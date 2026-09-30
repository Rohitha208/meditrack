"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useRootContext } from "@/context/RootContext"
import { staffRoleFromRoleName, type StaffRole } from "./rbac"

interface RoleContextValue {
  role: StaffRole
  setRole: (role: StaffRole) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

/** Staff role for the unified shell comes from the signed-in user's
 * backend roleName — not a client-side preview toggle. */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useRootContext()
  const role = staffRoleFromRoleName(user?.roleName || roles?.[0])
  const value = useMemo<RoleContextValue>(
    () => ({ role, setRole: () => {} }),
    [role]
  )
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useStaffRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (ctx) return ctx
  return { role: "admin", setRole: () => {} }
}
