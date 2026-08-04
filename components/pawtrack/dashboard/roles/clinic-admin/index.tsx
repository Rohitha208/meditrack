"use client"

import { ClinicAdminDashboard } from "./clinic-admin-dashboard"

export default function ClinicAdminDashboardWrapper({
  onNewPatient,
  onNewAppointment
}: {
  onNewPatient: () => void;
  onNewAppointment: () => void;
}) {
  return (
    <ClinicAdminDashboard 
      onNewPatient={onNewPatient}
      onNewAppointment={onNewAppointment}
    />
  )
}

export { ClinicAdminDashboard } 