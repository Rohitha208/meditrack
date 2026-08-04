import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateRoom } from "@/queries/rooms/create-room";
import { toast } from "@/hooks/use-toast";
import { Room } from "./index";
import { Combobox } from "@/components/ui/combobox";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type NewRoomProps = {
  clinicId?: string;
  onSuccess?: () => void;
};

const RoomSchema = z.object({
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .refine((val) => val.trim().length >= 3, "Name must be at least 3 characters and cannot be just spaces"),
  clinicId: z.string().min(1, "Clinic ID is required"),
  roomType: z.string().min(1, "Room type is required"),
  isActive: z.boolean().optional(),
});


export default function NewRoom({ clinicId, onSuccess }: NewRoomProps) {
  const router = useRouter();
  
  const createRoom = useCreateRoom({
    onSuccess: () => {
      toast({
        title: "Room created",
        description: `Room ${form.getValues().name} has been created successfully`,
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
        title: "Room creation failed",
        description: error.message || "Failed to create room",
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<Omit<Room, "id" | "createdAt">>({
    resolver: zodResolver(RoomSchema),
    defaultValues: {
      name: "",
      clinicId: clinicId || "",
      roomType: "",
      isActive: true,
    },
  });

  const roomTypeOptions = [
    { value: "examination", label: "Examination" },
    { value: "surgery", label: "Surgery" },
    { value: "isolation", label: "Isolation" },
    { value: "recovery", label: "Recovery" },
  ];
  
  const handleSubmit = async (values: Omit<Room, "id" | "createdAt">) => {
    try {
      await createRoom.mutateAsync({
        ...values,
        name: values.name.trim(),
        isActive: true
      });
    } catch (error) {
      // Error is handled in onError callback
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full">
      <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
        <div className="grid grid-cols-1 gap-8">
          <FormField name="name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          {!clinicId && (
            <FormField name="clinicId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Clinic ID</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
          
          <FormField name="roomType" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Room Type</FormLabel>
              <FormControl>
                <Combobox
                  options={roomTypeOptions}
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  placeholder="Select a room type"
                  searchPlaceholder="Search room types..."
                  emptyText="No room types found"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            Create Room
          </Button>
        </div>
      </form>
    </Form>
  );
} 