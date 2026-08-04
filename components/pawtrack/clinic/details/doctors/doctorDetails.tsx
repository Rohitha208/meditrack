'use client';

import { useState, useEffect } from "react";
import { useGetUserById } from "@/queries/users/get-user-by-id";
import { useUpdateUser } from "@/queries/users/update-user";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Doctor } from ".";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useGetRole } from "@/queries/roles/get-role";
import { useRootContext } from "@/context/RootContext";
import { getCompanyId } from "@/utils/clientCookie";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';


interface DoctorDetailsProps {
  doctorId: string;
  clinicId?: string;
  onSuccess?: () => void;
}

export default function DoctorDetails({ doctorId, clinicId, onSuccess }: DoctorDetailsProps) {
  const router = useRouter();
  const { clinic, user } = useRootContext();

  const { data: doctor, isLoading } = useGetUserById(doctorId);
  const updateUser = useUpdateUser();
  const { data: rolesData } = useGetRole();
  const [isPasswordDirty, setIsPasswordDirty] = useState(false);
  
  // Find veterinarian role
  const veterinarianRole = rolesData?.data?.find((role: any) => 
    role.name.toLowerCase() === 'veterinarian'
  );
  
  // Initialize form with empty values that will be updated when data is loaded
  const doctorSchema = z.object({
    id: z.string(),
    passwordHash: z.string().optional(),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().optional(),
    isActive: z.boolean().optional()
  });
  
  type Doctor = z.infer<typeof doctorSchema>;
  const form = useForm<Doctor & { password: string }>({
    resolver: zodResolver(doctorSchema),
    mode: 'onChange',
    defaultValues: {
      id: doctorId,
      email: "",
      passwordHash: "",
      password: "",
      firstName: "",
      lastName: "",
      isActive: false
    }
  });
  
  // Update form values when doctor data is loaded
  useEffect(() => {
    if (doctor) {
      // Make sure all fields have defined values
      const defaultValues = {
        ...doctor,
        firstName: doctor.firstName || "",
        lastName: doctor.lastName || "",
        email: doctor.email || "",
        password: "", // Initialize empty password field
        isActive: typeof doctor.isActive === 'boolean' ? doctor.isActive : false
      };
      
      form.reset(defaultValues);
    }
  }, [doctor, form]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!doctor) {
    return <div>Doctor not found</div>;
  }
  
  const handleSubmit = async (values: Doctor & { password: string }) => {
    try {
      // Get company ID from clinic context or cookies
      const companyId = clinic?.companyId || user?.companyId || getCompanyId();

      // Create the payload matching the expected API structure
      const payload = {
        id: values.id,
        email: values.email,
        passwordHash: values.password && isPasswordDirty ? values.password : doctor.passwordHash || "",
        firstName: values.firstName,
        lastName: values.lastName || null,
        roleId: veterinarianRole?.id,
        companyId: companyId,
        clinicIds: [clinicId || ""], // Array of clinic IDs
        isActive: true,
        slots: [] // Empty slots array as per API
      };

      await updateUser.mutateAsync(payload);
      toast({
        title: "Doctor updated",
        description: `Doctor ${values.firstName} ${values.lastName} updated successfully`,
        variant: "success",
      });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update doctor",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full max-w-md mx-auto">
      <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
        <div className="grid grid-cols-1 gap-4">
          <FormField name="firstName" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="lastName" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="password" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Password (leave empty to keep unchanged)</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="password" 
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e);
                    setIsPasswordDirty(e.target.value.length > 0);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            Update Doctor
          </Button>
        </div>
      </form>
    </Form>
  );
}
