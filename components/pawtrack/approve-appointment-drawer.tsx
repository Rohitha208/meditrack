"use client"

import ApproveAppointment from "@/components/pawtrack/appointments/approve-appointment"

interface ApproveAppointmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  appointmentId: string | null
}

export function ApproveAppointmentDrawer({ isOpen, onClose, appointmentId }: ApproveAppointmentDrawerProps) {
  if (!isOpen || !appointmentId) return null
  return (
    <ApproveAppointment appointmentId={appointmentId} onClose={onClose} />
  )
}


