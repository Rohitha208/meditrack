"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStaffRole } from "./RoleProvider"
import { OPD_STAGE_ACCESS } from "./rbac"

const MOCK_PATIENTS = [
  { name: "Meera Kulkarni", uhid: "UHID-0004821", visitId: "OPD-20260812-0091", hasActiveVisit: true },
]

/** Persistent header search — matches on patient name and surfaces a
 * "Jump to active visit" result that switches module to OPD and lands on
 * the furthest stage the current role is allowed to see, per the
 * unified-shell spec. Real routing, not a dead link. */
export function GlobalSearch() {
  const router = useRouter()
  const { role } = useStaffRole()
  const [query, setQuery] = useState("")

  const results = query.trim().length > 0 ? MOCK_PATIENTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())) : []

  function jumpToVisit(patientName: string) {
    const visible = OPD_STAGE_ACCESS[role].visible
    const furthestStage = visible.length > 0 ? Math.max(...visible) : 0
    setQuery("")
    router.push(`/opd/visit-thread?stage=${furthestStage}&patient=${encodeURIComponent(patientName)}`)
  }

  return (
    <div className="relative w-full max-w-[420px]">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search patients, providers, records..."
        className="w-full rounded-none border border-adminreg-border bg-adminreg-bg px-3 py-2 font-archivo text-sm text-adminreg-text placeholder:text-adminreg-muted focus:outline-none focus:ring-1 focus:ring-adminreg-olive"
      />
      {results.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full border border-adminreg-border bg-adminreg-card shadow-sm">
          {results.map((p) => (
            <div key={p.uhid} className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-adminreg-text">{p.name}</p>
                <p className="font-plexmono text-[10px] text-adminreg-muted">{p.uhid} · {p.visitId}</p>
              </div>
              {p.hasActiveVisit && (
                <button
                  type="button"
                  onClick={() => jumpToVisit(p.name)}
                  className="flex-shrink-0 whitespace-nowrap border border-adminreg-indigo bg-adminreg-indigo-soft px-2.5 py-1.5 text-xs font-semibold text-adminreg-indigo-dark hover:bg-adminreg-indigo hover:text-adminreg-card"
                >
                  Jump to active visit →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
