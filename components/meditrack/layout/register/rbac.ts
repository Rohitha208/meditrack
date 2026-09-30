/**
 * Demo-only RBAC for the unified Admin + OPD + IPD shell, per the Arogya HMS
 * unified-shell spec. Drives which module/screens a role can see and which
 * of those are editable vs. view-only. In production this comes from the
 * authenticated user's actual role/permission set, not a client-side
 * toggle — the role switcher here exists purely so this UI can demonstrate
 * all four states.
 */

export type StaffRole = "frontdesk" | "doctor" | "nurse" | "labtech" | "admin"

export const ROLES: StaffRole[] = ["frontdesk", "doctor", "nurse", "labtech", "admin"]

export const ROLE_LABEL: Record<StaffRole, string> = {
  frontdesk: "Front Desk",
  doctor: "Doctor",
  nurse: "Nurse",
  labtech: "Lab / Radiology Tech",
  admin: "Hospital Admin",
}

/** Maps the logged-in user's backend `roleName` (Nurse, Administrator, …)
 * onto the shell's StaffRole. Preview-as-role is not used in production. */
export function staffRoleFromRoleName(roleName?: string | null): StaffRole {
  const value = (roleName || "").trim().toLowerCase()
  if (value.includes("nurse")) return "nurse"
  if (value.includes("receptionist") || value.includes("front desk") || value.includes("frontdesk")) return "frontdesk"
  if (value.includes("lab") || value.includes("radio") || value.includes("phlebo")) return "labtech"
  if (value.includes("doctor") || value.includes("physician") || value.includes("veterinar")) return "doctor"
  return "admin"
}

export function roleHomePath(role: StaffRole, isSuperAdmin = false): string {
  if (isSuperAdmin) return "/admin/companies"
  if (role === "admin") return "/admin/dashboard"
  if (role === "labtech") return "/opd/diagnostics?screen=sample-collection"
  if (role === "nurse") return "/opd/visit-thread?stage=3"
  if (role === "doctor") return "/opd/visit-thread?stage=4"
  return "/opd/appointments"
}

/** Only Hospital Admin can enter the Admin module at all. */
export function canAccessAdmin(role: StaffRole): boolean {
  return role === "admin"
}

/** Only Front Desk and Hospital Admin can reach Appointment Booking. */
export function canAccessAppointmentBooking(role: StaffRole): boolean {
  return role === "frontdesk" || role === "admin"
}

/** Hospital Admin sees Appointment Booking read-only (oversight); Front Desk edits it. */
export function appointmentBookingEditable(role: StaffRole): boolean {
  return role === "frontdesk"
}

/** The three OPD Diagnostics worklists (Sample Collection / Imaging Performed
 * / Result Entry) are the Lab / Radiology Tech's home; Hospital Admin sees
 * them read-only for oversight. Everyone else works from the Diagnostics
 * stage of the visit thread instead. */
export function canAccessDxWorklist(role: StaffRole): boolean {
  return role === "labtech" || role === "admin"
}

export function dxWorklistEditable(role: StaffRole): boolean {
  return role === "labtech"
}

/** Which of the 9 OPD visit-thread stage indices (0-8) a role can see at all,
 * and which of those it can additionally edit — everything visible-but-not-
 * editable renders in view-only mode (banner + no mutating controls).
 * Stages: 0 Registration, 1 Fee Collection, 2 Token & Queue, 3 Vitals &
 * Triage, 4 Consultation, 5 Diagnostics, 6 e-Prescription, 7 Pharmacy
 * Dispensing, 8 Visit Closure.
 *
 * Front Desk sees only their own OPD stages (Registration, Fee Collection,
 * Token & Queue, Visit Closure). Nurse / Doctor / Lab / Pharmacy stages
 * stay off that sidebar.
 *
 * Lab / Radiology Tech works from the three Diagnostics worklists (see
 * canAccessDxWorklist) and owns the Diagnostics stage of the visit thread.
 * Doctors order tests from Consultation — they do not re-order on Diagnostics. */
export const OPD_STAGE_ACCESS: Record<StaffRole, { visible: number[]; editable: number[] }> = {
  frontdesk: { visible: [0, 1, 2, 8], editable: [0, 1, 2, 8] },
  doctor: { visible: [3, 4, 6, 7, 8], editable: [4, 6] },
  nurse: { visible: [3], editable: [3] },
  labtech: { visible: [5], editable: [5] },
  admin: { visible: [0, 1, 2, 3, 4, 5, 6, 7, 8], editable: [] },
}

export function isStageVisible(role: StaffRole, stage: number): boolean {
  return OPD_STAGE_ACCESS[role].visible.includes(stage)
}

export function isStageEditable(role: StaffRole, stage: number): boolean {
  return OPD_STAGE_ACCESS[role].editable.includes(stage)
}

/** First stage a role is allowed to land on — used when the current stage
 * isn't in that role's visible list (e.g. switching role mid-thread). */
export function firstVisibleStage(role: StaffRole): number {
  return OPD_STAGE_ACCESS[role].visible[0] ?? 0
}

/** Which of the 8 IPD stay stage indices (0-7) a role can see/edit.
 * Stages: 0 Admission Decision, 1 Bed Allocation, 2 Deposit & Pre-Auth
 * (ONCE — AT ADMISSION) · 3 Nursing & Rounds, 4 Diagnostics & OT, 5 Daily
 * Billing Accrual (EVERY DAY OF STAY) · 6 Discharge Planning, 7 Final
 * Billing & Settlement (ONCE — AT DISCHARGE).
 *
 * Unlike OPD's per-role-narrowed visibility, IPD visibility is broad by
 * default — Front Desk and Doctor see the full 8-stage stay (continuity of
 * care across a multi-day admission matters even for stages they don't own),
 * they just can't edit stages outside their own. Nurse is the one deliberate
 * exception, per the spec: "Nurse sees only the MAR (no billing, no
 * admin)" — narrowed to stage 3 alone, not just non-editable elsewhere.
 *
 * Lab / Radiology Tech owns Diagnostics & OT (stage 4) only — same narrow
 * treatment as Nurse. */
export const IPD_STAGE_ACCESS: Record<StaffRole, { visible: number[]; editable: number[] }> = {
  frontdesk: { visible: [0, 1, 2, 5, 7], editable: [0, 1, 2, 5, 7] },
  doctor: { visible: [0, 1, 2, 3, 4, 5, 6, 7], editable: [4, 6] },
  nurse: { visible: [3], editable: [3] },
  labtech: { visible: [4], editable: [4] },
  admin: { visible: [0, 1, 2, 3, 4, 5, 6, 7], editable: [] },
}

export function isIpdStageVisible(role: StaffRole, stage: number): boolean {
  return IPD_STAGE_ACCESS[role].visible.includes(stage)
}

export function isIpdStageEditable(role: StaffRole, stage: number): boolean {
  return IPD_STAGE_ACCESS[role].editable.includes(stage)
}

export function firstVisibleIpdStage(role: StaffRole): number {
  return IPD_STAGE_ACCESS[role].visible[0] ?? 0
}
