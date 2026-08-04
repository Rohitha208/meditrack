"use client"

import { useState, useMemo } from "react"
import { useGetDashboardSummary } from "@/queries/dashboard/get-dashboard-summary"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { TrendingUp, Users, Stethoscope, Package, Truck, Building2 } from "lucide-react"
import { DatePickerWithRangeV2 } from "@/components/ui/custom/date/date-picker-with-range";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetAppointments } from "@/queries/appointment/get-appointment"
import { useRootContext } from "@/context/RootContext"
import Loader from "@/components/ui/loader"
import { ExpiringProductsCard } from "@/components/pawtrack/dashboard/shared/expiring-products-card"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useEffect } from "react"

export const AdminDashboard = () => {
  const today = new Date();
  const { clinic } = useRootContext();
  const { toast } = useToast();

  const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  // Convert local time to UTC ISO string
  const startOfDay = new Date(startOfDayLocal.getTime() - startOfDayLocal.getTimezoneOffset() * 60000);
  const endOfDay = new Date(endOfDayLocal.getTime() - endOfDayLocal.getTimezoneOffset() * 60000);

  // Date range state for admin dashboard
  // Update this part in your component
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,  // This will set the default "from" date to today
    to: today     // This will set the default "to" date to today
  });

  // Request appointments search params
  const requestAppointmentsParams = useMemo(() => ({
    search: null,
    status: null,
    provider: null,
    dateFrom: null,
    dateTo: null,
    clinicId: null,
    patientId: null,
    clientId: null,
    veterinarianId: null,
    roomId: null,
    companyId: clinic?.companyId || null,
    appointmentId: null,
    tab: "admin-dashboard",
    pageNumber: 1,
    pageSize: 5,
    isRegistered: true,
  }), [clinic?.companyId]);


  // Fetch appointment requests
  const { data: appointmentRequestsData } = useGetAppointments(requestAppointmentsParams);

  // Handle appointment approval
  const handleApproveAppointment = (appointmentId: string) => {
    // Pass this up to the parent component to handle
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('approveAppointment', { detail: { appointmentId } });
      window.dispatchEvent(event);
    }
  };

  // Separate params: clinic details (all-time, no date filter) vs appointment metrics (date-filtered)
  const clinicDetailsParams = useMemo(() => {
    if (!clinic?.companyId) return null;
    return {
      companyId: clinic.companyId,
      // NO date params - always fetch all-time clinic details (vets/patients)
    };
  }, [clinic?.companyId]);

  const appointmentMetricsParams = useMemo(() => {
    if (!clinic?.companyId) return null;
    const formatDate = (date: Date | undefined, fallback: Date) => {
      const d = date || fallback;
      return d.toISOString().split('T')[0];
    };
    return {
      companyId: clinic.companyId,
      fromDate: formatDate(dateRange?.from, startOfDay),
      toDate: formatDate(dateRange?.to, endOfDay),
      // Only fetch appointment metrics with date filter
    };
  }, [clinic?.companyId, dateRange, startOfDay, endOfDay]);

  // Fetch clinic details (all-time, no date filter)
  const { data: clinicDetailsData, isLoading: isLoadingClinicDetails, error: clinicDetailsError } = useGetDashboardSummary(
    clinicDetailsParams,
    { enabled: !!clinicDetailsParams?.companyId, queryKeySuffix: 'clinic-details-all-time' }
  );

  // Fetch appointment metrics (date-filtered)
  const { data: appointmentMetricsData, isLoading: isLoadingAppointments, error: appointmentMetricsError } = useGetDashboardSummary(
    appointmentMetricsParams,
    { enabled: !!appointmentMetricsParams?.companyId, queryKeySuffix: 'appointment-metrics-filtered' }
  );

  const isLoading = isLoadingClinicDetails || isLoadingAppointments;
  const error = clinicDetailsError || appointmentMetricsError;

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to load dashboard summary"),
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Get appointment requests
  const appointmentRequests = appointmentRequestsData?.items || [];

  // Extract company-wide totals from API response
  const totalPatients = clinicDetailsData?.data?.totalPatients || 0;
  const totalProducts = clinicDetailsData?.data?.totalProducts || 0;

  // Merge clinic details (all-time) with appointment metrics (date-filtered)
  // Normalize API response: backend may return PascalCase (Clinics, ClinicDetails, etc.) or camelCase
  const clinicDetailsRaw = clinicDetailsData?.data;
  const appointmentMetricsRaw = appointmentMetricsData?.data;
  
  const clinicDetailsClinics = clinicDetailsRaw?.clinics ?? clinicDetailsRaw?.Clinics ?? [];
  const appointmentMetricsClinics = appointmentMetricsRaw?.clinics ?? appointmentMetricsRaw?.Clinics ?? [];

  // Create maps for merging: clinic details (all-time) and appointment metrics (date-filtered)
  const clinicDetailsMap = new Map();
  clinicDetailsClinics.forEach((c: any) => {
    const clinicId = c.clinicId ?? c.ClinicId ?? c.id ?? "";
    const clinicName = c.clinicName ?? c.ClinicName ?? "";
    const key = clinicId || clinicName;
    const details = c.clinicDetails ?? c.ClinicDetails ?? {};
    clinicDetailsMap.set(key, {
      numberOfVeterinarians: details.numberOfVeterinarians ?? details.NumberOfVeterinarians ?? 0,
      numberOfPatients: details.numberOfPatients ?? details.NumberOfPatients ?? 0,
      numberOfClients: details.numberOfClients ?? details.NumberOfClients ?? 0,
      numberOfProducts: details.numberOfProducts ?? details.NumberOfProducts ?? 0,
      numberOfSuppliers: details.numberOfSuppliers ?? details.NumberOfSuppliers ?? 0,
      averageRating: c.averageRating ?? c.AverageRating ?? null,
      serviceProfit: c.serviceProfit ?? c.ServiceProfit ?? 0,
      productProfit: c.productProfit ?? c.ProductProfit ?? 0,
    });
  });

  const appointmentMetricsMap = new Map();
  appointmentMetricsClinics.forEach((c: any) => {
    const clinicId = c.clinicId ?? c.ClinicId ?? c.id ?? "";
    const clinicName = c.clinicName ?? c.ClinicName ?? "";
    const key = clinicId || clinicName;
    const ratios = c.appointmentCompletionRatios ?? c.AppointmentCompletionRatios ?? {};
    appointmentMetricsMap.set(key, {
      totalAppointments: ratios.totalAppointments ?? ratios.TotalAppointments ?? 0,
      completedAppointments: ratios.completedAppointments ?? ratios.CompletedAppointments ?? 0,
      canceledAppointments: ratios.canceledAppointments ?? ratios.CanceledAppointments ?? 0,
      completionRatio: ratios.completionRatio ?? ratios.CompletionRatio ?? 0,
      percentageOfCompleting: ratios.percentageOfCompleting ?? ratios.PercentageOfCompleting ?? "0",
    });
  });

  // Start with clinic details (all-time) as base, overlay appointment metrics (date-filtered)
  // Use clinicDetailsClinics as primary source to ensure all clinics are shown even if no appointments in date range
  const clinics = clinicDetailsClinics.map((c: any) => {
    const clinicId = c.clinicId ?? c.ClinicId ?? c.id ?? "";
    const clinicName = c.clinicName ?? c.ClinicName ?? "";
    const key = clinicId || clinicName;
    const allTimeDetails = clinicDetailsMap.get(key) ?? (c.clinicDetails ?? c.ClinicDetails ?? {});
    const appointmentMetrics = appointmentMetricsMap.get(key) ?? {
      totalAppointments: 0,
      completedAppointments: 0,
      canceledAppointments: 0,
      completionRatio: 0,
      percentageOfCompleting: "0",
    };
    
    return {
      clinicId,
      clinicName,
      clinicDetails: {
        numberOfVeterinarians: allTimeDetails.numberOfVeterinarians ?? 0,
        numberOfPatients: allTimeDetails.numberOfPatients ?? 0,
        numberOfClients: allTimeDetails.numberOfClients ?? 0,
        numberOfProducts: allTimeDetails.numberOfProducts ?? 0,
        numberOfSuppliers: allTimeDetails.numberOfSuppliers ?? 0,
      },
      appointmentCompletionRatios: {
        totalAppointments: appointmentMetrics.totalAppointments ?? 0,
        completedAppointments: appointmentMetrics.completedAppointments ?? 0,
        canceledAppointments: appointmentMetrics.canceledAppointments ?? 0,
        // completionRatio from API is decimal (0-1); display as percentage by multiplying by 100
        completionRatio: appointmentMetrics.completionRatio ?? 0,
        percentageOfCompleting: appointmentMetrics.percentageOfCompleting ?? "0",
      },
      averageRating: allTimeDetails.averageRating ?? c.averageRating ?? c.AverageRating ?? null,
      serviceProfit: allTimeDetails.serviceProfit ?? c.serviceProfit ?? c.ServiceProfit ?? 0,
      productProfit: allTimeDetails.productProfit ?? c.productProfit ?? c.ProductProfit ?? 0,
    };
  });

  if (!clinicDetailsParams?.companyId) return <div className="p-6 text-muted-foreground">Select a company or clinic to view dashboard.</div>;
  if (isLoading) return <div className="min-h-svh flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <Loader size="lg" label="Loading..." />
    </div>
  </div>
  if (error) return <div className="p-6 text-red-500">{getToastErrorMessage(error, "Error loading dashboard summary")}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 -m-4 mb-4 rounded-b-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your clinic operations and statistics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DatePickerWithRangeV2
            date={dateRange}
            setDate={setDateRange}
            showYear={true}
          />
        </div>
      </div>

      {/* NEW LAYOUT: Summary Cards in Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Summary Cards - 50% width on desktop, 2 columns if appointment requests are present */}
        <div className={`grid ${appointmentRequests.length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-4'} grid-cols-1 gap-6 flex-1 lg:w-1/2`}>
          <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                  <Building2 className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                </div>
                <div>
                  <p className="text-md font-medium text-muted-foreground">Total Clinics</p>
                  <p className="text-2xl font-bold theme-text-primary">{clinics.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                  <Stethoscope className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                </div>
                <div>
                  <p className="text-md font-medium text-muted-foreground">Total Veterinarians</p>
                  <p className="text-2xl font-bold theme-text-secondary">
                    {clinics.reduce((sum: number, clinic: any) => sum + (clinic.clinicDetails?.numberOfVeterinarians || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                  <Users className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                </div>
                <div>
                  <p className="text-md font-medium text-muted-foreground">Total Patients</p>
                  <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">
                    {totalPatients}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                  <Package className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                </div>
                <div>
                  <p className="text-md font-medium text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">
                    {totalProducts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointment Requests Card - 50% width on desktop */}
        {appointmentRequests.length > 0 && (
          <Card className="col-span-1 shadow-lg border bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50 lg:w-1/2 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">Appointment Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '112px' }}>
                {appointmentRequests.map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center justify-between p-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-base text-primary">{appointment.patient?.name || "Unknown"}</span>
                      <span className="text-sm text-muted-foreground">{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="theme-button text-white" onClick={() => handleApproveAppointment(appointment.id)} title="Approve">
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Clinics accordion */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Clinics by location</h2>
        <Accordion
          type="multiple"
          defaultValue={clinics.length > 0 ? [String(0)] : []}
          className="w-full rounded-lg border border-border bg-card text-card-foreground shadow-sm"
        >
          {clinics.map((clinic: any, idx: number) => {
            const details = clinic.clinicDetails || {};
            const ratios = clinic.appointmentCompletionRatios || {};
            const pieData = [
              { name: "Completed", value: ratios.completedAppointments || 0, fill: "hsl(var(--chart-1))" },
              { name: "Canceled", value: ratios.canceledAppointments || 0, fill: "hsl(var(--destructive))" },
              { name: "Other", value: Math.max(0, (ratios.totalAppointments || 0) - (ratios.completedAppointments || 0) - (ratios.canceledAppointments || 0)), fill: "hsl(var(--muted))" },
            ].filter((d) => d.value > 0);
            // Profit comparison data for bar chart
            const profitData = [
              { label: "Products", value: Number(clinic.productProfit ?? 0) },
              { label: "Services", value: Number(clinic.serviceProfit ?? 0) },
            ];
            const profitConfig = {
              value: { label: "Profit", color: "#1E3D3D" },
            };

            return (
              <AccordionItem key={idx} value={String(idx)} className="border-b border-border last:border-b-0 px-4">
                <AccordionTrigger className="hover:no-underline py-4 [&[data-state=open]]:border-b [&[data-state=open]]:border-border">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2 shrink-0 min-w-0">
                      <Building2 className="h-5 w-5 text-[#1E3D3D] dark:text-[#D2EFEC] shrink-0" />
                      <span className="font-semibold text-foreground truncate">{clinic.clinicName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Badge variant="secondary" className="font-normal whitespace-nowrap">
                        {typeof ratios.percentageOfCompleting === "string" && ratios.percentageOfCompleting.includes("%") ? ratios.percentageOfCompleting : `${((ratios.completionRatio ?? 0) * 100).toFixed(2)}%`} completion
                      </Badge>
                      <Badge variant="outline" className="font-normal whitespace-nowrap">
                        {details.numberOfVeterinarians || 0} vets · {details.numberOfPatients || 0} patients
                      </Badge>
                      <span className="flex items-center gap-1.5 text-muted-foreground text-sm whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-[#1E3D3D]" /> Active
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-4">
                  {clinic.clinicId && (
                    <div className="mb-6">
                      <ExpiringProductsCard className="w-full" clinicId={clinic.clinicId} />
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1: Clinic statistics as clean cards */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-foreground">Clinic statistics</h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="border rounded-lg p-3 bg-gradient-to-br from-[#D2EFEC]/30 to-transparent dark:from-[#1E3D3D]/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Stethoscope className="h-4 w-4 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                            <span className="text-xs text-muted-foreground">Vets</span>
                          </div>
                          <p className="text-xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{details.numberOfVeterinarians || 0}</p>
                        </div>
                        <div className="border rounded-lg p-3 bg-gradient-to-br from-[#D2EFEC]/30 to-transparent dark:from-[#1E3D3D]/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="h-4 w-4 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                            <span className="text-xs text-muted-foreground">Suppliers</span>
                          </div>
                          <p className="text-xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{details.numberOfSuppliers || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Appointment analytics pie + profit bar chart */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-foreground">Appointment analytics</h3>
                      <ChartContainer
                        config={{
                          completed: { label: "Completed", color: "#1E3D3D" },
                          canceled: { label: "Canceled", color: "hsl(var(--destructive))" },
                          other: { label: "Other", color: "hsl(var(--muted))" },
                        }}
                        className="mx-auto aspect-square max-h-[180px]"
                      >
                        <PieChart>
                          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                          <Pie
                            data={pieData.length ? pieData : [{ name: "No data", value: 1, fill: "hsl(var(--muted))" }]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={75}
                          />
                        </PieChart>
                      </ChartContainer>
                      <div className="text-center space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Total: <span className="font-semibold text-foreground">{ratios.totalAppointments || 0}</span>
                          {" · "}
                          Completion: <span className="font-semibold text-[#1E3D3D] dark:text-[#D2EFEC]">{typeof ratios.percentageOfCompleting === "string" && ratios.percentageOfCompleting.includes("%") ? ratios.percentageOfCompleting : `${((ratios.completionRatio ?? 0) * 100).toFixed(2)}%`}</span>
                        </p>
                      </div>
                    </div>

                    {/* Column 3: Profit comparison chart + rating */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-foreground">Profit breakdown</h3>
                      <ChartContainer
                        config={profitConfig}
                        className="h-[160px] w-full"
                      >
                        <BarChart data={profitData} margin={{ left: 0, right: 0 }}>
                          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#1E3D3D" />
                        </BarChart>
                      </ChartContainer>
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-[#D2EFEC]/40 dark:bg-[#1E3D3D]/20 border border-[#1E3D3D]/10 dark:border-[#D2EFEC]/10">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">Completion rate</span>
                            <span className="font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{typeof ratios.percentageOfCompleting === "string" && ratios.percentageOfCompleting.includes("%") ? ratios.percentageOfCompleting : `${((ratios.completionRatio ?? 0) * 100).toFixed(2)}%`}</span>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-[#D2EFEC]/40 dark:bg-[#1E3D3D]/20 border border-[#1E3D3D]/10 dark:border-[#D2EFEC]/10">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">Average rating</span>
                            <span className="font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{clinic.averageRating ?? "N/A"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                        <span>Updated: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  )
}