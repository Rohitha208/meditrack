"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useGetProviderStats, ProviderStats, GetProviderStatsParams } from "@/queries/providers/get-provider-stats"
import { AppointmentSearchParamsType } from "@/components/pawtrack/appointments/hooks/useAppointmentFilter"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, List } from "lucide-react"
import AppointmentCalendar from "./appointment-calendar"
import { DatePickerWithRangeV2 } from "../../ui/custom/date/date-picker-with-range"
import { format } from "date-fns"
import { useRootContext } from "@/context/RootContext"


export default function ProviderView({ onAppointmentClick }: { onAppointmentClick: (id: string) => void }) {
  // State for date range selection
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date()
  });
  
  // Format dates for API calls
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');
  
  // Get user context
  const { clinic, userType, user } = useRootContext();
  
  // Determine filter params based on user role
  const filterParams: GetProviderStatsParams = {
  fromDate,
  toDate,
  ...(userType?.isClinicAdmin || userType?.isVeterinarian ? { clinicId: clinic.id ?? undefined } : {}),
  ...(userType?.isAdmin && user?.companyId ? { companyId: user.companyId } : {})
};

  // Fetch providers with appropriate filters
  const { data: providers = [], isLoading: isLoadingProviders } = useGetProviderStats(filterParams);
  
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"list" | "calendar">("list");

  // Only show providers whose role is 'Veterinarian'
  const veterinarianProviders = providers.filter((provider: ProviderStats) => provider.role?.toLowerCase() === "veterinarian");

  // Automatically select the first veterinarian when loaded
  useEffect(() => {
    if (!selectedProvider && veterinarianProviders.length > 0) {
      setSelectedProvider(veterinarianProviders[0].id);
    }
  }, [veterinarianProviders, selectedProvider]);

  // Find the selected provider object
  const selectedProviderObj = veterinarianProviders.find((p: ProviderStats) => p.id === selectedProvider);

  // Build search params for appointments
  // const searchParams: AppointmentSearchParamsType = {
  //   search: null,
  //   status: null,
  //   provider: selectedProviderObj ? selectedProviderObj.name : null,
  //   dateFrom: fromDate,
  //   dateTo: toDate,
  //   clinicId: clinic?.id || null,
  //   patientId: null,
  //   clientId: null,
  //   veterinarianId: selectedProviderObj ? selectedProviderObj.id : null,
  //   roomId: null,
  //   pageNumber: 1,
  //   pageSize: 10,
  // };

  // Use appointments from the selected provider object, ensure it's always an array
  const appointments = Array.isArray(selectedProviderObj?.appointments) ? selectedProviderObj.appointments : [];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "in_progress":
        return "theme-badge-info"
      case "completed":
        return "theme-badge-success"
      case "scheduled":
      case "confirmed":
        return "theme-badge-neutral"
      default:
        return "theme-badge-neutral"
    }
  }

  // Handler for date range changes
  const handleDateRangeChange = (date: { from?: Date, to?: Date } | undefined) => {
    if (date?.from) {
      setDateRange({
        from: date.from,
        to: date.to || date.from // Default to 'from' if 'to' is not set
      });
    }
  };

  if (isLoadingProviders) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Skeleton className="h-12 w-12 rounded-full mr-4" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-16 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Provider Cards */}
      <div className="w-full max-w-screen-2xl overflow-x-auto mb-2">
        <div className="flex gap-6 p-2">
          {veterinarianProviders.map((provider: ProviderStats) => (
            <div
              key={provider.id}
              className="min-w-[320px] max-w-[340px] flex-shrink-0"
            >
              {/* Keep all your existing card code exactly as is */}
              <Card
                className={`cursor-pointer hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700 ${
                  selectedProvider === provider.id
                    ? "ring-2 ring-[#1E3D3D] ring-offset-2 dark:ring-offset-slate-900"
                    : ""
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src="/diverse-avatars.png" alt={provider.name} />
                      <AvatarFallback>{provider.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-md">{provider.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {provider.role} • {provider.specialty}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#D2EFEC] dark:bg-[#1E3D3D]/20 p-2 rounded">
                      <div className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{provider.total}</div>
                      <div className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">Total</div>
                    </div>
                    <div className="bg-[#D2EFEC]/60 dark:bg-[#1E3D3D]/10 p-2 rounded">
                      <div className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{provider.done}</div>
                      <div className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">Done</div>
                    </div>
                    <div className="bg-[#D2EFEC]/40 dark:bg-[#1E3D3D]/5 p-2 rounded">
                      <div className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{provider.pending}</div>
                      <div className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
      
      {/* Selected Provider Appointments */}
      {selectedProvider && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedProviderObj?.name}&apos;s Appointments
              {viewType === "list" && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              {viewType === "list" && (
                <DatePickerWithRangeV2
                  date={dateRange}
                  setDate={handleDateRangeChange}
                />
              )}
              <Tabs 
                value={viewType} 
                onValueChange={(value) => setViewType(value as "list" | "calendar")}
              >
                <TabsList>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline-block">List View</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline-block">Calendar View</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {viewType === "list" ? (
            <div className="overflow-x-auto">
              {appointments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No appointments found for the selected date range.</div>
              ) : (
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-[#D2EFEC]/30 dark:bg-[#1E3D3D]/20">
                    <tr className="text-sm font-semibold">
                      <th className="px-6 py-3 text-left text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                        Visit Type
                      </th>
                      <th className="px-6 py-3 text-left text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {appointments.map((appointment: any) => {
                      const datePart = appointment.appointmentDate?.split('T')[0];
                      const [timeFrom, timeTo] = `${appointment.appointmentTimeFrom} - ${appointment.appointmentTimeTo}`.split(' - ');
                      const formattedTimeFrom = timeFrom.slice(0, 5);
                      const formattedTimeTo = timeTo.slice(0, 5);
                      return (
                        <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                           {formattedTimeFrom} - {formattedTimeTo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {appointment.patient?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {`${appointment.client?.firstName || ''} ${appointment.client?.lastName || ''}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {appointment.appointmentType?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusBadgeClass(appointment.status)}>
                              {appointment.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAppointmentClick(appointment.id)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div>
              <AppointmentCalendar 
                onAppointmentClick={(id) => onAppointmentClick(id.toString())} 
                appointments={appointments} 
                providerId={selectedProvider}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
