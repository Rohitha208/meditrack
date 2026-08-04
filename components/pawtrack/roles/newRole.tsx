'use client';

import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { useCreateRole } from "@/queries/roles/create-role";
import { useRouter } from "next/navigation";
import { toast } from "../../ui/use-toast";
import { Role } from "@/queries/roles/get-role";
import { useQueryClient } from "@tanstack/react-query";

type RoleFormValues = {
    name: string;
    value: string;
    isPrivileged: boolean;
    metadata: string; // flexible JSON-like structure
    isClinicRequired: boolean;
    colourName: string;
    priority: number;
  };
  

interface NewRoleProps {
  onSuccess?: () => void;
}

export default function NewRole({ onSuccess }: NewRoleProps) {
  const router = useRouter();
   const queryClient = useQueryClient();
  
  const createRole = useCreateRole({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/roles");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<RoleFormValues>({
    defaultValues: {
      name: "",
      value: "",
      isPrivileged: false,
      metadata: "{}",
      isClinicRequired: false,
      colourName: "#000000",
    },
  });

  const handleSubmit = async (values: RoleFormValues) => {  
    try {
      await createRole.mutateAsync(values);
    } catch (error) {
      // Error is handled in onError callback
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full max-w-md mx-auto">
        <div className="grid grid-cols-1 gap-4">
          <FormField name="name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="value" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl><Input {...field} /></FormControl>
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
            Create Role
          </Button>
        </div>
      </form>
    </Form>
  );
}
