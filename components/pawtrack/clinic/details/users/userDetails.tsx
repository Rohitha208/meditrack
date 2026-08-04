'use client';

import { useState, useEffect } from "react";
import { useGetUserById } from "@/queries/users/get-user-by-id";
import { useUpdateUser } from "@/queries/users/update-user";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { User } from ".";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Role, useGetRole } from "@/queries/roles/get-role";
import { Combobox } from "@/components/ui/combobox";

interface UserDetailsProps {
  userId: string;
  clinicId?: string;
  onSuccess?: () => void;
}

export default function UserDetails({ userId, clinicId, onSuccess }: UserDetailsProps) {
  const router = useRouter();
  const [isPasswordDirty, setIsPasswordDirty] = useState(false);
  
  const { data: user, isLoading } = useGetUserById(userId);
  const updateUser = useUpdateUser();
  const { data: rolesData } = useGetRole();
  
  // Initialize form with empty values that will be updated when data is loaded
  const form = useForm<User & { password: string } & { roleId: string }>({
    defaultValues: {
      id: userId,
      email: "",
      passwordHash: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "",
      roleId: "",
      isActive: true
    }
  });
  
  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      // Make sure all fields have defined values
      const defaultValues = {
        ...user,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role || "",
        roleId: user.roleId || "",
        password: "", // Initialize empty password field
        isActive: true
      };
      
      form.reset(defaultValues);
      
      // Set the roleId if not already set
      if (rolesData?.data && user.roleId) {
        form.setValue('roleId', user.roleId);
      }
    }
  }, [user, form, rolesData]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <div>User not found</div>;
  }
  
  const handleSubmit = async (values: User & { password: string } & { roleId: string }) => {
    try {
      // Find the selected role to get additional role information
      const selectedRole = rolesData?.data?.find((role: Role) => role.id === values.roleId);
      
      // Create the payload matching the PUT API structure
      const payload = {
        id: values.id,
        email: values.email,
        passwordHash: values.password && isPasswordDirty ? values.password : user.passwordHash || "",
        firstName: values.firstName,
        lastName: values.lastName || null,
        roleId: values.roleId,
        companyId: user.companyId,
        clinicIds: clinicId ? [clinicId] : (user.clinicIds || []), // Array of clinic IDs
        isActive: true,
        slots: user.slots || [] // Preserve existing slots or empty array
      };
      
      await updateUser.mutateAsync(payload);
      toast({
        title: "User Updated",
        description: "User details have been updated successfully",
        variant: "success",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "error",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full max-w-md mx-auto">
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
          
          <FormField 
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Combobox
                    options={rolesData?.data?.map((role: Role) => ({
                      value: role.id,
                      label: role.name
                    })) || []}
                    value={field.value?.toString()}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    placeholder="Select role"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end mt-6">
          <Button type="submit">
            Update User
          </Button>
        </div>
      </form>
    </Form>
  );
}