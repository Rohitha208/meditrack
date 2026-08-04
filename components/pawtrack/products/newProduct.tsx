'use client';
 
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useCreateProduct } from "@/queries/products/create-products";
import { productSchema, ProductFormValues, defaultProductValues } from "@/components/pawtrack/schema/productSchema";
import { Combobox } from "../../ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { useEffect } from "react";
import { getCompanyId } from "@/utils/clientCookie";
import { zodResolver } from "@hookform/resolvers/zod";  

const UNIT_OF_MEASURE_OPTIONS = [
  { value: "STRIP", label: "Strip" },
  { value: "EA", label: "Each (EA)" },
  { value: "BOX", label: "Box" },
  { value: "PACK", label: "Pack" },
  { value: "BAG", label: "Bag" },
  { value: "BOTTLE", label: "Bottle" },
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
 
interface NewProductProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}


 
export default function NewProduct({ onSuccess, onCancel }: NewProductProps) {
   const { toast } = useToast();

  const createProduct = useCreateProduct({
    onSuccess: () => {
      toast({
        title: "Product Created",
        description: "Product has been created successfully",
        variant: "success",
      });
      // Close the sheet and refetch data after successful creation
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to create product"),
        variant: "destructive",
      });
    },
  });
 
  // Update useForm configuration
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultProductValues
  });
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

  const handleSubmit = (values: ProductFormValues) => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (!values.companyId && user?.companyId) {
        values.companyId = user.companyId;
      }
    }
    
    // Start the mutation (this will refetch the data automatically via query invalidation)
    createProduct.mutate(values);
  };

 
  return (
    <div className="flex flex-col w-full ">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col">
        <div className=" h-[calc(100vh-10rem)] overflow-y-auto border p-4 rounded-md">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            
            
            <FormField name="productNumber" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Product Number*</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
           
            <FormField name="name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Name*</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
           
            <FormField name="brandName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
           
            <FormField name="genericName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Generic Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
           
            <FormField name="category" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Category*</FormLabel>
                <FormControl>
                  <Combobox
                    options={PRODUCT_CATEGORIES}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select or search category"
                    searchPlaceholder="Search categories..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
           
           
            {/* <FormField name="manufacturer" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturer</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} /> */}
           
            <FormField name="ndcNumber" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>NDC Number</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
           
            {/* <FormField name="strength" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Strength</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} /> */}
           
            <FormField name="dosageForm" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Dosage Form</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
           
            <FormField name="unitOfMeasure" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure*</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "EA"}
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
           
            <FormField name="controlledSubstanceSchedule" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Controlled Substance Schedule</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField name="price" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price*</FormLabel>
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
                <FormLabel>Selling Price*</FormLabel>
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
           
            <FormField name="storageRequirements" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Requirements</FormLabel>
                <FormControl><Input {...field} /></FormControl>
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
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-[#1E3D3D]"
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
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-[#1E3D3D]"
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
              Create Product
            </Button>
          </div>
      </form>
    </Form>


  </div>
  );
}
