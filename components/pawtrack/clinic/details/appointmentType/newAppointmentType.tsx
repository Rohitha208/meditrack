import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateAppointmentType } from "@/queries/appointmentType/create-appointmentType";
import { toast } from "@/hooks/use-toast";
import { AppointmentType } from "@/queries/appointmentType/get-appointmentType";

type NewAppointmentTypeProps = {
  onSuccess?: () => void;
};

export default function NewAppointmentType({ onSuccess }: NewAppointmentTypeProps) {
  const router = useRouter();
  
  const createAppointmentType = useCreateAppointmentType({
    onSuccess: (appointmentType: AppointmentType) => {
      toast({
        title: "Appointment Type Created",
        description: `Appointment type ${appointmentType.name} created successfully`,
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
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create appointment type",
        variant: "error",
      });
    },
  });
  
  const form = useForm<{ name: string }>({
    defaultValues: {
      name: "",
    },
  });
  
  const handleSubmit = async (values: { name: string }) => {
    try {
      await createAppointmentType.mutateAsync({
        name: values.name,
        isActive: true, 
      });
    } catch (error) {
      // Error is handled in onError callback
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-12 w-full pt-4">
        <div className="grid grid-cols-1 gap-8">
          <FormField name="name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        <div className="flex justify-end mt-6">
          <Button type="submit">
            Create Appointment Type
          </Button>
        </div>
      </form>
    </Form>
  );
}
