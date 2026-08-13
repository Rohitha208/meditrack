"use client"

import { cn } from "@/lib/utils"
import { statusTone, toneClasses, type Tone } from "./theme"

interface StatusBadgeProps {
  status: string
  /** Override the automatic status→tone mapping when a status string is ambiguous. */
  tone?: Tone
  className?: string
}

/** Small pill used for status columns (Active, Pending, Cancelled, ...) with a consistent color language. */
export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const resolvedTone = tone ?? statusTone(status)
  const classes = toneClasses[resolvedTone]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        classes.soft,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />
      {status}
    </span>
  )
}
