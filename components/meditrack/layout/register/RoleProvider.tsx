"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { StaffRole } from "./rbac"

interface RoleContextValue {
  role: StaffRole
  setRole: (role: StaffRole) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

/** Holds the demo "preview as role" selection for the unified Admin + OPD
 * shell. Provided once, above the Admin/OPD route branching in
 * meditrack-layout.tsx, so the selection survives client-side navigation
 * between the two modules — both the sidebar and each module's page content
 * read it via `useStaffRole()`. */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<StaffRole>("admin")
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>
}

export function useStaffRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error("useStaffRole must be used within a RoleProvider")
  return ctx
}
