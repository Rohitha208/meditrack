'use client';

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateUser } from "@/queries/users/create-user";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from ".";
import { Role, useGetRole } from "@/queries/roles/get-role";
import React, { useEffect } from "react";
import { Combobox } from "@/components/ui/combobox";
import { getCompanyId } from "@/utils/clientCookie";

type UserFormValues = Omit<User, "id" | "lastLogin" | "createdAt" | "updatedAt"> & {
  companyId?: string;
};

interface NewUserProps {
  clinicId?: string;
  onSuccess?: () => void;
}

export default function NewUser({ clinicId, onSuccess }: NewUserProps) {
  const router = useRouter();
  
  const createUser = useCreateUser({
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "User has been created successfully",
        variant: "success",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/clinic");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "error",
      });
    },
  });
  
  const form = useForm<UserFormValues>({
    defaultValues: {
      email: "",
      passwordHash: "",
      firstName: "",
      lastName: "",
      role: "",
      isActive: true,
      companyId: "",
    },
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
  
  const { data: rolesData } = useGetRole();
  
  const roleOptions = React.useMemo(() => {
    return rolesData?.data?.map((role: Role) => ({
      value: role.value,
      label: role.name
    })) || [];
  }, [rolesData?.data]);
  
  const handleSubmit = async (values: UserFormValues) => {
    try {
      // Find the selected role to get the id and name
      const roleToSend = rolesData?.data?.find((role: Role) => role.value === values.role);

      // Create the payload matching the POST API structure
      const payload = {
      email: values.email,
      passwordHash: values.passwordHash,
      firstName: values.firstName,
      lastName: values.lastName || "",
      roleId: roleToSend?.id ?? "",
      companyId: values.companyId ?? "",
      clinicIds: clinicId ? [clinicId] : [],
      slots: [],
    };
    console.log("Creating user with payload:", payload);

      await createUser.mutateAsync(payload);
    } catch (error) {
      // Error is handled in onError callback
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full max-w-md mx-auto">
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
          
          <FormField name="role" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Combobox
                  options={roleOptions}
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  placeholder="Select role"
                  searchPlaceholder="Search roles..."
                  emptyText="No roles found"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        <div className="flex justify-end mt-6">
          <Button type="submit" className="theme-button text-white">
            Create User
          </Button>
        </div>
      </form>
    </Form>
  );
}