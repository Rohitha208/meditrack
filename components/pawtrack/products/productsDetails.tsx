'use client';

import { useState, useEffect } from "react";
import { useGetProductById } from "@/queries/products/get-product-by-id";
import { useUpdateProduct } from "@/queries/products/update-product";
import { Button } from "../../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { useForm } from "react-hook-form";
import { Switch } from "../../ui/switch";
import { Product } from ".";
import { useRouter } from "next/navigation";
import { toast } from "../../ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Combobox } from "../../ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const UNIT_OF_MEASURE_OPTIONS = [
  { value: "STRIP", label: "Strip" },
  { value: "EA", label: "Each (EA)" },
  { value: "BOTTLE", label: "Bottle" },
  { value: "BOX", label: "Box" },
  { value: "PACK", label: "Pack" },
  { value: "BAG", label: "Bag" },
  { value: "CAN", label: "Can" }
];

const PRODUCT_CATEGORIES = [
  { value: "medication", label: "Medication" },
  { value: "vaccine", label: "Vaccine" },
  { value: "supplement", label: "Supplement" },
  { value: "medical_supply", label: "Medical Supply" },
  { value: "equipment", label: "Equipment" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" }
];

const productSchema = z.object({
    id: z.string(),
    productNumber: z.string().min(2, 'Product number must be at least 2 characters'),
    name: z.string().min(2, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    price: z.number({
      required_error: 'Cost price is required',
      invalid_type_error: 'Cost price must be a number'
    }).min(0.01, 'Cost price must be greater than 0'),
    sellingPrice: z.number().min(0.01, 'Selling price is required and must be greater than 0'),
    reorderThreshold: z.number().int().nonnegative().optional(),
    unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
    brandName: z.string().optional(),
    genericName: z.string().optional(),
    manufacturer: z.string().optional(),
    ndcNumber: z.string().optional(),
    strength: z.string().optional(),
    dosageForm: z.string().optional(),
    controlledSubstanceSchedule: z.string().optional(),
    storageRequirements: z.string().optional(),
    requiresPrescription: z.boolean(),
    isActive: z.boolean(),
    companyId: z.string().optional(),
  });



interface ProductDetailsProps {
  productId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProductDetails({ productId, onSuccess, onCancel }: ProductDetailsProps) {
  const router = useRouter();
  const [isFormReady, setIsFormReady] = useState(false);
  const { toast } = useToast();

  const { data: product, isLoading } = useGetProductById(productId);

  console.log("Product Details Data:", product);

  const updateProduct = useUpdateProduct();
  type ProductFormValues = z.infer<typeof productSchema>;

  const form = useForm<ProductFormValues>({
    mode: 'onChange',
    resolver: zodResolver(productSchema),
  });

  // Update form values when product data is loaded
  useEffect(() => {
    if (product && !isFormReady) {
      const formData = {
        ...product,
        unitOfMeasure: product.unitOfMeasure || '',
        price: product.price ?? 0,
        sellingPrice: product.sellingPrice ?? 0,
        reorderThreshold: product.reorderThreshold ?? null,
        category: product.category || '',
        requiresPrescription: product.requiresPrescription ?? false,
        isActive: product.isActive ?? true,
        productNumber: product.productNumber || '',
        name: product.name || '',
        genericName: product.genericName || '',
        ndcNumber: product.ndcNumber || '',
        dosageForm: product.dosageForm || '',
        controlledSubstanceSchedule: product.controlledSubstanceSchedule || '',
        storageRequirements: product.storageRequirements || '',
      };
      
      form.reset(formData);
      setIsFormReady(true);
    }
  }, [product, form, isFormReady]);

useEffect(() => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.companyId) {
        form.setValue("companyId", user.companyId);
      }
    } catch (err) {
      console.error("Error parsing user from localStorage:", err);
    }
  }
}, [form]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  // Don't render the form until it's ready with data
  if (!isFormReady) {
    return <div>Preparing form...</div>;
  }
  

  const handleSubmit = async (values: ProductFormValues) => {

    try {
      await updateProduct.mutateAsync(values);
      toast({
        title: "Product Updated",
        description: "Product has been updated successfully",
        variant: "success",
      });
      if (onSuccess) onSuccess();
      // Refetch product data after update to ensure UI is up to date
      form.reset(values);
    } catch (error) {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to update product"),
        variant: "destructive",
      });
    }
  };

  console.log("Product Details Form Values:", form.getValues());

  return (
    <div className="flex flex-col w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col w-full h-full">
          <div className="h-[calc(100vh-10rem)] overflow-y-auto pb-4 border rounded-md">
          <div className="grid grid-cols-2 gap-6 p-4 rounded-md">

            <FormField name="productNumber" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Product Number</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="brandName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="genericName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Generic Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="category" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Combobox
                    options={PRODUCT_CATEGORIES}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    placeholder="Select or search category"
                    searchPlaceholder="Search categories..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />


            <FormField name="ndcNumber" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>NDC Number</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="dosageForm" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Dosage Form</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="unitOfMeasure" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''}
                  defaultValue={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit of measure" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {UNIT_OF_MEASURE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="price" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter cost price"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={0}
                    step="0.01"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="sellingPrice" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter selling price"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    min={0}
                    step="0.01"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="reorderThreshold" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Threshold</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter reorder threshold"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="controlledSubstanceSchedule" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Controlled Substance Schedule</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="storageRequirements" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Requirements</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-6 mt-12 p-2">
            <FormField name="requiresPrescription" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Requires Prescription</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="isActive" control={form.control} render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <div className="flex justify-end my-4 bottom-0 bg-white gap-4">
          <Button type="button" variant="outline" onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              form.reset();
            }
          }}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white">
            Update Product
          </Button>
        </div>
      </form>
    </Form>
  </div>
);
}