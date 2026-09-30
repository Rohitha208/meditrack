"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { AdminButton, BED_STATUS_CLASS, type BedStatus } from "@/components/meditrack/admin/register"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { ROLE_LABEL, firstVisibleIpdStage, isIpdStageEditable, isIpdStageVisible } from "@/components/meditrack/layout/register/rbac"
import { SectionLabel, FieldLabel, FieldValue, Panel, ViewOnlyBanner, InlineInfo, InlineSuccess } from "@/components/meditrack/opd/shared/ui"
import { IPD_STAGE_DEFS, REFERRAL_STATE_LABEL, type ReferralState } from "./theme"

// ---------------------------------------------------------------------------
// Frontend/UI only — the IPD "stay record". Mirrors the Arogya HMS handoff's
// §3 (OPD → IPD admission referral): a worklist "front door" into Stage 1
// (Admission Decision) that carries the OPD consultation's context over
// rather than re-typing it, plus lighter reference panels for the other 7
// once-per-admission / every-day-of-stay / once-at-discharge stages. All
// state is local React state — see opd-visit-thread-page.tsx for the same
// convention (this module doesn't share a live store with OPD; both sides
// of the referral tell the same story independently, same as every other
// "shared" record in this prototype).
// ---------------------------------------------------------------------------

const STAY = { patient: "Ramesh Iyer", ageSex: "58 / Male", uhid: "UHID-0003318", ipdNo: "IPD-20260808-0042", ward: "General Medicine", bed: "GM-004" }
const STAY_DAYS = [
  { day: 1, date: "5 AUG" },
  { day: 2, date: "10 AUG" },
  { day: 3, date: "11 AUG" },
  { day: 4, date: "12 AUG" },
]

// --- Bed Allocation (Stage 1) ------------------------------------------------

interface BedCategoryDef {
  key: string
  vacant: number
  full: boolean
}

const BED_CATEGORIES: BedCategoryDef[] = [
  { key: "General", vacant: 4, full: false },
  { key: "Semi-private", vacant: 0, full: true },
  { key: "Private", vacant: 1, full: false },
  { key: "ICU", vacant: 2, full: false },
]

interface WardDef {
  name: string
  prefix: string
  count: number
}

const IPD_WARDS: WardDef[] = [
  { name: "General Medicine", prefix: "GM", count: 35 },
  { name: "Cardiology ICU", prefix: "CI", count: 16 },
  { name: "Orthopedics", prefix: "OR", count: 24 },
  { name: "Maternity", prefix: "MT", count: 20 },
  { name: "Pediatrics", prefix: "PD", count: 18 },
]

interface WardBed {
  code: string
  status: BedStatus
  patientId?: string
}

/** Deterministic mock distribution — mostly occupied, a handful vacant, a
 * few cleaning/out-of-service — matching Admin → Wards & Beds' own bed grid
 * exactly (same generation rule), since the copy on this screen explicitly
 * claims they're the same register, not a second grid. */
function generateWardBeds(ward: WardDef): WardBed[] {
  const beds: WardBed[] = []
  for (let i = 1; i <= ward.count; i++) {
    const code = `${ward.prefix}-${String(i).padStart(3, "0")}`
    const mod = i % 11
    let status: BedStatus = "Occupied"
    if (mod === 4 || mod === 9) status = "Vacant"
    else if (mod === 7) status = "Cleaning"
    else if (mod === 2 && i > ward.count / 2) status = "Out of service"
    beds.push({ code, status, patientId: status === "Occupied" ? `••${1000 + i * 37}` : undefined })
  }
  return beds
}

const BED_LEGEND: BedStatus[] = ["Occupied", "Vacant", "Cleaning", "Out of service"]

// --- Deposit & Pre-Auth (Stage 2) --------------------------------------------

interface PaymentRouteDef {
  key: string
  subtitle: string
}

const PAYMENT_ROUTES: PaymentRouteDef[] = [
  { key: "Cashless — TPA", subtitle: "Star Health · policy ending 4471" },
  { key: "PMJAY", subtitle: "Package rates apply; no deposit collected" },
  { key: "Self-pay", subtitle: "Advance deposit against running charges" },
]

interface PreAuthStep {
  label: string
  detail: string
  done: boolean
}

const PROVISIONAL_ADMISSION_NOTE =
  "The patient is admitted and being treated while approval is outstanding. Charges accrue normally against the self-pay deposit; if approval lands, the accrual is re-based to the approved limit and the deposit is refunded at settlement. If it is declined, the stay converts to self-pay and Billing is alerted the same day — not at discharge."

interface WorklistRow {
  id: string
  patient: string
  ageSex: string
  uhid: string
  referredBy: string
  department: string
  diagnosis: string
  referredAt: string
  waitMin: number
  overdueThresholdMin: number
}

const WORKLIST: WorklistRow[] = [
  { id: "REF-20260812-0031", patient: "Ramesh Iyer", ageSex: "58 / M", uhid: "UHID-0003318", referredBy: "Dr. Anjali Nair", department: "Cardiology", diagnosis: "Unstable angina (I20.0)", referredAt: "09:58", waitMin: 6, overdueThresholdMin: 45 },
  { id: "REF-20260812-0027", patient: "Fatima Sheikh", ageSex: "34 / F", uhid: "UHID-0007712", referredBy: "Dr. S. Raghavan", department: "Orthopaedics", diagnosis: "Closed femur fracture — for fixation", referredAt: "08:52", waitMin: 72, overdueThresholdMin: 45 },
  { id: "REF-20260812-0022", patient: "Arjun Das", ageSex: "4 / M", uhid: "UHID-0009810", referredBy: "Dr. P. Menon", department: "Pediatrics", diagnosis: "Acute gastroenteritis with dehydration", referredAt: "09:31", waitMin: 33, overdueThresholdMin: 45 },
  { id: "REF-20260812-0019", patient: "Lakshmi Rao", ageSex: "66 / F", uhid: "UHID-0004108", referredBy: "Dr. V. Iyer", department: "General Medicine", diagnosis: "Uncontrolled diabetes — for stabilization", referredAt: "09:44", waitMin: 20, overdueThresholdMin: 45 },
]

const REFERRAL_CONTEXT = {
  workingDiagnosis: "Suspected early bronchospasm; cardiac cause not excluded",
  vitalsAtReferral: "BP 168/104 · HR 96 · SpO2 91% (flagged at triage)",
  diagnosticsOnFile: "Chest X-ray ordered 09:58 — awaiting collection",
  referringDoctor: "Dr. Anjali Nair · Cardiology",
  admissionReason: "Unstable angina with a rising troponin — needs a monitored bed and inpatient workup today.",
}

function overdue(row: WorklistRow) {
  return row.waitMin > row.overdueThresholdMin
}

export function IpdStayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role } = useStaffRole()

  const s = Number(searchParams.get("stage") ?? 0)
  const activeDay = Number(searchParams.get("day") ?? 4)
  const openRef = searchParams.get("ref")
  const editable = isIpdStageEditable(role, s)

  useEffect(() => {
    if (isIpdStageVisible(role, s)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("stage", String(firstVisibleIpdStage(role)))
    router.replace(`/ipd/stay?${params.toString()}`)
  }, [role, s, router, searchParams])
  const activeStage = IPD_STAGE_DEFS[s] ?? IPD_STAGE_DEFS[0]

  const [referralState, setReferralState] = useState<ReferralState>("pending")
  const [dismissedJustCompleted, setDismissedJustCompleted] = useState(false)
  const [admissionForm, setAdmissionForm] = useState({ source: "From OPD referral" as "Emergency" | "Direct — planned" | "From OPD referral", diagnosis: REFERRAL_CONTEXT.workingDiagnosis, consultant: REFERRAL_CONTEXT.referringDoctor, los: "3–4 days" })

  const [bedCategory, setBedCategory] = useState("General")
  const [bedWard, setBedWard] = useState(STAY.ward)
  const [visibleBedStatuses, setVisibleBedStatuses] = useState<Set<BedStatus>>(new Set(BED_LEGEND))
  const activeWard = IPD_WARDS.find((w) => w.name === bedWard) ?? IPD_WARDS[0]
  const wardBeds = generateWardBeds(activeWard)
  const filteredWardBeds = wardBeds.filter((b) => visibleBedStatuses.has(b.status))
  function toggleBedStatus(status: BedStatus) {
    setVisibleBedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const [paymentRoute, setPaymentRoute] = useState(PAYMENT_ROUTES[0].key)
  const [tpaApproved, setTpaApproved] = useState(false)
  const preAuthSteps: PreAuthStep[] = [
    { label: "Documents submitted to TPA", detail: "09 Aug 16:00", done: true },
    { label: "Query raised by TPA — responded", detail: "10 Aug 11:20", done: true },
    { label: tpaApproved ? "Approved — TPA authorization confirmed" : "Approval decision pending", detail: tpaApproved ? "12 Aug 09:40" : "", done: tpaApproved },
  ]

  function goToStage(n: number) {
    router.push(`/ipd/stay?stage=${Math.max(0, Math.min(IPD_STAGE_DEFS.length - 1, n))}${activeDay ? `&day=${activeDay}` : ""}`)
  }
  function goToDay(d: number) {
    router.push(`/ipd/stay?stage=${s}&day=${d}`)
  }
  function openWorklistRow(row: WorklistRow) {
    router.push(`/ipd/stay?stage=0&day=${activeDay}&ref=${row.id}`)
    setDismissedJustCompleted(false)
  }
  function backToWorklist() {
    router.push(`/ipd/stay?stage=0&day=${activeDay}`)
  }
  function confirmAdmission() {
    setReferralState("admitted")
    setDismissedJustCompleted(false)
  }

  const selectedRow = WORKLIST.find((r) => r.id === openRef)
  const overdueCount = WORKLIST.filter(overdue).length

  return (
    <div className="min-h-full">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-adminreg-border bg-adminreg-header px-4 py-4 font-archivo sm:px-6 md:px-8">
        <div>
          <div className="mb-1 font-plexmono text-[10px] tracking-[0.05em] text-adminreg-muted">
            IPD — {activeStage.band} · DAY {activeDay} OF STAY
          </div>
          <h1 className="text-[21px] font-extrabold tracking-[-0.01em] text-adminreg-text">{activeStage.name}</h1>
        </div>
      </div>

      {!editable && <ViewOnlyBanner role={ROLE_LABEL[role]} />}

      <div className="border-b border-adminreg-border bg-adminreg-card px-4 py-3 font-archivo sm:px-6 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">Stay timeline — scrub to any day</span>
          <div className="flex gap-1.5">
            {STAY_DAYS.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => goToDay(d.day)}
                className={cn(
                  "border px-2.5 py-1 text-center font-plexmono text-[10px] font-bold transition-colors",
                  activeDay === d.day ? "border-adminreg-ipd bg-adminreg-ipd/10 text-adminreg-ipd" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted hover:text-adminreg-text"
                )}
              >
                DAY {d.day}
                <br />
                {d.date}
              </button>
            ))}
          </div>
          <p className="max-w-md text-[11px] text-adminreg-muted">Once-only stages are fixed to the day they happened. Recurring stages — nursing, billing — re-read against the selected day.</p>
        </div>
      </div>

      <div className="px-4 pb-16 pt-6 font-archivo sm:px-6 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          {s === 0 && !selectedRow && (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <SectionLabel>OPD referral worklist</SectionLabel>
                {overdueCount > 0 && <span className="font-plexmono text-[10px] font-bold uppercase text-adminreg-red-text">{overdueCount} referral{overdueCount > 1 ? "s" : ""} overdue — threshold 45 min</span>}
              </div>
              <p className="mb-3.5 text-xs text-adminreg-muted">Patients a doctor has referred for admission, waiting on desk action. Opening a row starts Stage 1 with the OPD context already carried over — nothing is re-typed here.</p>

              <div className="space-y-2.5">
                {WORKLIST.map((row) => {
                  const isOverdue = overdue(row)
                  const isJustAdmitted = row.id === "REF-20260812-0031" && referralState === "admitted"
                  return (
                    <div key={row.id} className={cn("border bg-adminreg-card", isOverdue ? "border-adminreg-red" : "border-adminreg-border")}>
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-adminreg-text">{row.patient} <span className="font-plexmono text-[10px] font-normal text-adminreg-muted">— {row.ageSex} · {row.uhid}</span></div>
                          <div className="text-[11px] text-adminreg-muted">Referred by {row.referredBy} · {row.department} · {row.referredAt}</div>
                          <div className="text-[11px] text-adminreg-muted">{row.diagnosis}</div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3.5">
                          <span className={cn("font-plexmono text-lg font-bold", isJustAdmitted ? "text-adminreg-olive-700" : isOverdue ? "text-adminreg-red-text" : "text-adminreg-muted")}>
                            {isJustAdmitted ? "—" : `${row.waitMin} min`}
                          </span>
                          {isJustAdmitted ? (
                            <AdminButton type="button" variant="secondary">View stay →</AdminButton>
                          ) : (
                            <AdminButton type="button" accent={isOverdue ? undefined : "indigo"} variant={isOverdue ? "danger" : "primary"} onClick={() => openWorklistRow(row)}>
                              {isOverdue ? "Open now →" : "Open →"}
                            </AdminButton>
                          )}
                        </div>
                      </div>
                      {isOverdue && !isJustAdmitted && (
                        <div className="border-t border-adminreg-red bg-adminreg-red-soft px-3.5 py-2 text-[11px] font-semibold text-adminreg-red-text">
                          OVERDUE — {row.waitMin} min since referral, threshold 45. This patient has already been told they need admission and is still waiting on desk action.
                        </div>
                      )}
                      {isJustAdmitted && (
                        <div className="border-t border-adminreg-olive bg-adminreg-olive-soft px-3.5 py-2 text-[11px] font-semibold text-adminreg-olive-dark">
                          Admission order IPD-20260809-0042 generated at {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} — clearing from this list on refresh. Kept visible for a moment so the desk sees the outcome instead of a row vanishing.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <Panel className="mt-5">
                <SectionLabel>One record, two views</SectionLabel>
                <p className="mb-2.5 text-xs text-adminreg-muted">Not two lists that sync — one referral record, read from two desks. The same row.</p>
                <div className="grid grid-cols-1 gap-3.5 text-xs sm:grid-cols-3">
                  <div>
                    <FieldLabel>Doctor confirms</FieldLabel>
                    <FieldValue>Confirm panel closes; status card reads &quot;Pending pickup&quot;.</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Desk opens it</FieldLabel>
                    <FieldValue>Status moves to &quot;Being processed by admission desk&quot;.</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Stage 1 completes</FieldLabel>
                    <FieldValue>Row tagged NEW with the field reason; admission desk stage 1 opens with context carried over.</FieldValue>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {s === 0 && selectedRow && referralState !== "admitted" && (
            <div>
              <div className="mb-3.5 flex items-center justify-between">
                {referralState === "pending" ? (
                  <InlineSuccess>✓ Stage 1 opened for {selectedRow.patient} with the OPD referral context carried over.</InlineSuccess>
                ) : (
                  <span className="text-xs font-semibold text-adminreg-indigo-dark">Stage 1 · REF-{selectedRow.id.slice(-8)} · {REFERRAL_STATE_LABEL[referralState]}</span>
                )}
                <button type="button" onClick={backToWorklist} className="flex-shrink-0 text-[11px] text-adminreg-muted underline">← Back to referral worklist</button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
                <Panel>
                  <SectionLabel>Admission source</SectionLabel>
                  <div className="mb-3.5 flex flex-wrap gap-2">
                    {(["Emergency", "Direct — planned", "From OPD referral"] as const).map((src) => (
                      <button
                        key={src}
                        type="button"
                        disabled={!editable}
                        onClick={() => setAdmissionForm((f) => ({ ...f, source: src }))}
                        className={cn(
                          "border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed",
                          admissionForm.source === src ? "border-adminreg-ipd bg-adminreg-ipd/10 text-adminreg-ipd" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted"
                        )}
                      >
                        {src}
                      </button>
                    ))}
                  </div>

                  <FieldLabel>Provisional diagnosis</FieldLabel>
                  <input value={admissionForm.diagnosis} disabled={!editable} onChange={(e) => setAdmissionForm((f) => ({ ...f, diagnosis: e.target.value }))} className="mb-3.5 mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-ipd disabled:opacity-70" />

                  <FieldLabel>Admitting consultant</FieldLabel>
                  <input value={admissionForm.consultant} disabled={!editable} onChange={(e) => setAdmissionForm((f) => ({ ...f, consultant: e.target.value }))} className="mb-3.5 mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-ipd disabled:opacity-70" />

                  <FieldLabel>Expected length of stay</FieldLabel>
                  <input value={admissionForm.los} disabled={!editable} onChange={(e) => setAdmissionForm((f) => ({ ...f, los: e.target.value }))} className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-ipd disabled:opacity-70" />

                  {editable && (
                    <AdminButton type="button" className="mt-4 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90" onClick={confirmAdmission}>
                      Confirm admission → Bed allocation
                    </AdminButton>
                  )}
                </Panel>

                <Panel className="border-adminreg-ipd bg-adminreg-ipd/[0.04]">
                  <div className="mb-2.5 flex items-center justify-between">
                    <SectionLabel>Carried over from OPD — not re-entered</SectionLabel>
                    <a href="/opd/visit-thread?stage=4" className="flex-shrink-0 text-[11px] text-adminreg-ipd underline">View source visit OPD-20260812-0091 →</a>
                  </div>
                  <p className="mb-2.5 text-[11px] text-adminreg-muted">This patient was referred up from an OPD consultation. Everything below is already on file — the admission desk confirms it rather than re-typing it.</p>
                  <div className="space-y-2.5 text-xs">
                    <div><FieldLabel>Referring doctor</FieldLabel><FieldValue>{REFERRAL_CONTEXT.referringDoctor}</FieldValue></div>
                    <div><FieldLabel>OPD diagnosis</FieldLabel><FieldValue>{REFERRAL_CONTEXT.workingDiagnosis}</FieldValue></div>
                    <div><FieldLabel>Vitals at referral</FieldLabel><FieldValue>{REFERRAL_CONTEXT.vitalsAtReferral}</FieldValue></div>
                    <div><FieldLabel>Diagnostics on file</FieldLabel><FieldValue>{REFERRAL_CONTEXT.diagnosticsOnFile}</FieldValue></div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {s === 0 && selectedRow && referralState === "admitted" && (
            <div>
              {!dismissedJustCompleted && (
                <div className="mb-3.5 flex items-center justify-between border border-adminreg-olive bg-adminreg-olive-soft px-3.5 py-2.5">
                  <span className="text-xs font-semibold text-adminreg-olive-dark">✓ Admission order IPD-20260809-0042 generated. The referral clears from the worklist and the OPD status card now reads Admitted.</span>
                  <button type="button" onClick={() => setDismissedJustCompleted(true)} className="flex-shrink-0 text-[11px] text-adminreg-olive-dark underline">Dismiss</button>
                </div>
              )}
              <Panel>
                <SectionLabel>Stage 1 · REF-{selectedRow.id.slice(-8)} · Admitted</SectionLabel>
                <div className="grid grid-cols-2 gap-2.5 text-sm">
                  <div><FieldLabel>Admission order</FieldLabel><FieldValue>IPD-20260809-0042</FieldValue></div>
                  <div><FieldLabel>Bed</FieldLabel><FieldValue>{STAY.ward}, {STAY.bed}</FieldValue></div>
                </div>
                <button type="button" onClick={backToWorklist} className="mt-4 text-[11px] text-adminreg-muted underline">← Back to referral worklist</button>
              </Panel>
            </div>
          )}

          {s === 1 && (
            <div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
                <Panel>
                  <SectionLabel>Bed category requested</SectionLabel>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {BED_CATEGORIES.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        disabled={!editable}
                        onClick={() => setBedCategory(c.key)}
                        className={cn(
                          "border p-3 text-left disabled:cursor-not-allowed",
                          bedCategory === c.key ? "border-adminreg-ipd bg-adminreg-ipd/[0.06]" : "border-adminreg-border bg-adminreg-bg"
                        )}
                      >
                        <div className="text-sm font-semibold text-adminreg-text">{c.key}</div>
                        <div className={cn("mt-1 text-xs", c.full ? "font-semibold text-adminreg-amber-text" : "text-adminreg-muted")}>{c.full ? "Full — waitlist" : `${c.vacant} vacant`}</div>
                      </button>
                    ))}
                  </div>
                  {bedCategory === "Semi-private" && (
                    <div className="mt-3.5 border border-adminreg-amber bg-adminreg-amber-soft px-3.5 py-2.5 text-xs text-adminreg-amber-text">
                      Semi-private is full. Patient is 2nd on the waitlist — admit to General now and auto-upgrade when a semi-private bed frees, rather than holding the admission.
                    </div>
                  )}
                </Panel>

                <Panel className="border-adminreg-ipd bg-adminreg-ipd/[0.04]">
                  <SectionLabel>ICU escalation</SectionLabel>
                  <p className="text-xs text-adminreg-muted">ICU beds are allocated on clinical criteria, not category preference. Escalation requires the consultant&apos;s order and is charged at the ICU tariff from the hour of transfer.</p>
                  {editable && <AdminButton type="button" className="mt-3.5 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90">Transfer bed (mid-stay)</AdminButton>}
                </Panel>
              </div>

              <div className="mt-6">
                <InlineInfo>
                  <span className="mb-1 block font-plexmono text-[9.5px] font-bold uppercase tracking-[0.04em]">Shared bed register — same data as Admin → Wards &amp; Beds</span>
                  This is not a second bed grid. Admissions, transfers, and discharges written here are the same records the ward-in-charge reads in Admin — one source, no sync step, so a wall display never shows a stale bed.
                </InlineInfo>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {IPD_WARDS.map((w) => (
                    <button
                      key={w.name}
                      type="button"
                      onClick={() => setBedWard(w.name)}
                      className={cn(
                        "border px-4 py-2 text-sm font-semibold transition-colors",
                        bedWard === w.name ? "border-adminreg-ipd bg-adminreg-ipd/10 text-adminreg-ipd" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
                      )}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
                <span className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">
                  Showing: {bedWard} {bedWard === STAY.ward && `· Patient is in ${STAY.bed} · ${STAY.ward}`}
                </span>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-4 text-sm">
                {BED_LEGEND.map((status) => (
                  <label key={status} className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={visibleBedStatuses.has(status)} onChange={() => toggleBedStatus(status)} className="h-3.5 w-3.5 accent-adminreg-ipd" />
                    <span className={cn("h-2.5 w-2.5 rounded-sm", BED_STATUS_CLASS[status].dot)} />
                    <span className="text-adminreg-text">{status}</span>
                  </label>
                ))}
              </div>

              <div className="mt-3.5 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
                {filteredWardBeds.map((bed) => {
                  const cls = BED_STATUS_CLASS[bed.status]
                  const isCurrentPatient = bed.code === STAY.bed && bedWard === STAY.ward
                  return (
                    <div key={bed.code} className={cn("border p-3 text-sm", cls.border, cls.bg, isCurrentPatient && "border-2 border-adminreg-ipd")}>
                      <p className={cn("font-semibold text-adminreg-text", isCurrentPatient && "text-adminreg-ipd")}>{bed.code}</p>
                      <p className={cn("mt-0.5 text-xs font-medium", cls.text)}>{bed.status}</p>
                      {bed.patientId && <p className="mt-1 font-mono text-[10px] text-adminreg-muted">{bed.patientId}</p>}
                    </div>
                  )
                })}
              </div>

              {editable && (
                <AdminButton type="button" className="mt-6 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90" onClick={() => goToStage(2)}>
                  Confirm bed → Deposit &amp; pre-auth
                </AdminButton>
              )}
            </div>
          )}

          {s === 2 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel>
                <SectionLabel>Payment route</SectionLabel>
                <div className="space-y-2.5">
                  {PAYMENT_ROUTES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      disabled={!editable}
                      onClick={() => setPaymentRoute(r.key)}
                      className={cn(
                        "w-full border p-3.5 text-left disabled:cursor-not-allowed",
                        paymentRoute === r.key ? "border-adminreg-ipd bg-adminreg-ipd/[0.06]" : "border-adminreg-border bg-adminreg-bg"
                      )}
                    >
                      <div className={cn("text-sm font-bold", paymentRoute === r.key ? "text-adminreg-ipd" : "text-adminreg-text")}>{r.key}</div>
                      <div className="mt-0.5 text-xs text-adminreg-muted">{r.subtitle}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-5 border-t border-adminreg-divider pt-4">
                  <FieldLabel>Advance deposit collected</FieldLabel>
                  <div className="mt-1 text-2xl font-bold text-adminreg-text">₹25,000</div>
                  <p className="mt-0.5 font-plexmono text-[11px] text-adminreg-muted">Receipt RCP-IPD-0091 · UPI · 09 Aug 14:52</p>
                  {editable && <AdminButton type="button" variant="secondary" className="mt-3.5">Collect additional deposit</AdminButton>}
                </div>
              </Panel>

              <div>
                <Panel>
                  <SectionLabel>Pre-authorization status</SectionLabel>
                  <div className="space-y-2.5">
                    {preAuthSteps.map((step) => (
                      <div key={step.label} className="flex items-start gap-2.5">
                        <span className={cn("mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border", step.done ? "border-adminreg-olive bg-adminreg-olive text-adminreg-card" : "border-adminreg-amber")}>
                          {step.done && <Check className="h-3 w-3" strokeWidth={3} />}
                          {!step.done && <span className="h-1.5 w-1.5 bg-adminreg-amber" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className={cn("text-sm", step.done ? "text-adminreg-text" : "font-semibold text-adminreg-amber-text")}>{step.label}</span>
                          {step.detail && <span className="ml-1.5 font-plexmono text-[11px] text-adminreg-muted">— {step.detail}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {editable && !tpaApproved && (
                    <AdminButton type="button" className="mt-4 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90" onClick={() => setTpaApproved(true)}>
                      Record TPA approval
                    </AdminButton>
                  )}
                  {tpaApproved && (
                    <div className="mt-4">
                      <InlineSuccess>TPA approval recorded. Charges will re-base to the approved limit; the self-pay deposit is refunded at settlement.</InlineSuccess>
                    </div>
                  )}
                </Panel>

                <Panel className="mt-5 border-adminreg-amber bg-adminreg-amber-soft">
                  <p className="mb-1.5 font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-amber-text">Provisional admission — active</p>
                  <p className="text-xs text-adminreg-amber-text">{PROVISIONAL_ADMISSION_NOTE}</p>
                </Panel>

                {editable && (
                  <AdminButton type="button" className="mt-5 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90" onClick={() => goToStage(3)}>
                    Proceed → Nursing &amp; rounds
                  </AdminButton>
                )}
              </div>
            </div>
          )}

          {s === 3 && (
            <Panel>
              <SectionLabel>Medication administration record — Day {activeDay}</SectionLabel>
              <div className="border border-adminreg-border">
                <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Drug</span><span>08:00</span><span>14:00</span><span>20:00</span></div>
                {[{ drug: "Atenolol 50mg", d: ["✓", "—", "—"] }, { drug: "Atorvastatin 40mg", d: ["—", "—", "✓"] }, { drug: "Heparin 5000 IU SC", d: ["✓", "✓", "Due"] }].map((row) => (
                  <div key={row.drug} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center border-t border-adminreg-divider px-4 py-2.5 text-sm">
                    <span className="font-medium text-adminreg-text">{row.drug}</span>
                    {row.d.map((v, i) => <span key={i} className={cn("font-plexmono text-xs", v === "Due" ? "font-bold text-adminreg-amber-text" : v === "✓" ? "text-adminreg-olive-700" : "text-adminreg-muted")}>{v}</span>)}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-adminreg-muted">Nurse role sees only this screen — no billing, no admin, per the unified shell's RBAC.</p>
            </Panel>
          )}

          {s === 4 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel>
                <SectionLabel>Ordered diagnostics — Day {activeDay}</SectionLabel>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-adminreg-divider pb-2"><span>ECG (repeat)</span><span className="font-plexmono text-adminreg-muted">Ordered 08:10</span></div>
                  <div className="flex justify-between"><span>Troponin-I (repeat)</span><span className="font-plexmono text-adminreg-muted">Ordered 08:10</span></div>
                </div>
              </Panel>
              <Panel>
                <SectionLabel>OT booking</SectionLabel>
                <p className="text-sm text-adminreg-muted">No procedure booked for this stay.</p>
                {editable && <AdminButton type="button" variant="secondary" className="mt-3.5">Book OT slot</AdminButton>}
              </Panel>
            </div>
          )}

          {s === 5 && (
            <Panel>
              <SectionLabel>Daily billing accrual — Day {activeDay}</SectionLabel>
              <div className="border border-adminreg-border">
                <div className="grid grid-cols-[1.6fr_1fr] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Charge</span><span>Amount (₹)</span></div>
                {[["General ward bed / day", "1,200"], ["Nursing care", "800"], ["Consultant visit — Dr. Anjali Nair", "700"]].map(([label, amt]) => (
                  <div key={label} className="grid grid-cols-[1.6fr_1fr] border-t border-adminreg-divider px-4 py-2.5 text-sm"><span>{label}</span><span className="font-plexmono">{amt}</span></div>
                ))}
                <div className="grid grid-cols-[1.6fr_1fr] border-t border-adminreg-divider bg-adminreg-header px-4 py-2.5 text-sm font-bold"><span>Day {activeDay} total</span><span className="font-plexmono">₹2,700</span></div>
              </div>
            </Panel>
          )}

          {s === 6 && (
            <Panel>
              <SectionLabel>Discharge checklist</SectionLabel>
              <div className="space-y-2 text-sm">
                {["Final round completed", "Discharge summary drafted", "Follow-up appointment scheduled", "Take-home medication reconciled"].map((item) => (
                  <label key={item} className="flex items-center gap-2.5">
                    <input type="checkbox" disabled={!editable} className="h-3.5 w-3.5 accent-adminreg-ipd" />
                    <span className="text-adminreg-text">{item}</span>
                  </label>
                ))}
              </div>
              {editable && <AdminButton type="button" className="mt-4 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90" onClick={() => goToStage(7)}>Ready → Final billing</AdminButton>}
            </Panel>
          )}

          {s === 7 && (
            <Panel>
              <SectionLabel>Final billing &amp; settlement</SectionLabel>
              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div><FieldLabel>Total charges</FieldLabel><FieldValue>₹48,200</FieldValue></div>
                <div><FieldLabel>Deposit adjusted</FieldLabel><FieldValue>₹25,000</FieldValue></div>
                <div><FieldLabel>TPA settlement</FieldLabel><FieldValue>₹18,000</FieldValue></div>
                <div><FieldLabel>Balance due</FieldLabel><FieldValue>₹5,200</FieldValue></div>
              </div>
              {editable && <AdminButton type="button" className="mt-4 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90">Collect balance &amp; discharge</AdminButton>}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
