"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Stethoscope, Package, Truck, Building2, Calendar, CheckCircle, XCircle, Clock, UserPlus, CalendarPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useRootContext } from "@/context/RootContext"
import { useGetClinicAdminDashboard } from "@/queries/dashboard/get-clinic-admin-dashboard"
import { AppointmentCompletionRatios, ClinicDetail } from "@/queries/dashboard/get-clinic-admin-dashboard"
import { useGetAppointments } from "@/queries/appointment/get-appointment"
import { Badge } from "@/components/ui/badge"
import { DashboardWelcomeHeader } from "../../shared/dashboard-welcome-header"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Skeleton } from "@/components/ui/skeleton"
import { DatePickerWithRangeV2 } from "@/components/ui/custom/date/date-picker-with-range"
import { DateRange } from "react-day-picker"
import { WeeklyProfitCard } from "../../shared/weekly-profit-card"
import { ExpiringProductsCard } from "../../shared/expiring-products-card"
import { useGetScreenAccess } from "@/queries/screen/access/get-screen-access"

// Define appointment interface
interface Appointment {
  id: string;
  appointmentDate: string;
  startTime?: string;
  appointmentTimeFrom?: string;
  appointmentTimeTo?: string;
  status?: string;
  reason?: string;
  roomSlot?: {
    startTime?: string;
  };
  patient?: {
    name?: string;
    species?: string
  } | string;
  veterinarian?: {
    firstName?: string;
    lastName?: string;
  };
}

export const ClinicAdminDashboard = ({
  onNewPatient,
  onNewAppointment
}: {
  onNewPatient: () => void;
  onNewAppointment: () => void;
}) => {
  const today = new Date();
  const { clinic, user, userType } = useRootContext();
  const clinicId = clinic?.id ?? null;
  const roleId = (user as any)?.roleId ?? undefined;
  const { data: screenAccessData } = useGetScreenAccess(clinicId, roleId, !!clinicId && !userType?.isSuperAdmin, false);
  const hasInventoryAccess = (() => {
    if (userType?.isSuperAdmin || userType?.isAdmin) return true;
    const allowed = new Set(
      (Array.isArray(screenAccessData) ? screenAccessData : [])
        .filter((item: any) => item?.isAccessEnable)
        .map((item: any) => String(item?.screenName ?? "").toLowerCase())
    );
    return allowed.size === 0 || allowed.has("inventory");
  })();

  const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  // For weekly stats, get the first day of the current week (Sunday)
  const startOfWeekLocal = new Date(today);
  startOfWeekLocal.setDate(today.getDate() - today.getDay());
  startOfWeekLocal.setHours(0, 0, 0, 0);

  // Convert local time to UTC ISO string
  const startOfDay = new Date(startOfDayLocal.getTime() - startOfDayLocal.getTimezoneOffset() * 60000);
  const endOfDay = new Date(endOfDayLocal.getTime() - endOfDayLocal.getTimezoneOffset() * 60000);



  // Search parameters for today's appointments
  const todaySearchParams = useMemo(() => ({
    search: null,
    status: null,
    provider: null,
    dateFrom: startOfDay.toISOString(),
    dateTo: endOfDay.toISOString(),
    clinicId: clinic?.id ?? null,
    companyId: clinic?.companyId ?? null,
    patientId: null,
    clientId: null,
    veterinarianId: null,
    roomId: null,
    pageNumber: 1,
    appointmentId: null,
    tab: "clinic-admin-dashboard",
    pageSize: 20,
    isRegistered: false
  }), [startOfDay, endOfDay, clinic?.id]);

  // Clinic admin dashboard parameters
  // const dashboardParams = useMemo(() => ({
  //   clinicId: clinic?.id ?? '',
  //   fromDate: startOfWeekLocal.toISOString().split('T')[0],
  //   toDate: today.toISOString().split('T')[0]
  // }), [clinic?.id, startOfWeekLocal, today]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,  // This will set the default "from" date to today
    to: today     // This will set the default "to" date to today
  });

  const dashboardParams = useMemo(() => {
    if (!clinic?.id) return null;  // Return null if no clinicId

    const formatDate = (date: Date | undefined, fallback: Date) => {
      const d = date || fallback;
      return d.toISOString().split('T')[0];
    };

    return {
      clinicId: clinic?.id ?? '',
      fromDate: formatDate(dateRange?.from, startOfDay),
      toDate: formatDate(dateRange?.to, endOfDay),
    };
  }, [clinic?.id, dateRange, startOfDay, endOfDay]);

  // Fetch data
  const { data: todayAppointmentsData } = useGetAppointments(todaySearchParams);
  // const { data: clinicDashboardData, isLoading, error } = useGetClinicAdminDashboard(dashboardParams);

  const { data: clinicDashboardData, isLoading, error } =
    useGetClinicAdminDashboard(dashboardParams!, {
      enabled: !!dashboardParams,   // 👈 Prevents call until params exist
    });


  // Create pie data for appointment distribution (uses normalized completionMetrics after it's defined below)
  const pieData = useMemo(() => {
    if (!clinicDashboardData) return [];
    const raw = (clinicDashboardData as any)?.appointmentCompletionRatios ?? (clinicDashboardData as any)?.AppointmentCompletionRatios;
    if (!raw) return [];
    const total = raw.totalAppointments ?? raw.TotalAppointments ?? 0;
    const completed = raw.completedAppointments ?? raw.CompletedAppointments ?? 0;
    const canceled = raw.canceledAppointments ?? raw.CanceledAppointments ?? 0;
    return [
      { name: "Completed", value: completed, color: "#10b981" },
      { name: "Scheduled", value: Math.max(0, total - completed - canceled), color: "#3b82f6" },
      { name: "Canceled", value: canceled, color: "#ef4444" }
    ];
  }, [clinicDashboardData]);

  // Process appointments data
  const todayAppointments = (todayAppointmentsData?.items || []) as Appointment[];


  // Format time helper function
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

  if (isLoading) return <ClinicAdminDashboardSkeleton />;
  if (error) return <div className="p-6 text-red-500">Error loading clinic dashboard</div>;
  if (!clinicDashboardData) return <div className="p-6">No data available</div>;

  // Normalize API response: backend may return PascalCase (ClinicDetails, AppointmentCompletionRatios, etc.) or camelCase
  const responseAny = clinicDashboardData as any;
  const rawDetails = responseAny?.clinicDetails ?? responseAny?.ClinicDetails ?? responseAny?.clinicDetail ?? {};
  const rawRatios = responseAny?.appointmentCompletionRatios ?? responseAny?.AppointmentCompletionRatios ?? {};
  const clinicDetail = {
    numberOfVeterinarians: rawDetails.numberOfVeterinarians ?? rawDetails.NumberOfVeterinarians ?? 0,
    numberOfPatients: rawDetails.numberOfPatients ?? rawDetails.NumberOfPatients ?? 0,
    numberOfClients: rawDetails.numberOfClients ?? rawDetails.NumberOfClients ?? 0,
    numberOfProducts: rawDetails.numberOfProducts ?? rawDetails.NumberOfProducts ?? 0,
    numberOfSuppliers: rawDetails.numberOfSuppliers ?? rawDetails.NumberOfSuppliers ?? 0,
  };
  const completionMetrics = {
    totalAppointments: rawRatios.totalAppointments ?? rawRatios.TotalAppointments ?? 0,
    completedAppointments: rawRatios.completedAppointments ?? rawRatios.CompletedAppointments ?? 0,
    canceledAppointments: rawRatios.canceledAppointments ?? rawRatios.CanceledAppointments ?? 0,
    completionRatio: rawRatios.completionRatio ?? rawRatios.CompletionRatio ?? 0,
    percentageOfCompleting: rawRatios.percentageOfCompleting ?? rawRatios.PercentageOfCompleting ?? "0",
  };

  const clinicName = responseAny?.clinicName ?? responseAny?.ClinicName ?? "Clinic";
  const averageRating = responseAny?.averageRating ?? responseAny?.AverageRating ?? 0;
  const productProfit = responseAny?.productProfit ?? responseAny?.ProductProfit ?? 0;
  const serviceProfit = responseAny?.serviceProfit ?? responseAny?.ServiceProfit ?? 0;

  return (
    <div className="px-0 space-y-8">
      {/* Page Header & Date Picker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 -m-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight theme-text-primary">{clinicName} Dashboard</h1>
          <p className="text-muted-foreground text-sm">Clinic performance and daily operations overview</p>
        </div>
        <div className="flex gap-2">
          <Button className="theme-button text-white flex items-center gap-2" onClick={onNewPatient}>
            <UserPlus className="h-4 w-4" />
            <span>New Patient</span>
          </Button>
          <Button className="theme-button text-white flex items-center gap-2" onClick={onNewAppointment}>
            <CalendarPlus className="h-4 w-4" />
            <span>New Appointment</span>
          </Button>

          <div>
            <DatePickerWithRangeV2
              date={dateRange}
              setDate={setDateRange}
              showYear={true}
            // className="w-[350px]"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                <Calendar className="h-6 w-6 text-[#1E3D3D]" />
              </div>
              <div>
                <div>
                  <div className="text-md font-medium text-muted-foreground">Total Appointments</div>
                  <div className="text-2xl font-bold theme-text-primary">{completionMetrics?.totalAppointments || 0}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                <CheckCircle className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
              </div>
              <div>
                <p className="text-md font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{completionMetrics?.completedAppointments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                <XCircle className="h-6 w-6 text-[#1E3D3D]" />
              </div>
              <div>
                <p className="text-md font-medium text-muted-foreground">Canceled</p>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{completionMetrics?.canceledAppointments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasInventoryAccess && clinic?.id && (
        <div className="w-full">
          <ExpiringProductsCard className="w-full" clinicId={clinic.id} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinic Statistics Card - same style as admin dashboard */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle>Clinic Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 pr-2">
              <div className="space-y-2 border p-4 rounded-md">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Vets</span>
                </div>
                <p className="text-2xl font-bold theme-text-primary">{clinicDetail?.numberOfVeterinarians || 0}</p>
              </div>
              <div className="space-y-2 border p-4 rounded-md">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Patients</span>
                </div>
                <p className="text-2xl font-bold theme-text-secondary">{clinicDetail?.numberOfPatients || 0}</p>
              </div>
              <div className="space-y-2 border p-4 rounded-md">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Clients</span>
                </div>
                <p className="text-2xl font-bold theme-text-accent">{clinicDetail?.numberOfClients || 0}</p>
              </div>
              <div className="space-y-2 border p-4 rounded-md">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Products</span>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{clinicDetail?.numberOfProducts || 0}</p>
              </div>
              <div className="space-y-2 border p-4 rounded-md col-span-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Suppliers</span>
                </div>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{clinicDetail?.numberOfSuppliers || 0}</p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Completion Rate</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {(() => {
                  const p = completionMetrics?.percentageOfCompleting ?? "0";
                  if (typeof p === "string" && p.includes("%")) return p;
                  const num = Number(p);
                  if (!Number.isNaN(num) && num <= 1 && num >= 0) return `${(num * 100).toFixed(2)}%`;
                  return typeof p === "string" ? p : `${(Number(p) * 100).toFixed(2)}%`;
                })()}
              </span>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Average Rating</span>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{averageRating}</span>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Profit By Products</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{productProfit}</span>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Profit By Services</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{serviceProfit}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Distribution */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle>Appointment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-center border p-2 rounded-md">
              <div className="border-r">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold theme-text-primary">{completionMetrics?.totalAppointments || 0}</p>
              </div>
              <div className="border-r">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-green-600">{completionMetrics?.completedAppointments || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canceled</p>
                <p className="text-xl font-bold text-red-600">{completionMetrics?.canceledAppointments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <WeeklyProfitCard
          className="border shadow-lg"
          clinicId={clinic?.id || ""}
          fromDate={dashboardParams?.fromDate}
          toDate={dashboardParams?.toDate}
        />
      </div>

      {/* Today's Schedule */}
      <Card className="border shadow-lg">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Veterinarian
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
                  {todayAppointments.map((appointment: Appointment, index: number) => (
                    <tr key={index} className="dark:hover:bg-slate-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
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
                        {appointment.veterinarian ?
                          `${appointment.veterinarian.firstName} ${appointment.veterinarian.lastName}` :
                          "Unassigned"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {appointment.reason || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            appointment.status === "completed"
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
              No appointments scheduled for today.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const ClinicAdminDashboardSkeleton = () => (
  <div className="px-0 space-y-8">
    {/* Header Skeleton */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>

    {/* Main Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>

    {/* Schedule Table Skeleton */}
    <Skeleton className="h-64 w-full" />
  </div>
);