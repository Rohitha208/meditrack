"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Pencil, ClipboardList, Search, X, Loader2, Mic } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useGetClinic } from "@/queries/clinic/get-clinic"
import { useQueryClient } from "@tanstack/react-query"
import { useGetPatients, PaginatedResponse, Patient } from "@/queries/patients/get-patients"
import { useGetClients, type Client } from "@/queries/clients/get-client"
import { useGetUsers } from "@/queries/users/get-users"
import { useGetRole } from "@/queries/roles/get-role"
import { useGetRoom } from "@/queries/rooms/get-room"
import { useGetAppointmentType } from "@/queries/appointmentType/get-appointmentType"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import VisitManager from "@/components/appointments/visit"
import CertificateGeneration from "./certificate-generation"
//import { useSearchPatients } from "@/queries/patients/get-patients-by-search"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { AudioManager } from "@/components/audioTranscriber/AudioManager"
import { useTranscriber } from "@/components/audioTranscriber/hooks/useTranscriber"
import { useGetAvailableSlotsByUserId } from "@/queries/users/get-availabelSlots-by-userId"
import React from "react"
import DatePicker from "react-datepicker"; // New import
import "react-datepicker/dist/react-datepicker.css"; // New import

// Define the form schema
const appointmentSchema = z.object({
  clinicId: z.string().uuid(),
  patientId: z.string().uuid(),
  clientId: z.string().uuid(),
  veterinarianId: z.string().uuid(),
  roomId: z.string().uuid(),
  appointmentDate: z
    .date() // Changed to z.date()
    .refine((date) => !!date, "Please select an appointment date") // New validation
    .refine((date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    }, "Appointment date cannot be in the past"),
  SlotId: z.string().optional(),
  appointmentTypeId: z.string(),
  reason: z.string(),
  status: z.string(),
  notes: z.string().optional(),
  createdBy: z.string().uuid().nullable().optional(),
})

export interface Slot {
  id: string
  clinicId: string
  roomId: string
  startTime: string
  endTime: string
  durationMinutes: number
  isActive: boolean
  isAvailable: boolean
}

type AppointmentFormValues = z.infer<typeof appointmentSchema>

interface AppointmentDetailsProps {
  appointmentId: string
  onClose: () => void
}

// Define a more comprehensive patient interface
interface ExtendedPatient {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  species?: string
  breed?: string
  microchipNumber?: string;
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

export default function AppointmentDetails({ appointmentId, onClose }: AppointmentDetailsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isVisitOpen, setIsVisitOpen] = useState(false)
  const [isCertificateOpen, setIsCertificateOpen] = useState(false)
  const hasManuallyClosedVisit = useRef(false)
  const hasManuallyClosedCertificate = useRef(false)
  const { data: appointment, isLoading } = useGetAppointmentById(appointmentId)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("")
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; clientId?: string } | null>(null)
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("") // New state for debounced value

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(patientSearchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [patientSearchQuery, 300]); // Depend on patientSearchQuery
  const searchDropdownRef = useRef<HTMLDivElement>(null)

  // Initialize form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clinicId: "",
      patientId: "",
      clientId: "",
      veterinarianId: "",
      roomId: "",
      appointmentDate: undefined, // Changed to undefined
      SlotId: "",
      appointmentTypeId: "",
      reason: "",
      status: "scheduled",
      notes: "",
      createdBy: "",
    },
  })

  // Get selected clinicId and roomId from form
  const selectedClinicId = form.watch("clinicId")
  const selectedRoomId = form.watch("roomId")

  // Fetch rooms for the selected clinic
  const { data: filteredRoomsResponse } = useGetRoom(1, 100, "", selectedClinicId)
  const filteredRoomOptions = (filteredRoomsResponse?.items || [])
    .filter((room) => room.isActive)
    .map((room) => ({
      value: room.id,
      label: room.name,
    }))

  // Doctor available slots
  const selectedVeterinarianId = form.watch("veterinarianId")
  const selectedDate = form.watch("appointmentDate")

  // Format selected date to YYYY-MM-DD for API filtering
  // Use local date methods to ensure the date stays in the user's timezone
  const formattedDate = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
    : ""

  const { data: availableSlots = [], isLoading: isLoadingSlots } = useGetAvailableSlotsByUserId(
    selectedVeterinarianId,
    selectedClinicId,
    formattedDate, // Use formattedDate here
    !!selectedVeterinarianId && !!selectedClinicId && !!formattedDate,
  )

  // Merge available slots with the originally selected one so it stays visible
  const mergedSlots = useMemo(() => {
    const originalSlotId = (appointment as any)?.SlotId || (appointment as any)?.slotId
    const originalStart = (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime
    const originalEnd = (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime

    let slots: any[] = [...(availableSlots as any[])]

    // Always keep the original slot visible
    if (originalSlotId || (originalStart && originalEnd)) {
      const byId = originalSlotId ? slots.find((s) => s.id === originalSlotId) : null
      const byTime =
        !byId && originalStart && originalEnd
          ? slots.find(
              (s) =>
                s.startTime?.slice(0, 5) === String(originalStart).slice(0, 5) &&
                s.endTime?.slice(0, 5) === String(originalEnd).slice(0, 5),
            )
          : null

      if (byId) {
        slots = slots.map((slot) => (slot.id === byId.id ? { ...slot, isOriginalAppointment: true } : slot))
      } else if (byTime) {
        slots = slots.map((slot) => (slot.id === byTime.id ? { ...slot, isOriginalAppointment: true } : slot))
      } else if (originalStart && originalEnd) {
        slots = [
          ...slots,
          {
            id: originalSlotId || `original-${appointment?.id || "appointment"}`,
            startTime: originalStart,
            endTime: originalEnd,
            isOriginalAppointment: true,
            isInjected: true,
          },
        ]
      }
    }

    return slots
  }, [availableSlots, appointment, form.watch("SlotId")])

  // Auto-select matching available slot by time when no SlotId is set
  useEffect(() => {
    const currentSlotId = form.getValues("SlotId")
    if (currentSlotId) return
    const currentStart = (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime
    const currentEnd = (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime
    if (!currentStart || !currentEnd || !(availableSlots as any[])?.length) return
    const match = (availableSlots as any[]).find(
      (s) =>
        s.startTime?.slice(0, 5) === String(currentStart).slice(0, 5) &&
        s.endTime?.slice(0, 5) === String(currentEnd).slice(0, 5),
    )
    if (match) {
      form.setValue("SlotId" as any, match.id as any)
      setSelectedSlot(match.id)
    }
  }, [availableSlots, appointment])

  // Use patient search query for edit mode
  const { user } = useRootContext()
  const companyId = getCompanyId() || user?.companyId
  const { data: rolesData } = useGetRole()

  useEffect(() => {
    if (rolesData?.data) {
      const vetRole = rolesData.data.find((role: any) => role.name.toLowerCase() === "veterinarian")
      if (vetRole) {
        setVeterinarianRoleId(vetRole.id)
      }
    }
  }, [rolesData])

  const { data: searchResults, isLoading: isSearching } = useGetPatients(
    1, // pageNumber
    50, // pageSize - get more results for search
    debouncedSearchTerm, // Use the debounced string value here
    '', // clientId - empty for general search
    companyId || undefined // companyId
  )

  // Convert search results to our format
  const typedSearchResults = searchResults?.items || [] as ExtendedPatient[]

  // Format time for display (assuming HH:mm:ss format from API)
  const formatTime = (timeString: string) => {
    if (!timeString) return ""

    // If time is already in HH:MM format, return as is
    if (timeString.length <= 5) return timeString

    // Try to parse and format to HH:MM
    try {
      // Handle ISO format (2023-06-01T11:00:00)
      if (timeString.includes("T")) {
        return timeString.split("T")[1].substring(0, 5)
      }

      // Handle HH:MM:SS format
      if (timeString.includes(":")) {
        const timeParts = timeString.split(":")
        return `${timeParts[0]}:${timeParts[1]}`
      }

      return timeString
    } catch (e) {
      return timeString
    }
  }

  // Handle clicking outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle selecting a patient from search
  const handlePatientSelect = (patient: ExtendedPatient) => {
    // Determine the correct patient name based on different possible API structures
    let patientName = ""

    if (patient.name) {
      patientName = patient.name
    } else if (patient.id) {
      patientName = patient.id
      if (patient.species) {
        patientName += ` (${patient.species})`
      }
    } else if (patient.firstName || patient.lastName) {
      patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
    }

    if (!patientName) {
      console.warn("No name found for selected patient:", patient)
      patientName = `Patient (ID: ${patient.id.substring(0, 8)}...)`
    }

    setSelectedPatient({
      id: patient.id,
      name: patientName,
    })
    form.setValue("patientId", patient.id)
    // Set clientId if available from the search result
    if ((patient as any).clientId) {
      form.setValue("clientId", (patient as any).clientId)
    }
    setPatientSearchQuery("") // Clear the search input
    setIsSearchDropdownOpen(false) // Close the dropdown
  }

  // Simplified handleSlotClick function
  const handleSlotClick = (slot: { id: string; startTime: string; endTime: string }) => {
    const slotId = slot.id

    // Update the selected slot
    setSelectedSlot(slotId)
    form.setValue("SlotId" as any, slotId as any)
  }

  // Clear selected patient
  const clearSelectedPatient = () => {
    setSelectedPatient(null)
    form.setValue("patientId", "")
  }

  // Fetch data from APIs
  const { data: clinicsResponse } = useGetClinic(1, 100, "", true)
  const { data: patientsResponse } = useGetPatients(1, 100, "", "", companyId)
  const { data: clientsResponse } = useGetClients(1, 100, "", "first_name", companyId || "")
  const { data: usersResponse } = useGetUsers(
    1,
    100,
    "",
    !!selectedClinicId && !!veterinarianRoleId, // enabled
    companyId || "", // companyId
    selectedClinicId ? [selectedClinicId] : [], // clinicIds: Pass as an array
    veterinarianRoleId ? [veterinarianRoleId] : [], // roleIds: Pass as an array
  )
  const { data: roomsResponse } = useGetRoom(1, 100, "", selectedClinicId)
  const { data: appointmentTypes = [] } = useGetAppointmentType(1, 100, selectedClinicId, true)

  const queryClient = useQueryClient()
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Appointment Saved",
        description: "Appointment details have been saved successfully",
        variant: "success",
      })
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ["appointment"] })
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message instanceof Error ? error.message : "Failed to update appointment",
        variant: "error",
      })
    },
  })

  // Transform data for comboboxes
  const clinicOptions = (clinicsResponse?.items || []).map((clinic) => ({
    value: clinic.id,
    label: clinic.name,
  }))

  const patientOptions = (patientsResponse?.items || []).map((patient: ExtendedPatient) => {
    // Determine the display name based on available properties
    let displayName = ""

    if (patient.name) {
      displayName = patient.name
    } else if (patient.id) {
      displayName = patient.id
      if (patient.species) {
        displayName += ` (${patient.species})`
      }
    } else if (patient.firstName || patient.lastName) {
      displayName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
    }

    // If we still don't have a display name, use ID as last resort
    if (!displayName) {
      displayName = `Patient (ID: ${patient.id.substring(0, 8)}...)`
    }

    return {
      value: patient.id,
      label: displayName,
    }
  })

  const clientOptions = (clientsResponse?.items || [])
    .filter((client) => client.isActive)
    .map((client: Client) => ({
      value: client.id,
      label: `${client.firstName} ${client.lastName}`,
    }))

  const veterinarianOptions = useMemo(() => {
    const items = usersResponse?.items ?? []
    console.log("usersResponse.items in AppointmentDetails:", items) // Debug log
    console.log("selectedClinicId in AppointmentDetails for vets:", selectedClinicId) // Debug log
    return items
      .filter((u) => u.roleName === "Veterinarian")
      .filter((u) => {
        const clinics = (u as any).clinics as { clinicId: string }[] | undefined
        const clinicIds = (u as any).clinicIds as string[] | undefined
        const ids = clinicIds ?? (clinics ? clinics.map((c: { clinicId: string }) => c.clinicId) : [])
        return selectedClinicId ? ids.includes(selectedClinicId) : true
      })
      .map((vet) => ({
        value: vet.id,
        label: `Dr. ${vet.firstName} ${vet.lastName}`,
      }))
  }, [usersResponse?.items, selectedClinicId])

  const roomOptions = (roomsResponse?.items || []).map((room) => ({
    value: room.id,
    label: room.name,
  }))

  const appointmentTypeOptions = (appointmentTypes || [])
    .filter((type: { isActive: boolean }) => type.isActive)
    .map((type: { appointmentTypeId: string; name: string }) => ({
      value: type.appointmentTypeId,
      label: type.name,
    }))

  // Update form values when appointment data is loaded
  useEffect(() => {
    if (appointment) {
      const slotId = (appointment as any).SlotId || (appointment as any).slotId || ""

      form.reset({
        ...appointment,
        appointmentDate: new Date(appointment.appointmentDate), // Convert to Date object
        roomSlotId: slotId, // Handle different field names
      })

      // Set the selected slot
      setSelectedSlot(slotId)

      // Set the selected patient for the search component
      if (appointment.patientId && appointment.patient) {
        // Determine the display name based on what's available
        let patientName = ""

        if (appointment.patient.name) {
          patientName = appointment.patient.name
        } else if (appointment.patient.patientId) {
          patientName = appointment.patient.patientId
          if (appointment.patient.species) {
            patientName += ` (${appointment.patient.species})`
          }
        } else if (appointment.patient.firstName || appointment.patient.lastName) {
          patientName = `${appointment.patient.firstName || ""} ${appointment.patient.lastName || ""}`.trim()
        }

        if (!patientName) {
          patientName = `Patient (ID: ${appointment.patientId.substring(0, 8)}...)`
        }

        setSelectedPatient({
          id: appointment.patientId,
          name: patientName,
          clientId: appointment.clientId, // Ensure clientId is set
        })
      }

      // Ensure clientId is set in the form directly
      form.setValue("clientId", appointment.clientId || "")

      // Reset editing state if appointment is completed or cancelled
      if (appointment.status && ["Completed", "Cancelled", "completed", "cancelled"].includes(appointment.status)) {
        setIsEditing(false)
      }
    }
  }, [appointment, form])

  const onSubmit = (data: AppointmentFormValues) => {
    // Derive time range from selected slot when provided
    const chosenSlotId = data.SlotId || selectedSlot || ""
    let appointmentTimeFrom: string | undefined =
      (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime
    let appointmentTimeTo: string | undefined = (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime

    if (chosenSlotId) {
      const slot = (mergedSlots as any[])?.find((s) => s.id === chosenSlotId)
      if (slot) {
        appointmentTimeFrom = slot.startTime
        appointmentTimeTo = slot.endTime
      }
    }

    // Exclude SlotId from payload and structure according to API schema
    const { SlotId, ...formData } = data as any

    // Build the payload according to your API schema
    const payload = {
      id: appointmentId, // Add the appointment ID to the payload as required by the external API
      ...formData,
      appointmentDate: new Date(data.appointmentDate).toISOString(),
      appointmentTimeFrom: appointmentTimeFrom || "",
      appointmentTimeTo: appointmentTimeTo || "",
      isRegistered: false, // Set to false as per user request
      sendEmail: false, // Add this required field, set to true if you want to send emails
    }

    updateAppointmentMutation.mutate({
      id: appointmentId,
      data: payload,
    })
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-[#D2EFEC] text-[#1E3D3D] dark:bg-[#1E3D3D] dark:text-[#D2EFEC]"
      case "confirmed":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "in room":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // Auto-open Visit Summary ONLY on page refresh/load when BOTH tab AND appointmentId exist in URL
  // This ensures we only restore state if user was actually viewing Visit Summary before refresh
  // Visit Summary will NEVER auto-open when user clicks an appointment - only when page refreshes
  useEffect(() => {
    if (appointment && !isLoading && !isVisitOpen && !isCertificateOpen) {
      const tabParam = searchParams.get("tab")
      const appointmentIdFromUrl = searchParams.get("appointmentId")

      // Skip auto-open if user manually closed the sheet in this session
      if (hasManuallyClosedVisit.current || hasManuallyClosedCertificate.current) return

      // Only auto-open if:
      // 1. Tab parameter exists (user was viewing a tab)
      // 2. AppointmentId in URL matches current appointment (user was viewing this specific appointment's Visit Summary)
      // 3. Visit Summary is not already open (prevents re-opening)
      if (tabParam && appointmentIdFromUrl === appointmentId) {
        const typeName = appointment?.appointmentType?.name?.toLowerCase() || ""
        if (typeName.includes("certification") || typeName.includes("certificate")) {
          setIsCertificateOpen(true)
        } else {
          setIsVisitOpen(true)
        }
      }
    }
  }, [appointment, isLoading, searchParams, appointmentId, isVisitOpen, isCertificateOpen])

  const handlePatientInfoClick = () => {
    hasManuallyClosedVisit.current = false
    hasManuallyClosedCertificate.current = false
    const typeName = appointment?.appointmentType?.name?.toLowerCase() || ""
    if (typeName.includes("certification") || typeName.includes("certificate")) {
      setIsCertificateOpen(true)
      // Add default tab to URL when opening Visit Summary
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", "certification-details")
      params.set("appointmentId", appointmentId)
      router.replace(`?${params.toString()}`, { scroll: false })
      return
    }
    setIsVisitOpen(true)
    // Add default tab to URL when opening Visit Summary
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "intake")
    params.set("appointmentId", appointmentId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }
  const handleCertificateClick = () => {
    setIsCertificateOpen(true)
    hasManuallyClosedCertificate.current = false
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "certification-details")
    params.set("appointmentId", appointmentId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const [audioModalOpen, setAudioModalOpen] = useState<null | "reason" | "notes">(null)
  const reasonTranscriber = useTranscriber()
  const notesTranscriber = useTranscriber()

  // Audio transcription effect for reason
  useEffect(() => {
    const output = reasonTranscriber.output
    if (output && !output.isBusy && output.text) {
      form.setValue("reason", (form.getValues("reason") ? form.getValues("reason") + "\n" : "") + output.text)
      setAudioModalOpen(null)
    }
    // eslint-disable-next-line
  }, [reasonTranscriber.output, form, setAudioModalOpen])

  // Audio transcription effect for notes
  useEffect(() => {
    const output = notesTranscriber.output
    if (output && !output.isBusy && output.text) {
      form.setValue("notes", (form.getValues("notes") ? form.getValues("notes") + "\n" : "") + output.text)
      setAudioModalOpen(null)
    }
    // eslint-disable-next-line
  }, [notesTranscriber.output, form, setAudioModalOpen])

  return (
    <>
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="flex flex-row items-center border-b pb-2">
            <SheetTitle className="pr-2">Appointment Details</SheetTitle>
            {appointment &&
              appointment.status &&
              !["Completed", "Cancelled", "completed", "cancelled", "in_progress"].includes(appointment.status) && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)} className="h-6 w-6 !m-0">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
          </SheetHeader>

          {!isEditing ||
          (appointment?.status && ["Completed", "Cancelled", "completed", "cancelled"].includes(appointment.status)) ? (
            // View Mode
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1">
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Clinic:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">{appointment?.clinic?.name}</p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Patient:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">
                    {appointment?.patient
                      ? appointment.patient.name ||
                        (appointment.patient.patientId
                          ? `${appointment.patient.patientId}${appointment.patient.species ? ` (${appointment.patient.species})` : ""}`
                          : appointment.patient.firstName || appointment.patient.lastName
                            ? `${appointment.patient.firstName || ""} ${appointment.patient.lastName || ""}`.trim()
                            : `Patient (ID: ${appointment.patient.id.substring(0, 8)}...)`)
                      : "Not assigned"}
                  </p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Client:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">
                    {appointment?.client?.firstName} {appointment?.client?.lastName}
                  </p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Veterinarian:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">
                    {appointment?.veterinarian?.firstName}
                    {appointment?.veterinarian?.lastName}
                  </p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Room:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">{appointment?.room?.name}</p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Appointment Type:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">{appointment?.appointmentType.name}</p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Date:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">
                    {appointment?.appointmentDate
                      ? new Date(appointment.appointmentDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Time:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">
                    {(() => {
                      // Priority order: appointmentTimeFrom/To, roomSlot, startTime/endTime
                      const timeFrom = (appointment as any)?.appointmentTimeFrom
                      const timeTo = (appointment as any)?.appointmentTimeTo

                      if (timeFrom && timeTo) {
                        return `${formatTime(timeFrom)} - ${formatTime(timeTo)}`
                      }

                      if (appointment?.roomSlot?.startTime && appointment?.roomSlot?.endTime) {
                        return `${formatTime(appointment.roomSlot.startTime)} - ${formatTime(appointment.roomSlot.endTime)}`
                      }

                      if (appointment?.startTime && appointment?.endTime) {
                        return `${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime)}`
                      }

                      return "Not set"
                    })()}
                  </p>
                </div>
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Status:</h3>
                  <Badge
                    className={`${getStatusBadgeClass(appointment?.status || "")} pl-4 text-md font-medium hover:bg-inherit hover:text-inherit`}
                  >
                    {appointment?.status}
                  </Badge>
                </div>
              </div>
              <div className="!m-0">
                <div className="flex border-b py-2">
                  <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Reason:</h3>
                  <p className="text-md text-gray-900 dark:text-gray-100 pl-4">{appointment?.reason}</p>
                </div>
                {appointment?.notes && (
                  <div className="flex border-b py-2">
                    <h3 className="text-md font-bold text-gray-500 dark:text-gray-400 min-w-48">Notes:</h3>
                    <p className="text-md text-gray-900 dark:text-gray-100 pl-4">{appointment.notes}</p>
                  </div>
                )}
                {(appointment?.status === "in_progress" || appointment?.status === "completed") && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="theme-button-outline bg-transparent"
                      onClick={handlePatientInfoClick}
                    >
                      <ClipboardList className="h-4 w-4 mr-1" />
                      Open Visit Summary
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Edit Mode
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-6">
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
                          <div className="relative flex-grow" ref={searchDropdownRef}>
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
                                    placeholder="Search patients by name"
                                    className="pl-10"
                                    value={patientSearchQuery}
                                    onChange={(e) => {
                                      setPatientSearchQuery(e.target.value)
                                      setIsSearchDropdownOpen(true)
                                    }}
                                    onFocus={() => setIsSearchDropdownOpen(true)}
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
                                          // Determine the display name
                                          let displayName = ""

                                          if (patient.name) {
                                            displayName = patient.name
                                          } else if (patient.id) {
                                            displayName = patient.id
                                            if (patient.species) {
                                              displayName += ` (${patient.species})`
                                            }
                                          } else if (patient.name ) {
                                            displayName = `${patient.name}`.trim()
                                          }

                                          if (!displayName) {
                                            displayName = `Patient (ID: ${patient.id.substring(0, 8)}...)`
                                          }

                                          const microchipDisplay = patient.microchipNumber ? ` (Microchip: ${patient.microchipNumber})` : '';

                                          displayName += microchipDisplay;

                                          return (
                                            <li
                                              key={patient.id}
                                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                              onClick={() => handlePatientSelect(patient)}
                                            >
                                              <div className="font-medium">{displayName}</div>
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
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
                        <FormLabel>Client</FormLabel>
                        <FormControl>
                          <Combobox
                            options={clientOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select client"
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
                            placeholder="Select veterinarian"
                          />
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
                          <Combobox
                            options={filteredRoomOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select room"
                          />
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
                          <Combobox
                            options={appointmentTypeOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select appointment type"
                          />
                        </FormControl>
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
                        <FormItem className="flex flex-col">
                          <FormLabel className="mb-1">Date</FormLabel>
                          <FormControl>
                            <DatePicker
                              selected={field.value}
                              onChange={(date) => field.onChange(date)}
                              minDate={today}
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
                      )
                    }}
                  />

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
                            ) : mergedSlots.length === 0 ? (
                              <div className="text-sm text-gray-500">
                                No slots available for this veterinarian on the selected date
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {mergedSlots
                                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                  .map((slot) => {
                                    const originalStart =
                                      (appointment as any)?.appointmentTimeFrom || (appointment as any)?.startTime
                                    const originalEnd =
                                      (appointment as any)?.appointmentTimeTo || (appointment as any)?.endTime
                                    const matchesOriginalTime =
                                      originalStart &&
                                      originalEnd &&
                                      String(slot.startTime).slice(0, 5) === String(originalStart).slice(0, 5) &&
                                      String(slot.endTime).slice(0, 5) === String(originalEnd).slice(0, 5)
                                    const hasExplicitSelection = Boolean(field.value || selectedSlot)
                                    const isSelected = hasExplicitSelection
                                      ? selectedSlot === slot.id || field.value === slot.id
                                      : matchesOriginalTime
                                    const isOriginalAppointment = slot.isOriginalAppointment

                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => handleSlotClick(slot as any)}
                                        className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                                          isSelected
                                            ? "bg-green-100 border-green-300 text-green-800"
                                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                        }`}
                                      >
                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                      </button>
                                    )
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

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel>Reason</FormLabel>
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
                          <FormLabel>Notes</FormLabel>
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
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="theme-button text-white">
                    Save Changes
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          )}
        </SheetContent>
      </Sheet>

      {isVisitOpen && (
        <VisitManager
          patientId={appointment?.patientId || ""}
          appointmentId={appointmentId}
          onClose={() => {
            setIsVisitOpen(false)
            hasManuallyClosedVisit.current = true
            // Remove tab from URL when closing Visit Summary
            const params = new URLSearchParams(searchParams.toString())
            params.delete("tab")
            router.replace(`?${params.toString()}`, { scroll: false })
          }}
        />
      )}

      {isCertificateOpen && (
        <CertificateGeneration
          appointmentId={appointmentId}
          patientId={appointment?.patientId || ""}
          onClose={() => {
            setIsCertificateOpen(false)
            hasManuallyClosedCertificate.current = true
            // Remove tab from URL when closing Certificate
            const params = new URLSearchParams(searchParams.toString())
            params.delete("tab")
            router.replace(`?${params.toString()}`, { scroll: false })
          }}
        />
      )}
    </>
  )
}
