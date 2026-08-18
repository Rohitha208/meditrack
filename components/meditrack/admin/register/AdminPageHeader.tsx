"use client"

import type { ReactNode } from "react"

interface AdminPageHeaderProps {
  title: string
  subtitle: string
  actions?: ReactNode
}

/** Title + subtitle + optional action buttons row shared by every
 * Administration Register page (22px/800 title, Archivo). The role badge
 * and date used to live here too — both are now shown once in the unified
 * shell's top bar instead of repeating on every screen. */
export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 font-archivo sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.01em] text-adminreg-text">{title}</h1>
        <p className="mt-1 text-sm text-adminreg-muted">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}
