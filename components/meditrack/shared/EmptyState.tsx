"use client"

import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
}

/** Centered placeholder shown inside a table/list when there's no data (or nothing matches the current filters). */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-adminreg-border/40 text-adminreg-muted">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="text-sm font-medium text-adminreg-text">{title}</p>
      {description && <p className="max-w-xs text-xs text-adminreg-muted">{description}</p>}
    </div>
  )
}
