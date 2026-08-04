"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addDays, addWeeks, subWeeks, startOfWeek, endOfWeek, parseISO, isSameDay } from "date-fns"
import { useGetProviderStats } from "@/queries/providers/get-provider-stats"
import { useRootContext } from "@/context/RootContext"

interface AppointmentCalendarProps {
  onAppointmentClick: (id: string | number) => void;
  appointments?: any[]; // Real appointment data
  providerId?: string; // Optional provider ID to filter by
}

interface ProcessedAppointment {
  id: string | number;
  date: Date;
  day: string;
  dayNumber: string;
  time: string;
  hourBlock: string; 
  patient: string;
  type: string;
  status: string;
  duration: number;
}

export default function AppointmentCalendar({ 
  onAppointmentClick, 
  appointments = [],
  providerId
}: AppointmentCalendarProps) {
  const [viewMode, setViewMode] = useState("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const { clinic } = useRootContext()
  
  // Calculate the start and end of the current week
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }) // Start on Monday
  const endOfCurrentWeek = endOfWeek(currentDate, { weekStartsOn: 1 }) // End on Sunday
  
  // Format dates for the API
  const fromDateStr = format(startOfCurrentWeek, 'yyyy-MM-dd')
  const toDateStr = format(endOfCurrentWeek, 'yyyy-MM-dd')

  // Fetch provider stats for the current week if providerId is provided
  const { data: providerStats = [] } = useGetProviderStats({
    fromDate: fromDateStr,
    toDate: toDateStr,
    clinicId: clinic?.id || undefined
  })

  // Find the specific provider if providerId is provided
  const selectedProvider = providerId 
    ? providerStats.find(provider => provider.id === providerId)
    : null

  // Combine appointments from props and/or provider stats
  const allAppointments = useMemo(() => {
    if (providerId && selectedProvider?.appointments?.length) {
      return selectedProvider.appointments
    }
    return appointments
  }, [appointments, providerId, selectedProvider])
  
  // Generate an array of days for the week view (Monday to Saturday)
  const weekDays = Array(6).fill(0).map((_, index) => {
    const day = addDays(startOfCurrentWeek, index)
    return {
      date: day,
      dayName: format(day, 'EEE'),
      dayNumber: format(day, 'd')
    }
  })
  
  // Hours for the calendar grid
  const hours = [
    "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00"
  ]
  
  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentDate(prevDate => subWeeks(prevDate, 1))
  }
  
  // Navigate to next week
  const goToNextWeek = () => {
    setCurrentDate(prevDate => addWeeks(prevDate, 1))
  }
  
  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  // Format the current week range for display
  const formattedDateRange = `${format(startOfCurrentWeek, 'MMM d, yyyy')} - ${format(endOfCurrentWeek, 'MMM d, yyyy')}`
  
  // Process appointments to match the calendar structure
  const processedAppointments: ProcessedAppointment[] = useMemo(() => {
    if (!Array.isArray(allAppointments)) return [];
    
    return allAppointments.map(appointment => {
      // Skip invalid appointments
      if (!appointment || typeof appointment !== 'object') return null;
      
      try {
        // Extract date and time parts
        const appointmentDate = appointment.appointmentDate ? parseISO(appointment.appointmentDate) : null
        // Try to get the time from different possible sources
        // const timeStr = appointment.startTime || 
        //                 (appointment.roomSlot && appointment.roomSlot.startTime) || 
        //                 '00:00'
        const timeStr = appointment.appointmentTimeFrom || '00:00'
        
        // Skip invalid appointments
        if (!appointmentDate) return null
        
        // Extract hour and minute from time string
        const [hours, minutes] = timeStr.split(':').map(Number)
        
        // Determine which hour block this appointment belongs to
        // Format hour to match our grid hours
        const hourBlock = `${hours}:00`
        
        // Format appointment for the calendar
        return {
          id: appointment.id,
          date: appointmentDate,
          day: format(appointmentDate, 'EEE'),
          dayNumber: format(appointmentDate, 'd'),
          time: timeStr.substring(0, 5), // Extract HH:MM from HH:MM:SS
          hourBlock,
          patient: appointment.patient?.name || 'Unknown',
          type: appointment.appointmentType?.name || 'Appointment',
          status: appointment.status,
          duration: 60, // Default duration - could be calculated from start/end times if available
        }
      } catch (error) {
        // Silently handle the error without logging
        return null;
      }
    }).filter(Boolean) as ProcessedAppointment[]
  }, [allAppointments])
  
  // Get appointments for a specific day
  const getAppointmentsByDay = (dayName: string, dayNumber: string) => {
    return processedAppointments.filter(appt => 
      appt.day === dayName && appt.dayNumber === dayNumber
    )
  }
  
  // Get appointments for a specific hour on a specific day
  const getAppointmentsByHour = (dayName: string, dayNumber: string, hour: string) => {
    // Find the day object
    const dayObj = weekDays.find(day => day.dayName === dayName && day.dayNumber === dayNumber);
    if (!dayObj) return [];
    
    // Return appointments that match this day and have a startTime matching this hour block
    return processedAppointments.filter(appt => 
      isSameDay(appt.date, dayObj.date) && 
      appt.hourBlock === hour
    );
  }
  
  // Determine appointment style based on appointment type or status
  const getAppointmentStyle = (appointment: ProcessedAppointment) => {
    // First try to determine style by status
    switch (appointment.status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
      case "in_progress":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
    }
    
    // Then by appointment type
    switch (appointment.type?.toLowerCase()) {
      case "check-up":
      case "checkup":
      case "check up":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
      case "surgery":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
      case "consultation":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
      case "grooming":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
      case "vaccination":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
      case "dental":
      case "dental procedure":
      case "dental exam":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
    }
  }

  // Update provider stats whenever the date range changes
  useEffect(() => {
    // The useGetProviderStats query will automatically refetch when 
    // fromDateStr or toDateStr change due to its queryKey
  }, [fromDateStr, toDateStr])

  // Debug function to check if we have appointments for the current week
  const hasAppointmentsForCurrentWeek = useMemo(() => {
    return processedAppointments.some(appt => 
      weekDays.some(day => isSameDay(appt.date, day.date))
    );
  }, [processedAppointments, weekDays]);

  return (
    <div className="p-6">
      {/* Calendar Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <div className="hidden">
          {/* Keeping viewMode state but hiding the buttons */}
          <Button
            variant="outline"
            size="sm"
            className={viewMode === "week" ? "theme-button text-white" : ""}
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
        </div>

        <div className="flex items-center">
          <div className="mr-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Weekly Appointments</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedProvider ? `${selectedProvider.name}'s schedule` : 'All appointments'}
            </p>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-center">
          <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-none hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-6 py-2 font-medium text-center bg-white dark:bg-slate-800 min-w-[220px]">
              {formattedDateRange}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-none hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={goToNextWeek}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {selectedProvider && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <span className="font-medium">{selectedProvider.name}</span>: 
            <span className="ml-2 text-blue-600 dark:text-blue-400">{selectedProvider.total} total</span> • 
            <span className="ml-2 text-green-600 dark:text-green-400">{selectedProvider.done} done</span> • 
            <span className="ml-2 text-amber-600 dark:text-amber-400">{selectedProvider.pending} pending</span>
          </div>
        )}
      </div>

      {/* Week View Calendar */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 border-r border-gray-200 dark:border-gray-700"></div>
          {weekDays.map((day) => (
            <div
              key={`${day.dayName}-${day.dayNumber}`}
              className="p-2 text-center font-medium border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              {day.dayName} {day.dayNumber}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-7">
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                {hour}
              </div>
              {weekDays.map((day) => {
                const appts = getAppointmentsByHour(day.dayName, day.dayNumber, hour)
                return (
                  <div
                    key={`${day.dayName}-${day.dayNumber}-${hour}`}
                    className="p-1 min-h-[60px] border-r border-gray-200 dark:border-gray-700 last:border-r-0 relative"
                  >
                    {appts.length > 0 && appts.map((appt) => (
                      <div
                        key={appt.id}
                        onClick={() => onAppointmentClick(appt.id)}
                        className={`p-1 text-xs rounded border mb-1 cursor-pointer ${getAppointmentStyle(appt)}`}
                      >
                        <div className="font-medium">{appt.patient}</div>
                        <div className="flex justify-between">
                          <span>{appt.type}</span>
                          <span className="font-medium">{appt.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Legend */}
      <div className="mt-6 bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
          <span className="text-sm">Scheduled</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
          <span className="text-sm">In Progress</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
          <span className="text-sm">Completed</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
          <span className="text-sm">Cancelled</span>
        </div>
      </div>
    </div>
  )
}
