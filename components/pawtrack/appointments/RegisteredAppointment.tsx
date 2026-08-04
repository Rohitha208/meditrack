"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { NewAppointmentDrawer } from "@/components/pawtrack/new-appointment-drawer"
import { ApproveAppointmentDrawer } from "@/components/pawtrack/approve-appointment-drawer"
import { useGetAppointments } from "@/queries/appointment/get-appointment"
import { useRootContext } from '@/context/RootContext'
import { useToast } from "@/hooks/use-toast"
import { Clock, User, Calendar, MapPin, CheckCircle, AlertCircle } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { DateRange } from 'react-day-picker'
import { DatePickerWithRangeV2 } from "@/components/ui/custom/date/date-picker-with-range";

interface RegisteredAppointmentProps { }

const RegisteredAppointment: React.FC<RegisteredAppointmentProps> = () => {
  const { toast } = useToast()
  const { user, clinic, IsAdmin, userType } = useRootContext()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewAppointmentDrawer, setShowNewAppointmentDrawer] = useState(false)
  const [editAppointmentId, setEditAppointmentId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from, to };
  });

  const formatDateOnly = (date: Date) => date.toISOString().split("T")[0];

  const today = new Date();
  const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const startIso = dateRange?.from
    ? formatDateOnly(dateRange.from)
    : formatDateOnly(startOfDayLocal);

  const endIso = dateRange?.to
    ? formatDateOnly(dateRange.to)
    : formatDateOnly(endOfDayLocal);

  // Fetch all appointments and filter for registered/pending ones
  const { data: appointmentsData, isLoading } = useGetAppointments(
    {
      search: null,
      status: null,
      provider: null,
      dateFrom: startIso,
      dateTo: endIso,
      clinicId:
        userType.isClinicAdmin && user?.clinicId
          ? user.clinicId
          : clinic?.id && clinic.id !== "undefined"
            ? clinic.id
            : null,

      companyId: null,
      patientId: null,
      clientId: null,
      veterinarianId: null,
      roomId: null,

      // ✅ MANDATORY FIELDS (always send)
      appointmentId: null,
      tab: "registered",

      pageNumber: currentPage,
      pageSize: pageSize,
      isRegistered: true,
    },
    {
      enabled:
        !!(userType.isClinicAdmin && user?.clinicId) ||
        !!(clinic?.id && clinic.id !== "undefined"),
    }
  )


  // Filter appointments to show only those that need assignment (no veterinarian assigned)
  const filteredAppointments = useMemo(() => {
    if (!appointmentsData || typeof appointmentsData !== 'object') return []
    const items = appointmentsData.items || []

    // Filter for appointments that don't have a veterinarian assigned or are in a "pending" state
    return items.filter((appointment: any) =>
      !appointment.veterinarianId ||
      appointment.isRegistered === true ||
      appointment.status === "pending" ||
      appointment.status === "registered" ||
      (appointment.status === "scheduled" && !appointment.roomId)
    )
  }, [appointmentsData])

  // Use filtered appointments for display
  const appointments = filteredAppointments

  const paginationInfo = useMemo(() => {
    return {
      totalCount: appointments.length,
      pageNumber: currentPage,
      pageSize: pageSize,
      totalPages: Math.ceil(appointments.length / pageSize),
    }
  }, [appointments, currentPage, pageSize])

  // Handle appointment approval
  const handleAcceptClick = (appointmentId: string) => {
    setEditAppointmentId(appointmentId);
    setShowNewAppointmentDrawer(true);
  };

  // Table columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "patient",
      header: "Patient",
      cell: ({ row }) => {
        const patient = row.original.patient
        return typeof patient === 'object' ? patient.name : patient || 'N/A'
      },
    },
    {
      accessorKey: "client",
      header: "Owner",
      cell: ({ row }) => {
        const client = row.original.client
        if (client) {
          return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'N/A'
        }
        return 'N/A'
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => row.original.reason || 'N/A',
    },
    {
      accessorKey: "appointmentType",
      header: "Type",
      cell: ({ row }) => {
        const appointmentType = row.original.appointmentType
        return typeof appointmentType === 'object' && appointmentType?.name
          ? appointmentType.name
          : appointmentType || 'N/A'
      },
    },
    {
      accessorKey: "createdAt",
      header: "Registered",
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          onClick={() => handleAcceptClick(row.original.id)}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Accept
        </Button>
      ),
    },
  ]

  // Handle search
  const handleSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Registered Appointments Queue</h1>
          <p className="text-gray-600 text-sm">Manage pending appointment registrations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4" />
            <span>{paginationInfo.totalCount} pending registrations</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Today's Registrations</p>
                <p className="text-2xl font-bold text-blue-600">{paginationInfo.totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{filteredAppointments.filter((a: any) => a.status === "registered").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Ready to Accept</p>
                <p className="text-2xl font-bold text-green-600">{filteredAppointments.filter((a: any) => a.status === "pending").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="border shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Registered Appointments
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Date Range Picker */}
              <DatePickerWithRangeV2
                date={dateRange}
                setDate={setDateRange}
                showYear={true}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={appointments}
            searchColumn="patient"
            searchPlaceholder="Search by patient name..."
            onSearch={handleSearch}
            page={currentPage}
            pageSize={pageSize}
            totalPages={paginationInfo.totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            className="min-h-[400px]"
          />
        </CardContent>
      </Card>

      {/* New Appointment Drawer - Similar to dashboard-screen.tsx */}
      {/* <NewAppointmentDrawer 
          isOpen={showNewAppointmentDrawer} 
          onClose={() => {
            setShowNewAppointmentDrawer(false);
            setEditAppointmentId(null);
          }} 
          appointmentId={null}
          sendEmail={false}
        /> */}

      <ApproveAppointmentDrawer
        isOpen={showNewAppointmentDrawer}
        appointmentId={editAppointmentId}
        onClose={() => {
          setShowNewAppointmentDrawer(false);
          setEditAppointmentId(null);
        }}
      />
    </div>
  )
}

export default RegisteredAppointment