"use client"

import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

// Frontend/UI only — audit trail lives in local constants, no backend.

interface AuditEntry {
  entry: string
  timestamp: string
  user: string
  action: string
  module: string
}

const AUDIT_LOG: AuditEntry[] = [
  { entry: "00189", timestamp: "10:42", user: "R. Desai", action: "Updated tariff — ICU bed / day", module: "Tariffs & Packages" },
  { entry: "00188", timestamp: "09:58", user: "S. Verma", action: "Flagged Clopidogrel 75mg — critical stock", module: "Master Data" },
  { entry: "00187", timestamp: "09:20", user: "R. Desai", action: "Marked bed OR-014 out of service", module: "Wards & Beds" },
  { entry: "00186", timestamp: "08:47", user: "A. Bhatt", action: "Added staff record — F. Sheikh", module: "HR & Staff" },
  { entry: "00185", timestamp: "Yesterday", user: "R. Desai", action: "Renewed ESI empanelment — pending", module: "Tariffs & Packages" },
  { entry: "00184", timestamp: "Yesterday", user: "K. Rao", action: "Updated duty roster — week 33", module: "HR & Staff" },
  { entry: "00183", timestamp: "Yesterday", user: "R. Desai", action: "Changed department head — Cardiology", module: "Departments" },
  { entry: "00182", timestamp: "2 days ago", user: "S. Verma", action: "Added drug — Insulin Glargine", module: "Master Data" },
  { entry: "00181", timestamp: "2 days ago", user: "A. Bhatt", action: "Deactivated user — old front desk account", module: "Users & Roles" },
  { entry: "00180", timestamp: "3 days ago", user: "R. Desai", action: "Updated hospital profile — added Whitefield branch", module: "Hospital Profile" },
]

export function AdminAuditLogPage() {
  return (
    <div>
      <AdminPageHeader title="Audit Log" subtitle="Chronological record of configuration changes across the Administration Register." />

      <AdminCard noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-adminreg-border bg-adminreg-header text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
              <th className="px-5 py-3">Entry</th>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Module</th>
            </tr>
          </thead>
          <tbody>
            {AUDIT_LOG.map((e) => (
              <tr key={e.entry} className="border-b border-adminreg-divider last:border-0">
                <td className="px-5 py-3 font-mono text-xs text-adminreg-muted">{e.entry}</td>
                <td className="px-5 py-3 font-mono text-xs text-adminreg-muted">{e.timestamp}</td>
                <td className="px-5 py-3 font-medium text-adminreg-text">{e.user}</td>
                <td className="px-5 py-3">{e.action}</td>
                <td className="px-5 py-3 text-adminreg-muted">{e.module}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </div>
  )
}
