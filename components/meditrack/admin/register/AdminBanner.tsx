"use client"

import { CheckCircle2, X } from "lucide-react"

interface AdminBannerProps {
  message: string
  onDismiss: () => void
}

/**
 * The Administration Register's ONE success-feedback pattern — a single
 * dismissible inline banner at the top of the content area (olive
 * background, checkmark), shown after any save/confirm action. Per the
 * Arogya HMS design spec, this replaces toasts and per-row success states
 * everywhere in the module.
 */
export function AdminBanner({ message, onDismiss }: AdminBannerProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 border border-adminreg-olive bg-adminreg-olive-soft px-4 py-3 font-archivo">
      <span className="flex items-center gap-2 text-sm font-medium text-adminreg-olive-dark">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        {message}
      </span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-adminreg-olive-dark hover:opacity-70">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
