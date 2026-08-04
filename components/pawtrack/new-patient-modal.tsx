"use client"

import type React from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { NewPatientForm } from "@/components/pawtrack/patients/new-patient-form"

interface NewPatientModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewPatientModal({ isOpen, onClose }: NewPatientModalProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
       <SheetContent className="w-[90%] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold relative top-[-14px]">Add New Patient</SheetTitle>
        </SheetHeader>
        <div className="">
          <NewPatientForm onSuccess={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
