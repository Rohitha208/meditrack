"use client"

import { useRootContext } from "@/context/RootContext"
import { useStaffRole } from "./RoleProvider"
import { ROLE_LABEL } from "./rbac"

function signedInName(user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined) {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
  return name || user?.email || "—"
}

/** Shows the signed-in user's name and role. Real RBAC comes from auth. */
export function RoleSwitcher() {
  const { role } = useStaffRole()
  const { user } = useRootContext()

  return (
    <div className="flex-shrink-0 border-t border-adminreg-sidebar-border px-3 py-3">
      <p className="mb-2 px-2 font-plexmono text-[9px] uppercase tracking-[0.1em] text-adminreg-sidebar-text-muted">Signed in as</p>
      <div className="px-2.5 py-2 bg-adminreg-indigo text-adminreg-card">
        <div className="text-[13px] font-bold">{signedInName(user)}</div>
        <div className="mt-0.5 text-[10px] font-semibold opacity-80">{ROLE_LABEL[role]}</div>
      </div>
    </div>
  )
}
