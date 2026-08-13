"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { MtButton } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { BED_STATUS_CLASS, type BedStatus } from "./theme"

// Frontend/UI only — bed grid lives in local React state (status per bed).

interface WardConfig {
  name: string
  prefix: string
  count: number
}

const WARDS: WardConfig[] = [
  { name: "General Medicine", prefix: "GM", count: 35 },
  { name: "Cardiology ICU", prefix: "CI", count: 16 },
  { name: "Orthopedics", prefix: "OR", count: 24 },
  { name: "Maternity", prefix: "MT", count: 20 },
  { name: "Pediatrics", prefix: "PD", count: 18 },
]

interface Bed {
  id: string
  status: BedStatus
  patientId?: string
}

// Deterministic mock distribution — mostly occupied, a handful vacant, a
// few cleaning/out-of-service, matching the approved mockup's density.
function generateBeds(ward: WardConfig): Bed[] {
  const beds: Bed[] = []
  for (let i = 1; i <= ward.count; i++) {
    const code = `${ward.prefix}-${String(i).padStart(3, "0")}`
    const mod = i % 11
    let status: BedStatus = "Occupied"
    if (mod === 4 || mod === 9) status = "Vacant"
    else if (mod === 7) status = "Cleaning"
    else if (mod === 2 && i > ward.count / 2) status = "Out of service"
    beds.push({ id: code, status, patientId: status === "Occupied" ? `••${1000 + i * 37}` : undefined })
  }
  return beds
}

const LEGEND: BedStatus[] = ["Occupied", "Vacant", "Cleaning", "Out of service"]

export function AdminWardsBedsPage() {
  const [activeWard, setActiveWard] = useState(WARDS[0].name)
  const [visibleStatuses, setVisibleStatuses] = useState<Set<BedStatus>>(new Set(LEGEND))

  const ward = WARDS.find((w) => w.name === activeWard)!
  const beds = useMemo(() => generateBeds(ward), [ward])
  const filteredBeds = beds.filter((b) => visibleStatuses.has(b.status))

  function toggleStatus(status: BedStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  return (
    <div>
      <AdminPageHeader title="Wards & Beds" subtitle="Live bed status by ward, and ward master configuration." />

      <div className="mb-4 flex flex-wrap gap-2">
        {WARDS.map((w) => (
          <button
            key={w.name}
            type="button"
            onClick={() => setActiveWard(w.name)}
            className={cn(
              "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
              w.name === activeWard ? "border-adminreg-olive bg-adminreg-olive text-white" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
            )}
          >
            {w.name}
          </button>
        ))}
      </div>

      <MtButton className="mb-5 gap-2">
        <Plus className="h-4 w-4" />
        Add bed
      </MtButton>

      <div className="mb-5 flex flex-wrap items-center gap-4 text-sm">
        {LEGEND.map((status) => (
          <label key={status} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={visibleStatuses.has(status)}
              onChange={() => toggleStatus(status)}
              className="h-3.5 w-3.5 accent-adminreg-olive"
            />
            <span className={cn("h-2.5 w-2.5 rounded-sm", BED_STATUS_CLASS[status].dot)} />
            <span className="text-adminreg-text">{status}</span>
          </label>
        ))}
      </div>

      <AdminCard title={`${ward.name} — ${beds.length} beds`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredBeds.map((bed) => {
            const cls = BED_STATUS_CLASS[bed.status]
            return (
              <div key={bed.id} className={cn("rounded-lg border p-3 text-sm", cls.border, cls.bg)}>
                <p className="font-semibold text-adminreg-text">{bed.id}</p>
                <p className={cn("mt-0.5 text-xs font-medium", cls.text)}>{bed.status}</p>
                {bed.patientId && <p className="mt-1 font-mono text-[10px] text-adminreg-muted">{bed.patientId}</p>}
              </div>
            )
          })}
        </div>
      </AdminCard>
    </div>
  )
}
