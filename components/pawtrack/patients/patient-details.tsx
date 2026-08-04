import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { useGetPatientById } from "@/queries/patients/get-patient-by-id";
import { useUpdatePatient } from "@/queries/patients/update-patient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Switch } from "../../ui/switch";
import { Patient } from "@/queries/patients/get-patients";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useRootContext } from "@/context/RootContext";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "../../ui/datePicker";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Checkbox } from "../../ui/checkbox";

const patientSchema = z.object({
  id: z.string(),
  clientId: z.string().min(1, "Owner is required"),
  name: z.string().min(1, "Name is required"),
  species: z.string().min(1, "Species is required"),
  breed: z.string().min(1, "Breed is required"),
  secondaryBreed: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  gender: z.string().min(1, "Gender is required"),
  isNeutered: z.boolean().default(false),
  dateOfBirth: z.string()
    .refine(dateString => !!dateString, "Date of birth is required")
    .refine((dateString) => {
      const [day, month, year] = dateString.split('/').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0,0,0,0);
      return !isNaN(parsedDate.getTime()) && parsedDate <= today;
    }, "Date of birth cannot be in the future"),
  weightKg: z.coerce.number().min(0, "Weight must be a positive number"),
  microchipNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  behavioralNotes: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Unknown" }
];

const SPECIES_OPTIONS = [
  { value: "Dog", label: "Dog" },
  { value: "Cat", label: "Cat" },
  { value: "Bird", label: "Bird" },
  { value: "Rabbit", label: "Rabbit" },
  { value: "Reptile", label: "Reptile" },
  { value: "Other", label: "Other" }
];

type PatientDetailsProps = {
  patientId: string;
  onSuccess?: () => void;
};

export default function PatientDetails({ patientId, onSuccess }: PatientDetailsProps) {
  const router = useRouter();
  const { userType, clinic } = useRootContext();
  const { data: patient, isLoading } = useGetPatientById(patientId);
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();
 
  // Update the useForm configuration
  const form = useForm<Patient>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient,
  });
  
  // Update form values when patient data is loaded
  useEffect(() => {
    if (patient) {
      const formData = {
        ...patient,
        dateOfBirth: format(new Date(patient.dateOfBirth), "dd/MM/yyyy"),
        species: patient.species || '',
        gender: patient.gender || '',
        breed: patient.breed || '',
        secondaryBreed: patient.secondaryBreed || '',
        color: patient.color || '',
        weightKg: patient.weightKg ?? 0,
        isNeutered: patient.isNeutered ?? false,
        isActive: patient.isActive ?? true,
        microchipNumber: patient.microchipNumber || '',
        registrationNumber: patient.registrationNumber || '',
        insuranceProvider: patient.insuranceProvider || '',
        insurancePolicyNumber: patient.insurancePolicyNumber || '',
        allergies: patient.allergies || '',
        medicalConditions: patient.medicalConditions || '',
        behavioralNotes: patient.behavioralNotes || '',
      };
      form.reset(formData);
    }
  }, [patient, form]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!patient) {
    return <div>Patient not found</div>;
  }
  
  const handleSubmit = async (values: Patient) => {
    try {
      // Parse DD/MM/YYYY string to ISO string for API submission
      const [day, month, year] = values.dateOfBirth.split('/').map(Number);
      const dateOfBirthISO = new Date(year, month - 1, day).toISOString();

      const patientData = {
        ...values,
        dateOfBirth: dateOfBirthISO,
      };
      
      await updatePatient.mutateAsync({
        ...patientData,
        id: patientId
      });
      
      toast({
        title: "Patient Updated",
        description: "Patient has been updated successfully",
        variant: "success",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while updating the patient.",
        variant: "error",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-12 w-full">
        <div className="grid grid-cols-2 gap-8">
          <FormField name="name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="species" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Species</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SPECIES_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="breed" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Breed</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="secondaryBreed" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Secondary Breed</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="color" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="gender" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="isNeutered" control={form.control} render={({ field }) => (
            <FormItem className="flex flex-row items-end space-x-2 space-y-0 mt-8">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Neutered/Spayed</FormLabel>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="dateOfBirth" control={form.control} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? new Date(
                    +field.value.split('/')[2],
                    +field.value.split('/')[1] - 1,
                    +field.value.split('/')[0]
                  ) : null}
                  onChange={(date) => {
                    if (date) {
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      field.onChange(`${day}/${month}/${year}`);
                    } else {
                      field.onChange("");
                    }
                  }}
                  minDate={new Date("1900-01-01")}
                  maxDate={new Date()}
                  placeholder="Select date of birth"
                  inputFormat="dd/MM/yyyy"
                  autoFormatTyping={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="weightKg" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="microchipNumber" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Microchip Number</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="registrationNumber" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Number</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="insuranceProvider" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Provider</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="insurancePolicyNumber" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Policy Number</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="allergies" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Allergies</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="medicalConditions" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Conditions</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="behavioralNotes" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Behavioral Notes</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="isActive" control={form.control} render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Set whether this patient is active or not
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )} />
        </div>
        
        <div className="flex justify-end mt-6">
          <Button type="submit">
            Update Patient
          </Button>
        </div>
      </form>
    </Form>
  );
}