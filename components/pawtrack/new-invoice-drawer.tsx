"use client"

import { useState } from "react"
import { Calendar, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import InvoiceSheet from "@/components/pawtrack/invoice/InvoiceSheet"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface NewInvoiceDrawerProps {
  isOpen: boolean
  onClose: () => void
  patientId?: string
  appointmentId?: string
  visitId?: string
}

export function NewInvoiceDrawer({ isOpen, onClose, patientId, appointmentId, visitId }: NewInvoiceDrawerProps) {
  return (
    <InvoiceSheet
      isOpen={isOpen}
      onClose={onClose}
      patientId={patientId || ""}
      appointmentId={appointmentId || ""}
      visitId={visitId}
    />
  )
}
