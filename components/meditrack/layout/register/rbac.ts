/**
 * Demo-only RBAC for the unified Admin + OPD shell, per the Arogya HMS
 * unified-shell spec. Drives which module/screens a role can see and which
 * of those are editable vs. view-only. In production this comes from the
 * authenticated user's actual role/permission set, not a client-side
 * toggle — the role switcher here exists purely so this UI can demonstrate
 * all three states.
 */

export type StaffRole = "frontdesk" | "doctor" | "admin"

export const ROLES: StaffRole[] = ["frontdesk", "doctor", "admin"]

export const ROLE_LABEL: Record<StaffRole, string> = {
  frontdesk: "Front Desk",
  doctor: "Doctor",
  admin: "Hospital Admin",
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

/** Which of the 9 OPD visit-thread stage indices (0-8) a role can see at all,
 * and which of those it can additionally edit — everything visible-but-not-
 * editable renders in view-only mode (banner + no mutating controls). */
export const OPD_STAGE_ACCESS: Record<StaffRole, { visible: number[]; editable: number[] }> = {
  frontdesk: { visible: [0, 1, 2, 8], editable: [0, 1, 2, 8] },
  doctor: { visible: [3, 4, 5, 6], editable: [4, 6] },
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
