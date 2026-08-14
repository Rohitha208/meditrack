"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MtDataTable, StatusBadge, getInitials, type MtColumn } from "@/components/meditrack/shared"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

// Frontend/UI only — static register content, no backend.

const PERMISSION_COLUMNS = ["Registration", "Billing", "Wards & Beds", "Pharmacy", "Reports"] as const
type PermissionColumn = (typeof PERMISSION_COLUMNS)[number]

interface RolePermissionRow {
  role: string
  access: Record<PermissionColumn, boolean>
}

const ROLE_PERMISSIONS: RolePermissionRow[] = [
  { role: "Administrator", access: { Registration: true, Billing: true, "Wards & Beds": true, Pharmacy: true, Reports: true } },
  { role: "Front Desk", access: { Registration: true, Billing: true, "Wards & Beds": false, Pharmacy: false, Reports: false } },
  { role: "Nurse", access: { Registration: false, Billing: false, "Wards & Beds": true, Pharmacy: false, Reports: false } },
  { role: "Doctor", access: { Registration: true, Billing: false, "Wards & Beds": true, Pharmacy: true, Reports: true } },
  { role: "Pharmacist", access: { Registration: false, Billing: true, "Wards & Beds": false, Pharmacy: true, Reports: false } },
  { role: "Lab Technician", access: { Registration: false, Billing: false, "Wards & Beds": false, Pharmacy: false, Reports: true } },
]

interface UserRow {
  name: string
  role: string
  status: "Active" | "Inactive"
  lastLogin: string
}

const USERS: UserRow[] = [
  { name: "R. Desai", role: "Administrator", status: "Active", lastLogin: "12 Aug 2026, 09:10 AM" },
  { name: "K. Bhatt", role: "Front Desk", status: "Active", lastLogin: "12 Aug 2026, 08:45 AM" },
  { name: "Kavita Rao", role: "Nurse", status: "Active", lastLogin: "12 Aug 2026, 07:55 AM" },
  { name: "Dr. Anjali Nair", role: "Doctor", status: "Active", lastLogin: "11 Aug 2026, 06:20 PM" },
  { name: "M. Pillai", role: "Pharmacist", status: "Active", lastLogin: "12 Aug 2026, 09:00 AM" },
  { name: "S. Verma", role: "Lab Technician", status: "Inactive", lastLogin: "28 Jul 2026, 04:15 PM" },
]

export function AdminUsersRolesPage() {
  const [tab, setTab] = useState<"users" | "permissions">("permissions")
  const [permissions, setPermissions] = useState<RolePermissionRow[]>(ROLE_PERMISSIONS)

  function togglePermission(role: string, col: PermissionColumn) {
    setPermissions((prev) => prev.map((row) => (row.role === role ? { ...row, access: { ...row.access, [col]: !row.access[col] } } : row)))
  }

  const userColumns: MtColumn<UserRow>[] = [
    {
      key: "name",
      header: "User",
      alwaysVisible: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-brand-50 text-xs font-semibold text-brand-700">{getInitials(r.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-adminreg-text">{r.name}</span>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (r) => r.role },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "lastLogin", header: "Last Login", render: (r) => r.lastLogin },
  ]

  return (
    <div>
      <AdminPageHeader title="Users & Roles" subtitle="User accounts, access status and role permission matrix." />

      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "users" ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab("permissions")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "permissions" ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Role permissions
        </button>
      </div>

      {tab === "users" ? (
        <AdminCard title="User Accounts" noPadding>
          <MtDataTable columns={userColumns} rows={USERS} keyExtractor={(r) => r.name} />
        </AdminCard>
      ) : (
        <AdminCard title="Role Permission Matrix">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-adminreg-border text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
                  <th className="py-2.5 pr-4">Role</th>
                  {PERMISSION_COLUMNS.map((col) => (
                    <th key={col} className="px-4 py-2.5 text-center">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((row) => (
                  <tr key={row.role} className="border-b border-adminreg-border/70 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-adminreg-text">{row.role}</td>
                    {PERMISSION_COLUMNS.map((col) => {
                      const on = row.access[col]
                      return (
                        <td key={col} className="px-4 py-3 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            aria-label={`${row.role} — ${col}`}
                            onClick={() => togglePermission(row.role, col)}
                            className={cn(
                              // Switches are the one control in this design that keep their
                              // pill shape — a square toggle reads ambiguously at a glance,
                              // and this is the universally-recognized pattern for on/off.
                              "relative mx-auto flex h-5 w-9 flex-shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-adminreg-olive focus-visible:ring-offset-1",
                              on ? "border-adminreg-olive bg-adminreg-olive" : "border-adminreg-border bg-adminreg-border/50"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-3.5 w-3.5 rounded-full bg-adminreg-card shadow-sm transition-transform",
                                on ? "translate-x-[18px]" : "translate-x-[3px]"
                              )}
                            />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-xs text-adminreg-muted">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-adminreg-muted" />
            Role default access shown above. Per-user overrides are marked with an amber ring in the exception panel.
          </p>
        </AdminCard>
      )}
    </div>
  )
}
