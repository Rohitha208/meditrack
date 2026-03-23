import React, { useEffect, useState, useMemo } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { useCreateAppointment } from "@/queries/appointment"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useGetClinic } from "@/queries/clinic/get-clinic"
import { useGetPatients, Patient } from "@/queries/patients/get-patients"
import { useGetClients, Client, useGetClientById, getClientById } from "@/queries/clients/get-client"
import { useGetRoom, Room } from "@/queries/rooms/get-room"
import { useGetUsers } from "@/queries/users/get-users"
import { useGetRole } from "@/queries/roles/get-role";
import { NewPatientForm } from "@/components/patients/new-patient-form"
import { Separator } from "@/components/ui/separator"
import { Plus, Search, X, Loader2, Mic, Sparkles } from "lucide-react"
import { useRootContext } from '@/context/RootContext'
import { useGetRoomsByClinicId } from "@/queries/rooms/get-room-by-clinic-id"
import { useSearchPatients } from "@/queries/patients/get-patients-by-search"
import { useDebounce } from "@/hooks/use-debounce"
import { useGetAvailableSlotsByUserId, AvailableSlot } from "@/queries/users/get-availabelSlots-by-userId"
import { AudioManager } from "@/components/audioTranscriber/AudioManager"
import { useTranscriber } from "@/components/audioTranscriber/hooks/useTranscriber"
import { useGetAppointmentType } from "@/queries/appointmentType/get-appointmentType"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetUserById } from "@/queries/users/get-user-by-id"
import { reasonFormatting, notesFormatting } from "@/app/actions/reasonformatting";
import * as z from "zod"
import { newAppointmentSchema, NewAppointmentFormValues } from "@/components/schema/appointmentSchema"

// Extended patient interface to handle API response variations
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
  microchipNumber?: string; // Added microchipNumber
  isActive?: boolean;
  client?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  }
}
interface NewAppointmentProps {
  isOpen: boolean
  onClose: () => void
  patientId?: string
  preSelectedClinic?: string
  preSelectedRoom?: string | null
  appointmentId?: string | null
  sendEmail?: boolean
}

// Define the SlotResponse interface to match your API
interface SlotResponse {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  items: AvailableSlot[];
}

function NewAppointment({ isOpen, onClose, patientId, preSelectedClinic, preSelectedRoom, appointmentId, sendEmail = false }: NewAppointmentProps) {
  const { toast } = useToast()
  const { user, userType, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || null
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null);

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("")
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("") // New state for debounced value

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(patientSearchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [patientSearchQuery, 300]); // Depend on patientSearchQuery

  const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string, clientId?: string, isActive?: boolean } | null>(null)

  const { data: searchResults, isLoading: isSearching } = useGetPatients(
    1, // pageNumber
    50, // pageSize - get more results for search
    debouncedSearchTerm, // Use the debounced string value here
    '', // clientId - empty for general search
    companyId || undefined // companyId
  )

  // Fetch specific patient by ID when patientId is provided
  const { data: specificPatient } = useGetPatientById(patientId || "");

  // Fetch client data to check client active status
  const { data: selectedClientData } = useGetClientById(selectedPatient?.clientId || "");

  // Fetch appointment by ID when editing
  const { data: appointmentData, isLoading: isLoadingAppointment } = useGetAppointmentById(appointmentId || "");

  // Cast the search results to our custom interface to handle API variations
  const typedSearchResults = (searchResults?.items || []) as SearchPatientResult[];

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

  const form = useForm<NewAppointmentFormValues>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: {
      clinicId: "",
      patientId: "",
      veterinarianId: userType?.isVeterinarian ? user?.id : "",
      roomId: "",
      appointmentDate: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(),
      slotId: "",
      appointmentTypeId: "",
      reason: "",
      status: "scheduled",
      notes: "",
      isActive: true,
      isRegistered: false,
    },
  })

  // Get selected veterinarian ID and date for slots
  const selectedVeterinarianId = form.watch("veterinarianId");
  const selectedDate = form.watch("appointmentDate");
  const watchedClinicId = form.watch("clinicId");

  // Prefer clinic chosen in the form; fallback to context clinic
  const selectedClinicId = watchedClinicId || clinic?.id || "";

  // Fetch patients data with the selected clinic ID
  const { data: patientsResponse, refetch: refetchPatients } = useGetPatients(
    1, // page
    100, // pageSize
    '', // search
    '', // clientId
    selectedClinicId // clinicId - use the selected clinic ID
  );

  // Update form when clinic changes in RootContext - only set if no clinic is currently selected
  useEffect(() => {
    if (!form.getValues("clinicId")) {
      // For clinic admins, auto-select their clinic
      if (userType?.isClinicAdmin && user?.clinics && user.clinics.length > 0) {
        const clinicId = user.clinics[0].clinicId;
        form.setValue("clinicId", clinicId);

        // Force refetch of data when clinic changes
        if (refetchPatients) {
          refetchPatients();
        }
      }
      // For regular users (non-admin, non-super-admin), auto-select context clinic
      else if (clinic?.id && !(userType?.isAdmin || userType?.isSuperAdmin)) {
        form.setValue("clinicId", clinic.id);

        // Force refetch of data when clinic changes
        if (refetchPatients) {
          refetchPatients();
        }
      }
    }
  }, [clinic?.id, user?.clinics, form, refetchPatients, userType]);

  // Format selected date to YYYY-MM-DD for API filtering
  // Use local date methods to ensure the date stays in the user's timezone
  const formattedDate = selectedDate ?
    `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` :
    '';

  // Fetch available slots for the selected veterinarian using the new hook
  const {
    data: availableSlots = [],
    isLoading: isLoadingSlots
  } = useGetAvailableSlotsByUserId(
    selectedVeterinarianId,
    selectedClinicId,
    formattedDate,
    !!selectedVeterinarianId && !!selectedClinicId && !!formattedDate
  );

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

  // Fetch clinics filtered by company
  const { data: clinics } = useGetClinic(1, 100, companyId, true)

  const { data: usersResponse = { items: [] } } = useGetUsers(
    1,
    100,
    '',
    true, // enabled: Always fetch users for the selected clinic
    companyId || '', // companyId
    selectedClinicId ? [selectedClinicId] : [], // clinicIds: Pass as an array
    veterinarianRoleId ? [veterinarianRoleId] : [] // roleIds: Pass as an array
  );

  // Memoize veterinarian options to prevent infinite re-renders
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

  // Transform API data into Combobox format
  const clinicOptions = useMemo(() => {
    const items = clinics?.items || []
    const filtered = companyId ? items.filter((c: any) => c.companyId === companyId) : items
    return filtered.map((clinic: any) => ({
      value: clinic.id,
      label: clinic.name
    }));
  }, [clinics?.items, companyId]);

  const { data: rooms, isLoading: isLoadingRooms } = useGetRoomsByClinicId(selectedClinicId);
  const { data: appointmentTypes = [], isLoading: isLoadingAppointmentTypes } = useGetAppointmentType(1, 100, selectedClinicId, true);

  const roomOptions = useMemo(() => {
    if (isLoadingRooms) return [];
    return (rooms || []).filter((room: any) => room.isActive).map((room: any) => ({
      value: room.id,
      label: `${room.name} (${room.roomType})`
    }));
  }, [rooms, isLoadingRooms]);

  const appointmentTypeOptions = useMemo(() => {
    if (isLoadingAppointmentTypes) return [];
    return (appointmentTypes || []).filter((type: any) => type.isActive).map((type : any) => ({
      value: type.appointmentTypeId,
      label: type.name
    }));
  }, [appointmentTypes, isLoadingAppointmentTypes]);

  const { mutate: createAppointment, isPending } = useCreateAppointment({
    onSuccess: () => {
      toast({
        title: "Appointment Created",
        description: "Appointment has been created successfully",
        variant: "success",
      })
      form.reset()
      setSelectedPatient(null)
      // Notify rest of app to refresh appointments
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointments:refresh'))
      }
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to create appointment"),
        variant: "destructive",
      })
    }
  })

  // Update appointment mutation
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Appointment Updated",
        description: "Appointment information has been updated successfully",
        variant: "success",
      })
      form.reset() // Clear the form after successful update
      setSelectedPatient(null) // Clear selected patient after update
      // Notify rest of app to refresh appointments
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appointments:refresh'))
      }
      onClose()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to update appointment"),
        variant: "destructive",
      })
    }
  })

  // Handle selecting a patient from search results
  const handlePatientSelect = (patient: SearchPatientResult) => {
    // Determine the correct patient name based on different possible API structures
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

    // Get client ID - check both possible locations based on API structure
    const clientId = patient.clientId || patient.client?.id;

    // Check if the patient is inactive
    if (patient.isActive === false) {
      toast({
        title: "Inactive Patient",
        description: "This patient is inactive. Cannot create appointments for inactive patients.",
        variant: "destructive",
      });
      setPatientSearchQuery("");
      setIsSearchDropdownOpen(false);
      return;
    }

    // Select the patient
    setSelectedPatient({
      id: patient.id,
      name: patientName,
      clientId: clientId,
      isActive: patient.isActive
    });

    form.setValue("patientId", patient.id, { shouldValidate: true });
    if ((form as any).clearErrors) {
      (form as any).clearErrors("patientId");
    }
    if ((form as any).trigger) {
      (form as any).trigger("patientId");
    }
    setPatientSearchQuery(""); // Clear the search input
    setIsSearchDropdownOpen(false); // Close the dropdown

  }

  const handleSlotClick = (slotId: string) => {
    setSelectedSlot(slotId);
    form.setValue("slotId", slotId, { shouldValidate: true });
    form.clearErrors("slotId");
  };

  // Handle form validation errors
  const onSubmit = async (data: NewAppointmentFormValues) => {
    try {
      // appointmentDate is already a Date object now
      if (!data.appointmentDate) {
        throw new Error("Appointment date is required");
      }
      // Format date using local date methods to maintain consistency
      const formattedAppointmentDate = `${data.appointmentDate.getFullYear()}-${String(data.appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(data.appointmentDate.getDate()).padStart(2, '0')}`;

      // Check for the selected patient
      if (!selectedPatient) {
        toast({
          title: "Patient Required",
          description: "Please select a patient for this appointment.",
          variant: "destructive",
          duration: 800,
        });
        return;
      }

      // Check if the patient is inactive
      if (selectedPatient.isActive === false) {
        toast({
          title: "Inactive Patient",
          description: "Cannot create appointments for inactive patients. Please activate the patient first.",
          variant: "destructive",
        });
        return;
      }

      // Try to get client ID from the selected patient
      let clientId = selectedPatient.clientId;

      // If no client ID yet, check if we can find this patient in our patients list
      if (!clientId && patientsResponse) {
        const patientId = selectedPatient.id;
        // Find the patient in our full patient data
        const fullPatientData = patientsResponse.items?.find((p: any) => p.id === patientId);

        if (fullPatientData && fullPatientData.clientId) {
          clientId = fullPatientData.clientId;

          // Update the selected patient with the client ID and active status for future reference
          setSelectedPatient({
            ...selectedPatient,
            clientId: clientId,
            isActive: selectedPatient.isActive ?? fullPatientData.isActive
          });
        }
      }

      if (!clientId) {
        toast({
          title: "Missing Client Information",
          description: "To create an appointment, this patient must have an associated client. Please update the patient record first.",
          variant: "destructive",
          duration: 800,
        });
        return; // Prevent form submission
      }

      // Check if the client (owner) is inactive — use hook data if available, otherwise fetch directly
      const clientData = selectedClientData?.id === clientId
        ? selectedClientData
        : await getClientById(clientId);

      if (clientData && clientData.isActive === false) {
        toast({
          title: "Inactive Client",
          description: "Cannot create appointments because the owner (client) is inactive. Please activate the client first.",
          variant: "destructive",
        });
        return;
      }

      // Find selected slot details from the availableSlots array
      const selectedSlotDetails = availableSlots.find(slot => slot.id === data.slotId);

      if (!selectedSlotDetails) {
        toast({
          title: "Error",
          description: "Selected slot information not found",
          variant: "destructive",
          duration: 800,
        });
        return;
      }

      const formattedData = {
        ...data,
        clientId,
        appointmentDate: formattedAppointmentDate,
        appointmentTimeFrom: selectedSlotDetails.startTime,
        appointmentTimeTo: selectedSlotDetails.endTime,
        roomSlotId: data.slotId, // Keep for backward compatibility
        createdBy: user?.id,
      } as any; // Use type assertion to allow adding id property

      // Add isRegistered and sendEmail for appointment approvals
      if (appointmentId) {
        formattedData.isRegistered = false; // Mark as not registered (approved)
        formattedData.id = appointmentId; // Include the ID in the payload data
        formattedData.status = "scheduled"; // Ensure status is set to scheduled when updating

        if (sendEmail) {
          formattedData.sendEmail = true; // Send confirmation email
        }

        // Update existing appointment
        updateAppointmentMutation.mutate({
          id: appointmentId,
          data: formattedData
        });
      } else {
        // Create new appointment
        createAppointment(formattedData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast({
            title: "Validation Error",
            description: `${err.path.join('.')}: ${err.message}`,
            variant: "destructive",
          });
        });
      } else if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  }

  const handlePatientCreated = async () => {
    await refetchPatients()
    const latestPatient = patientsResponse?.items?.[patientsResponse.items?.length - 1]
    if (latestPatient) {
      form.setValue("patientId", latestPatient.id, { shouldValidate: true })
      if ((form as any).clearErrors) {
        (form as any).clearErrors("patientId");
      }

      // Update the selected patient state
      setSelectedPatient({
        id: latestPatient.id,
        name: latestPatient.name,
        clientId: latestPatient.clientId,
        isActive: latestPatient.isActive
      });

      toast({
        title: "Patient added",
        description: `${latestPatient.name} has been added successfully.`,
        variant: "success",
      })
    } else {
      toast({
        title: "Patient added",
        description: "Patient has been added successfully, refreshing patient list.",
        variant: "success",
      })
    }

    // Always close the form regardless of patient data availability
    setShowNewPatientForm(false)
  }

  // const handlePatientSearch = (searchTerm: string) => {
  //   setPatientSearchQuery(searchTerm)

  //   // Update URL with search parameter but don't expose specific fields
  //   const url = new URL(window.location.href);
  //   url.searchParams.set('search', encodeURIComponent(searchTerm));

  //   // Update the URL without page reload
  //   window.history.pushState({}, '', url.toString());
  // }

  const handlePatientSearch = (searchTerm: string) => {
     setPatientSearchQuery(searchTerm)
     setIsSearchDropdownOpen(true)
   }
  const debouncedPatientQuery = useDebounce(handlePatientSearch, 300)

  const handleCancel = () => {
    setShowNewPatientForm(false)
    form.reset() // Clear the form on close
    setSelectedPatient(null) // Clear selected patient on close
    setSelectedSlot(null) // Clear selected slot
    form.setValue("slotId", "") // Clear slot ID in form
    // Reset clinic to empty for administrators so they see the placeholder
    if (userType?.isAdmin) {
      form.setValue("clinicId", "");
    }
    onClose()
  }

  const handleClinicDefaultState = () => {
    // Don't overwrite preSelectedClinic if it's already set
    if (preSelectedClinic) {
      return;
    }

    // For clinic admins, auto-select their assigned clinic
    if (userType?.isClinicAdmin && user?.clinics && user.clinics.length > 0) {
      const clinicId = user.clinics[0].clinicId;
      form.setValue("clinicId", clinicId);
    }
    // For regular users, set default clinic if available
    else if (clinic?.id && !(userType?.isAdmin || userType?.isSuperAdmin)) {
      form.setValue("clinicId", clinic.id);
    }
    else if (clinicOptions.length === 1 && !(userType?.isAdmin || userType?.isSuperAdmin)) {
      form.setValue("clinicId", clinicOptions[0].value);
    }
  }

  useEffect(() => {
    handleClinicDefaultState()
  }, [clinic])

  // Make sure this runs when component mounts and when preSelectedClinic/preSelectedRoom changes
  useEffect(() => {
    console.log("Init form with selections:", { preSelectedClinic, preSelectedRoom, isOpen });

    if (isOpen) {
      // Force a slight delay to ensure the form is ready
      setTimeout(() => {
        // Set clinic ID (from props, user clinics, or context)
        if (preSelectedClinic) {
          console.log("Setting clinic ID:", preSelectedClinic);
          form.setValue("clinicId", preSelectedClinic);
        }
        // For clinic admins, use their assigned clinic
        else if (userType?.isClinicAdmin && user?.clinics && user.clinics.length > 0) {
          const clinicId = user.clinics[0].clinicId;
          console.log("Setting clinic ID for clinic admin:", clinicId);
          form.setValue("clinicId", clinicId);
        }
        // For regular users, use context clinic
        else if (clinic?.id && !(userType?.isAdmin || userType?.isSuperAdmin)) {
          console.log("Setting clinic ID from context:", clinic.id);
          form.setValue("clinicId", clinic.id);
        }

        // Set room ID if provided
        if (preSelectedRoom) {
          console.log("Setting room ID:", preSelectedRoom);
          form.setValue("roomId", preSelectedRoom);
        }

        // If patientId is provided, set it in the form
        if (patientId && specificPatient) {
          form.setValue("patientId", patientId, { shouldValidate: true });
          if ((form as any).clearErrors) {
            (form as any).clearErrors("patientId");
          }
          setSelectedPatient({
            id: specificPatient.id,
            name: specificPatient.name,
            clientId: specificPatient.clientId,
            isActive: specificPatient.isActive
          });
        }
      }, 100);
    }
  }, [isOpen, preSelectedClinic, preSelectedRoom, patientId, specificPatient, form, clinic, user?.clinics, userType]);

  // Pre-fill form with appointment data when editing
  useEffect(() => {
    if (isOpen && appointmentId && appointmentData) {
      // Set form values from appointment data
      form.setValue("clinicId", appointmentData.clinicId);
      form.setValue("patientId", appointmentData.patientId);
      form.setValue("veterinarianId", appointmentData.veterinarianId);
      form.setValue("roomId", appointmentData.roomId);

      // Handle date
      if (appointmentData.appointmentDate) {
        const appointmentDate = new Date(appointmentData.appointmentDate);
        form.setValue("appointmentDate", appointmentDate);
      }

      // Set other fields
      form.setValue("slotId", appointmentData.roomSlotId || appointmentData.slotId);
      form.setValue("appointmentTypeId", appointmentData.appointmentTypeId);
      form.setValue("reason", appointmentData.reason || "");
      form.setValue("notes", appointmentData.notes || "");
      form.setValue("status", appointmentData.status || "scheduled");

      // Set selected slot
      if (appointmentData.roomSlotId || appointmentData.slotId) {
        setSelectedSlot(appointmentData.roomSlotId || appointmentData.slotId);
      }

      // Set selected patient
      if (appointmentData.patient) {
        setSelectedPatient({
          id: appointmentData.patientId,
          name: appointmentData.patient.name,
          clientId: appointmentData.clientId,
          isActive: appointmentData.patient.isActive
        });
      }
    }
  }, [isOpen, appointmentId, appointmentData, form]);

  // Clear the selected patient
  const clearSelectedPatient = () => {
    setSelectedPatient(null);
    form.setValue("patientId", "");
  }

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
    // eslint-disable-next-line
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
    // eslint-disable-next-line
  }, [notesTranscriber.output?.isBusy]);

  // Remove the room slot dependency - we'll only use veterinarian slots now
  useEffect(() => {
    if (selectedVeterinarianId) {
      // Clear the selected slot when veterinarian changes
      setSelectedSlot(null);
      form.setValue("slotId", "");
    }
  }, [selectedVeterinarianId]);

  // Handler for AI formatting of reason
  const handleAIFormatReason = async () => {
    const currentReason = form.getValues("reason");
    if (!currentReason) return;
    setIsReasonFormatting(true);
    try {
      const formatted = await reasonFormatting(currentReason);
      form.setValue("reason", formatted);
    } catch (e) {
      // Optionally show error toast
      toast({ title: "AI Formatting Error", description: "Failed to format reason.", variant: "destructive" });
    } finally {
      setIsReasonFormatting(false);
    }
  };

  // Handler for AI formatting of notes
  const handleAIFormatNotes = async () => {
    const currentNotes = form.getValues("notes");
    if (!currentNotes) return;
    setIsNotesFormatting(true);
    try {
      const formatted = await notesFormatting(currentNotes);
      form.setValue("notes", formatted);
    } catch (e) {
      toast({ title: "AI Formatting Error", description: "Failed to format notes.", variant: "destructive" });
    } finally {
      setIsNotesFormatting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleCancel}>
      <SheetContent className={`w-[95%] sm:!max-w-full overflow-x-hidden overflow-y-hidden transition-all duration-300 ${
        showNewPatientForm 
          ? 'md:!max-w-[90%] lg:!max-w-[90%]'
          : 'md:!max-w-[50%] lg:!max-w-[50%]'
        }`}>


        <div className="flex gap-6">

          {/* Appointment Form Section */}
          <div className={showNewPatientForm ? 'flex-1 w-1/3' : 'flex-1 w-full'}>
            <SheetHeader className='relative top-[-14px]'>
              <SheetTitle>{appointmentId ? 'Update Appointment' : 'New Appointment'}</SheetTitle>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={(e) => {
                form.handleSubmit(onSubmit)(e);
              }} className="space-y-6  ">
                <div className='p-4 rounded-md h-[calc(100vh-10rem)] overflow-y-auto border'>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    {/* Show clinic selection ONLY for administrators */}
                    {userType?.isAdmin && (
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
                    )}

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
                                  <div>
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
                                    {selectedPatient.isActive === false && (
                                      <p className="text-sm text-red-600 mt-1 font-medium">Patient is inactive. Appointment cannot be created.</p>
                                    )}
                                    {selectedClientData && selectedClientData.isActive === false && (
                                      <p className="text-sm text-red-600 mt-1 font-medium">Owner (client) is inactive. Appointment cannot be created.</p>
                                    )}
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
                                          handlePatientSearch(e.target.value);
                                          setIsSearchDropdownOpen(true);
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
                                              // Get the client name first
                                              let clientName = '';

                                              if (patient.client) {
                                                clientName = `${patient.client.firstName || ''} ${patient.client.lastName || ''}`.trim();
                                              } else if (patient.clientFirstName || patient.clientLastName) {
                                                clientName = `${patient.clientFirstName || ''} ${patient.clientLastName || ''}`.trim();
                                              }

                                              // Get the patient name
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

                                              // If we still don't have a patient name, use the ID as last resort
                                              if (!patientName) {
                                                patientName = `Patient (ID: ${patient.id.substring(0, 8)}...)`;
                                              }

                                              // Combine client and patient names with phone number in the format {clients name}-{patients name} ({phone})
                                              const phoneNumber = patient.clientPhonePrimary;
                                              const microchipDisplay = patient.microchipNumber ? ` (Microchip: ${patient.microchipNumber})` : '';

                                              const displayName = clientName
                                                ? phoneNumber
                                                  ? `${patientName}-${clientName} (${phoneNumber})${microchipDisplay}`
                                                  : `${patientName}-${clientName}${microchipDisplay}`
                                                : `${patientName}${microchipDisplay}`;

                                              const isInactive = patient.isActive === false;

                                              return (
                                                <li
                                                  key={patient.id}
                                                  className={`px-4 py-2 ${isInactive ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-100'}`}
                                                  onClick={() => handlePatientSelect(patient)}
                                                >
                                                  <div className="font-medium">
                                                    {displayName}
                                                    {isInactive && <span className="ml-2 text-xs text-red-600 font-semibold">(Inactive)</span>}
                                                  </div>
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
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={() => setShowNewPatientForm(!showNewPatientForm)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <input type="hidden" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Only show veterinarian selection for non-veterinarian users */}
                    {!userType.isVeterinarian && (
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
                    )}

                    <FormField
                      control={form.control}
                      name="roomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room</FormLabel>
                          <FormControl>
                            <Combobox
                              options={roomOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder={isLoadingRooms ? "Loading rooms..." : "Select room"}
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
                              placeholder={isLoadingAppointmentTypes ? "Loading appointment types..." : "Select appointment type"}
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
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

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
                        );
                      }}
                    />
                  </div>

                  {/* Available Slots section - only show when veterinarian and date are selected */}
                  {selectedVeterinarianId && selectedDate && (
                    <FormField
                      control={form.control}
                      name="slotId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Available Slots
                          </FormLabel>
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
                                          ? 'bg-[#D2EFEC] border-[#1E3D3D] text-[#1E3D3D]'
                                          : 'bg-gray-50 border-gray-200'
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

                  <div className="space-y-6 mt-6">
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
                              className="ml-2 flex items-center gap-1 font-semibold bg-[#1E3D3D] text-white shadow-lg hover:bg-[#152B2B] hover:text-white hover:scale-105 transition-transform duration-150 border-0 px-2 py-0.5 rounded-full text-sm"
                            >
                              <Sparkles className="w-3 h-3" />
                              {isReasonFormatting ? <Loader2 className="w-3 h-3 animate-spin" /> : "AI Format"}
                            </Button>
                          </div>
                          <FormControl>
                            <textarea
                              id="reason"
                              value={field.value}
                              onChange={e => field.onChange(e.target.value)}
                              className="w-full h-20 p-2 border rounded-md"
                            />
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
                              onClick={handleAIFormatNotes}
                              disabled={isNotesFormatting}
                              className="ml-2 flex items-center gap-1 font-semibold bg-[#1E3D3D] text-white shadow-lg hover:bg-[#152B2B] hover:text-white hover:scale-105 transition-transform duration-150 border-0 px-2 py-0.5 rounded-full text-sm"
                            >
                              <Sparkles className="w-3 h-3" />
                              {isNotesFormatting ? <Loader2 className="w-3 h-3 animate-spin" /> : "AI Format"}
                            </Button>
                          </div>
                          <FormControl>
                            <textarea
                              id="notes"
                              value={field.value}
                              onChange={e => field.onChange(e.target.value)}
                              className="w-full h-20 p-2 border rounded-md"
                            />
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
                </div>

                <SheetFooter>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" className="theme-button text-white" disabled={isPending || showNewPatientForm}>
                    {isPending ? (appointmentId ? "Updating..." : "Creating...") : (appointmentId ? "Update Appointment" : "Create Appointment")}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>

          {/* New Patient Form Section */}
          {showNewPatientForm && (
            <div className="w-2/3 border-l pl-6">
              <h3 className="text-lg font-semibold relative top-[-14px]">Add New Patient</h3>
              <NewPatientForm onSuccess={handlePatientCreated} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default NewAppointment
