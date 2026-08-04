import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { useCreateSupplier } from "@/queries/suppliers/create-supplier";
import { useToast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { Switch } from "../../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useRootContext } from '@/context/RootContext';
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, SupplierFormValues, defaultSupplierValues } from "@/components/pawtrack/schema/supplierSchema";

type NewSupplierProps = {
  onSuccess?: () => void;
};

export default function NewSupplier({ onSuccess }: NewSupplierProps) {
  const router = useRouter();
  const { user, userType, clinic } = useRootContext();
  const { data: clinicsData } = useGetClinic(1, 10, clinic?.companyId || null);
  const clinics = clinicsData?.items || [];
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSupplier = useCreateSupplier({
    onSuccess: () => {
      toast({
        title: "Supplier Created",
        description: "Supplier has been created successfully",
        variant: "success",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/suppliers");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to create supplier"),
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      ...defaultSupplierValues,
      clinicId: clinic?.id || "",
    },
  });

  const handleClinicDefaultState = () => {
    if (clinic.id && !userType.isAdmin && !userType.isSuperAdmin) {
      form.setValue("clinicId", clinic.id);
    }
  };
  useEffect(() => {
    handleClinicDefaultState();
  }, [clinic]);
  
  const handleSubmit = async (values: SupplierFormValues) => {
    try {
      setIsSubmitting(true);
      await createSupplier.mutateAsync(values);
    } catch (error) {
      // Error is handled in onError callback
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full ">
      <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {(userType.isAdmin) && (
            <FormField name="clinicId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Clinic*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a clinic" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clinics?.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          
          <FormField name="name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Name*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="contactPerson" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email*</FormLabel>
              <FormControl><Input {...field} type="email" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="phone" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Phone*</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="tel"
                  maxLength={10}
                  onKeyPress={(e) => {
                    // Allow only numbers
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    // Remove any non-digit characters
                    const value = e.target.value.replace(/\D/g, '');
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="addressLine1" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 1*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="addressLine2" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 2</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="city" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>City*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="state" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>State*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="postalCode" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="accountNumber" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="paymentTerms" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Terms</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
        </div>
        </div>
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onSuccess ? onSuccess() : router.push('/suppliers')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
            disabled={isSubmitting}
          >
            Create Supplier
          </Button>
        </div>
      </form>
    </Form>
  );
} 