"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface InfoRowProps {
  icon?: LucideIcon
  label: string
  value: ReactNode
}

/** A single label/value line used inside detail-drawer bodies (Patient ID, Phone, Ward/Bed, ...). */
export function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <span className="flex flex-shrink-0 items-center gap-1.5 text-adminreg-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-right font-medium text-adminreg-text">{value}</span>
    </div>
  )
}
