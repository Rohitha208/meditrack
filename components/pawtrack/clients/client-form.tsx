import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Client } from "@/queries/clients/get-client";
import { useCreateClient } from "@/queries/clients/create-client";
import { useUpdateClient } from "@/queries/clients/update-client";
import { useRootContext } from '@/context/RootContext';
import { Mic, Loader2 } from "lucide-react";
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager";
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber";
import { useToast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { ClientFormValues, clientFormSchema } from "@/components/pawtrack/schema/clientSchema";

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  onSuccess?: (client: Client) => void;
  nestedForm?: boolean;
  isUpdate?: boolean;
  onCancel?: () => void;
  isClientContext?: boolean;
}

  
export function ClientForm({
  defaultValues,
  onSuccess,
  nestedForm = false,
  isUpdate = false,
  onCancel,
  isClientContext = false,
}: ClientFormProps) {
  const formDefaults = defaultValues || {
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phonePrimary: "",
    phoneSecondary: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
    isActive: true,
    isPremium: false,
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const { clinic, user } = useRootContext();
  const notesTranscriber = useTranscriber();
  const { toast } = useToast();
 
  // Audio transcription effect for notes
  useEffect(() => {
    const output = notesTranscriber.output;
    if (output && !output.isBusy && output.text) {
      form.setValue(
        "notes",
        (form.getValues("notes") ? form.getValues("notes") + "\n" : "") + output.text
      );
      setAudioModalOpen(false);
    }
    // eslint-disable-next-line
  }, [notesTranscriber.output?.isBusy]);
 
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: formDefaults,
  });
  const isNewClient = !isUpdate && !nestedForm;
 
  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      const companyId = clinic?.companyId || (user as any)?.companyId || undefined;
      const clientData = {
        ...data,
        phoneSecondary: data.phoneSecondary?.trim() === "" ? null : data.phoneSecondary,
        emergencyContactName: data.emergencyContactName?.trim() === "" ? null : data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone?.trim() === "" ? null : data.emergencyContactPhone,
        isActive: data.isActive !== undefined ? data.isActive : true,
        companyId
      } as any;
     
      console.log("Form submission - isUpdate:", isUpdate);
      console.log("Form submission - client ID:", data.id);
      console.log("Form submission data:", clientData);
     
      let updatedClient: Client;
     
      // Force update if isUpdate prop is true, regardless of ID
      if (isUpdate) {
        console.log("Using UPDATE mutation - ID:", data.id);
        updatedClient = await updateClientMutation.mutateAsync({
          id: (data.id || formDefaults.id || "") as string,  // Ensure we have the ID with string typecast
          companyId: clientData.companyId,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email,
          phonePrimary: clientData.phonePrimary,
          phoneSecondary: clientData.phoneSecondary,
          addressLine1: clientData.addressLine1,
          addressLine2: clientData.addressLine2,
          city: clientData.city,
          state: clientData.state,
          postalCode: clientData.postalCode,
          emergencyContactName: clientData.emergencyContactName,
          emergencyContactPhone: clientData.emergencyContactPhone,
          notes: clientData.notes,
          isActive: clientData.isActive,
          isPremium: clientData.isPremium
        });
        toast({
          title: "Owner Updated",
          description: "The owner's details have been updated successfully",
          variant: "success",
        });
      } else {
        // Otherwise use create mutation - exclude id from payload if present
        const { id: _omitId, ...createPayload } = clientData as any;
        updatedClient = await createClientMutation.mutateAsync(createPayload);
        toast({
          title: "Owner Created",
          description: "Owner has been created successfully",  
          variant: "success",
        });
      }
     
      if (onSuccess) {
        onSuccess(updatedClient);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: getToastErrorMessage(
          error,
          isUpdate ? "Failed to update owner. Please try again." : "Failed to create owner. Please try again."
        ),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
 
  // Handle phone number input changes
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    field.onChange(value);
  };

  // The form fields content
  const formContent = (
    <div className="space-y-6">
      {/* Hidden ID field for updates */}
      {isUpdate && (
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <input type="hidden" {...field} />
          )}
        />
      )}
<div className={`${isNewClient ? 'h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md' :isUpdate ? 'h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md' : ' '} !mt-0`}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <FormField
          control={form.control}
          name="phonePrimary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Phone*</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Primary phone" 
                  value={field.value}
                  onChange={(e) => handlePhoneChange(e, field)}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
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
                <Input 
                  placeholder="Secondary phone" 
                  value={field.value}
                  onChange={(e) => handlePhoneChange(e, field)}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
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
          <FormItem className="pt-2">
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
          <FormItem className="pt-2">
            <FormLabel>Address Line 2</FormLabel>
            <FormControl>
              <Input placeholder="Address line 2" {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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
 
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <FormField
          control={form.control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="Emergency contact name" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emergencyContactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact Phone</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Emergency contact phone" 
                  value={field.value}
                  onChange={(e) => handlePhoneChange(e, field)}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
     
      {isUpdate && (
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
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
      )}

      {(isUpdate || !isUpdate) && (
        <FormField
          control={form.control}
          name="isPremium"
          render={({ field }) => (
            <FormItem className={isUpdate ? "flex flex-row items-start space-x-3 space-y-0 pt-2" : "flex flex-row items-start space-x-3 space-y-0 pt-4"}>
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
      )}
 
     <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2 pt-2">
              <FormLabel>Notes</FormLabel>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setAudioModalOpen(true)}
                title="Record voice note"
                disabled={notesTranscriber.output?.isBusy}
              >
                {notesTranscriber.output?.isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>
            <FormControl>
              <Textarea
                placeholder="Any additional notes about the client"
                className="resize-none h-24"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
            <AudioManager
              open={audioModalOpen}
              onClose={() => setAudioModalOpen(false)}
              transcriber={notesTranscriber}
              onTranscriptionComplete={() => setAudioModalOpen(false)}
            />
          </FormItem>
        )}
      />
      </div>
      <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => { form.reset(defaultValues as any); onCancel && onCancel(); }}>
            Cancel
          </Button>
      <Button
        type="button"
        className={isUpdate ? "bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white" : "theme-button text-white"}
        disabled={isSubmitting}
        onClick={(e) => {
          e.preventDefault();
          // Manually trigger form validation and submission
          form.handleSubmit(onSubmit)();
        }}
      >
        {isSubmitting
          ? (isUpdate ? "Updating..." : "Saving...")
          : isUpdate 
            ? (isClientContext ? "Update Client" : "Update Owner")
            : (isClientContext ? "Save Client" : "Save Owner")
        }
      </Button>
    </div>
    </div>
  );
 
  // If this is a nested form, just return the form content without the outer Form and form tags
  if (nestedForm) {
    return (
      <Form {...form}>
        {formContent}
      </Form>
    );
  }
 
  // Otherwise, return the complete form with the form tag
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {formContent}
      </form>
    </Form>
  );
}