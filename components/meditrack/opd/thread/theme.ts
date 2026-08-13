import type { DrawerBadgeTone } from "@/components/meditrack/admin/register/AdminDrawer"

/**
 * OPD "visit thread" tokens — per the Arogya HMS unified-shell spec. Same
 * base register tokens as Admin (bg/card/border/text/amber/red, Archivo +
 * IBM Plex Mono, no border-radius/shadow); OPD's own accent is indigo
 * (`adminreg-indigo`) instead of Admin's olive.
 */

export interface StageDef {
  name: string
  role: string
}

export const STAGE_DEFS: StageDef[] = [
  { name: "Registration", role: "FRONT DESK" },
  { name: "Fee Collection", role: "FRONT DESK" },
  { name: "Token & Queue", role: "FRONT DESK" },
  { name: "Vitals & Triage", role: "NURSE" },
  { name: "Consultation", role: "DOCTOR" },
  { name: "Diagnostics", role: "LAB / RADIOLOGY" },
  { name: "e-Prescription", role: "DOCTOR" },
  { name: "Pharmacy Dispensing", role: "PHARMACIST" },
  { name: "Visit Closure", role: "FRONT DESK" },
]

export const MODE_BADGE_TONE: Record<string, DrawerBadgeTone> = {
  "LIVE EDIT": "neutral",
  AMENDMENT: "amend",
  VOID: "void",
  RETURN: "neutral",
  "MERGE REVIEW": "amend",
  "SUPERVISOR OVERRIDE REQUIRED": "amend",
  OVERRIDE: "neutral",
}

/** A field/action rendered in a "superseded" (struck-through, muted) state
 * after being corrected via an amendment — the original entry is kept on
 * record, never deleted. */
export const SUPERSEDED_CLASS = "line-through text-adminreg-muted2/70"
