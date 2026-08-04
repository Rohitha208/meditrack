"use client"

import { ClinicStaffDashboard } from "./clinic-staff-dashboard"

export default function ClinicStaffDashboardWrapper({
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
}) {
  return (
    <ClinicStaffDashboard 
      onNewPatient={onNewPatient}
      onNewAppointment={onNewAppointment}
      onNewInvoice={onNewInvoice}
      onAddProduct={onAddProduct}
      onAddSupplier={onAddSupplier}
      onAddClient={onAddClient}
      onCreatePurchaseOrder={onCreatePurchaseOrder}
      editAppointmentId={editAppointmentId}
      setEditAppointmentId={setEditAppointmentId}
    />
  )
}

export { ClinicStaffDashboard } 