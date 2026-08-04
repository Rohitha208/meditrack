"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, FileText, Eye } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useGetAppointmentByPatientId } from "@/queries/appointment/get-appointment-by-patient-id"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import NewAppointment from "@/components/pawtrack/appointments/newAppointment"
import AppointmentDetails from "@/components/pawtrack/appointments/appointment-details"
import { toast } from "@/components/ui/use-toast"
import DischargeSummarySheet from "@/components/pawtrack/appointments/discharge-summary-sheet"

interface PatientVisitsProps {
  isPatientActive?: boolean;
  isClientActive?: boolean;
}

export default function PatientVisits({ isPatientActive = true, isClientActive = true }: PatientVisitsProps) {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [viewAppointmentId, setViewAppointmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [dischargeSummaryOpen, setDischargeSummaryOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string | null>(null);

  const handleDischargeSummary = (appointment: any) => {
    setSelectedAppointmentId(appointment.id.toString());
    setSelectedAppointmentType(appointment.appointmentType?.name || appointment.appointmentType || 'consultation');
    setDischargeSummaryOpen(true);
  };

  // Fetch all appointments for this patient
  const { data: appointments = [], isLoading: isLoadingAppointments, refetch: refetchAppointments } = useGetAppointmentByPatientId(patientId);
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      refetchAppointments(); // Refetch to update the lists
      setActiveTab('upcoming'); // Switch to upcoming tab after rescheduling
      setViewAppointmentId(null); // Close the details/reschedule modal if open
    },
    onError: (error) => {
      alert(error?.message || 'Failed to update appointment');
    }
  });

  // Helper to parse date string to Date object
  const parseDate = (dateStr: string) => {
    // Try ISO, fallback to MM/DD/YYYY
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Split into upcoming and past
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingAppointments = (appointments || []).filter((appt: any) => {
    const apptDate = parseDate(appt.date || appt.appointmentDate);
    // Only show if date is today or in future AND status is not 'checked' and is 'scheduled'
    return (
      apptDate &&
      apptDate >= today &&
      (!appt.status || appt.status.toLowerCase() === 'scheduled' || appt.status.toLowerCase() === 'requested')
    );
  });
  const pastAppointments = (appointments || []).filter((appt: any) => {
    const apptDate = parseDate(appt.date || appt.appointmentDate);
    // Past is before today OR status is 'checked'
    return (
      apptDate &&
      (apptDate < today || (appt.status && appt.status.toLowerCase() === 'checked' || appt.status.toLowerCase() === 'completed' || appt.status.toLowerCase() === 'cancelled' || appt.status.toLowerCase() === 'in_progress'))
    );
  });

  return (
    <div className="space-y-6">
      {/* Appointment Calendar */}
      {/* <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appointment Calendar</h3>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-1 h-9 px-4">
                    <CalendarIcon className="h-4 w-4" />
                    {date ? format(date, "MMMM yyyy") : "Select Month"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="px-6 py-8">
            {/* Calendar preview would go here */}
            {/* <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400">
              <CalendarIcon className="h-12 w-12 mb-2" />
              <p className="text-sm">Calendar view would be displayed here</p>
              <p className="text-xs mt-1">Showing appointments for {format(date || new Date(), "MMMM yyyy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>  */}

      {/* Appointments List */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visits & Appointments</h3>
            <Button
              className="theme-button text-white"
              onClick={() => {
                if (!isPatientActive) {
                  toast({
                    title: "Cannot Book Appointment",
                    description: "This patient is inactive. Please activate the patient before creating an appointment.",
                    variant: "destructive",
                  });
                  return;
                }
                if (!isClientActive) {
                  toast({
                    title: "Cannot Book Appointment",
                    description: "The owner (client) of this patient is inactive. Please activate the client before creating an appointment.",
                    variant: "destructive",
                  });
                  return;
                }
                setShowNewAppointment(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New Appointment
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past Visits</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upcoming" className="p-0 mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date 
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Vet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {(upcomingAppointments as any[]).map((appointment) => (
                      <tr key={appointment.id}>
                         <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-200">
                            {(appointment.date || appointment.appointmentDate)?.split("T")[0]}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-200">
                            {appointment?.appointmentTimeFrom?.slice(0,5)} - {appointment?.appointmentTimeTo?.slice(0,5)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {appointment?.appointmentType?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {appointment?.veterinarian?.firstName} {appointment?.veterinarian?.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Scheduled'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewAppointmentId(appointment.id)}>
                              Reschedule
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              onClick={async () => {
                                await updateAppointmentMutation.mutateAsync({
                                  id: appointment.id.toString(),
                                  data: {
                                    id: appointment.id,
                                    clinicId: appointment.clinicId,
                                    patientId: appointment.patientId,
                                    clientId: appointment.clientId,
                                    veterinarianId: appointment.veterinarianId,
                                    roomId: appointment.roomId,
                                    appointmentDate: appointment.appointmentDate,
                                    startTime: appointment.startTime,
                                    endTime: appointment.endTime,
                                    appointmentTypeId: appointment.appointmentTypeId,
                                    reason: appointment.reason,
                                    status: "cancelled",
                                    notes: appointment.notes,
                                    createdBy: appointment.createdBy,
                                  }
                                });
                                // No reload, just refetch and switch tab
                              }}
                              disabled={updateAppointmentMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="past" className="p-0 mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Vet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {(pastAppointments as any[]).map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-200">
                            {(appointment.date || appointment.appointmentDate)?.split("T")[0]}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-200">
                            {appointment?.appointmentTimeFrom?.slice(0,5)} - {appointment?.appointmentTimeTo?.slice(0,5)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {appointment?.appointmentType?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {appointment?.veterinarian?.firstName} {appointment?.veterinarian?.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            {appointment.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setViewAppointmentId(appointment.id)}>
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDischargeSummary(appointment);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              <span>Summary</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showNewAppointment && (
        <NewAppointment
          isOpen={showNewAppointment}
          onClose={() => {
            setShowNewAppointment(false);
            setActiveTab('upcoming'); // Switch to upcoming tab after closing new appointment modal
            refetchAppointments();    // Refetch appointments to show the new one
          }}
          patientId={patientId}
        />
      )}

      {viewAppointmentId && (
        <AppointmentDetails
          appointmentId={viewAppointmentId}
          onClose={() => setViewAppointmentId(null)}
        />
      )}

      {/* Discharge Summary Sheet */}
      {selectedAppointmentId && (
        <DischargeSummarySheet
          isOpen={dischargeSummaryOpen}
          onClose={() => {
            setDischargeSummaryOpen(false);
            setSelectedAppointmentId(null);
            setSelectedAppointmentType(null);
          }}
          appointmentId={selectedAppointmentId}
          appointmentType={selectedAppointmentType || undefined}
        />
      )}
    </div>
  )
}