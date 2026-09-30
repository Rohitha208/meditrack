"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useStaffRole } from "./RoleProvider"
import { canAccessAdmin, firstVisibleIpdStage, firstVisibleStage, roleHomePath } from "./rbac"

/** Role-specific OPD/IPD landing. Default module hrefs start at stage 0
 * (Registration / Admission), which nurses must not open. */
const ROLE_MODULE_HOME: Partial<Record<string, Partial<Record<"opd" | "ipd", string>>>> = {
  nurse: { opd: roleHomePath("nurse"), ipd: `/ipd/stay?stage=${firstVisibleIpdStage("nurse")}` },
  labtech: { opd: "/opd/diagnostics?screen=sample-collection", ipd: `/ipd/stay?stage=${firstVisibleIpdStage("labtech")}` },
  doctor: { opd: roleHomePath("doctor"), ipd: `/ipd/stay?stage=${firstVisibleIpdStage("doctor")}` },
  frontdesk: { opd: roleHomePath("frontdesk"), ipd: `/ipd/stay?stage=${firstVisibleIpdStage("frontdesk")}` },
}

interface ModuleDef {
  key: "admin" | "opd" | "ipd"
  label: string
  sublabel: string
  href: string | null
  dotClass: string
  accentClass: string
  match: (pathname: string) => boolean
}

const MODULES: ModuleDef[] = [
  { key: "admin", label: "Admin", sublabel: "Configuration & registers", href: "/admin/dashboard", dotClass: "bg-adminreg-olive", accentClass: "border-l-adminreg-olive", match: (p) => p.startsWith("/admin") },
  { key: "opd", label: "OPD", sublabel: "Outpatient visit thread", href: "/opd/visit-thread", dotClass: "bg-adminreg-indigo", accentClass: "border-l-adminreg-indigo", match: (p) => p.startsWith("/opd") },
  { key: "ipd", label: "IPD", sublabel: "Inpatient stay record", href: "/ipd/stay", dotClass: "bg-adminreg-ipd", accentClass: "border-l-adminreg-ipd", match: (p) => p.startsWith("/ipd") },
]

/**
 * The module switcher — pinned at the top of the unified sidebar, per the
 * unified-shell spec. All three modules (Admin / OPD / IPD) are live. Admin
 * is dimmed (not removed from the DOM) for roles that can't access it, per
 * the spec's stated tradeoff; the same treatment applies to OPD/IPD for a
 * super admin, who only operates the company-management Admin surface.
 */
export function ModuleSwitcher({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname()
  const { role } = useStaffRole()

  return (
    <div className="flex-shrink-0 space-y-1 border-b border-adminreg-sidebar-border px-3 py-3">
      {MODULES.map((m) => {
        const href =
          isSuperAdmin && m.key === "admin"
            ? "/admin/companies"
            : (m.key === "opd" || m.key === "ipd") && ROLE_MODULE_HOME[role]?.[m.key]
              ? ROLE_MODULE_HOME[role]![m.key]!
              : m.href
        const active = m.match(pathname)
        const disabled =
          href === null ||
          (isSuperAdmin && m.key !== "admin") ||
          (m.key === "admin" && !canAccessAdmin(role) && !isSuperAdmin)
        const content = (
          <div
            className={cn(
              "flex items-center gap-2.5 border-l-[3px] border-transparent px-2.5 py-2 transition-colors",
              active && cn("bg-white/10", m.accentClass),
              disabled ? "opacity-40" : !active && "hover:bg-white/5"
            )}
          >
            <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", m.dotClass)} />
            <div className="min-w-0">
              <p className={cn("text-[13px]", active ? "font-bold text-adminreg-sidebar-text" : "font-semibold text-adminreg-sidebar-text-secondary")}>{m.label}</p>
              <p className="truncate text-[10px] text-adminreg-sidebar-text-muted">{m.sublabel}</p>
            </div>
          </div>
        )

        return disabled ? (
          <div key={m.key} aria-disabled className="cursor-not-allowed">{content}</div>
        ) : (
          <Link key={m.key} href={href!}>{content}</Link>
        )
      })}
    </div>
  )
}
