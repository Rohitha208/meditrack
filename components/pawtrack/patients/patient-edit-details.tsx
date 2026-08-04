"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Mic, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpdatePatient } from "@/queries/patients/update-patient"
import { Patient } from "@/queries/patients/get-patients"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager"
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber"
import { Switch } from "@/components/ui/switch"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"

const patientFormSchema = z.object({
  clientId: z.string().nonempty("Owner is required"),
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
      today.setHours(0, 0, 0, 0);
      return !isNaN(parsedDate.getTime()) && parsedDate <= today;
    }, "Date of birth cannot be in the future"),
  weightKg: z.coerce.number().min(0, "Weight must be a positive number"),
  microchipNumber: z.string().min(1, "Microchip number is required"),
  registrationNumber: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

type PatientFormValues = z.infer<typeof patientFormSchema>

interface PatientEditDetailsProps {
  patientId: string;
  onSuccess: () => void;
}
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
  { value: "Turtle", label: "Turtle" },
  { value: "Hamster", label: "Hamster" },
  { value: "Fish", label: "Fish" },
  { value: "Guinea Pig", label: "Guinea Pig" },
];

export function PatientEditDetails({ patientId, onSuccess }: PatientEditDetailsProps) {
  const [isPending, setIsPending] = useState(false)
  const [isFormReady, setIsFormReady] = useState(false)
  const [audioModalOpen, setAudioModalOpen] = useState<null | "notes">(null)
  const { toast } = useToast()

  const updatePatientMutation = useUpdatePatient()
  const { data: patient, isLoading } = useGetPatientById(patientId)
  const { user, userType, clinic } = useRootContext()
  const companyId = (typeof window !== 'undefined' && getCompanyId()) || user?.companyId || ''
  const notesTranscriber = useTranscriber()

  const defaultValues: Partial<PatientFormValues> = {
    clientId: "",
    name: "",
    species: "",
    breed: "",
    secondaryBreed: "",
    color: "",
    gender: "",
    isNeutered: false,
    isActive: true,
    weightKg: 0,
    microchipNumber: "",
  }

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: defaultValues
  })

  // Update form when patient data is loaded
  useEffect(() => {
    if (patient) {
      const formData = {
        ...patient,
        dateOfBirth: patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy") : "",
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
        notes: patient.notes || '',
      }

      form.reset(formData)
      if (!isFormReady) {
        setIsFormReady(true)
      }
    }
  }, [patient, form, isFormReady])

  // Audio transcription effect for notes
  useEffect(() => {
    const output = notesTranscriber.output
    if (output && !output.isBusy && output.text) {
      form.setValue(
        'notes',
        (form.getValues('notes') ? form.getValues('notes') + "\n" : "") + output.text
      )
      setAudioModalOpen(null)
    }
  }, [notesTranscriber.output?.isBusy, form])

  async function onSubmit(data: PatientFormValues) {
    setIsPending(true)
    try {
      const patientData = {
        ...data,
        companyId,
        dateOfBirth: data.dateOfBirth ? new Date(
          +data.dateOfBirth.split('/')[2],
          +data.dateOfBirth.split('/')[1] - 1,
          +data.dateOfBirth.split('/')[0]
        ).toISOString() : "",
      }

      await updatePatientMutation.mutateAsync({
        id: patientId,
        ...patientData
      })

      toast({
        title: "Patient Updated",
        description: "Patient information has been updated successfully",
        variant: "success",
      })

      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update patient. Please try again.",
        variant: "error",
      })
    } finally {
      setIsPending(false)
    }
  }

  if (isLoading) {
    return <div className="p-4">Loading patient details...</div>
  }

  if (!patient) {
    return <div className="p-4">Patient not found</div>
  }

  // Don't render the form until it's ready with data
  if (!isFormReady) {
    return <div className="p-4">Preparing form...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 border p-4 rounded-md h-[calc(100vh-10rem)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Pet name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="species"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Species*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    defaultValue={field.value || ''}
                  >
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
              )}
            />

            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Breed*</FormLabel>
                  <FormControl>
                    <Input placeholder="Primary Breed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondaryBreed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Breed</FormLabel>
                  <FormControl>
                    <Input placeholder="Secondary breed (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color*</FormLabel>
                  <FormControl>
                    <Input placeholder="Color" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    defaultValue={field.value || ''}
                  >
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
              )}
            />

            <FormField
              control={form.control}
              name="isNeutered"
              render={({ field }) => (
                <FormItem className="flex h-fit flex-row items-end space-x-2 space-y-0 mt-8">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Neutered/Spayed</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth*</FormLabel>
                  <FormControl>
                    <DatePicker
                      selected={field.value ? new Date(
                        +field.value.split('/')[2],
                        +field.value.split('/')[1] - 1,
                        +field.value.split('/')[0]
                      ) : null}
                      onChange={(date: Date | null) => {
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
                      placeholderText="dd/mm/yyyy"
                      dateFormat="dd/MM/yyyy"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="microchipNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Microchip Number*</FormLabel>
                  <FormControl>
                    <Input placeholder="Microchip number" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Registration number (optional)" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="insuranceProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Provider</FormLabel>
                  <FormControl>
                    <Input placeholder="Insurance provider (optional)" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="insurancePolicyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Policy Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Policy number (optional)" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Notes Section */}
          <div className="col-span-2">
            <div className="flex justify-between items-center">
              <FormLabel>Notes</FormLabel>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAudioModalOpen("notes")}
                title="Record voice note"
                disabled={notesTranscriber.output?.isBusy}
                className="h-8 w-8"
              >
                {notesTranscriber.output?.isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes (optional)"
                      className="min-h-[150px]"
                      {...field}
                      value={field.value || ""}
                    />
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
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm w-48">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="theme-button text-white"
          >
            {isPending ? "Updating..." : "Update Pet"}
          </Button>
        </div>
      </form>

      <AudioManager
        open={audioModalOpen === 'notes'}
        onClose={() => setAudioModalOpen(null)}
        transcriber={notesTranscriber}
        onTranscriptionComplete={() => setAudioModalOpen(null)}
      />
    </Form>
  )
}