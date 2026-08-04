"use client"

import { useState } from "react"
import { DashboardWelcomeHeader } from "../../shared/dashboard-welcome-header"
import { useGetAppointments } from "@/queries/appointment/get-appointment"
import { useRootContext } from "@/context/RootContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export const ClientDashboard = ({
  onNewAppointment
}: {
  onNewAppointment: () => void
}) => {
  const today = new Date();
  const { user, clinic } = useRootContext();

  const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDayLocal = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate(), 23, 59, 59, 999); // Show appointments for the next month

  // Convert local time to UTC ISO string
  const startOfDay = new Date(startOfDayLocal.getTime() - startOfDayLocal.getTimezoneOffset() * 60000);
  const endOfDay = new Date(endOfDayLocal.getTime() - endOfDayLocal.getTimezoneOffset() * 60000);
  
  // Update searchParams to use date range and filter by client
  const searchParams = {
    search: null,
    status: null,
    provider: null,
    dateFrom: startOfDay.toISOString(),
    dateTo: endOfDay.toISOString(),
    clinicId: clinic?.id ?? null,
    companyId: clinic?.companyId ?? null,
    patientId: null,
    clientId: user?.id, // Filter by current client
    veterinarianId: null,
    roomId: null,
    pageNumber: 1,
    pageSize: 10,
    isRegistered: false,
    appointmentId: null,
    tab: "client-dashboard",
  };

  const { data: appointmentsData } = useGetAppointments(searchParams);

  // Format time helper
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    
    try {
      let hour, minute;
      
      if (timeStr.includes(':')) {
        [hour, minute] = timeStr.split(":");
      } else {
        return timeStr;
      }
      
      const date = new Date();
      date.setHours(Number(hour), Number(minute));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeStr;
    }
  };

  // Helper to check if a date is today
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // Filter and organize appointments
  const appointmentsItems = appointmentsData?.items || appointmentsData || [];
  
  const upcomingAppointments = Array.isArray(appointmentsItems) 
    ? appointmentsItems.filter((a: any) => new Date(a.appointmentDate) >= today).sort((a, b) => 
        new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
      )
    : [];

  const pastAppointments = Array.isArray(appointmentsItems) 
    ? appointmentsItems.filter((a: any) => new Date(a.appointmentDate) < today).sort((a, b) => 
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      )
    : [];

  return (
    <div className="p-6 space-y-8">

      {/* Action Button */}
      <div className="flex justify-end gap-3 mb-6">
        <Button className="theme-button text-white" onClick={onNewAppointment}>
          Schedule Appointment
        </Button>
      </div>

      {/* Upcoming Appointments */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {upcomingAppointments.map((appointment: any, index: number) => (
                    <tr key={index} className="dark:hover:bg-slate-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {new Date(appointment.appointmentDate).toLocaleDateString()} {' '}
                        {formatTime(
                          appointment.appointmentTimeFrom ||
                          appointment.startTime ||
                          (appointment.roomSlot && appointment.roomSlot.startTime)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {typeof appointment.patient === 'string'
                          ? appointment.patient
                          : `${appointment.patient?.name || ''}${appointment.patient?.species ? ` (${appointment.patient.species})` : ''}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {appointment.reason || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            appointment.status === "in_progress"
                              ? "theme-badge-info"
                              : appointment.status === "completed"
                              ? "theme-badge-success"
                              : appointment.status === "in_room"
                              ? "theme-badge-warning"
                              : appointment.status === "scheduled"
                              ? "theme-badge-neutral"
                              : appointment.status === "cancelled"
                              ? "theme-badge-destructive"
                              : "theme-badge-neutral"
                          }
                        >
                          {appointment.status ? appointment.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : ''}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              You have no upcoming appointments. Schedule one today!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Past Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {pastAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {pastAppointments.slice(0, 5).map((appointment: any, index: number) => (
                    <tr key={index} className="dark:hover:bg-slate-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {new Date(appointment.appointmentDate).toLocaleDateString()} {' '}
                        {formatTime(
                          appointment.appointmentTimeFrom ||
                          appointment.startTime ||
                          (appointment.roomSlot && appointment.roomSlot.startTime)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {typeof appointment.patient === 'string'
                          ? appointment.patient
                          : `${appointment.patient?.name || ''}${appointment.patient?.species ? ` (${appointment.patient.species})` : ''}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {appointment.reason || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            appointment.status === "in_progress"
                              ? "theme-badge-info"
                              : appointment.status === "completed"
                              ? "theme-badge-success"
                              : appointment.status === "in_room"
                              ? "theme-badge-warning"
                              : appointment.status === "scheduled"
                              ? "theme-badge-neutral"
                              : appointment.status === "cancelled"
                              ? "theme-badge-destructive"
                              : "theme-badge-neutral"
                          }
                        >
                          {appointment.status ? appointment.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : ''}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              You have no past appointments.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 