'use client'

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Client } from "@/queries/clients/get-client";
import { useUpdateClient } from "@/queries/clients/update-client";
import { useToast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { CheckCircle } from "lucide-react";

const updateClientSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phonePrimary: z.string().min(5, { message: "Phone number is required." }),
  phoneSecondary: z.string().optional(),
  addressLine1: z.string().min(1, { message: "Address is required." }),
  addressLine2: z.string().optional(),
  city: z.string().min(1, { message: "City is required." }),
  state: z.string().min(1, { message: "State is required." }),
  postalCode: z.string().min(1, { message: "Postal code is required." }),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  isPremium: z.boolean().default(false),
});

type UpdateClientFormValues = z.infer<typeof updateClientSchema>;

interface ClientUpdateFormProps {
  client: Client;
  onSuccess?: () => void;
}

export function ClientUpdateForm({ client, onSuccess }: ClientUpdateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateClientMutation = useUpdateClient();
  const { toast } = useToast();

  // Initialize form with client data
  const form = useForm<UpdateClientFormValues>({
    resolver: zodResolver(updateClientSchema),
    defaultValues: {
      id: client.id,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email || "",
      phonePrimary: client.phonePrimary || "",
      phoneSecondary: client.phoneSecondary || "",
      addressLine1: client.addressLine1 || "",
      addressLine2: client.addressLine2 || "",
      city: client.city || "",
      state: client.state || "",
      postalCode: client.postalCode || "",
      emergencyContactName: client.emergencyContactName || "",
      emergencyContactPhone: client.emergencyContactPhone || "",
      notes: client.notes || "",
      isActive: client.isActive ?? true,
      isPremium: client.isPremium ?? false,
    },
  });

  const onSubmit = async (data: UpdateClientFormValues) => {
    setIsSubmitting(true);
    try {
      console.log("Updating client with PUT request:", data);
      console.log("Client ID:", data.id);
      
      // Direct call to updateClient mutation
      await updateClientMutation.mutateAsync({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phonePrimary: data.phonePrimary,
        phoneSecondary: data.phoneSecondary || "",
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || "",
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        emergencyContactName: data.emergencyContactName || "",
        emergencyContactPhone: data.emergencyContactPhone || "",
        notes: data.notes || "",
        isActive: data.isActive,
        isPremium: data.isPremium
      });
      
      toast({
        title: "Client Updated",
        description: `Client ${data.firstName} ${data.lastName} has been updated successfully`,
        variant: "success",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to update owner. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Hidden fields for ID and clinicId */}
        <input type="hidden" {...form.register("id")} />
        <input type="hidden" {...form.register("clinicId")} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name*</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email*</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phonePrimary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Phone*</FormLabel>
                <FormControl>
                  <Input placeholder="Primary phone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneSecondary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Secondary phone" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 1*</FormLabel>
              <FormControl>
                <Input placeholder="Address line 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="addressLine2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 2</FormLabel>
              <FormControl>
                <Input placeholder="Address line 2" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City*</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State*</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code*</FormLabel>
                <FormControl>
                  <Input placeholder="Postal code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPremium"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Premium Member</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full bg-green-600 hover:bg-green-700 text-white" 
          disabled={isSubmitting}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isSubmitting ? "Updating..." : "Update Owner"}
        </Button>
      </form>
    </Form>
  );
} 