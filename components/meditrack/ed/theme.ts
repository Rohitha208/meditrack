import { useSyncExternalStore } from "react"

/**
 * ED (Emergency) module tokens and demo data. Teal, like the rest of the
 * app — the handoff's red ED accent was replaced per the teal-theme request.
 * Priority colours stay semantic (immediate = red, urgent = amber).
 */

export interface EdStageDef {
  name: string
  role: string
}

export const ED_STAGE_DEFS: EdStageDef[] = [
  { name: "Arrival & Triage", role: "CASUALTY DESK / TRIAGE NURSE" },
  { name: "Assessment & Treatment", role: "ED DOCTOR" },
  { name: "Disposition", role: "ED DOCTOR / DESK" },
]

export const ED_COMPLAINTS = [
  "Chest pain",
  "Breathlessness",
  "Road traffic injury",
  "Unconscious / collapse",
  "Seizure",
  "Abdominal pain",
  "Burns",
  "Poisoning / overdose",
] as const

export const ED_BED_CATEGORIES = ["ICU", "HDU", "General ward", "Casualty observation"] as const

export const ED_ADMIT_DEPARTMENTS = ["General Surgery", "Orthopaedics", "General Medicine", "Cardiology"] as const

export type EdPriority = "IMMEDIATE" | "URGENT" | "NON-URGENT"

export const ED_PRIORITY_DEFS: { key: EdPriority; label: string; hint: string }[] = [
  { key: "IMMEDIATE", label: "Immediate", hint: "Life or limb threat — treat now" },
  { key: "URGENT", label: "Urgent", hint: "Doctor within 30 min" },
  { key: "NON-URGENT", label: "Non-urgent", hint: "Can safely wait — within 2 h" },
]

/** A handed-off ED encounter, as read by the IPD admission worklist. */
export interface EdHandoffRow {
  id: string
  patient: string
  ageSex: string
  uhid: string
  complaint: string
  doctor: string
  department: string
  bedCategory: string
  handedOffAt: string
}

let handoffs: EdHandoffRow[] = []
const listeners = new Set<() => void>()

export function addEdHandoff(row: EdHandoffRow) {
  handoffs = [...handoffs, row]
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return handoffs
}

/** Admitted ED encounters waiting on the IPD admission desk. Shared across
 * the ED and IPD screens in this session (demo state, not persisted). */
export function useEdHandoffs(): EdHandoffRow[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
