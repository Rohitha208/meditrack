"use client"

import { cn } from "@/lib/utils"
import { useStaffRole } from "./RoleProvider"
import { ROLES, ROLE_LABEL } from "./rbac"

/**
 * "Preview as role" — a demo-only control (explicitly not part of the
 * production design; real RBAC comes from auth, not a manual toggle) pinned
 * at the bottom of the unified sidebar so every screen's RBAC filtering can
 * be exercised without a real login per role.
 */
export function RoleSwitcher() {
  const { role, setRole } = useStaffRole()

  return (
    <div className="flex-shrink-0 border-t border-adminreg-sidebar-border px-3 py-3">
      <p className="mb-2 px-2 font-plexmono text-[9px] uppercase tracking-[0.1em] text-adminreg-sidebar-text-muted">Preview as role</p>
      <div className="space-y-0.5">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "block w-full px-2.5 py-2 text-left text-[13px] transition-colors",
              role === r ? "bg-adminreg-indigo font-bold text-adminreg-card" : "text-adminreg-sidebar-text-secondary hover:bg-white/5 hover:text-adminreg-sidebar-text"
            )}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>
    </div>
  )
}
