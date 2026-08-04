'use client';

import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateUser } from "@/queries/users/create-user";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Doctor } from ".";
import { useGetRole } from "@/queries/roles/get-role";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRootContext } from "@/context/RootContext";
import { getCompanyId } from "@/utils/clientCookie";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type DoctorFormValues = z.infer<typeof doctorSchema>;

const doctorSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  passwordHash: z.string().min(6, 'Password must be at least 6 characters'),
  clinicId: z.string().optional(),
  isActive: z.boolean().default(true),
});


interface NewDoctorProps {
  clinicId?: string;
  onSuccess?: () => void;
}

export default function NewDoctor({ clinicId, onSuccess }: NewDoctorProps) {
  const router = useRouter();
  const { clinic, user } = useRootContext();

  const createUser = useCreateUser({
    onSuccess: () => {
      toast({
        title: "Doctor Created",
        description: `Doctor ${form.getValues().firstName} ${form.getValues().lastName} created successfully`,
        variant: "success",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/clinic");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create doctor",
        variant: "destructive",
      });
    },
  });

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      email: "",
      passwordHash: "",
      firstName: "",
      lastName: "",
      isActive: true,
      clinicId: clinicId || "",
    },
  });

  const { data: rolesData } = useGetRole();
  // Compute companyId once and pass required params to useGetClinic
  const computedCompanyId = clinic?.companyId || user?.companyId || getCompanyId();
  const { data: clinicData } = useGetClinic(1, 100, computedCompanyId, true, user?.id || null);
  
  // Find veterinarian role
  const veterinarianRole = rolesData?.data?.find((role: any) => 
    role.name.toLowerCase() === 'veterinarian'
  );
  
  const handleSubmit = async (values: DoctorFormValues) => {
    try {
      // Use the computed company ID from context/cookies
      const companyId = computedCompanyId;

      // Create the payload matching the expected API structure
      const payload = {
        email: values.email,
        passwordHash: values.passwordHash,
        firstName: values.firstName,
        lastName: values.lastName || null,
        roleId: veterinarianRole?.id,
        companyId: companyId,
        clinicIds: [clinicId || ""], // Array of clinic IDs
        slots: [] // Empty slots array as per API
      };

      await createUser.mutateAsync(payload);
    } catch (error) {
      // Error is handled in onError callback
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
              <FormControl><Input {...field} value={field.value || ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="lastName" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl><Input {...field} value={field.value || ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input {...field} type="email" value={field.value || ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="passwordHash" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl><Input {...field} type="password" value={field.value || ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {!clinicId && (
            <FormField name="clinicId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Clinic</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clinicData?.items?.map((clinic: any) => (
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
        </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            Create Doctor
          </Button>
        </div>
      </form>
    </Form>
  );
}
