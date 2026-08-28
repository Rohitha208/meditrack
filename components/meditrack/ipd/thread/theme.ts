/**
 * IPD "stay record" tokens — per the Arogya HMS unified-shell spec. Same
 * base register tokens as Admin/OPD (bg/card/border/text/amber/red, Archivo
 * + IBM Plex Mono, no border-radius/shadow); IPD's own accent is oxblood
 * (`adminreg-ipd`) instead of Admin's olive / OPD's indigo.
 *
 * Unlike OPD's linear 9-step relay, IPD's 8 stages group into three bands —
 * once-at-admission, every-day-of-stay (re-read against whichever day the
 * scrubber is on), once-at-discharge — rather than a single stepper.
 */

export const IPD_BANDS = ["ONCE — AT ADMISSION", "EVERY DAY OF STAY", "ONCE — AT DISCHARGE"] as const
export type IpdBand = (typeof IPD_BANDS)[number]

export interface IpdStageDef {
  name: string
  role: string
  band: IpdBand
}

export const IPD_STAGE_DEFS: IpdStageDef[] = [
  { name: "Admission Decision", role: "ADMISSION DESK", band: "ONCE — AT ADMISSION" },
  { name: "Bed Allocation", role: "ADMISSION DESK", band: "ONCE — AT ADMISSION" },
  { name: "Deposit & Pre-Auth", role: "BILLING", band: "ONCE — AT ADMISSION" },
  { name: "Nursing & Rounds", role: "NURSE", band: "EVERY DAY OF STAY" },
  { name: "Diagnostics & OT", role: "DOCTOR", band: "EVERY DAY OF STAY" },
  { name: "Daily Billing Accrual", role: "BILLING", band: "EVERY DAY OF STAY" },
  { name: "Discharge Planning", role: "DOCTOR", band: "ONCE — AT DISCHARGE" },
  { name: "Final Billing & Settlement", role: "BILLING", band: "ONCE — AT DISCHARGE" },
]

/** Referral lifecycle shared by the OPD-side status card and the IPD-side
 * worklist/Admission Decision screen — "one record, two desks". */
export type ReferralState = "pending" | "processing" | "admitted"

export const REFERRAL_STATE_LABEL: Record<ReferralState, string> = {
  pending: "Pending pickup",
  processing: "Being processed by admission desk",
  admitted: "Admitted",
}
