"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { UnifiedSidebar } from "./UnifiedSidebar"
import { GlobalSearch } from "./GlobalSearch"
import { formatDate } from "@/components/meditrack/shared"

/** Full-bleed unified shell for /admin/* and /opd/* — one sidebar (module
 * switcher + role-aware nav + role switcher), a top bar with global search
 * + date, then the routed page content. Replaces the earlier separate
 * Admin-only RegisterShell and OPD's own self-contained shell.
 *
 * Admin screens have no padding of their own (they expect the shell to
 * provide it, same as the old RegisterShell did); OPD screens deliberately
 * manage their own padding — their header band is meant to run full-bleed
 * edge to edge — so the shell must not add a second layer of padding there. */
export function UnifiedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")

  return (
    <div className="flex h-screen w-full overflow-hidden bg-adminreg-bg font-archivo text-adminreg-text">
      <UnifiedSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-adminreg-border bg-adminreg-card px-8 py-3">
          <GlobalSearch />
          <span className="whitespace-nowrap font-plexmono text-xs uppercase text-adminreg-muted">{formatDate(new Date())}</span>
        </div>
        <main className="adminreg-scroll min-h-0 flex-1 overflow-y-auto">
          {isAdmin ? <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div> : children}
        </main>
      </div>
    </div>
  )
}
