"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRootContext } from "@/context/RootContext"
import { ADMIN_REGISTER_NAV, isAdminRegisterPathActive } from "@/components/meditrack/admin/register/theme"

/**
 * The Administration Register's sidebar — per the Arogya HMS design spec:
 * dark, square corners, Archivo throughout. Used only for /admin/* routes;
 * OPD is now the visit-thread experience (its own relay-spine sidebar, see
 * components/meditrack/opd/thread) and IPD has no module yet, so this no
 * longer needs to branch between contexts.
 */
export function RegisterSidebar() {
  const pathname = usePathname()
  const { user } = useRootContext()
  const displayName = user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "R. Desai"
  const staffCode = user?.id ? `ADMIN-${String(user.id).slice(-4).padStart(4, "0")}` : "ADMIN-0007"

  return (
    <aside className="hidden h-screen w-[236px] flex-shrink-0 flex-col bg-adminreg-sidebar font-archivo md:flex">
      <div className="flex-shrink-0 border-b border-adminreg-sidebar-border px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-none bg-adminreg-olive text-adminreg-card">
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <p className="text-base font-bold tracking-wide text-adminreg-sidebar-text">MediTrack</p>
        </div>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-adminreg-sidebar-text-muted">Administration Register</p>

        <div className="mt-4 border-t border-adminreg-sidebar-border pt-4">
          <p className="text-xs font-medium text-adminreg-sidebar-text-secondary">Sri Ramachandra Multispecialty Hospital</p>
          <p className="mt-0.5 font-plexmono text-[10px] text-adminreg-sidebar-text-muted">SRMH-BLR-04</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {ADMIN_REGISTER_NAV.map((item) => {
          const active = isAdminRegisterPathActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-none px-3 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-adminreg-olive font-bold text-adminreg-card" : "text-adminreg-sidebar-text-secondary hover:bg-white/5 hover:text-adminreg-sidebar-text"
              )}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-adminreg-card" : "text-adminreg-sidebar-text-muted")} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-adminreg-sidebar-border px-5 py-4">
        <p className="truncate text-[11px] text-adminreg-sidebar-text-muted">
          Logged in as <span className="text-adminreg-sidebar-text-secondary">{displayName.toUpperCase()}</span> · {staffCode}
        </p>
      </div>
    </aside>
  )
}
