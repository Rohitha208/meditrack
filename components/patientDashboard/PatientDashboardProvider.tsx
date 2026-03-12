"use client"
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RootContext } from "@/context/RootContext";
import { useGetPatients } from "@/queries/patients/get-patients";
import { useGetClientById } from "@/queries/clients/get-client";
import { useGetAppointments } from "@/queries/appointment/get-appointment";
import { getClientId } from "@/utils/clientCookie";
import { useIsMobile } from "@/hooks/use-mobile";

export const PatientDashboardContext = createContext<any>(null);

export function PatientDashboardProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const rootContext = useContext(RootContext);
  const handleLogout = rootContext?.handleLogout;
  const user = rootContext?.user;
  const isMobile = useIsMobile();
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientId(getClientId() || "");
    }
  }, []);

  const { data, isLoading, error, refetch } = useGetPatients(1, 100, "", clientId);
  const pets = data?.items || [];
  const { data: clientData, isLoading: isClientLoading, error: clientError } = useGetClientById(clientId);
  const appointmentQuery = useGetAppointments({
    search: null,
    status: null,
    provider: null,
    dateFrom: null,
    dateTo: null,
    clinicId: null,
    patientId: null,
    clientId,
    veterinarianId: null,
    roomId: null,
    pageNumber: 1,
    pageSize: 100,
    isRegistered: '' // Set to empty string to fetch both registered and unregistered appointments
  } as any);
  const appointments = appointmentQuery.data?.items || [];
  const isAppointmentsLoading = appointmentQuery.isLoading;
  const appointmentsError = appointmentQuery.error;
  const veterinarianId = appointments?.[0]?.veterinarianId;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && (!clientId || clientError) && !isClientLoading) {
      router.push("/login");
    }
  }, [clientId, isClientLoading, clientError, isClient, router]);

  return (
    <PatientDashboardContext.Provider value={{
      isClient,
      clientId,
      user,
      handleLogout,
      isMobile,
      pets,
      petsLoading: isLoading,
      petsError: error,
      refetchPets: refetch,
      clientData,
      isClientLoading,
      clientError,
      appointments,
      isAppointmentsLoading,
      appointmentsError,
      refetchAppointments: appointmentQuery.refetch,
      veterinarianId,
      isSidebarOpen,
      setIsSidebarOpen,
    }}>
      {children}
    </PatientDashboardContext.Provider>
  );
} 