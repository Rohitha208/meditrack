import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { useGetSupplierById } from "@/queries/suppliers/get-supplier-by-id";
import { useUpdateSupplier } from "@/queries/suppliers/update-supplier";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Switch } from "../../ui/switch";
import { Supplier } from ".";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useRootContext } from "@/context/RootContext";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";


 const supplierSchema = z.object({
  id: z.string(),
  clinicId: z.string().min(1, "Clinic is required"),
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string()
    .min(1, "Phone is required")
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(), // not required
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
  accountNumber: z.string().min(1, "Account Number is required"),
  paymentTerms: z.string().optional(), // not required
  isActive: z.boolean().optional(), 
  createdAt: z.string(),
  updatedAt: z.string(),
  clinicDetail: z.object({
    name: z.string(),
  }),

});

type SupplierDetailsProps = {
  supplierId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function SupplierDetails({ supplierId, onSuccess, onCancel }: SupplierDetailsProps) {
  const router = useRouter();
  const { userType, clinic } = useRootContext();
  const { data: clinicsData } = useGetClinic(1, 10, clinic?.companyId || null);
  const clinics = clinicsData?.items || [];  
  const { data: supplier, isLoading } = useGetSupplierById(supplierId);
  const updateSupplier = useUpdateSupplier();
  const { toast } = useToast();
 
  // Update the useForm configuration
  const form = useForm<Supplier>({
    resolver: zodResolver(supplierSchema),
     defaultValues: supplier,
  });
  
  // Update form values when supplier data is loaded
  useEffect(() => {
    if (supplier) {
      // For admin users, use the supplier's clinic ID, otherwise use the current clinic ID
      const clinicId = userType.isAdmin 
        ? supplier.clinicId 
        : (clinic?.id || supplier.clinicId || '');
      
      form.reset({
        ...supplier,
        clinicId: clinicId
      });
      
      // Ensure the clinic ID is set in the form state
      if (clinicId) {
        setTimeout(() => {
          form.setValue('clinicId', clinicId, { shouldValidate: true });
        }, 0);
      }
    }
  }, [supplier, userType.isAdmin, clinic?.id, form]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!supplier) {
    return <div>Supplier not found</div>;
  }
  
  const handleSubmit = async (values: Supplier) => {
    try {
      // Ensure clinicId is set correctly for clinicAdmin users
      if ((userType.isClinicAdmin || userType.isVeterinarian) && clinic.id) {
        values.clinicId = clinic.id;
      }
      
      await updateSupplier.mutateAsync(values);
      toast({
        title: "Supplier Updated",
        description: "Supplier has been updated successfully",
        variant: "success",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while updating the supplier.",
        variant: "error",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full">
      <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
        <div className="grid grid-cols-2 gap-4">
          {/* Only show clinic selection for admin users */}
          {!userType.isClinicAdmin && !userType.isVeterinarian && (
            <FormField name="clinicId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Clinic</FormLabel>
                <Select 
                  value={field.value || ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('clinicId', value, { shouldValidate: true });
                  }}
                >
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="contactPerson" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="phone" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
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
              <FormLabel>Address Line 1</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="addressLine2" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 2</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="city" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="state" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="postalCode" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="accountNumber" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="paymentTerms" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Terms</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="isActive" control={form.control} render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Set whether this supplier is active or not
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </div>
      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              router.push('/suppliers');
            }
          }}
        >
          Cancel
        </Button>
        <Button type="submit" className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white">
          Update Supplier
        </Button>
      </div>
    </form>
  </Form>
);
}