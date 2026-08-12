"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Mic, Sparkles, X, Search } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/datePicker"
import { DatePickerWithRangeV2 } from "@/components/ui/custom/date/date-picker-with-range"
import type { DateRange } from "react-day-picker"
import { useToast } from "@/hooks/use-toast"

import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import { useGetClinic } from "@/queries/clinic/get-clinic"
import { useGetPatients } from "@/queries/patients/get-patients"
import { useGetClients, Client } from "@/queries/clients/get-client"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetUsers } from "@/queries/users/get-users"
import { useGetRole } from "@/queries/roles/get-role";
import { useGetRoom } from "@/queries/rooms/get-room"
import { useGetAppointmentType } from "@/queries/appointmentType/get-appointmentType"
import { useGetAvailableSlotsByUserId } from "@/queries/users/get-availabelSlots-by-userId"
import { useSearchPatients } from "@/queries/patients/get-patients-by-search"
import { useDebounce } from "@/hooks/use-debounce"
import { AudioManager } from "@/components/audioTranscriber/AudioManager"
import { useTranscriber } from "@/components/audioTranscriber/hooks/useTranscriber"
import { reasonFormatting, notesFormatting } from "@/app/actions/reasonformatting";

// Schema mirrors appointment-details edit form
const appointmentSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  clientId: z.string().uuid(),
  veterinarianId: z.string().uuid(),
  roomId: z.string().uuid(),
  appointmentDate: z.string(),
  SlotId: z.string().optional(),
  appointmentTypeId: z.string(),
  reason: z.string(),
  status: z.string(),
  notes: z.string().optional(),
  createdBy: z.string().uuid().nullable().optional(),
})

interface SearchPatientResult {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  patientId?: string;
  species?: string;
  clientId?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhonePrimary?: string;
  client?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  }
}

type AppointmentFormValues = z.infer<typeof appointmentSchema>

interface ApproveAppointmentProps {
  appointmentId: string
  onClose: () => void
}

export default function ApproveAppointment({ appointmentId, onClose }: ApproveAppointmentProps) {
  const { toast } = useToast()
  const { data: appointment, isLoading } = useGetAppointmentById(appointmentId)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("")
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string, clientId?: string } | null>(null)
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null)

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clinicId: "",
      patientId: "",
      clientId: "",
      veterinarianId: "",
      roomId: "",
      appointmentDate: "",
      SlotId: "",
      appointmentTypeId: "",
      reason: "",
      status: "scheduled",
      notes: "",
      createdBy: ""
    }
  })

  // Watch values used for dependent queries
  const selectedClinicId = form.watch("clinicId")
  const selectedVeterinarianId = form.watch("veterinarianId")
  const selectedDate = form.watch("appointmentDate")

  const { user } = useRootContext()
  const companyId = (typeof window !== 'undefined' && getCompanyId()) || user?.companyId || '' // Moved declaration here
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

  // Fetch patients by search query
  const { data: searchResults = [], isLoading: isSearching } = useSearchPatients(
    patientSearchQuery,
    "name", // Always search by name
    companyId
  )

  // Cast the search results to our custom interface
  const typedSearchResults = searchResults as SearchPatientResult[];

  // Options data
  const { data: clinicsResponse } = useGetClinic(1, 100, companyId, true)
  const { data: patientsResponse } = useGetPatients(1, 100, '', '', companyId) // Fetch patients by companyId
  const { data: clientsResponse } = useGetClients(1, 100, '', 'first_name', companyId)
  const { data: usersResponse } = useGetUsers(
    1,
    100,
    '',
    !!selectedClinicId && !!veterinarianRoleId, // enabled: Only fetch if clinicId and veterinarianRoleId are available
    companyId, // companyId
    selectedClinicId ? [selectedClinicId] : [], // clinicIds: Pass as an array
    veterinarianRoleId ? [veterinarianRoleId] : [] // roleIds: Pass as an array
  )
  const { data: roomsResponse } = useGetRoom(1, 100, '', selectedClinicId)
  const { data: appointmentTypes = [] } = useGetAppointmentType(1, 100, selectedClinicId, true)

  // Slots for the chosen veterinarian/date
  const { data: availableSlots = [], isLoading: isLoadingSlots } = useGetAvailableSlotsByUserId(
    selectedVeterinarianId,
    selectedClinicId,
    selectedDate,
    !!selectedVeterinarianId && !!selectedClinicId && !!selectedDate
  )

  // Merge available slots with the originally selected slot so it's always visible
  const mergedSlots = useMemo(() => {
    const originalSlotId = (appointment as any)?.SlotId || (appointment as any)?.slotId
    const originalStart = (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime
    const originalEnd = (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime

    let slots: any[] = [...(availableSlots as any[])]

    if (originalSlotId || (originalStart && originalEnd)) {
      const byId = originalSlotId ? slots.find((s) => s.id === originalSlotId) : null
      const byTime = (!byId && originalStart && originalEnd)
        ? slots.find(
            (s) => s.startTime?.slice(0,5) === String(originalStart).slice(0,5) &&
                   s.endTime?.slice(0,5) === String(originalEnd).slice(0,5)
          )
        : null

      if (byId) {
        slots = slots.map((slot) => slot.id === (byId as any).id ? { ...slot, isOriginalAppointment: true } : slot)
      } else if (byTime) {
        slots = slots.map((slot) => slot.id === (byTime as any).id ? { ...slot, isOriginalAppointment: true } : slot)
      } else if (originalStart && originalEnd) {
        slots = [
          ...slots,
          {
            id: originalSlotId || `original-${appointment?.id || 'appointment'}`,
            startTime: originalStart,
            endTime: originalEnd,
            isOriginalAppointment: true,
            isInjected: true,
          },
        ]
      }
    }

    return slots
  }, [availableSlots, appointment, selectedDate, selectedVeterinarianId])

  // Auto-select a slot by time if no SlotId is set but an original time exists
  useEffect(() => {
    const currentSlotId = form.getValues("SlotId");
    if (currentSlotId) return;
    const currentStart = (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime;
    const currentEnd = (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime;
    if (!currentStart || !currentEnd || !(availableSlots as any[])?.length) return;
    const match = (availableSlots as any[]).find(
      (s) => s.startTime?.slice(0,5) === String(currentStart).slice(0,5) && s.endTime?.slice(0,5) === String(currentEnd).slice(0,5)
    );
    if (match) {
      form.setValue("SlotId" as any, match.id as any);
      setSelectedSlot(match.id);
    }
  }, [availableSlots, appointment]);

  // Options data (re-introduced for Comboboxes)
  const clinicOptions = useMemo(() => {
    return (clinicsResponse?.items || []).map(c => ({ value: c.id, label: c.name }))
  }, [clinicsResponse?.items]);

  const clientOptions = useMemo(() => {
    return (clientsResponse?.items || []).filter(c => c.isActive).map((c: Client) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))
  }, [clientsResponse?.items]);

  const veterinarianOptions = useMemo(() => {
    return (usersResponse?.items || []).filter((u: any) => u.roleName === 'Veterinarian').map((u: any) => ({ value: u.id, label: `Dr. ${u.firstName} ${u.lastName}` }))
  }, [usersResponse?.items]);

  const roomOptions = useMemo(() => {
    return (roomsResponse?.items || []).filter((r: any) => r.isActive).map((r: any) => ({ value: r.id, label: r.name }))
  }, [roomsResponse?.items]);

  const appointmentTypeOptions = useMemo(() => {
    return (appointmentTypes || []).filter((t: any) => t.isActive).map((t: any) => ({ value: t.appointmentTypeId, label: t.name }))
  }, [appointmentTypes]);

  // When appointment loads, prefill the form
  useEffect(() => {
    if (!appointment) return
    const slotId = (appointment as any).SlotId || (appointment as any).slotId || ""

    form.reset({
      ...appointment,
      appointmentDate: appointment.appointmentDate.split('T')[0],
      SlotId: slotId as any,
      status: appointment.status || 'scheduled'
    } as any)

    setSelectedSlot(slotId)

    // Set the selected patient based on the fetched appointment data
    if (appointment.patient) {
      setSelectedPatient({
        id: appointment.patientId,
        name: appointment.patient.name,
        clientId: appointment.clientId // Ensure clientId is set from appointment
      });
      setPatientSearchQuery(appointment.patient.name);
    }
    // Also ensure clientId is set in the form directly from appointment
    form.setValue("clientId", appointment.clientId || "");
  }, [appointment, form])

  // Approve submit
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({ title: "Appointment Approved", description: "Request approved and scheduled.", variant: "success" })
      onClose()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to approve appointment", variant: "error" })
    }
  })

  const handleSlotClick = (slot: { id: string; startTime: string; endTime: string }) => {
    setSelectedSlot(slot.id)
    form.setValue("SlotId" as any, slot.id as any)
  }

  const formatTime = (t?: string) => {
    if (!t) return ''
    if (t.includes('T')) return t.split('T')[1].substring(0, 5)
    const parts = t.split(':')
    return `${parts[0]}:${parts[1]}`
  }

  // Helper to create a local Date object from a YYYY-MM-DD string
  const createLocalDateFromYYYYMMDD = (dateString: string | undefined): Date | undefined => {
    if (!dateString) return undefined;
    const [year, month, day] = dateString.split('-').map(Number);
    // Month is 0-indexed in Date constructor
    return new Date(year, month - 1, day);
  };

  // Helper to format a Date object to YYYY-MM-DD string
  const formatDateToYYYYMMDD = (date: Date | null | undefined): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onSubmit = (data: AppointmentFormValues) => {
    const chosenSlotId = data.SlotId || selectedSlot || ""
    let appointmentTimeFrom: string | undefined = (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime
    let appointmentTimeTo: string | undefined = (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime

    if (chosenSlotId) {
      const slot = (availableSlots as any[])?.find((s) => s.id === chosenSlotId)
      if (slot) {
        appointmentTimeFrom = slot.startTime
        appointmentTimeTo = slot.endTime
      }
    }

    const { SlotId, ...rest } = data as any

    // Ensure all required fields are present and correctly formatted
    const payload = {
      id: appointmentId, // Ensure ID is present
      clinicId: data.clinicId,
      patientId: data.patientId,
      clientId: data.clientId,
      veterinarianId: data.veterinarianId,
      roomId: data.roomId,
      appointmentDate: new Date(data.appointmentDate).toISOString(), // Ensure ISO string format
      appointmentTimeFrom: appointmentTimeFrom || "",
      appointmentTimeTo: appointmentTimeTo || "",
      appointmentTypeId: data.appointmentTypeId,
      reason: data.reason,
      status: "scheduled", // Always set to scheduled when approving
      notes: data.notes || "",
      isRegistered: false, // As per previous discussion
      createdBy: data.createdBy && data.createdBy.length > 0 ? data.createdBy : undefined, // Send undefined if empty or null for mutation compatibility
      sendEmail: true, // Explicitly send true for approval, or based on a toggle
    };

    updateAppointmentMutation.mutate({
      id: appointmentId,
      data: payload,
    })
  }

  const handlePatientSelect = (patient: SearchPatientResult) => {
    let patientName = '';

    if (patient.name) {
      patientName = patient.name;
    }
    else if (patient.patientId) {
      patientName = patient.patientId;
      if (patient.species) {
        patientName += ` (${patient.species})`;
      }
    }
    else if (patient.firstName || patient.lastName) {
      patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    }

    if (!patientName) {
      patientName = `Patient (ID: ${patient.id.substring(0, 8)}...)`;
    }

    const clientId = patient.clientId || patient.client?.id;

    setSelectedPatient({
      id: patient.id,
      name: patientName,
      clientId: clientId
    });

    form.setValue("patientId", patient.id, { shouldValidate: true });
    // Set the clientId in the form as well
    form.setValue("clientId", clientId || "", { shouldValidate: true });

    if ((form as any).clearErrors) {
      (form as any).clearErrors("patientId");
    }
    if ((form as any).trigger) {
      (form as any).trigger("patientId");
    }
    setPatientSearchQuery(""); // Clear the search input
    setIsSearchDropdownOpen(false); // Close the dropdown
  }

  const clearSelectedPatient = () => {
    setSelectedPatient(null);
    form.setValue("patientId", "");
    form.setValue("clientId", ""); // Clear clientId when patient is cleared
    setPatientSearchQuery("");
  }

  const handlePatientSearch = (searchTerm: string) => {
    setPatientSearchQuery(searchTerm)
    // No need to update URL here, as it's a modal/drawer
  }
  const debouncedPatientQuery = useDebounce(handlePatientSearch, 300)

  const [audioModalOpen, setAudioModalOpen] = useState<null | "reason" | "notes">(null);
  const reasonTranscriber = useTranscriber();
  const notesTranscriber = useTranscriber();
  const [isReasonFormatting, setIsReasonFormatting] = useState(false);
  const [isNotesFormatting, setIsNotesFormatting] = useState(false);

  // Audio transcription effect for reason
  useEffect(() => {
    const output = reasonTranscriber.output;
    if (output && !output.isBusy && output.text) {
      form.setValue(
        "reason",
        (form.getValues("reason") ? form.getValues("reason") + "\n" : "") + output.text
      );
      setAudioModalOpen(null);
    }
  }, [reasonTranscriber.output?.isBusy]);

  // Audio transcription effect for notes
  useEffect(() => {
    const output = notesTranscriber.output;
    if (output && !output.isBusy && output.text) {
      form.setValue(
        "notes",
        (form.getValues("notes") ? form.getValues("notes") + "\n" : "") + output.text
      );
      setAudioModalOpen(null);
    }
  }, [notesTranscriber.output?.isBusy]);

  // Handler for AI formatting of reason
  const handleAIFormatReason = async () => {
    const currentReason = form.getValues("reason")?.trim();
    if (!currentReason) {
      toast({
        title: "Text required",
        description: "Please type or dictate a reason before using AI Format.",
        variant: "destructive"
      });
      return;
    }
    setIsReasonFormatting(true);
    try {
      const formatted = await reasonFormatting(currentReason);
      form.setValue("reason", formatted);
      toast({
        title: "Success",
        description: "Reason formatted successfully.",
        variant: "success"
      });
    } catch (e) {
      toast({ title: "AI Formatting Error", description: "Failed to format reason.", variant: "destructive" });
    } finally {
      setIsReasonFormatting(false);
    }
  };

  // Handler for AI formatting of notes
  const handleAIFormatNotes = async () => {
    const currentNotes = form.getValues("notes")?.trim();
    if (!currentNotes) {
      toast({
        title: "Text required",
        description: "Please type or dictate notes before using AI Format.",
        variant: "destructive"
      });
      return;
    }
    setIsNotesFormatting(true);
    try {
      const formatted = await notesFormatting(currentNotes);
      form.setValue("notes", formatted);
      toast({
        title: "Success",
        description: "Notes formatted successfully.",
        variant: "success"
      });
    } catch (e) {
      toast({ title: "AI Formatting Error", description: "Failed to format notes.", variant: "destructive" });
    } finally {
      setIsNotesFormatting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-600">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto">
      <SheetHeader className="flex flex-row items-center border-b pb-2">
        <SheetTitle className="pr-2">Approve Appointment</SheetTitle>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="clinicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic</FormLabel>
                  <FormControl>
                    <Combobox options={clinicOptions} value={field.value} onValueChange={field.onChange} placeholder="Select clinic" />
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
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        {selectedPatient ? (
                          <div className="flex items-center justify-between p-2 border rounded-md">
                            <span>{selectedPatient.name}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="p-1 h-auto"
                              onClick={clearSelectedPatient}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="relative w-full">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                              <Input
                                placeholder="Search patients by name, client, or phone"
                                className="pl-10"
                                value={patientSearchQuery}
                                onChange={(e) => {
                                  handlePatientSearch(e.target.value);
                                  setIsSearchDropdownOpen(true);
                                }}
                                onFocus={() => setIsSearchDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsSearchDropdownOpen(false), 100)}
                              />
                            </div>

                            {/* Search results dropdown */}
                            {isSearchDropdownOpen && patientSearchQuery && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                {isSearching ? (
                                  <div className="p-2 text-center text-gray-500">Searching...</div>
                                ) : typedSearchResults.length === 0 ? (
                                  <div className="p-2 text-center text-gray-500">No patients found</div>
                                ) : (
                                  <ul>
                                    {typedSearchResults.map((patient) => {
                                      let clientName = '';
                                      if (patient.client) {
                                        clientName = `${patient.client.firstName || ''} ${patient.client.lastName || ''}`.trim();
                                      } else if (patient.clientFirstName || patient.clientLastName) {
                                        clientName = `${patient.clientFirstName || ''} ${patient.clientLastName || ''}`.trim();
                                      }

                                      let patientName = '';
                                      if (patient.name) {
                                        patientName = patient.name;
                                      }
                                      else if (patient.patientId) {
                                        patientName = patient.patientId;
                                        if (patient.species) {
                                          patientName += ` (${patient.species})`;
                                        }
                                      }
                                      else if (patient.firstName || patient.lastName) {
                                        patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
                                      }

                                      if (!patientName) {
                                        patientName = `Patient (ID: ${patient.id.substring(0, 8)}...)`;
                                      }

                                      const phoneNumber = patient.clientPhonePrimary;
                                      const displayName = clientName 
                                        ? phoneNumber 
                                          ? `${patientName}-${clientName} (${phoneNumber})`
                                          : `${patientName}-${clientName}`
                                        : patientName;

                                      return (
                                        <li
                                          key={patient.id}
                                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                          onMouseDown={() => handlePatientSelect(patient)}
                                        >
                                          <div className="font-medium">{displayName}</div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <input type="hidden" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <FormControl>
                    <Combobox options={clientOptions} value={field.value} onValueChange={field.onChange} placeholder="Select client" />
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
                    <Combobox options={veterinarianOptions} value={field.value} onValueChange={field.onChange} placeholder="Select veterinarian" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <FormControl>
                    <Combobox options={roomOptions} value={field.value} onValueChange={field.onChange} placeholder="Select room" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <FormControl>
                    <Combobox options={appointmentTypeOptions} value={field.value} onValueChange={field.onChange} placeholder="Select appointment type" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={createLocalDateFromYYYYMMDD(field.value)}
                      onChange={(date) => field.onChange(formatDateToYYYYMMDD(date))}
                      minDate={(() => { const today = new Date(); today.setHours(0, 0, 0, 0); return today; })()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="col-span-2">
            <FormField
              control={form.control}
              name="SlotId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Slots</FormLabel>
                  <FormControl>
                    <div className="mt-2">
                      {isLoadingSlots ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading available slots...
                        </div>
                      ) : (mergedSlots as any[])?.length === 0 ? (
                        <div className="text-sm text-gray-500">No slots for this veterinarian on the selected date</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(mergedSlots as any[])
                            .slice()
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))
                            .map((slot: any) => {
                              const originalStart = (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime;
                              const originalEnd = (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime;
                              const matchesOriginalTime = originalStart && originalEnd && (
                                String(slot.startTime).slice(0,5) === String(originalStart).slice(0,5) &&
                                String(slot.endTime).slice(0,5) === String(originalEnd).slice(0,5)
                              );
                              const hasExplicitSelection = Boolean(field.value || selectedSlot);
                              const isSelected = hasExplicitSelection
                                ? (selectedSlot === slot.id || field.value === slot.id)
                                : matchesOriginalTime;
                              
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => handleSlotClick(slot)}
                                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${isSelected ? "bg-green-100 border-green-300 text-green-800" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}
                                >
                                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="mb-0">Reason</FormLabel>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setAudioModalOpen("reason")}
                      title="Record voice note"
                      disabled={reasonTranscriber.output?.isBusy}
                    >
                      {reasonTranscriber.output?.isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAIFormatReason}
                      disabled={isReasonFormatting}
                      className="ml-2 flex items-center gap-1 font-semibold bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] text-white shadow-lg hover:from-[#1E3D3D] hover:to-[#1E3D3D] hover:scale-105 transition-transform duration-150 border-0 px-2 py-0.5 rounded-full text-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      {isReasonFormatting ? <Loader2 className="w-3 h-3 animate-spin" /> : "AI Format"}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                  <AudioManager
                    open={audioModalOpen === "reason"}
                    onClose={() => setAudioModalOpen(null)}
                    transcriber={reasonTranscriber}
                    onTranscriptionComplete={() => setAudioModalOpen(null)}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="mb-0">Notes</FormLabel>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setAudioModalOpen("notes")}
                      title="Record voice note"
                      disabled={notesTranscriber.output?.isBusy}
                    >
                      {notesTranscriber.output?.isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAIFormatNotes}
                      disabled={isNotesFormatting}
                      className="ml-2 flex items-center gap-1 font-semibold bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] text-white shadow-lg hover:from-[#1E3D3D] hover:to-[#1E3D3D] hover:scale-105 transition-transform duration-150 border-0 px-2 py-0.5 rounded-full text-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      {isNotesFormatting ? <Loader2 className="w-3 h-3 animate-spin" /> : "AI Format"}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                  <AudioManager
                    open={audioModalOpen === "notes"}
                    onClose={() => setAudioModalOpen(null)}
                    transcriber={notesTranscriber}
                    onTranscriptionComplete={() => setAudioModalOpen(null)}
                  />
                </FormItem>
              )}
            />
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="theme-button text-white"
              disabled={updateAppointmentMutation.isPending}>
              {updateAppointmentMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Approve
            </Button>
          </SheetFooter>
        </form>
      </Form>
      </SheetContent>
    </Sheet>
  )
}


