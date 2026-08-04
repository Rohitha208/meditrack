"use client"

import { useState, useMemo } from "react"
import { useGetSuperAdminDashboard } from "@/queries/dashboard/get-super-admin-dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Pie, PieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { TrendingUp, Users, Stethoscope, Package, Truck, Building2, Activity, Calendar, ClipboardCheck, ClipboardList } from "lucide-react"
import { DatePickerWithRangeV2 } from "@/components/ui/custom/date/date-picker-with-range"
import type { DateRange } from "react-day-picker"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { format, startOfDay, endOfDay } from "date-fns"
import { ExpiringProductsCard } from "@/components/pawtrack/dashboard/shared/expiring-products-card"

export const SuperAdminDashboard = () => {
  // Add date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
    to: new Date(),
  });

  // Prepare parameters for API call
  const dashboardParams = useMemo(() => {
    const formatDate = (date: Date | undefined) => {
      if (!date) return '';
      return format(date, 'yyyy-MM-dd');
    };

    return {
      fromDate: formatDate(dateRange?.from),
      toDate: formatDate(dateRange?.to),
    };
  }, [dateRange]);

  const { data: dashboardData, isLoading, error } = useGetSuperAdminDashboard(dashboardParams);
  const companies = dashboardData?.companies || [];

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    let totalClinics = 0;
    let totalAdmins = 0;
    let totalVeterinarians = 0;
    let totalPatients = 0;
    let totalClients = 0;
    let totalProducts = 0;
    let totalSuppliers = 0;
    let totalAppointments = 0;
    let totalCompletedAppointments = 0;
    let totalCanceledAppointments = 0;

    companies.forEach((company) => {
      totalAdmins += company.numberOfAdmins ?? 0;
      company.clinics.forEach((clinic) => {
        totalClinics++;
        totalVeterinarians += clinic.clinicDetails.numberOfVeterinarians;
        totalPatients += clinic.clinicDetails.numberOfPatients;
        totalClients += clinic.clinicDetails.numberOfClients;
        totalProducts += clinic.clinicDetails.numberOfProducts;
        totalSuppliers += clinic.clinicDetails.numberOfSuppliers;
        totalAppointments += clinic.appointmentCompletionRatios.totalAppointments;
        totalCompletedAppointments += clinic.appointmentCompletionRatios.completedAppointments;
        totalCanceledAppointments += clinic.appointmentCompletionRatios.canceledAppointments;
      });
    });

    const overallCompletionRatio = totalAppointments > 0 ? totalCompletedAppointments / totalAppointments : 0;
    const overallPercentage = (overallCompletionRatio * 100).toFixed(2);

    return {
      totalClinics,
      totalAdmins,
      totalVeterinarians,
      totalPatients,
      totalClients,
      totalProducts,
      totalSuppliers,
      totalAppointments,
      totalCompletedAppointments,
      totalCanceledAppointments,
      overallCompletionRatio,
      overallPercentage
    };
  }, [companies]);

  // Prepare data for charts
  const clinicPerformanceData = useMemo(() => companies.flatMap((company) =>
    company.clinics.map((clinic) => ({
      name: clinic.clinicName,
      completionRate: (clinic.appointmentCompletionRatios.completionRatio * 100).toFixed(1),
      totalAppointments: clinic.appointmentCompletionRatios.totalAppointments,
      completedAppointments: clinic.appointmentCompletionRatios.completedAppointments,
      canceledAppointments: clinic.appointmentCompletionRatios.canceledAppointments,
    }))
  ), [companies]);

  const appointmentStatusData = useMemo(() => [
    { name: 'Completed', value: overallStats.totalCompletedAppointments, color: '#10b981' },
    { name: 'Canceled', value: overallStats.totalCanceledAppointments, color: '#ef4444' },
    { name: 'Scheduled', value: overallStats.totalAppointments - overallStats.totalCompletedAppointments - overallStats.totalCanceledAppointments, color: '#3b82f6' },
  ], [overallStats.totalCompletedAppointments, overallStats.totalCanceledAppointments, overallStats.totalAppointments]);

  if (isLoading) return <SuperAdminDashboardSkeleton />;
  if (error) return <div className="p-6 text-red-500">Error loading super admin dashboard</div>;

  return (
    <div className="space-y-4">
      {/* Header and Date Range Picker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 -m-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight theme-text-primary">Super Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Monitor and manage all companies and clinics across the system</p>
        </div>
         <div>
          <DatePickerWithRangeV2
            date={dateRange}
            setDate={setDateRange}
            showYear={true}
          // className="w-[350px]"
          />
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                <Building2 className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
              </div>
              <div>
                <p className="text-md font-medium text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold theme-text-primary">{companies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                <Activity className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
              </div>
              <div>
                <p className="text-md font-medium text-muted-foreground">Total Clinics</p>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{overallStats.totalClinics}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                <Users className="h-6 w-6 text-[#1E3D3D]" />
              </div>
              <div>
                <p className="text-md font-medium text-muted-foreground">Total Admins</p>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{overallStats.totalAdmins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Company and Clinic Details */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Company Overview</h2>
        <Accordion
          key={companies[0]?.companyId ?? "accordion"}
          type="multiple"
          defaultValue={companies[0] ? [String(companies[0].companyId)] : []}
          className="w-full border px-4 py-2 !mt-0 rounded-md"
        >
          {companies.map((company) => {
            // Calculate totals for this company
            // const totalPatients = company.clinics.reduce((sum, clinic) => sum + (clinic.clinicDetails.numberOfPatients || 0), 0);
            // const totalClients = company.clinics.reduce((sum, clinic) => sum + (clinic.clinicDetails.numberOfClients || 0), 0);
            const totalProducts = company.clinics.reduce((sum, clinic) => sum + (clinic.clinicDetails.numberOfProducts || 0), 0);
            
            return (
            <AccordionItem key={company.companyId} value={String(company.companyId)} className="!border-b-0">
              <AccordionTrigger className="px-4 border my-2 rounded-lg hover:no-underline">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2 shrink-0 min-w-0">
                    <Building2 className="h-5 w-5 text-[#1E3D3D] dark:text-[#D2EFEC] shrink-0" />
                    <span className="text-[1rem] font-medium truncate">{company.companyName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {company.clinics.length} Clinic{company.clinics.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary" className="whitespace-nowrap">
                      Products: {totalProducts}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="">
                  <CardContent className="p-0 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {company.clinics.map((clinic, index) => (
                        <div
                          key={index}
                          className="group relative overflow-hidden border border-gray-200 rounded-xl p-6 space-y-4 bg-white hover:shadow-lg transition-all duration-300 hover:border-gray-300"
                        >
                          {/* Header with gradient background */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-bold text-[1rem] text-gray-900 group-hover:text-[#1E3D3D] transition-colors">
                                {clinic.clinicName}
                              </h4>
                              {/* <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div> */}
                            </div>
                          </div>

                          {/* Enhanced statistics grid */}
                          <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-[#D2EFEC] rounded-lg border border-[#1E3D3D]/20 hover:bg-[#D2EFEC] transition-colors">
                              <div className="p-2 bg-[#1E3D3D] rounded-lg">
                                <Stethoscope className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-[#1E3D3D] uppercase tracking-wide">Vets</span>
                                <span className="font-bold text-xl leading-[1.25rem] text-gray-900">{clinic.clinicDetails.numberOfVeterinarians}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-green-100 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                              <div className="p-2 bg-green-500 rounded-lg">
                                <ClipboardList className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-green-600 uppercase tracking-wide">Total Appointments</span>
                                <span className="font-bold text-xl leading-[1.25rem] text-gray-900">{clinic.appointmentCompletionRatios.totalAppointments}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-[#D2EFEC] rounded-lg border border-[#1E3D3D]/20 hover:bg-[#D2EFEC] transition-colors">
                              <div className="p-2 bg-[#1E3D3D] rounded-lg">
                                <ClipboardCheck className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-[#1E3D3D] uppercase tracking-wide">Completed Appointments</span>
                                <span className="font-bold text-xl leading-[1.25rem] text-gray-900">{clinic.appointmentCompletionRatios.completedAppointments}</span>
                              </div>
                            </div>
                          </div>
                          {((clinic as any).clinicId ?? (clinic as any).id) && (
                            <div className="mt-4">
                              <ExpiringProductsCard className="w-full" clinicId={(clinic as any).clinicId ?? (clinic as any).id} />
                            </div>
                          )}
                          {/* Subtle hover effect overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1E3D3D]/5 to-[#1E3D3D]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </div>
              </AccordionContent>
            </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};

const SuperAdminDashboardSkeleton = () => (
  <div className="p-6 space-y-8">
    <div className="md:flex justify-between items-center">
      <div>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <Skeleton className="h-10 w-[350px]" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-80 w-full" />
      ))}
    </div>
  </div>
);