"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Search, Trash2, Pencil, XIcon, FileText, Printer, X, AlertTriangle } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Combobox } from "@/components/ui/combobox"
import { useGetAppointments } from "@/queries/appointment/get-appointment"
import { useDeleteAppointment } from "@/queries/appointment/delete-appointment"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { CancelConfirmationDialog } from "@/components/ui/cancel-confirmation-dialog"
import { toast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import useAppointmentFilter from "./hooks/useAppointmentFilter"
import { DatePickerWithRangeV2 } from "../../ui/custom/date/date-picker-with-range"
import { useRootContext } from "@/context/RootContext"
import { User } from "@/hooks/useContentLayout"
import { useGetAppointmentByPatientId } from "@/queries/appointment/get-appointment-by-patient-id"
import { useGetUsers, User as ApiUser } from "@/queries/users/get-users"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGetRole } from "@/queries/roles/get-role";
import { useGetClinic } from "@/queries/clinic/get-clinic"
import { usePathname, useSearchParams } from "next/navigation"
import DischargeSummarySheet from "./discharge-summary-sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Extended API user type with clinicId
interface ExtendedUser extends ApiUser {
  clinicId?: string;
}

interface Appointment {
  id: string;
  veterinarian?: {
    firstName?: string;
    lastName?: string;
  };
  patient?: {
    name?: string;
  };
  client?: {
    firstName?: string;
    lastName?: string;
  };
  status: string;
  appointmentType?: string;
}

export default function AppointmentList({
  onAppointmentClick,
  selectedPatientId
}: {
  onAppointmentClick: (id: string) => void,
  selectedPatientId?: string
}) {
  const pathname = usePathname();

  const { user, userType, IsAdmin, clinic } = useRootContext()
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null);
  const [dischargeSummaryOpen, setDischargeSummaryOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null)
  const { searchParams, handleSearch, handleStatus, handleProvider, handleClinic, handleDate, removeAllFilters } = useAppointmentFilter();

  const datesInitializedRef = useRef(false);

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

  const { data: clinicsData } = useGetClinic(1, 100, clinic?.companyId ?? null);
  const clinics = clinicsData?.items ?? [];

  const [localClinicId, setLocalClinicId] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);

      if (user.roleName === "Clinic Admin") {
        if (user.clinics && user.clinics.length > 0) {
          setLocalClinicId(user.clinics[0].clinicId);
        }
      }
    }
  }, []);


  const effectiveClinicId = useMemo(() => {
    if (userType.isAdmin) {
      return clinic?.id || "";
    } else if (userType.isClinicAdmin) {
      return localClinicId || "";
    } else if (userType.isVeterinarian || userType.isReceptionist || userType.isProvider) {
      // Vet + Receptionist + Provider use the selected clinic from context
      return clinic?.id || "";
    }
    return "";
  }, [
    userType.isAdmin,
    userType.isClinicAdmin,
    userType.isVeterinarian,
    userType.isReceptionist,
    userType.isProvider,
    clinic?.id,
    localClinicId
  ]);

  const { data: usersData } = useGetUsers(
    1,
    100,
    '',
    true, // enabled
    clinic?.companyId || '', // companyId
    effectiveClinicId ? [effectiveClinicId] : [], // Pass clinicId as an array
    veterinarianRoleId ? [veterinarianRoleId] : [] // Pass veterinarianRoleId as an array
  );

  // Filter users to get only veterinarians
  const veterinarians = useMemo(() => {
    if (!usersData?.items) return [];

    const vets = usersData.items.filter(user => user.roleName === "Veterinarian") as ExtendedUser[];

    // If not admin, we don't need to filter further since we already filtered by clinicId in the API call
    return vets;
  }, [usersData]);

  // Fetch appointments by patient ID if selectedPatientId is provided
  const { data: patientAppointments = [], isLoading: isLoadingPatientAppointments } = useGetAppointmentByPatientId(
    selectedPatientId || ""
  );

  // Fetch all appointments when no patient is selected
  // Fetch all appointments when no patient is selected
  // Use useMemo to create a stable reference for query params
  const appointmentQueryParams = useMemo(() => ({
    dateFrom: searchParams.dateFrom ?? null,
    dateTo: searchParams.dateTo ?? null,
    search: searchParams.search ?? null,
    status: searchParams.status ?? null,
    provider: searchParams.provider ?? null,

    clinicId: effectiveClinicId || null, // ✅ FIX
    patientId: searchParams.patientId ?? null,
    clientId: searchParams.clientId ?? null,
    veterinarianId: userType.isProvider
      ? user?.id ?? null
      : searchParams.veterinarianId ?? null,
    roomId: searchParams.roomId ?? null,

    appointmentId: null,        
    tab: activeTab ?? null,      

    pageNumber: currentPage,
    pageSize: pageSize,
    isRegistered: false,
    companyId: userType.isAdmin ? user?.companyId ?? null : null,
  }), [
    searchParams.dateFrom,
    searchParams.dateTo,
    searchParams.search,
    searchParams.status,
    searchParams.provider,
    effectiveClinicId,
    searchParams.patientId,
    searchParams.clientId,
    userType.isProvider,
    user?.id,
    searchParams.veterinarianId,
    searchParams.roomId,
    currentPage,
    pageSize,
    userType.isAdmin,
    user?.companyId,
    activeTab
  ]);


  // In your AppointmentList component, update the useGetAppointments call:
  const {
    data: allAppointments = [],
    isLoading: isLoadingAllAppointments,
    refetch: refetchAppointments,
    isFetching: isFetchingAppointments
  } = useGetAppointments(appointmentQueryParams, {
    enabled: Boolean(effectiveClinicId) // Add this enabled condition
  });

  // Refresh appointments when a new appointment is created/updated elsewhere
  useEffect(() => {
    const handleRefresh = () => {
      if (refetchAppointments) {
        refetchAppointments();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('appointments:refresh', handleRefresh);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('appointments:refresh', handleRefresh);
      }
    };
  }, [refetchAppointments]);

  useEffect(() => {

    // Reset to first page when clinic changes
    setCurrentPage(1);

    // Clear any search queries that might be clinic-specific
    setSearchQuery("");

    // Reset active tab
    setActiveTab("all");

    // Reset provider selection
    setSelectedProvider("");

  }, [effectiveClinicId]);

  // Use patient-specific appointments when selectedPatientId is provided, otherwise use all appointments
  const appointments = selectedPatientId ? patientAppointments : allAppointments;
  const isLoading = selectedPatientId ? isLoadingPatientAppointments : isLoadingAllAppointments;

  // Extract pagination information from API response
  const paginationInfo = useMemo(() => {
    if (!selectedPatientId && allAppointments && typeof allAppointments === 'object') {
      return {
        totalCount: allAppointments.totalCount || 0,
        pageNumber: allAppointments.pageNumber || 1,
        pageSize: allAppointments.pageSize || 10,
        totalPages: allAppointments.totalPages || 1,
      };
    }
    return {
      totalCount: 0,
      pageNumber: currentPage,
      pageSize: pageSize,
      totalPages: 1,
    };
  }, [allAppointments, currentPage, pageSize, selectedPatientId]);

  const appointmentItems = useMemo(() => {
    if (selectedPatientId) {
      return patientAppointments;
    }

    // Check if allAppointments has items property
    if (allAppointments && allAppointments.items && Array.isArray(allAppointments.items)) {
      return allAppointments.items;
    }

    // Fallback if allAppointments itself is an array
    if (Array.isArray(allAppointments)) {
      return allAppointments;
    }

    // Default empty array if no data
    return [];
  }, [allAppointments, patientAppointments, selectedPatientId]);

  const deleteAppointmentMutation = useDeleteAppointment({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to delete appointment"),
        variant: "destructive",
      })
    }
  })

  // Add update mutation
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to update appointment status"),
        variant: "destructive",
      })
    }
  })

  // Helper function to check if appointment date is in the future
  const isFutureAppointment = (appointmentDateString: string) => {
    const appointmentDate = new Date(appointmentDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    return appointmentDate > today;
  };

  // // Add create visit mutation
  // const createVisitMutation = useCreateVisit()

  // --- Start: Data Enrichment ---
  // The API now provides nested user data, so we directly enrich the appointments
  const enrichedAppointments = useMemo(() => {
    // Ensure appointments is an array before mapping
    if (!Array.isArray(appointmentItems)) {
      return [];
    }

    return appointmentItems.map(appointment => {
      const patientName = appointment.patient?.name || 'N/A';
      const ownerName = `${appointment.client?.firstName || ''} ${appointment.client?.lastName || ''}`.trim() || 'N/A';
      const providerName = `${appointment.veterinarian?.firstName || ''} ${appointment.veterinarian?.lastName || ''}`.trim() || 'N/A';

      return {
        ...appointment,
        patient: patientName,
        owner: ownerName,
        provider: providerName,
      };
    });
  }, [appointmentItems]); // Re-run when appointments data changes
  // --- End: Data Enrichment ---

  // Use the enriched appointments directly and filter in the frontend
  const filteredAppointments = useMemo(() => {
    // Debug: Log appointment types for completed appointments
    // const completedAppointments = enrichedAppointments.filter(a => a.status === "completed");
    // if (completedAppointments.length > 0) {
    //   console.log('Completed appointments with types:', completedAppointments.map(a => ({
    //     id: a.id,
    //     appointmentType: a.appointmentType,
    //     appointmentTypeName: a.appointmentType?.name
    //   })));
    // }

    // First filter out any appointments with status "requested"
    let filtered = enrichedAppointments.filter(a => a.status !== "requested");

    // Apply status filter based on active tab
    if (activeTab === "all") {
      // No additional filtering needed, we already filtered out "requested"
    } else if (activeTab === "scheduled") {
      filtered = filtered.filter(
        (a) => a.status === "scheduled" || a.status === "confirmed"
      );
    } else if (activeTab === "checked-in") {
      filtered = filtered.filter((a) => a.status === "in_progress");
    } else if (activeTab === "completed") {
      filtered = filtered.filter((a) => a.status === "completed");
    } else if (activeTab === "cancelled") {
      filtered = filtered.filter((a) => a.status === "cancelled");
    }

    // Apply search filter client-side
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(appointment =>
        appointment.patient?.toLowerCase().includes(query) ||
        appointment.owner?.toLowerCase().includes(query) ||
        appointment.appointmentType?.toLowerCase().includes(query)
      );
    }

    // Note: Provider filtering is now handled by the API using veterinarianId parameter
    // We don't need to filter by provider name client-side anymore

    return filtered;
  }, [enrichedAppointments, activeTab, searchQuery]);

  // Update counts based on filtered data
  const scheduledCount = enrichedAppointments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed"
  ).length;
  const checkedInCount = enrichedAppointments.filter(
    (a) => a.status === "in_progress"
  ).length;
  const completedCount = enrichedAppointments.filter(
    (a) => a.status === "completed"
  ).length;
  const cancelledCount = enrichedAppointments.filter(
    (a) => a.status === "cancelled"
  ).length;
  const allCount = enrichedAppointments.length;

  // Calculate today's appointments count
  const todayAppointmentsCount = enrichedAppointments.length;

  // Calculate today's completed appointments
  const todayCompletedCount = enrichedAppointments.filter(
    (a) => a.status === "completed"
  ).length;

  // Provider options from users API
  const providerOptions = useMemo(() => {
    // Create options from veterinarians data
    const options = [
      { value: "", label: "All Providers" },
      ...veterinarians.map(vet => ({
        value: vet.id, // Use the veterinarian's ID as the value
        label: `${vet.firstName} ${vet.lastName}`.trim()
      }))
    ];
    return options;
  }, [veterinarians]);

  // Handle provider selection
  const handleProviderSelection = (providerId: string) => {
    setSelectedProvider(providerId);

    // Update search parameters to include veterinarianId
    const params: any = {
      veterinarianId: providerId || null,
      pageNumber: 1 // Reset to page 1 when changing provider
    };

    // Remove the provider parameter as we're using veterinarianId instead
    if (searchParams.provider) {
      params.provider = null;
    }

    handleProvider(providerId);
  };

  const handleDefaultState = () => {
    // Set provider filter if user is a provider
    if (userType.isProvider && user?.id) {
      setSelectedProvider(user.id);
      handleProviderSelection(user.id);
    }
  }

  // Function to initialize today's date filter
  const initializeTodayDateFilter = () => {
    // Only set the date filter if it's not already set and we haven't initialized it yet
    //console.log("function call" , !searchParams.dateFrom , !searchParams.dateTo , !datesInitializedRef.current)
    if ((!searchParams.dateFrom || !searchParams.dateTo)) {
      const today = new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
      handleDate(today, today);
      datesInitializedRef.current = true;
    }
  }

  useEffect(() => {
    handleDefaultState();
  }, [userType, user]);

  // Initialize with today's date when component mounts
  useEffect(() => {
    //console.log("pathname", pathname , searchParams);
    initializeTodayDateFilter();
  }, [pathname, searchParams.dateTo, searchParams.dateFrom]);

  // Status options
  // You might want to dynamically generate these options based on the fetched appointments.
  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "Scheduled", label: "Scheduled" },
    { value: "In Room", label: "In Room" },
    { value: "In Progress", label: "In Progress" },
    { value: "Completed", label: "Completed" },
    { value: "Cancelled", label: "Cancelled" },
  ]

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-[#D2EFEC] text-[#1E3D3D] dark:bg-[#1E3D3D]/20 dark:text-[#D2EFEC]"
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

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "appointmentDate",
      header: "Date",
      cell: ({ row }) => {
        const appointment = row.original;
        if (appointment.appointmentDate) {
          // Format date as MM/DD/YYYY
          const date = new Date(appointment.appointmentDate);
          return date.toLocaleDateString('en-GB');
        }
        return 'N/A';
      },
    },
    {
      accessorKey: "startTime",
      header: "Time",
      cell: ({ row }) => {
        const appointment = row.original;

        // First try to use appointmentTimeFrom and appointmentTimeTo (new API format)
        if (appointment.appointmentTimeFrom && appointment.appointmentTimeTo) {
          const formatTime = (timeString: string) => {
            // Format time to HH:MM
            if (timeString.includes(':')) {
              const timeParts = timeString.split(':');
              return `${timeParts[0]}:${timeParts[1]}`;
            }
            return timeString;
          };

          return `${formatTime(appointment.appointmentTimeFrom)} - ${formatTime(appointment.appointmentTimeTo)}`;
        }

        // Check if roomSlot and startTime exist (legacy format)
        if (appointment.roomSlot && appointment.roomSlot.startTime) {
          // Format time to HH:MM
          const timeValue = appointment.roomSlot.startTime;

          // Handle HH:MM:SS format
          if (timeValue.includes(':')) {
            const timeParts = timeValue.split(':');
            return `${timeParts[0]}:${timeParts[1]}`;
          }

          return timeValue;
        }

        // Fallback to direct startTime if exists
        if (appointment.startTime) {
          return appointment.startTime;
        }

        return 'N/A';
      },
    },
    {
      accessorKey: "patient",
      header: "Patient",
    },
    {
      accessorKey: "owner",
      header: "Owner",
    },
    {
      accessorKey: "appointmentType",
      header: "Visit Type",
      cell: ({ row }) => {
        const appointmentType = row.original.appointmentType;
        // Handle case when appointmentType is an object with name property
        return typeof appointmentType === 'object' && appointmentType?.name
          ? appointmentType.name
          : appointmentType || 'N/A';
      },
    },
    {
      accessorKey: "provider",
      header: "Provider",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={`${getStatusBadgeClass(row.original.status)} hover:bg-inherit hover:text-inherit`}>
         {row.original.status === "cancelled" ? "Cancelled" : row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>

          {/* For scheduled or confirmed: show Check In and Cancel */}
          {(row.original.status === "scheduled" || row.original.status === "confirmed") && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`theme-button-outline ${isFutureAppointment(row.original.appointmentDate)
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFutureAppointment(row.original.appointmentDate)) {
                            toast({
                              title: "Error",
                              description: "Cannot check in a future appointment.",
                              variant: "destructive",
                            });
                            return;
                          }

                          updateAppointmentMutation.mutate({
                            id: row.original.id.toString(),
                            data: {
                              id: row.original.id,
                              clinicId: row.original.clinicId,
                              patientId: row.original.patientId,
                              clientId: row.original.clientId,
                              veterinarianId: row.original.veterinarianId,
                              roomId: row.original.roomId,
                              appointmentDate: row.original.appointmentDate,
                              appointmentTimeFrom: row.original.appointmentTimeFrom,
                              appointmentTimeTo: row.original.appointmentTimeTo,
                              startTime: row.original.startTime,
                              endTime: row.original.endTime,
                              appointmentTypeId: row.original.appointmentTypeId,
                              reason: row.original.reason,
                              status: "in_progress",
                              notes: row.original.notes,
                              createdBy: row.original.createdBy,
                            }
                          });
                        }}
                        disabled={
                          updateAppointmentMutation.isPending ||
                          isFutureAppointment(row.original.appointmentDate)
                        }
                      >
                        Check In
                      </Button>
                    </span>
                  </TooltipTrigger>

                  {isFutureAppointment(row.original.appointmentDate) && (
                    <TooltipContent>
                      <p>Cannot check in a future date</p>
                    </TooltipContent>

                  )}
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelClick(row.original);
                }}

                disabled={updateAppointmentMutation.isPending}
                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                title="Cancel appointment"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {/* For in_progress: show Cancel only */}
          {row.original.status === "in_progress" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCancelClick(row.original)}

              disabled={updateAppointmentMutation.isPending}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              title="Cancel appointment"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {/* Delete button removed - appointments should be canceled, not deleted */}
          {/* Keep SOAP buttons */}
          {row.original.status === "In Progress" && (
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-200 text-gray-500 border-gray-300 opacity-50"
              disabled
            >
              SOAP
            </Button>
          )}
          {row.original.status === "completed" && (
            <>
              {/* Show discharge summary for consultation, surgery, emergency, deworming appointments or if appointment type is not available */}
              {(row.original.appointmentType?.name?.toLowerCase().includes('consultation') ||
                row.original.appointmentType?.name?.toLowerCase().includes('surgery') ||
                row.original.appointmentType?.name?.toLowerCase().includes('emergency') ||
                row.original.appointmentType?.name?.toLowerCase().includes('deworming') ||
                row.original.appointmentType?.name?.toLowerCase().includes('vaccination') ||
                (typeof row.original.appointmentType === 'string' &&
                  (row.original.appointmentType.toLowerCase().includes('consultation') ||
                    row.original.appointmentType.toLowerCase().includes('surgery') ||
                    row.original.appointmentType.toLowerCase().includes('emergency') ||
                    row.original.appointmentType.toLowerCase().includes('deworming') ||
                    row.original.appointmentType.toLowerCase().includes('vaccination')
                  )
                ) ||
                !row.original.appointmentType) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="theme-button-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAppointmentId(row.original.id.toString())
                      setSelectedAppointmentType(row.original.appointmentType?.name || row.original.appointmentType || 'consultation')
                      setDischargeSummaryOpen(true)
                    }}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                )}
            </>
          )}
        </div>
      ),
    },
  ]

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointmentMutation.mutateAsync(id)
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to delete appointment"),
        variant: "destructive",
      })
    }
  }

  // Handle cancel appointment with confirmation
  const handleCancelClick = (appointment: any) => {

    setAppointmentToCancel(appointment)
    setIsCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
  if (!appointmentToCancel) return;

  try {
    await updateAppointmentMutation.mutateAsync({
      id: appointmentToCancel.id.toString(),
      data: {
        ...appointmentToCancel,
        status: "cancelled",
      }
    });

    toast({
      title: "Appointment Cancelled",
      description: `Appointment has been cancelled successfully.`,
      variant: "default",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: getToastErrorMessage(error, "Failed to cancel appointment"),
      variant: "destructive",
    });
  } finally {
    setIsCancelDialogOpen(false);
    setAppointmentToCancel(null);
  }
};


  // Update page handling
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Add pageNumber and pageSize to URL params
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('pageNumber', page.toString());
    urlParams.set('pageSize', pageSize.toString());
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Update pageSize handling
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    // Add pageNumber and pageSize to URL params
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('pageNumber', '1'); // Reset to page 1
    urlParams.set('pageSize', size.toString());
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3 mb-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-3">
            <DatePickerWithRangeV2
              date={{
                from: searchParams.dateFrom ? new Date(searchParams.dateFrom) : new Date(),
                to: searchParams.dateTo ? new Date(searchParams.dateTo) : new Date()
              }}
              setDate={async (date) => {
                try {
                  if (date?.from && date?.to) {
                    // Create copies to avoid mutating the original objects
                    const fromDate = new Date(date.from);
                    const toDate = new Date(date.to);
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    // Always set toDate to end of day to avoid timezone issues
                    toDate.setHours(23, 59, 59, 999);

                    // Format dates as YYYY-MM-DD for comparison
                    const formatDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const fromDateStr = formatDateOnly(fromDate);
                    const toDateStr = formatDateOnly(toDate);
                    const todayStr = formatDateOnly(today);
                    const yesterdayStr = formatDateOnly(yesterday);

                    setCurrentPage(1);

                    // If both dates are the same and it's today, use "today" preset
                    if (fromDateStr === toDateStr && fromDateStr === todayStr) {
                      handleDate("today", null);
                    }
                    // If both dates are the same and it's yesterday, use "yesterday" preset
                    else if (fromDateStr === toDateStr && fromDateStr === yesterdayStr) {
                      handleDate("yesterday", null);
                    }
                    // If the selected range is the current month, force the first and last day of the month
                    else if (
                      fromDate.getDate() === 1 &&
                      toDate.getMonth() === fromDate.getMonth() &&
                      toDate.getFullYear() === fromDate.getFullYear() &&
                      (toDate.getDate() === new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0).getDate())
                    ) {
                      // This is a full month selection, so force the correct range
                      const firstDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
                      const lastDay = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0);
                      lastDay.setHours(23, 59, 59, 999); // Set to end of day to avoid timezone issues
                      handleDate(formatDateOnly(firstDay), formatDateOnly(lastDay));
                    }
                    // Otherwise, use the date strings directly
                    else {
                      handleDate(fromDateStr, toDateStr);
                    }
                  } else {
                    // If date is cleared, reset date filters
                    setCurrentPage(1);
                    handleDate(null, null);
                  }
                } catch (error) {
                  console.error('Error updating date range:', error);
                }
              }}
              className="h-full md:w-[400px]"
            />
            {!userType.isProvider && (
              <div className="md:w-[400px]">
                <Combobox
                  options={providerOptions}
                  value={selectedProvider}
                  onValueChange={handleProviderSelection}
                  placeholder="Select Provider"
                  searchPlaceholder="Search veterinarians..."
                  emptyText="No veterinarians found."
                />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedProvider("")
              setSearchQuery("")
              setActiveTab("all")
              handleClinic(null)
              removeAllFilters()
            }}
          >
            <XIcon className="w-4 h-4" /> Clear Filters
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex justify-between overflow-x-auto mb-6 bg-white dark:bg-slate-800 rounded-lg">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-6 py-3 text-md font-medium  w-full ${activeTab === "all"
            ? "theme-active text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
        >
          All ({allCount})
        </button>
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`px-6 py-3 text-md font-medium  w-full ${activeTab === "scheduled"
            ? "theme-active text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
        >
          Scheduled ({scheduledCount})
        </button>
        <button
          onClick={() => setActiveTab("checked-in")}
          className={`px-6 py-3 text-md font-medium  w-full ${activeTab === "checked-in"
            ? "theme-active text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
        >
          Checked In ({checkedInCount})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-6 py-3 text-md font-medium  w-full ${activeTab === "completed"
            ? "theme-active text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setActiveTab("cancelled")}
          className={`px-6 py-3 text-md font-medium  w-full ${activeTab === "cancelled"
            ? "theme-active text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
        >
          Cancelled ({cancelledCount})
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredAppointments}
        searchColumn="patient"
        searchPlaceholder="Search appointments..."
        page={currentPage}
        pageSize={pageSize}
        totalPages={paginationInfo.totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onRowClick={(appointment) => onAppointmentClick(appointment.id.toString())}
      />

      {/* Discharge Summary Sheet */}
      {selectedAppointmentId && (
        <DischargeSummarySheet
          isOpen={dischargeSummaryOpen}
          onClose={() => {
            setDischargeSummaryOpen(false)
            setSelectedAppointmentId(null)
            setSelectedAppointmentType(null)
          }}
          appointmentId={selectedAppointmentId}
          appointmentType={selectedAppointmentType || undefined}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={(open) => {
          setIsCancelDialogOpen(open)
          if (!open) {
            setAppointmentToCancel(null)
          }
        }}
        onConfirm={handleCancelConfirm}
        title="Cancel Appointment"
        description={`Are you sure you want to cancel this appointment${appointmentToCancel?.patient?.name ? ` for ${appointmentToCancel.patient.name}` : ''}? This action cannot be undone.`}
        isDeleting={updateAppointmentMutation.isPending}

      />

    </div>
  )
}