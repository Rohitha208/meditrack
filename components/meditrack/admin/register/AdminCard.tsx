"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AdminCardProps {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  noPadding?: boolean
}

/**
 * The register "panel" surface — per the Arogya HMS design spec: square
 * corners, no drop shadow, cream panel background (`#F1EDDF`), a thin
 * structural border, and an uppercase/letter-spaced Archivo section
 * heading. Used across every Administration Register screen.
 */
export function AdminCard({ title, action, children, className, contentClassName, noPadding }: AdminCardProps) {
  return (
    <div className={cn("rounded-none border border-adminreg-border bg-adminreg-card font-archivo", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-adminreg-border px-5 py-3.5">
          {title && <h2 className="text-[11px] font-bold uppercase tracking-[0.04em] text-adminreg-muted">{title}</h2>}
          {action}
        </div>
      )}
      {/* overflow-x-auto is a safety net for cards holding a raw <table>
       * (not every screen goes through MtDataTable, which handles this
       * itself) — keeps a wide table scrolling inside the card on mobile
       * instead of blowing out the whole page's width. */}
      <div className={cn("overflow-x-auto", noPadding ? "" : "p-5", contentClassName)}>{children}</div>
    </div>
  )
}
