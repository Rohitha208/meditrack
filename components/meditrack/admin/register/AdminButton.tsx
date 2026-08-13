"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger"
  /** Module accent for the primary variant — olive (Admin) or indigo (OPD). */
  accent?: "olive" | "indigo"
}

const PRIMARY_ACCENT_CLASSES: Record<NonNullable<AdminButtonProps["accent"]>, string> = {
  olive: "bg-adminreg-olive text-adminreg-card border-adminreg-olive-dark hover:bg-adminreg-olive-dark",
  indigo: "bg-adminreg-indigo text-adminreg-card border-adminreg-indigo-dark hover:bg-adminreg-indigo-dark",
}

const SECONDARY_DANGER_CLASSES: Record<"secondary" | "danger", string> = {
  secondary: "bg-adminreg-bg text-adminreg-muted border-adminreg-border hover:bg-adminreg-header",
  danger: "bg-adminreg-red text-adminreg-card border-adminreg-red-text hover:opacity-90",
}

/**
 * The register family's button (Admin + OPD) — per the Arogya HMS design
 * spec: square corners, 8px/14px padding, 1px border a shade darker than
 * the fill, no shadow. The primary variant's color follows the active
 * module's accent (olive for Admin, indigo for OPD) via `accent`.
 * Deliberately its own component (not the shared MtButton), which the rest
 * of MediTrack keeps using until its own matching redesign.
 */
export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ variant = "primary", accent = "olive", className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-none border px-3.5 font-archivo text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" ? PRIMARY_ACCENT_CLASSES[accent] : SECONDARY_DANGER_CLASSES[variant],
        className
      )}
      {...props}
    />
  )
)
AdminButton.displayName = "AdminButton"
