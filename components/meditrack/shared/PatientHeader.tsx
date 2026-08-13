"use client"

import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "./theme"

interface PatientHeaderProps {
  name: string
  uhid: string
  age: number
  gender: string
  bloodGroup?: string
  allergies?: string[]
  /** Extra identity chips specific to the screen (IPD number/ward/bed, appointment time, ...). */
  extra?: ReactNode
}

/** Shared patient identity strip — reused at the top of the Patient Profile,
 * Doctor Consultation, and IPD Patient Detail screens so a patient's
 * identity always reads the same way no matter which module you're in. */
export function PatientHeader({ name, uhid, age, gender, bloodGroup, allergies, extra }: PatientHeaderProps) {
  const hasAllergies = allergies && allergies.length > 0

  return (
    <div className="rounded-xl border border-adminreg-border bg-adminreg-card p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="h-14 w-14 flex-shrink-0">
          <AvatarFallback className="bg-brand-600 text-base font-semibold text-white">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-adminreg-text">{name}</p>
            <span className="rounded-full bg-adminreg-border/40 px-2 py-0.5 text-xs font-medium text-adminreg-muted">
              {uhid}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-adminreg-muted">
            {age} Y · {gender}
            {bloodGroup ? ` · ${bloodGroup}` : ""}
          </p>
        </div>
        {extra && <div className="flex flex-shrink-0 flex-wrap items-center gap-4">{extra}</div>}
      </div>

      {hasAllergies && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          Allergies: {allergies!.join(", ")}
        </div>
      )}
    </div>
  )
}
