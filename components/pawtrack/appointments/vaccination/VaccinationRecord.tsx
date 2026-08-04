"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/datePicker"
import { Combobox } from "@/components/ui/combobox"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useGetVaccinationMasters } from "@/queries/vaccinationMaster/get-vaccinationMaster"
import { CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import {
  VaccinationDetailRequest,
  useCreateVaccinationDetail
} from "@/queries/vaccinationDetail/create-vaccinationDetail"
import { useGetUsers } from "@/queries/users/get-users"
import { useRootContext } from "@/context/RootContext"
import { useToast } from "@/hooks/use-toast"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import { useGetRole } from "@/queries/roles/get-role";

interface Vaccination {
  id: string;
  species: string;
  disease: string;
  vaccineType: string;
  initialDose: string;
  booster: string;
  revaccinationInterval: string;
  notes: string;
}

interface VaccinationRecordProps {
  patientId: string;
  appointmentId: string;
  species: string;
  selectedVaccines?: string[];
  onBack: () => void;
  onSubmit: (success: boolean) => void; // Changed to pass success status instead of data
}

// Form schema
const vaccinationRecordSchema = z.object({
  vaccineId: z.string({
    required_error: "Please select a vaccine",
  }),
  dateGiven: z.string({
    required_error: "Date given is required",
  }).refine((dateString) => {
    const [day, month, year] = dateString.split('/').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return !isNaN(parsedDate.getTime());
  }, "Invalid date format, expected DD/MM/YYYY"),
  nextDueDate: z.string({
    required_error: "Next due date is required",
  }).refine((dateString) => {
    const [day, month, year] = dateString.split('/').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return !isNaN(parsedDate.getTime());
  }, "Invalid date format, expected DD/MM/YYYY"),
  batchNumber: z.string({
    required_error: "Batch number is required",
  }),
  veterinarian: z.string({
    required_error: "Veterinarian name is required",
  }),
  adverseReactions: z.string().optional(),
});

type VaccinationRecordFormValues = z.infer<typeof vaccinationRecordSchema>;

export default function VaccinationRecord({
  patientId,
  appointmentId,
  species,
  selectedVaccines = [],
  onBack,
  onSubmit: onSubmitProp
}: VaccinationRecordProps) {

  // State to track current step (vaccine being recorded)
  const [currentStep, setCurrentStep] = useState(0);
  // State to store form values for each vaccine
  const [formValues, setFormValues] = useState<Record<string, VaccinationRecordFormValues>>({});

  // Convert species to lowercase for API call
  const speciesLowerCase = species.toLowerCase();

  // Get vaccinations for dropdown
  const { data: vaccinations = [], isLoading } = useGetVaccinationMasters({
    species: speciesLowerCase
  });

  // Filter vaccinations to only show selected ones if any were selected in previous step
  const filteredVaccinations = selectedVaccines.length > 0
    ? vaccinations.filter((v: Vaccination) => selectedVaccines.includes(v.id))
    : vaccinations;

  const vaccineMasters = filteredVaccinations.map((vaccine: Vaccination) => ({
    id: vaccine.id,
    name: vaccine.disease,
    type: vaccine.vaccineType,
  }));

  const isLastStep = currentStep === vaccineMasters.length - 1;
  const currentVaccine = vaccineMasters[currentStep];

  // Get clinic context
  const { clinic } = useRootContext();

  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null);

  const { data: rolesData } = useGetRole();

  useEffect(() => {
    if (rolesData?.data) {
      const vetRole = rolesData.data.find(
        (role: any) => role.name.toLowerCase() === 'veterinarian'
      );
      if (vetRole) {
        setVeterinarianRoleId(vetRole.id);
      }
    }
  }, [rolesData]);

  // Fetch veterinarians (users with role "Veterinarian")
  const { data: usersResponse = { items: [] } } = useGetUsers(
    1,
    100,
    '',
    !!clinic?.id && !!veterinarianRoleId, // enabled
    '',
    clinic?.id ? [clinic.id] : [], // clinicIds
    veterinarianRoleId ? [veterinarianRoleId] : [] // roleIds
  );

  // Filter and format veterinarians for dropdown
  const veterinarianOptions = usersResponse.items
    .filter(user => user.roleName === "Veterinarian")
    .map(vet => ({
      value: vet.id,
      label: `Dr. ${vet.firstName} ${vet.lastName}`
    }));

  // Form
  const form = useForm<VaccinationRecordFormValues>({
    resolver: zodResolver(vaccinationRecordSchema),
    defaultValues: {
      vaccineId: currentVaccine?.id || "",
      batchNumber: "",
      veterinarian: "",
      adverseReactions: "",
      dateGiven: "", // Initialize as empty string
      nextDueDate: "", // Initialize as empty string
    },
  });

  // Update vaccineId value when currentStep changes
  useEffect(() => {
    if (currentVaccine?.id) {
      form.setValue("vaccineId", currentVaccine.id);
    }
  }, [currentStep, currentVaccine, form]);

  // Handle navigation between steps
  const goToNextStep = (data: VaccinationRecordFormValues) => {
    // Save the current form data
    setFormValues(prev => ({
      ...prev,
      [currentVaccine.id]: data
    }));

    // Move to the next step if not the last
    if (currentStep < vaccineMasters.length - 1) {
      setCurrentStep(currentStep + 1);
      // Pre-set the vaccineId for the next form
      form.setValue("vaccineId", vaccineMasters[currentStep + 1].id);
      // Reset other fields
      form.setValue("batchNumber", "");
      form.setValue("adverseReactions", "");
      // Keep veterinarian field value for convenience
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Restore previously saved values
      const prevVaccine = vaccineMasters[currentStep - 1];
      const prevValues = formValues[prevVaccine.id];

      if (prevValues) {
        form.setValue("vaccineId", prevValues.vaccineId);
        form.setValue("dateGiven", prevValues.dateGiven);
        form.setValue("nextDueDate", prevValues.nextDueDate);
        form.setValue("batchNumber", prevValues.batchNumber);
        form.setValue("veterinarian", prevValues.veterinarian);
        form.setValue("adverseReactions", prevValues.adverseReactions || "");
      } else {
        // Set just the vaccine ID
        form.setValue("vaccineId", currentVaccine.id);
        form.setValue("dateGiven", ""); // Clear date fields
        form.setValue("nextDueDate", ""); // Clear date fields
      }
    }
  };

  // Fetch the visit associated with this appointment
  const { data: visitData } = useGetVisitByAppointmentId(appointmentId);

  // Add toast
  const { toast } = useToast();

  // Add mutations
  const createVaccinationDetail = useCreateVaccinationDetail();
  const updateAppointment = useUpdateAppointment({
    onSuccess: () => {
      console.log("Appointment status updated to completed");
    },
    onError: (error) => {
      console.error("Failed to update appointment status:", error);
    }
  });

  // Final submit handler
  const handleFinalSubmit = (data: VaccinationRecordFormValues) => {
    // Check if we have visit data
    if (!visitData || !visitData.id) {
      toast({
        title: "Error",
        description: "Could not find visit data for this appointment",
        variant: "destructive",
      });
      return;
    }

    // Save the last form data
    const allFormValues = {
      ...formValues,
      [currentVaccine.id]: data
    };

    // Convert to array format for the API
    const allFormsArray: VaccinationRecordFormValues[] = Object.values(allFormValues);

    // Prepare the data in the format expected by the API
    const batchSubmission: VaccinationDetailRequest = {
      visitId: visitData.id,
      // Aggregate any notes/adverse reactions across records if present; fallback to empty string
      notes: allFormsArray.map(r => r.adverseReactions).filter(Boolean).join("; ") || "",
      isCompleted: true,
      vaccinationMasterIds: allFormsArray.map(record => record.vaccineId),

      // Convert DD/MM/YYYY strings to ISO strings for API
      dateGiven: allFormsArray[0].dateGiven ? new Date(
        parseInt(allFormsArray[0].dateGiven.split('/')[2]),
        parseInt(allFormsArray[0].dateGiven.split('/')[1]) - 1,
        parseInt(allFormsArray[0].dateGiven.split('/')[0])
      ).toISOString() : "",
      nextDueDate: allFormsArray[0].nextDueDate ? new Date(
        parseInt(allFormsArray[0].nextDueDate.split('/')[2]),
        parseInt(allFormsArray[0].nextDueDate.split('/')[1]) - 1,
        parseInt(allFormsArray[0].nextDueDate.split('/')[0])
      ).toISOString() : "",
    };

    console.log("Submitting vaccination records:", batchSubmission);

    // Call the mutation directly
    createVaccinationDetail.mutate(batchSubmission, {
      onSuccess: () => {
        // Update the appointment status to completed
        updateAppointment.mutate({
          id: appointmentId,
          data: {
            id: appointmentId,
            status: "completed"
          }
        });

        toast({
          title: "Success",
          description: "Vaccination records added successfully",
        });
        // Notify parent component of success and close
        onSubmitProp(true);
      },
      onError: (error) => {
        console.error("Error saving vaccination records:", error);
        toast({
          title: "Error",
          description: "Failed to add vaccination records",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Vaccination Record</h2>
        <p className="text-gray-600">Complete vaccination documentation</p>
      </div>

      {selectedVaccines.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <h3 className="text-lg font-medium">No Vaccinations Selected</h3>
            <p className="text-gray-600 max-w-md">
              Please go back and select at least one vaccination before proceeding to record keeping.
            </p>
            <Button
              onClick={onBack}
              className="mt-4"
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Vaccination Selection
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Vaccination Cards Progress */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {vaccineMasters.map((vaccine, index) => (
                <div
                  key={vaccine.id}
                  className={`flex-shrink-0 px-4 py-2 rounded-md cursor-pointer ${index === currentStep
                      ? "bg-black text-white"
                      : index < currentStep
                        ? "bg-gray-200 text-gray-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  onClick={() => {
                    // Only allow navigation to steps that have been completed or current
                    if (index <= currentStep) {
                      setCurrentStep(index);

                      // Restore saved values if available
                      const savedValues = formValues[vaccine.id];
                      if (savedValues) {
                        form.setValue("vaccineId", savedValues.vaccineId);
                        form.setValue("dateGiven", savedValues.dateGiven);
                        form.setValue("nextDueDate", savedValues.nextDueDate);
                        form.setValue("batchNumber", savedValues.batchNumber);
                        form.setValue("veterinarian", savedValues.veterinarian);
                        form.setValue("adverseReactions", savedValues.adverseReactions || "");
                      } else {
                        // Set just the vaccine ID
                        form.setValue("vaccineId", vaccine.id);
                      }
                    }
                  }}
                >
                  {index < currentStep && (
                    <CheckCircle2 className="inline-block h-4 w-4 mr-1" />
                  )}
                  {vaccine.name}
                </div>
              ))}
            </div>
          </div>

          {/* Current Vaccine Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">
                {currentVaccine?.name} ({currentVaccine?.type})
              </h3>
              <p className="text-sm text-gray-500">
                Step {currentStep + 1} of {vaccineMasters.length}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(isLastStep ? handleFinalSubmit : goToNextStep)} className="space-y-6">
                {/* Replace the problematic input */}
                <FormField
                  control={form.control}
                  name="vaccineId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input
                          type="hidden"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="dateGiven"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date Given *</FormLabel>
                        <DatePicker
                          value={field.value ? new Date(parseInt(field.value.split('/')[2]), parseInt(field.value.split('/')[1]) - 1, parseInt(field.value.split('/')[0])) : null}
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
                          className="w-full"
                          inputFormat="dd/MM/yyyy"
                          autoFormatTyping={true}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextDueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Next Due Date *</FormLabel>
                        <DatePicker
                          value={field.value ? new Date(parseInt(field.value.split('/')[2]), parseInt(field.value.split('/')[1]) - 1, parseInt(field.value.split('/')[0])) : null}
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
                          className="w-full"
                          inputFormat="dd/MM/yyyy"
                          autoFormatTyping={true}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter batch number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="veterinarian"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Veterinarian *</FormLabel>
                        <FormControl>
                          <Combobox
                            placeholder="Select veterinarian"
                            options={veterinarianOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adverseReactions"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Adverse Reactions (if any)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Note any adverse reactions or side effects"
                            rows={4}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={currentStep === 0 ? onBack : goToPreviousStep}
                    className="px-5"
                  >
                    {currentStep === 0 ? "Back to Selection" : (
                      <>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </>
                    )}
                  </Button>

                  <Button
                    type="submit"
                    className={isLastStep ? "bg-black hover:bg-gray-800 text-white px-5" : "bg-gray-500 hover:bg-gray-600 text-white px-5"}
                  >
                    {isLastStep ? "Add Vaccination Record and Checkout" : (
                      <>
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </>
      )}
    </div>
  );
} 