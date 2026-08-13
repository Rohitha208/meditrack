"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { formatDate } from "@/components/meditrack/shared"
import { ADMIN_REGISTER_NAV, isAdminRegisterPathActive } from "./theme"

interface AdminPageHeaderProps {
  title: string
  subtitle: string
  role?: string
  actions?: ReactNode
}

/** Breadcrumb + title + role badge + date row shared by every Administration
 * Register page — per the Arogya HMS design spec (22px/800 title, Archivo
 * throughout, IBM Plex Mono for the date). */
export function AdminPageHeader({ title, subtitle, role = "Hospital Administrator", actions }: AdminPageHeaderProps) {
  const pathname = usePathname()
  const current = ADMIN_REGISTER_NAV.find((item) => isAdminRegisterPathActive(pathname, item.href))

  return (
    <div className="mb-6 flex flex-col gap-4 font-archivo sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.01em] text-adminreg-text">{title}</h1>
        <p className="mt-1 text-sm text-adminreg-muted">{subtitle}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        {actions}
        <span className="flex h-9 items-center rounded-none bg-adminreg-sidebar px-3 text-[11px] font-bold uppercase tracking-wide text-adminreg-sidebar-text">
          {role}
        </span>
        <span className="whitespace-nowrap font-plexmono text-xs uppercase text-adminreg-muted">{formatDate(new Date())}</span>
      </div>
    </div>
  )
}
