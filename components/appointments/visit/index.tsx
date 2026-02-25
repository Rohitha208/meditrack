"use client"

import PatientInformation from "@/components/appointments/Patient-Information/index"
import VaccinationManager from "@/components/appointments/vaccination/index"
import EmergencyComponent from "@/components/appointments/emergency/index"
import DewormingComponent from "@/components/appointments/deworming"
import SurgeryComponent from "@/components/appointments/surgery"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useGetPatientAppointmentHistory } from "@/queries/patients/get-patient-appointment-history"
import { useContentLayout } from "@/hooks/useContentLayout"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import React, { useMemo, useState, useEffect } from "react"

interface VisitManagerProps {
  patientId: string
  appointmentId: string
  onClose: () => void
}

export default function VisitManager({ patientId, appointmentId, onClose }: VisitManagerProps) {
  const [currentAppointmentId, setCurrentAppointmentId] = useState(appointmentId)
  const { clinic, user, userType } = useContentLayout()
  const { data: appointment } = useGetAppointmentById(currentAppointmentId)
  const { data: visitData } = useGetVisitByAppointmentId(currentAppointmentId)
  
  // Use clinic ID for appointment history if user is clinic admin or veterinarian
  const clinicIdForHistory = (user?.roleName === 'Clinic Admin' || user?.roleName === 'Veterinarian') 
    ? (appointment?.clinicId || clinic?.id) 
    : undefined

  const { data: history } = useGetPatientAppointmentHistory(patientId, clinicIdForHistory)

  // Keep currentAppointmentId in sync if parent prop changes
  useEffect(() => {
    setCurrentAppointmentId(appointmentId)
  }, [appointmentId])

  const items = history?.appointmentHistory || []
  
  // Match by visitId first (more precise), then fall back to appointmentId
  const currentIndex = useMemo(() => {
    if (!visitData?.id) {
      // No visitId available, match by appointmentId (will find first match)
      return items.findIndex(a => a.appointmentId === currentAppointmentId)
    }
    // Try to match by visitId first (most accurate)
    const visitIdMatch = items.findIndex(a => a.visitId === visitData.id)
    if (visitIdMatch >= 0) return visitIdMatch
    // Fall back to appointmentId match
    return items.findIndex(a => a.appointmentId === currentAppointmentId)
  }, [items, currentAppointmentId, visitData?.id])

  const canPrev = currentIndex > 0
  const canNext = currentIndex >= 0 && currentIndex < items.length - 1

  const selectedItem = currentIndex >= 0 ? items[currentIndex] : undefined
  const displayDate = selectedItem?.appointmentDate
    ? new Date(selectedItem.appointmentDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : undefined

  const typeName = (appointment?.appointmentType?.name || "").toLowerCase()

  let content: React.ReactNode
  if (typeName.includes("vaccination")) {
    content = (
      <VaccinationManager
        patientId={patientId}
        appointmentId={currentAppointmentId}
        onClose={onClose}
        appointmentStatus={appointment?.status}
      />
    )
  } else if (typeName.includes("emergency")) {
    content = (
      <EmergencyComponent
        patientId={patientId}
        appointmentId={currentAppointmentId}
        onClose={onClose}
      />
    )
  } else if (typeName.includes("deworming")) {
    content = (
      <DewormingComponent
        patientId={patientId}
        appointmentId={currentAppointmentId}
        onClose={onClose}
      />
    )
  } else if (typeName.includes("surgery")) {
    content = (
      <SurgeryComponent
        patientId={patientId}
        appointmentId={currentAppointmentId}
        onClose={onClose}
      />
    )
  } else {
    content = (
      <PatientInformation
        patientId={patientId}
        appointmentId={currentAppointmentId}
        onClose={onClose}
      />
    )
  }

  return (
    <>
      {items.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex items-center justify-between border-b">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{displayDate || "Current appointment"}</span>
            </div>
            {selectedItem && (
              <div className="text-xs text-gray-500 dark:text-gray-500 ml-6">
                {selectedItem.appointmentType}
                {selectedItem.appointmentTimeFrom && selectedItem.appointmentTimeTo && (
                  <span className="ml-2">
                    {selectedItem.appointmentTimeFrom.slice(0, 5)} - {selectedItem.appointmentTimeTo.slice(0, 5)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={!canPrev}
              onClick={() => {
                if (!canPrev) return
                const prevItem = items[currentIndex - 1]
                setCurrentAppointmentId(prevItem.appointmentId)
              }}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!canNext}
              onClick={() => {
                if (!canNext) return
                const nextItem = items[currentIndex + 1]
                setCurrentAppointmentId(nextItem.appointmentId)
              }}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {content}
    </>
  )
}


