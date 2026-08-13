"use client"

import { cn } from "@/lib/utils"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { REGISTER_VALUE_CLASS, type RegisterValueTone } from "./theme"

// Frontend/UI only — Administration Register's Overview page. Realistic
// mock data; no API calls.

interface CensusRow {
  label: string
  value: string | number
  tone?: RegisterValueTone
}

const FACILITY_CENSUS: CensusRow[] = [
  { label: "Total sanctioned beds", value: 135 },
  { label: "Occupied", value: 95 },
  { label: "Vacant", value: 19 },
  { label: "Out of service", value: 10, tone: "red" },
  { label: "Staff on duty today", value: 96 },
  { label: "Admissions today", value: 14 },
  { label: "Discharges today", value: 9 },
  { label: "Pending scheme approvals", value: 6, tone: "amber" },
  { label: "Critical stock alerts", value: 1, tone: "red" },
]

interface WardOccupancy {
  ward: string
  occupied: number
  total: number
}

const WARD_OCCUPANCY: WardOccupancy[] = [
  { ward: "General Medicine", occupied: 28, total: 40 },
  { ward: "Cardiology ICU", occupied: 14, total: 20 },
  { ward: "Orthopedics", occupied: 21, total: 30 },
  { ward: "Maternity", occupied: 18, total: 25 },
  { ward: "Pediatrics", occupied: 14, total: 20 },
]

export function AdminOverviewPage() {
  return (
    <div>
      <AdminPageHeader title="Overview" subtitle="Facility-wide snapshot of beds, staffing and flagged items today." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <AdminCard title="Facility Census — Today" noPadding className="lg:col-span-3">
          <ul className="divide-y divide-adminreg-border">
            {FACILITY_CENSUS.map((row, i) => (
              <li key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="flex items-center gap-3 text-sm text-adminreg-text">
                  <span className="w-5 flex-shrink-0 font-mono text-xs text-adminreg-muted">{String(i + 1).padStart(2, "0")}</span>
                  {row.label}
                </span>
                <span className={cn("font-mono text-sm font-bold", REGISTER_VALUE_CLASS[row.tone ?? "default"])}>{row.value}</span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Ward Occupancy Snapshot" className="lg:col-span-2">
          <ul className="space-y-4">
            {WARD_OCCUPANCY.map((w) => {
              const percent = Math.round((w.occupied / w.total) * 100)
              return (
                <li key={w.ward}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-adminreg-text">{w.ward}</span>
                    <span className="font-mono text-xs text-adminreg-muted">
                      {w.occupied} / {w.total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-adminreg-border">
                    <div className="h-1.5 rounded-full bg-adminreg-olive" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </AdminCard>
      </div>
    </div>
  )
}
