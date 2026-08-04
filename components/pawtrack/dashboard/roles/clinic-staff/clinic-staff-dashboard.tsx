"use client"

import { useState, useEffect } from "react"
import { DashboardWelcomeHeader } from "../../shared/dashboard-welcome-header"
import { DashboardActionButtons } from "../../shared/dashboard-action-buttons"
import { DashboardStatsCards } from "../../shared/dashboard-stats-cards"
import { DashboardScheduleTable } from "../../shared/dashboard-schedule-table"
import { ExpiringProductsCard } from "../../shared/expiring-products-card"
import { useGetAppointments } from "@/queries/appointment/get-appointment"
import { useRootContext } from "@/context/RootContext"
import { useExpiringProducts } from "@/queries/dashboard/get-expiring-products"
import { useGetScreenAccess } from "@/queries/screen/access/get-screen-access"
import { WeeklyProfitCard } from "@/components/pawtrack/dashboard/shared/weekly-profit-card";

export const ClinicStaffDashboard = ({
  onNewPatient,
  onNewAppointment,
  onNewInvoice,
  onAddProduct,
  onAddSupplier,
  onAddClient,
  onCreatePurchaseOrder,
  editAppointmentId,
  setEditAppointmentId
}: {
  onNewPatient: () => void
  onNewAppointment: () => void
  onNewInvoice: () => void
  onAddProduct?: () => void
  onAddSupplier?: () => void
  onAddClient?: () => void
  onCreatePurchaseOrder?: () => void
  editAppointmentId: string | null
  setEditAppointmentId: (id: string | null) => void
}) => {
  const today = new Date();

  const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  // Convert local time to UTC ISO string
  const startOfDay = new Date(startOfDayLocal.getTime() - startOfDayLocal.getTimezoneOffset() * 60000);
  const endOfDay = new Date(endOfDayLocal.getTime() - endOfDayLocal.getTimezoneOffset() * 60000);

  const { clinic, user, userType } = useRootContext();
  const clinicIdForAccess = clinic?.id ?? null;
  const roleId = (user as any)?.roleId ?? undefined;
  const { data: screenAccessData } = useGetScreenAccess(clinicIdForAccess, roleId, !!clinicIdForAccess && !userType?.isSuperAdmin, false);
  const hasInventoryAccess = (() => {
    if (userType?.isSuperAdmin || userType?.isAdmin) return true;
    const allowed = new Set(
      (Array.isArray(screenAccessData) ? screenAccessData : [])
        .filter((item: any) => item?.isAccessEnable)
        .map((item: any) => String(item?.screenName ?? "").toLowerCase())
    );
    return allowed.size === 0 || allowed.has("inventory");
  })();

  // Update searchParams to use dateRange
  const searchParams = {
    search: null,
    status: null,
    provider: null,
    dateFrom: startOfDay.toISOString(),
    dateTo: endOfDay.toISOString(),
    clinicId: clinic?.id ?? null,
    companyId: clinic?.companyId || null,
    patientId: null,
    clientId: null,
    veterinarianId: null,
    roomId: null,
    pageNumber: 1,
    pageSize: 10,
    appointmentId: null,
    tab: "clinic-staff-dashboard",
    isRegistered: false
  };

  const { data: appointmentsData } = useGetAppointments(searchParams);

  // Request appointments search params
  const requestAppointmentsParams = {
    search: null,
    status: null,
    provider: null,
    dateFrom: null,
    dateTo: null,
    clinicId: clinic?.id ?? null,
    patientId: null,
    clientId: null,
    veterinarianId: null,
    roomId: null,
    companyId: clinic?.companyId || null,
    pageNumber: 1,
    pageSize: 5,
    isRegistered: true,
    tab: "clinic-staff-dashboard",
    appointmentId: null
  };

  // Fetch appointment requests
  const { data: appointmentRequestsData } = useGetAppointments(requestAppointmentsParams);

  // Handle appointment approval
  const handleApproveAppointment = (appointmentId: string) => {
    setEditAppointmentId(appointmentId);
    onNewAppointment();
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

  // Filter only today's appointments
  // Check if appointmentsData has items property (paginated response) or is an array
  const appointmentsItems = appointmentsData?.items || appointmentsData || [];
  
  const todaysAppointments = Array.isArray(appointmentsItems) 
    ? appointmentsItems.filter((a: any) => isToday(a.appointmentDate))
    : [];

  const todayAppointmentsCount = todaysAppointments.length;
  const todayCompletedCount = todaysAppointments.filter((a: any) => a.status === "completed").length;
  
  // Get appointment requests
  const appointmentRequests = appointmentRequestsData?.items || [];
  const { data: expiringProducts = [] } = useExpiringProducts(clinic?.id || "");
  const hasExpiringProducts = hasInventoryAccess && expiringProducts.length > 0;

  return (
    <div className="p-6">
      <DashboardActionButtons 
        onNewPatient={onNewPatient}
        onNewAppointment={onNewAppointment}
        onNewInvoice={onNewInvoice}
        onAddProduct={onAddProduct}
        onAddSupplier={onAddSupplier}
        onAddClient={onAddClient}
        onCreatePurchaseOrder={onCreatePurchaseOrder}
      />
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <DashboardStatsCards 
            todayAppointmentsCount={todayAppointmentsCount}
            todayCompletedCount={todayCompletedCount}
          />
        </div>
        
        {hasExpiringProducts && (
          <div className="w-full">
            <ExpiringProductsCard className="w-full" clinicId={clinic?.id || ""} products={expiringProducts} />
          </div>
        )}
        
        <DashboardScheduleTable 
          appointments={todaysAppointments}
          pendingRegistrations={appointmentRequests}
        />
      </div>
    </div>
  )
}