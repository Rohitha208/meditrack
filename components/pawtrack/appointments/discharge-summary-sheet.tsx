"use client"

import React from 'react'
import DischargeSummaryConsultation from './discharge-summary-consultation'
import DischargeSummaryDeworming from './discharge-summary-deworming'
import DischargeSummaryEmergency from './discharge-summary-emergency'
import DischargeSummarySurgery from './discharge-summary-surgery'
import DischargeSummaryVaccination from './discharge-summary-vaccination'

interface DischargeSummarySheetProps {
  isOpen: boolean
  onClose: () => void
  appointmentId: string
  appointmentType?: string
}

export default function DischargeSummarySheet({ 
  isOpen, 
  onClose, 
  appointmentId,
  appointmentType 
}: DischargeSummarySheetProps) {
  // Determine which discharge summary component to render based on appointment type
  const getDischargeSummaryComponent = () => {
    if (!appointmentType) {
      // Default to consultation if no appointment type is provided
      return DischargeSummaryConsultation
    }

    const type = appointmentType.toLowerCase()
    
    if (type.includes('surgery')) {
      return DischargeSummarySurgery
    } else if (type.includes('deworming')) {
      return DischargeSummaryDeworming
    } else if (type.includes('emergency')) {
      return DischargeSummaryEmergency
    } else if (type.includes('vaccination')) {
      return DischargeSummaryVaccination
    } else {
      // Default to consultation for all other types
      return DischargeSummaryConsultation
    }
  }

  const DischargeSummaryComponent = getDischargeSummaryComponent()

  return (
    <DischargeSummaryComponent
      isOpen={isOpen}
      onClose={onClose}
      appointmentId={appointmentId}
    />
  )
} 