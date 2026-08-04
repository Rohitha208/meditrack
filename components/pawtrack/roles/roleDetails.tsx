'use client';

import { useState, useEffect } from "react";
import { useGetRoleById } from "@/queries/roles/get-role-by-id";
import { useUpdateRole } from "@/queries/roles/update-role";
import { Button } from "../../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { useForm } from "react-hook-form";
import { Switch } from "../../ui/switch";
import { Role } from "@/queries/roles/get-role";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

type RoleFormValues = {
  id: string;
  name: string;
  value: string;
  isPrivileged: boolean;
  metadata: string;
  isClinicRequired: boolean;
  createdAt: string;
  updatedAt: string;
  colourName: string;
  priority: number;
};

type UpdateRolePayload = {
  name: string;
  value: string;
  isPrivileged: boolean;
  metadata: string | null;
  isClinicRequired: boolean;
  colourName: string;
  priority: number;
};

interface RoleDetailsProps {
  roleId: string;
  onSuccess?: () => void;
}

export default function RoleDetails({ roleId, onSuccess }: RoleDetailsProps) {
  const router = useRouter();
  
  const { data: role, isLoading } = useGetRoleById(roleId);
  const updateRole = useUpdateRole();
  
  // Initialize form with empty values that will be updated when data is loaded
  const form = useForm<RoleFormValues>({
    defaultValues: {
      id: roleId,
      name: "",
      value: "",
      isPrivileged: false,
      metadata: "{}",
      isClinicRequired: false,
      createdAt: "",
      updatedAt: "",
      colourName: "#000000",
    }
  });
  
  // Update form values when role data is loaded
  useEffect(() => {
    if (role) {
      form.reset(role);
    }
  }, [role, form]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!role) {
    return <div>Role not found</div>;
  }
  
  const handleSubmit = async (values: RoleFormValues) => {
      // Create the update payload with only the required fields
      const updatePayload: UpdateRolePayload = {
      name: values.name,
      value: values.value,
      isPrivileged: values.isPrivileged,
      metadata: null,
      isClinicRequired: values.isClinicRequired,
      colourName: values.colourName,
      priority: values.priority,
    };

    try {
      await updateRole.mutateAsync({ id: roleId, ...updatePayload });
      if (onSuccess) onSuccess();
      toast({
        title: "Role Updated",
        description: "Role details have been updated successfully",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "error",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full max-w-md mx-auto">
        <div className="grid grid-cols-1 gap-4">
          <FormField name="name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="value" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField
            name="colourName"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ fontWeight: "bold", marginBottom: 8 }}>Color</FormLabel>
                <FormControl>
                  <div style={{ position: "relative", width: 48, height: 48 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: field.value || "#ff001a",
                        border: "2px solid #eee",
                        cursor: "pointer",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        zIndex: 1,
                      }}
                      onClick={() => {
                        document.getElementById("hidden-color-input")?.click();
                      }}
                    />
                    <input
                      id="hidden-color-input"
                      type="color"
                      value={field.value || "#ff001a"}
                      onChange={e => field.onChange(e.target.value)}
                      style={{
                        opacity: 0,
                        width: 48,
                        height: 48,
                        border: "none",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                      tabIndex={-1}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField name="isClinicRequired" control={form.control} render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Clinic Required</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        <div className="flex justify-end mt-6">
          <Button type="submit">
            Update Role
          </Button>
        </div>
      </form>
    </Form>
  );
}
