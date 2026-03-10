"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/datePicker"
import { useCreateAppointment } from "@/queries/appointment"
import { useToast } from "@/hooks/use-toast"
import { useGetClinic } from "@/queries/clinic/get-clinic"
import { useGetLocation } from '@/hooks/useGetLocation'
import { NearestClinicMap } from './index';
import type { Clinic } from '../clinic';
import { useGetUsers } from "@/queries/users/get-users"
import { useGetAvailableSlotsByUserId, AvailableSlot } from "@/queries/users/get-availabelSlots-by-userId"
import { useGetRole } from "@/queries/roles/get-role";
import { Loader2, Video } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useGetAppointmentType } from '@/queries/appointmentType/get-appointmentType';
import { getSubdomain } from '@/utils/subdomain';
import { useGetCompanyBySubdomain } from '@/queries/companies/get-company-by-subdomain';
import { useCreateNotification } from '@/queries/notifications/create-notification';

// Define the form schema
const appointmentSchema = z.object({
  clinicId: z.string().uuid("Please select a clinic"),
  patientId: z.string().uuid("Please select a patient"),
  veterinarianId: z.string().uuid("Please select a veterinarian"),
  appointmentTypeId: z.string().min(1, "Please select an appointment type"),
  appointmentDate: z.date()
    .refine(date => !!date, "Please select an appointment date")
    .refine(date => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, "Appointment date cannot be in the past"),
  slotId: z.string().min(1, "Please select a time slot"),
  reason: z.string().min(1, "Please provide a reason for the appointment"),
  notes: z.string().optional(),
  isVideoCall: z.boolean().optional(),
})

type AppointmentFormValues = z.infer<typeof appointmentSchema>

interface PatientAppointmentFormProps {
  isOpen: boolean
  onClose: (wasSuccess?: boolean) => void
  clientId: string
  patients: any[]
  initialClinicId?: string;
  initialPatientId?: string;
  initialDate?: Date;
  initialAppointmentTypeId?: string;
}

export default function PatientAppointmentForm({ isOpen, onClose, clientId, patients, initialClinicId, initialPatientId, initialDate, initialAppointmentTypeId }: PatientAppointmentFormProps) {
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)
  const { latitude, longitude, address, isLoading, error, refetch } = useGetLocation()
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clinicId: "",
      patientId: "",
      veterinarianId: "",
      appointmentTypeId: "",
      appointmentDate: undefined,
      slotId: "",
      reason: "",
      notes: "",
      isVideoCall: false,
    },
  })

  useEffect(() => {
    setIsClient(true)
    setSubdomain(getSubdomain());
  }, [])

  const { data: companyData } = useGetCompanyBySubdomain(
    subdomain || ''
  );
  const companyId = companyData?.id;

  // Fetch clinics
  const { data: clinicsData } = useGetClinic(1, 100, companyId || null, Boolean(isClient && latitude && longitude && typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude) && companyId));
  const clinicOptions = (clinicsData?.items || []).map(clinic => ({
    value: clinic.id,
    label: clinic.name
  }));

  useEffect(() => {
    if (!isOpen || !clinicOptions.length) return;
    console.log('[ClinicPrefill] initialClinicId:', initialClinicId, 'clinicOptions:', clinicOptions, 'current:', form.getValues('clinicId'));
    // Try explicit match
    if (initialClinicId && clinicOptions.some(opt => opt.value === initialClinicId)) {
      if (form.getValues('clinicId') !== initialClinicId) {
        form.setValue('clinicId', initialClinicId);
      }
      return;
    }
    // If only one clinic in options, auto-select it if not set
    if (!form.getValues('clinicId') && clinicOptions.length === 1) {
      form.setValue('clinicId', clinicOptions[0].value);
    }
  }, [isOpen, initialClinicId, clinicOptions, form]);

  useEffect(() => {
    if (isOpen && initialPatientId) {
      form.setValue('patientId', initialPatientId);
    }
    if (isOpen && initialDate) {
      form.setValue('appointmentDate', initialDate);
    }
    if (isOpen && initialAppointmentTypeId) {
      form.setValue('appointmentTypeId', initialAppointmentTypeId);
    }
  }, [isOpen, initialPatientId, initialDate, initialAppointmentTypeId, form]);

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

  useEffect(() => {
    if(isClient && !latitude && !longitude){
      refetch()
    }
  }, [latitude, longitude, isClient]) 

  // Get selected veterinarian ID and date for slots
  const selectedClinicId = form.watch("clinicId");
  const selectedVeterinarianId = form.watch("veterinarianId");
  const selectedDate = form.watch("appointmentDate");

  // Format selected date to YYYY-MM-DD for API filtering
  // Use local date methods to ensure the date stays in the user's timezone
  const formattedDate = selectedDate ? 
    `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : 
    '';

  // Fetch available slots for the selected veterinarian
  const {
    data: availableSlots = [],
    isLoading: isLoadingSlots
  } = useGetAvailableSlotsByUserId(
    selectedVeterinarianId || '',
    selectedClinicId || '',
    formattedDate || undefined,
    Boolean(isClient && selectedVeterinarianId && selectedClinicId && formattedDate && typeof selectedVeterinarianId === 'string' && selectedVeterinarianId.length > 0 && typeof selectedClinicId === 'string' && selectedClinicId.length > 0 && typeof formattedDate === 'string' && formattedDate.length > 0)
  );

  // Fetch veterinarians for the selected clinic
  const { data: usersResponse = { items: [] } } = useGetUsers(
    1,
    100,
    '',
    Boolean(isClient && selectedClinicId && veterinarianRoleId), // enabled
    companyId || '', // companyId
    selectedClinicId ? [selectedClinicId] : [], // clinicIds
    veterinarianRoleId ? [veterinarianRoleId] : [] // roleIds
  );
  const veterinarianOptions = useMemo(() => {
      const items = usersResponse.items ?? [];
      return items
        .filter(u => u.roleName === "Veterinarian")
        .filter(u => {
          const clinics = (u as any).clinics as { clinicId: string }[] | undefined;
          const clinicIds = (u as any).clinicIds as string[] | undefined;
          const ids = clinicIds ?? (clinics ? clinics.map((c: { clinicId: string }) => c.clinicId) : []);
          return selectedClinicId ? ids.includes(selectedClinicId) : true;
        })
        .map(u => ({
          value: u.id,
          label: `Dr. ${u.firstName} ${u.lastName}`,
        }));
  }, [usersResponse.items, selectedClinicId]);

  // Fetch appointment types
  const { data: appointmentTypes = [], isLoading: isLoadingAppointmentTypes } = useGetAppointmentType(1, 100, '', Boolean(isClient));

  // Create patient options from provided patients
  const patientOptions = patients.map(patient => ({
    value: patient.id,
    label: patient.name
  }))

  const { mutate: createNotification } = useCreateNotification();
  const lastSubmittedDataRef = React.useRef<AppointmentFormValues | null>(null);

  const { mutate: createAppointment, isPending } = useCreateAppointment({
    onSuccess: () => {
      const submittedData = lastSubmittedDataRef.current;

      // If this was a video call appointment, notify the assigned vet
      if (submittedData?.isVideoCall && submittedData?.veterinarianId) {
        const selectedPatient = patients.find(p => p.id === submittedData.patientId);
        const patientName = selectedPatient?.name || "a patient";

        createNotification({
          userId: submittedData.veterinarianId,
          type: 'video_call_appointment',
          title: 'New Video Call Appointment',
          message: `A video call consultation has been requested for ${patientName}. Please check your upcoming appointments.`,
          data: JSON.stringify({
            patientId: submittedData.patientId,
            veterinarianId: submittedData.veterinarianId,
            isVideoCall: true,
          }),
        });
      }

      toast({
        title: "Appointment Requested",
        description: submittedData?.isVideoCall
          ? "Your video call appointment request has been submitted. The veterinarian has been notified."
          : "Your appointment request has been submitted successfully",
        variant: "success",
      })
      form.reset()
      setSelectedSlot(null)
      lastSubmittedDataRef.current = null;
      onClose(true)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit appointment request",
        variant: "destructive",
      })
      lastSubmittedDataRef.current = null;
      onClose(false)
    }
  })

  // Format time for display (assuming HH:mm:ss format from API)
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // If time is already in HH:MM format, return as is
    if (timeString.length <= 5) return timeString;
    
    // Try to parse and format to HH:MM
    try {
      // Handle ISO format (2023-06-01T11:00:00)
      if (timeString.includes('T')) {
        return timeString.split('T')[1].substring(0, 5);
      }
      
      // Handle HH:MM:SS format
      if (timeString.includes(':')) {
        const timeParts = timeString.split(':');
        return `${timeParts[0]}:${timeParts[1]}`;
      }
      
      return timeString;
    } catch (e) {
      return timeString;
    }
  };

  const handleSlotClick = (slotId: string) => {
    setSelectedSlot(slotId);
    form.setValue("slotId", slotId);
  };

  const onSubmit = (data: AppointmentFormValues) => {
    try {
      if (!data.appointmentDate) {
        throw new Error("Appointment date is required")
      }

      // Format date using local date methods to maintain consistency
      const formattedAppointmentDate = `${data.appointmentDate.getFullYear()}-${String(data.appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(data.appointmentDate.getDate()).padStart(2, '0')}`;

      // Find selected slot details
      const selectedSlotDetails = availableSlots.find(slot => slot.id === data.slotId);
      
      if (!selectedSlotDetails) {
        toast({
          title: "Error",
          description: "Selected slot information not found",
          variant: "destructive",
        });
        return;
      }

      const formattedData = {
        ...data,
        clientId,
        appointmentDate: formattedAppointmentDate,
        appointmentTimeFrom: selectedSlotDetails.startTime,
        appointmentTimeTo: selectedSlotDetails.endTime,
        roomSlotId: data.slotId, // For backward compatibility
        status: "requested", // Set status to requested for client-submitted appointments
        isRegistered: true, // Set isRegistered to true as requested
        isActive: true,
        isVideoCall: data.isVideoCall || false,
      }

      lastSubmittedDataRef.current = data;
      createAppointment(formattedData)
    } catch (error) {
      console.error("Error submitting form:", error)
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      }
    }
  }

  // Set default appointment date to today when component mounts
  useEffect(() => {
    form.setValue("appointmentDate", new Date())
  }, [form])

  // Handler to select a clinic from the map
  const handleClinicSelect = (clinic: Clinic) => {
    form.setValue('clinicId', clinic.id);
  };

  // Reset veterinarian and slot when clinic changes
  useEffect(() => {
    if (selectedClinicId) {
      form.setValue('veterinarianId', '');
      form.setValue('slotId', '');
      setSelectedSlot(null);
    }
  }, [selectedClinicId, form]);

  // Reset slot when veterinarian or date changes
  useEffect(() => {
    if (selectedVeterinarianId || selectedDate) {
      form.setValue('slotId', '');
      setSelectedSlot(null);
    }
  }, [selectedVeterinarianId, selectedDate, form]);

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose(false)}>
      <SheetContent className="w-full sm:max-w-3xl md:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Request New Appointment</SheetTitle>
        </SheetHeader>

        {/* Responsive two-column layout: form left, map right */}
        <div className="flex flex-col md:flex-row gap-8 mt-4">
          {/* Left: Form */}
          <div className="flex-1 min-w-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic</FormLabel>
                      <FormControl>
                        <Combobox
                          options={clinicOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select clinic"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <FormControl>
                        <Combobox
                          options={patientOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select patient"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="veterinarianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinarian</FormLabel>
                      <FormControl>
                        <Combobox
                          options={veterinarianOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={selectedClinicId ? "Select veterinarian" : "Select a clinic first"}
                        />
                      </FormControl>
                      {selectedClinicId && veterinarianOptions.length === 0 && (
                        <p className="text-sm text-muted-foreground">No veterinarians available at this clinic</p>
                      )}
                      {!selectedClinicId && (
                        <p className="text-sm text-muted-foreground">Please select a clinic first</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => {
                    // Set minDate to start of today (midnight)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    return (
                      <FormItem>
                        <FormLabel>Preferred Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            minDate={today}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* Appointment Type Selection */}
                <FormField
                  control={form.control}
                  name="appointmentTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Type</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {isLoadingAppointmentTypes ? (
                            <div className="text-sm text-gray-500">Loading appointment types...</div>
                          ) : appointmentTypes.length === 0 ? (
                            <div className="text-sm text-gray-500">No appointment types available</div>
                          ) : (
                            appointmentTypes.filter((type: any) => type.isActive).map((type: any) => (
                              <button
                                key={type.appointmentTypeId}
                                type="button"
                                onClick={() => field.onChange(type.appointmentTypeId)}
                                className={`rounded-full px-4 py-1 text-sm border transition-colors font-medium
                                  ${field.value === type.appointmentTypeId
                                    ? 'bg-green-100 border-green-300 text-green-800'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
                                `}
                              >
                                {type.name}
                              </button>
                            ))
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Available Slots section */}
                {selectedVeterinarianId && selectedDate && (
                  <FormField
                    control={form.control}
                    name="slotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Time Slots</FormLabel>
                        <FormControl>
                          <div className="mt-2">
                            {isLoadingSlots ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading available slots...
                              </div>
                            ) : availableSlots.length === 0 ? (
                              <div className="text-sm text-gray-500">
                                No available slots for this veterinarian on the selected date
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {availableSlots.map((slot) => (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => handleSlotClick(slot.id)}
                                    className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                                      selectedSlot === slot.id
                                        ? 'bg-green-100 border-green-300 text-green-800'
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                    title={`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`}
                                  >
                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                  </button>
                                ))}
                              </div>
                            )}
                            <input type="hidden" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Visit</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Please describe the reason for your appointment request"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any additional information you'd like to provide"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Video Call Consultation Toggle */}
                <FormField
                  control={form.control}
                  name="isVideoCall"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/30 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/40">
                            <Video className="h-5 w-5 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                          </div>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">
                              Video Call Consultation
                            </FormLabel>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Join this appointment via video call instead of in-person visit
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-[#1E3D3D]"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />

                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => onClose(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="theme-button text-white"
                    disabled={isPending || !selectedSlot}
                  >
                    {isPending ? "Submitting..." : "Request Appointment"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>

          {/* Right: Map */}
          <div className="md:w-[420px] w-full max-w-full">
            <div className="font-semibold text-base mb-2 text-gray-700">Clinics Near You</div>
            <NearestClinicMap onClinicSelect={handleClinicSelect} companyId={companyId || undefined} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 