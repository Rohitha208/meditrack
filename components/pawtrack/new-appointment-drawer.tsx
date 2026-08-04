"use client"

import type React from "react"

import { useState } from "react"
import { Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import NewAppointment from "@/components/pawtrack/appointments/newAppointment"
import AppointmentDetails from "./appointments/appointment-details"

interface NewAppointmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  preSelectedClinic?: string
  preSelectedRoom?: string | null
  appointmentId?: string | null
  sendEmail?: boolean
}

export function NewAppointmentDrawer({ 
  isOpen, 
  onClose, 
  preSelectedClinic, 
  preSelectedRoom, 
  appointmentId, 
  sendEmail = false 
}: NewAppointmentDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[20%] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold">
            {appointmentId ? "Update Appointment" : "Schedule New Appointment"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {appointmentId ? (
            <AppointmentDetails
              appointmentId={appointmentId}
              onClose={onClose}
            />
          ) : (
            <NewAppointment 
              isOpen={isOpen} 
              onClose={onClose} 
              preSelectedClinic={preSelectedClinic}
              preSelectedRoom={preSelectedRoom}
              appointmentId={appointmentId}
              sendEmail={sendEmail}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
