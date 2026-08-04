"use client"

import { ClientDashboard } from "./client-dashboard"

export default function ClientDashboardWrapper({
  onNewAppointment
}: {
  onNewAppointment: () => void
}) {
  return (
    <ClientDashboard 
      onNewAppointment={onNewAppointment}
    />
  )
}

export { ClientDashboard } 