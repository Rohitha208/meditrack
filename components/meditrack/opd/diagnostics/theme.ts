/**
 * OPD Diagnostics worklist screens (Arogya HMS addendum §2–4) — the three
 * technician-facing queues that sit between "order placed" (Diagnostics
 * stage of the visit thread) and "result available":
 *
 *   Sample Collection  — PHLEBOTOMY   · pathology specimens
 *   Imaging Performed   — RADIOGRAPHER · radiology scans (no specimen)
 *   Result Entry        — LAB/RADIOLOGY · derived queue, collected/performed only
 *
 * Same register tokens as the rest of OPD (indigo accent, IBM Plex Mono for
 * identifiers, square corners, no shadow).
 */

export type DxWorklistKey = "sample-collection" | "imaging-performed" | "result-entry"

export interface DxWorklistDef {
  key: DxWorklistKey
  name: string
  /** Sidebar eyebrow / owning role. */
  role: string
  /** Header breadcrumb line. */
  breadcrumb: string
  href: string
}

export const DX_WORKLIST_DEFS: DxWorklistDef[] = [
  {
    key: "sample-collection",
    name: "Sample Collection",
    role: "PHLEBOTOMY",
    breadcrumb: "OPD — SAMPLE COLLECTION · PATHOLOGY WORKLIST",
    href: "/opd/diagnostics?screen=sample-collection",
  },
  {
    key: "imaging-performed",
    name: "Imaging Performed",
    role: "RADIOGRAPHER",
    breadcrumb: "OPD — IMAGING PERFORMED · RADIOLOGY WORKLIST",
    href: "/opd/diagnostics?screen=imaging-performed",
  },
  {
    key: "result-entry",
    name: "Result Entry",
    role: "LAB / RADIOLOGY",
    breadcrumb: "OPD — RESULT ENTRY · LAB / RADIOLOGY WORKLIST",
    href: "/opd/diagnostics?screen=result-entry",
  },
]

export const REJECTION_REASONS = ["Hemolyzed sample", "Insufficient volume", "Wrong container", "Unlabelled"] as const
export const IMAGING_FAIL_REASONS = ["Motion artifact — unreadable", "Technical failure", "Patient could not hold position", "Incorrect projection"] as const
