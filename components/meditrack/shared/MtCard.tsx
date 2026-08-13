"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MtCardProps {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  noPadding?: boolean
}

/**
 * The base "panel" surface used across every MediTrack page — a white/slate
 * card with a light border and soft shadow. Keeping this in one place is
 * what makes cards look identical across the whole app.
 */
export function MtCard({
  title,
  description,
  action,
  icon,
  children,
  className,
  contentClassName,
  noPadding,
}: MtCardProps) {
  const hasHeader = Boolean(title || description || action)

  return (
    <div
      className={cn(
        // min-w-0 lets this shrink properly when it's a flex/grid item (e.g. the
        // fixed-width column next to a table) instead of stretching wider than
        // its track to fit long unwrapped text and pushing content off-screen.
        "min-w-0 rounded-xl border border-adminreg-border bg-adminreg-card shadow-sm",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon && (
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-sm font-semibold text-adminreg-text">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-xs text-adminreg-muted">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(noPadding ? "" : "p-5", contentClassName)}>{children}</div>
    </div>
  )
}

/** A collapsible content section — used inside long screens like Doctor
 * Consultation or IPD Patient Detail to break dense forms into scannable
 * blocks without needing a separate route per section. */
export function SectionCard({
  title,
  icon,
  action,
  children,
  className,
  defaultOpen = true,
}: {
  title: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-xl border border-adminreg-border bg-adminreg-card", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              {icon}
            </div>
          )}
          <h3 className="text-sm font-semibold text-adminreg-text">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <svg
            className="h-4 w-4 flex-shrink-0 text-adminreg-muted transition-transform group-open:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </summary>
      <div className="border-t border-adminreg-border p-4">{children}</div>
    </details>
  )
}
