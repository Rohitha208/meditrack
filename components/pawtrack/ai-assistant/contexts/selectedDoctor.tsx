"use client"

import React, { createContext, useContext, useState, useMemo, ReactNode } from "react"

interface Patient {
  id: string
  name: string
  clientId?: string
}

interface SelectedPatientContextType {
  selectedPatient: Patient | null
  setSelectedPatient: (patient: Patient | null) => void
}

const SelectedPatientContext = createContext<SelectedPatientContextType | undefined>(undefined)

interface SelectedPatientProviderProps {
  children: ReactNode
}

export function SelectedPatientProvider({ children }: SelectedPatientProviderProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const value = useMemo(
    () => ({
      selectedPatient,
      setSelectedPatient,
    }),
    [selectedPatient]
  )

  return (
    <SelectedPatientContext.Provider value={value}>
      {children}
    </SelectedPatientContext.Provider>
  )
}

export function useSelectedPatient() {
  const context = useContext(SelectedPatientContext)
  if (context === undefined) {
    throw new Error("useSelectedPatient must be used within a SelectedPatientProvider")
  }
  return context
}

