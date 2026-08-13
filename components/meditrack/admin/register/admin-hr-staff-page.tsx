"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MtDataTable, StatusBadge, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

// Frontend/UI only — duty roster lives in local React state; clicking a
// cell cycles its shift.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const
type Day = (typeof DAYS)[number]
type Shift = "M" | "E" | "N" | "OFF"

const SHIFT_CYCLE: Shift[] = ["M", "E", "N", "OFF"]
const SHIFT_CLASS: Record<Shift, string> = {
  M: "text-adminreg-text",
  E: "text-adminreg-amber font-semibold",
  N: "text-adminreg-red font-semibold",
  OFF: "text-adminreg-muted",
}

interface RosterRow {
  staff: string
  shifts: Record<Day, Shift>
}

const INITIAL_ROSTER: RosterRow[] = [
  { staff: "Kavita Rao", shifts: { Mon: "M", Tue: "M", Wed: "M", Thu: "OFF", Fri: "E" } },
  { staff: "Manoj Pillai", shifts: { Mon: "E", Tue: "E", Wed: "OFF", Thu: "M", Fri: "M" } },
  { staff: "Suman Verma", shifts: { Mon: "M", Tue: "M", Wed: "M", Thu: "M", Fri: "OFF" } },
  { staff: "Ritu Chawla", shifts: { Mon: "N", Tue: "N", Wed: "OFF", Thu: "N", Fri: "N" } },
  { staff: "Ajay Bhatt", shifts: { Mon: "M", Tue: "E", Wed: "M", Thu: "E", Fri: "M" } },
  { staff: "Farah Sheikh", shifts: { Mon: "OFF", Tue: "OFF", Wed: "M", Thu: "M", Fri: "M" } },
]

interface Personnel {
  name: string
  role: string
  department: string
  phone: string
  status: "Active" | "On Leave"
}

const PERSONNEL: Personnel[] = [
  { name: "Kavita Rao", role: "Nurse", department: "General Medicine", phone: "+91 98200 22101", status: "Active" },
  { name: "Manoj Pillai", role: "Nurse", department: "Cardiology ICU", phone: "+91 98200 22102", status: "Active" },
  { name: "Suman Verma", role: "Lab Technician", department: "Diagnostics", phone: "+91 98200 22103", status: "Active" },
  { name: "Ritu Chawla", role: "Nurse", department: "Cardiology ICU", phone: "+91 98200 22104", status: "Active" },
  { name: "Ajay Bhatt", role: "Front Desk", department: "Reception", phone: "+91 98200 22105", status: "Active" },
  { name: "Farah Sheikh", role: "Pharmacist", department: "Pharmacy", phone: "+91 98200 22106", status: "On Leave" },
]

export function AdminHrStaffPage() {
  const [tab, setTab] = useState<"personnel" | "roster">("roster")
  const [roster, setRoster] = useState<RosterRow[]>(INITIAL_ROSTER)

  function cycleShift(staff: string, day: Day) {
    setRoster((prev) =>
      prev.map((row) => {
        if (row.staff !== staff) return row
        const current = row.shifts[day]
        const next = SHIFT_CYCLE[(SHIFT_CYCLE.indexOf(current) + 1) % SHIFT_CYCLE.length]
        return { ...row, shifts: { ...row.shifts, [day]: next } }
      })
    )
  }

  const personnelColumns: MtColumn<Personnel>[] = [
    { key: "name", header: "Staff", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span> },
    { key: "role", header: "Role", render: (r) => r.role },
    { key: "department", header: "Department", render: (r) => r.department },
    { key: "phone", header: "Phone", render: (r) => r.phone },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} tone={r.status === "Active" ? "success" : "warning"} /> },
  ]

  return (
    <div>
      <AdminPageHeader title="HR & Staff" subtitle="Staff directory, leave and the weekly duty roster." />

      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("personnel")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "personnel" ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Personnel
        </button>
        <button
          type="button"
          onClick={() => setTab("roster")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "roster" ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Duty roster
        </button>
      </div>

      {tab === "personnel" ? (
        <AdminCard title="Personnel" noPadding>
          <MtDataTable columns={personnelColumns} rows={PERSONNEL} keyExtractor={(r) => r.name} />
        </AdminCard>
      ) : (
        <AdminCard title="Weekly Duty Roster">
          <p className="mb-4 text-xs text-adminreg-muted">Click a cell to assign or change a shift directly on the grid.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-adminreg-border text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
                  <th className="py-2.5 pr-4">Staff</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-4 py-2.5 text-center">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.staff} className="border-b border-adminreg-border/70 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-adminreg-text">{row.staff}</td>
                    {DAYS.map((day) => (
                      <td key={day} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => cycleShift(row.staff, day)}
                          className={cn("w-full rounded-md py-1 text-sm transition-colors hover:bg-adminreg-border/30", SHIFT_CLASS[row.shifts[day]])}
                        >
                          {row.shifts[day]}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  )
}
