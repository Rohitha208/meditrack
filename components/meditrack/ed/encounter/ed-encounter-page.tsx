"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { AdminButton } from "@/components/meditrack/admin/register"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { ROLE_LABEL, isEdStageEditable } from "@/components/meditrack/layout/register/rbac"
import { SectionLabel, FieldLabel, Panel, InlineWarning, InlineInfo, ViewOnlyBanner } from "@/components/meditrack/opd/shared/ui"
import { DxOrderPanel } from "@/components/meditrack/opd/shared/DxOrderPanel"
import {
  ED_ADMIT_DEPARTMENTS,
  ED_BED_CATEGORIES,
  ED_COMPLAINTS,
  ED_PRIORITY_DEFS,
  ED_STAGE_DEFS,
  addEdHandoff,
  type EdPriority,
} from "../theme"

// ---------------------------------------------------------------------------
// Frontend/UI only. One ED encounter walked through three stages. Local state
// for the encounter; the admission hand-off is written to the shared ED→IPD
// store so the IPD admission worklist picks it up.
// ---------------------------------------------------------------------------

const ENCOUNTER_ID = "ED-20260812-0109"
const ARRIVED_AT = "10:14"
const CONSULT_FEE = 800
const PROCEDURE_FEE = 1450
const DIAGNOSTICS_FEE = 1450
const TOTAL_CHARGES = CONSULT_FEE + PROCEDURE_FEE + DIAGNOSTICS_FEE

const STAGE_ELAPSED = ["00:12", "00:47", "01:24"]

const TREATMENT_OPTIONS = [
  "Inj. Tramadol 50 mg IV — analgesia",
  "Tetanus toxoid 0.5 mL IM",
  "IV NS 1 L — second bolus",
  "Inj. Ondansetron 4 mg IV",
  "Wound cleaning & dressing",
  "Cervical collar applied",
] as const

const ESCALATION_REASONS = ["Falling BP", "Falling GCS", "SpO₂ below 90%", "Rising heart rate", "Increasing abdominal pain"] as const

const FOLLOW_UP_ITEMS = [
  "Review in OPD General Surgery in 3 days",
  "Return immediately if breathless, vomiting blood, or pain worsens",
  "Tab. Paracetamol 650 mg three times daily for 5 days",
  "No driving or two-wheeler riding for 72 hours",
] as const

const OTHER_ARRIVALS = [
  { name: "Mohan Lal · 68 / M", complaint: "Chest pain with sweating", priority: "IMMEDIATE" as EdPriority, arrived: "09:52" },
  { name: "Priya Nair · 27 / F", complaint: "Asthma — cannot finish sentences", priority: "URGENT" as EdPriority, arrived: "09:40" },
  { name: "Shabana Begum · 41 / F", complaint: "Abdominal pain, vomiting", priority: "URGENT" as EdPriority, arrived: "10:05" },
  { name: "Arun Kumar · 19 / M", complaint: "Laceration, left palm", priority: "NON-URGENT" as EdPriority, arrived: "09:31" },
]

const PRIORITY_RANK: Record<EdPriority, number> = { IMMEDIATE: 0, URGENT: 1, "NON-URGENT": 2 }

const PRIORITY_CHIP: Record<EdPriority, string> = {
  IMMEDIATE: "border-adminreg-red bg-adminreg-red text-adminreg-card",
  URGENT: "border-adminreg-amber bg-adminreg-amber text-adminreg-card",
  "NON-URGENT": "border-adminreg-olive bg-adminreg-olive text-adminreg-card",
}

interface EdEvent {
  time: string
  kind: "TRIAGE" | "DOCTOR'S NOTE" | "TREATMENT" | "ORDER" | "ESCALATION" | "STAND DOWN"
  by: string
  text: string
}

interface VitalsState {
  sbp: string
  dbp: string
  hr: string
  spo2: string
  rr: string
  temp: string
  gcs: string
}

const INITIAL_VITALS: VitalsState = { sbp: "96", dbp: "60", hr: "118", spo2: "93", rr: "24", temp: "36.8", gcs: "14" }

/** Vitals outside the normal range — drives the red cells and the summary line. */
function outOfRange(v: VitalsState): { key: keyof VitalsState; label: string }[] {
  const out: { key: keyof VitalsState; label: string }[] = []
  const n = (s: string) => Number(s)
  if (s(v.sbp) && (n(v.sbp) < 100 || n(v.sbp) > 180)) out.push({ key: "sbp", label: `Systolic BP ${v.sbp}` })
  if (s(v.hr) && (n(v.hr) < 50 || n(v.hr) > 110)) out.push({ key: "hr", label: `Heart rate ${v.hr}` })
  if (s(v.spo2) && n(v.spo2) < 94) out.push({ key: "spo2", label: `SpO₂ ${v.spo2}` })
  if (s(v.rr) && (n(v.rr) < 10 || n(v.rr) > 22)) out.push({ key: "rr", label: `Resp. rate ${v.rr}` })
  if (s(v.temp) && (n(v.temp) > 38 || n(v.temp) < 35)) out.push({ key: "temp", label: `Temp ${v.temp}` })
  if (s(v.gcs) && n(v.gcs) < 15) out.push({ key: "gcs", label: `GCS ${v.gcs}` })
  return out
  function s(x: string) {
    return x.trim() !== "" && !Number.isNaN(Number(x))
  }
}

function isOutOfRange(key: keyof VitalsState, v: VitalsState) {
  return outOfRange(v).some((o) => o.key === key)
}

export function EdEncounterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role } = useStaffRole()

  const stage = Math.min(2, Math.max(0, Number(searchParams.get("stage") ?? 0)))
  const editable = isEdStageEditable(role, stage)

  // Arrival & triage
  const [identityProvisional, setIdentityProvisional] = useState(true)
  const [name, setName] = useState("")
  const [sex, setSex] = useState<"Male" | "Female" | "Unknown">("Male")
  const [ageBand, setAgeBand] = useState("30–50")
  const [marks, setMarks] = useState('Tattoo "OM" on right wrist; red helmet; brought by 108 ambulance')
  const [complaint, setComplaint] = useState<string | null>("Road traffic injury")
  const [vitals, setVitals] = useState<VitalsState>(INITIAL_VITALS)
  const [priority, setPriority] = useState<EdPriority | null>(null)
  const [paymentAtArrival, setPaymentAtArrival] = useState<"deferred" | "collected">("deferred")
  const [triageAttempted, setTriageAttempted] = useState(false)
  const [triaged, setTriaged] = useState(false)

  // Assessment & treatment
  const [events, setEvents] = useState<EdEvent[]>([])
  const [note, setNote] = useState("")
  const [escalation, setEscalation] = useState<string | null>(null)
  const [escalating, setEscalating] = useState(false)
  const [escalationPick, setEscalationPick] = useState<string | null>(null)
  const [orderedTests, setOrderedTests] = useState<string[]>([])

  // Disposition
  const [identityResolved, setIdentityResolved] = useState(false)
  const [fullName, setFullName] = useState("")
  const [ageOrDob, setAgeOrDob] = useState("")
  const [mobile, setMobile] = useState("")
  const [idProof, setIdProof] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "UPI" | "Cashless / TPA">("Cash")
  const [chargesPaid, setChargesPaid] = useState(false)
  const [decision, setDecision] = useState<"home" | "admit" | null>(null)
  const [admitDept, setAdmitDept] = useState<(typeof ED_ADMIT_DEPARTMENTS)[number]>("General Surgery")
  const [admitBed, setAdmitBed] = useState<(typeof ED_BED_CATEGORIES)[number]>("HDU")
  const [admitDiagnosis, setAdmitDiagnosis] = useState("Blunt abdominal trauma — splenic laceration, grade II")
  const [followUp, setFollowUp] = useState<boolean[]>([true, true, true, false])
  const [closed, setClosed] = useState<"discharged" | "handed-off" | null>(null)

  const outs = outOfRange(vitals)
  const vitalsOutCount = outs.length
  const currentPriority = priority
  const patientLabel = identityResolved && fullName.trim() ? fullName.trim() : identityProvisional ? "Unidentified male · ~30–50 y" : name.trim() || "Unnamed patient"

  const board = useMemo(() => {
    const rows = OTHER_ARRIVALS.map((a) => ({ ...a, self: false }))
    const self = {
      name: patientLabel,
      complaint: complaint ?? "Complaint not yet recorded",
      priority: currentPriority,
      arrived: ARRIVED_AT,
      self: true,
    }
    const all = [...rows, self]
    const rank = (p: EdPriority | null) => (p ? PRIORITY_RANK[p] : -1)
    // Untriaged arrivals sit at the top until a priority is set.
    return all.sort((a, b) => {
      const ra = a.self && !currentPriority ? -1 : rank(a.priority)
      const rb = b.self && !currentPriority ? -1 : rank(b.priority)
      if (ra !== rb) return ra - rb
      return a.arrived.localeCompare(b.arrived)
    })
  }, [patientLabel, complaint, currentPriority])

  const selfPosition = board.findIndex((b) => b.self) + 1

  function saveTriage() {
    setTriageAttempted(true)
    if (!editable || !priority) return
    setTriaged(true)
    setEvents((e) => [
      { time: ARRIVED_AT, kind: "TRIAGE", by: "S. Joseph, triage nurse", text: `${complaint ?? "Complaint not recorded"}. SBP ${vitals.sbp}, HR ${vitals.hr}, SpO₂ ${vitals.spo2}%, GCS ${vitals.gcs}. Priority: ${priority.toLowerCase()}.` },
      ...e,
    ])
    router.push(`/ed/encounter?stage=1`)
  }

  function addNote() {
    if (!note.trim()) return
    setEvents((e) => [{ time: "10:48", kind: "DOCTOR'S NOTE", by: "Dr. R. Shah", text: note.trim() }, ...e])
    setNote("")
  }

  function recordTreatment(text: string) {
    setEvents((e) => [{ time: "10:50", kind: "TREATMENT", by: "Dr. R. Shah", text }, ...e])
  }

  function confirmEscalation() {
    if (!escalationPick) return
    setEscalation(escalationPick)
    setEvents((e) => [{ time: "10:52", kind: "ESCALATION", by: "Dr. R. Shah", text: `Deteriorating — ${escalationPick}. Senior and rapid response team paged.` }, ...e])
    setEscalating(false)
    setEscalationPick(null)
  }

  function standDown() {
    setEvents((e) => [{ time: "11:20", kind: "STAND DOWN", by: "Dr. K. Menon", text: "Stabilised — escalation stood down." }, ...e])
    setEscalation(null)
  }

  function onOrderConfirmed(tests: { name: string }[]) {
    setOrderedTests(tests.map((t) => t.name))
    setEvents((e) => [{ time: "10:55", kind: "ORDER", by: "Dr. R. Shah", text: tests.map((t) => t.name).join(" · ") }, ...e])
  }

  const blockers: string[] = []
  if (identityProvisional && !identityResolved) blockers.push("identity is still provisional")
  if (!chargesPaid) blockers.push(`ED charges of ₹${TOTAL_CHARGES.toLocaleString("en-IN")} are still deferred`)

  function confirmIdentity() {
    if (!fullName.trim() || !ageOrDob.trim() || !mobile.trim() || !idProof.trim()) return
    setIdentityResolved(true)
  }

  function confirmDischarge() {
    if (blockers.length || decision !== "home") return
    setClosed("discharged")
  }

  function confirmAdmit() {
    if (blockers.length || decision !== "admit") return
    addEdHandoff({
      id: ENCOUNTER_ID,
      patient: fullName.trim() || "Ravi Kumar",
      ageSex: ageOrDob.trim() ? `${ageOrDob.trim()} / M` : "34 / M",
      uhid: "UHID-0011231",
      complaint: admitDiagnosis,
      doctor: "Dr. R. Shah · Emergency (ED)",
      department: admitDept,
      bedCategory: admitBed,
      handedOffAt: "11:42",
    })
    setClosed("handed-off")
  }

  const stageLabel = ED_STAGE_DEFS[stage].name

  return (
    <div className="min-h-full">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-adminreg-border bg-adminreg-header px-4 py-4 font-archivo sm:px-6 md:px-8">
        <div>
          <div className="mb-1 font-plexmono text-[10px] tracking-[0.05em] text-adminreg-muted">
            ED — STAGE {stage + 1} OF 3 · {ROLE_LABEL[role].toUpperCase()} · ENCOUNTER {ENCOUNTER_ID}
          </div>
          <h1 className="text-[21px] font-extrabold tracking-[-0.01em] text-adminreg-text">{stageLabel}</h1>
        </div>
      </div>

      {!editable && <ViewOnlyBanner role={ROLE_LABEL[role]} />}

      <div className="px-4 pb-16 pt-6 font-archivo sm:px-6 md:px-8">
        <div className="mx-auto max-w-[1240px] space-y-5">
          {/* Patient banner */}
          <div className="grid grid-cols-1 border-l-[3px] border-adminreg-olive bg-adminreg-card sm:grid-cols-[1fr_auto]">
            <div className="p-4">
              <div className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2">Patient · {ENCOUNTER_ID}</div>
              <div className="mt-0.5 text-lg font-extrabold text-adminreg-text">{patientLabel}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                {identityResolved ? (
                  <span className="border border-adminreg-olive bg-adminreg-olive-soft px-2 py-0.5 text-adminreg-olive-dark">ID confirmed</span>
                ) : identityProvisional ? (
                  <span className="border border-adminreg-amber bg-adminreg-amber-soft px-2 py-0.5 text-adminreg-amber-text">ID provisional</span>
                ) : (
                  <span className="border border-adminreg-olive bg-adminreg-olive-soft px-2 py-0.5 text-adminreg-olive-dark">ID given by patient</span>
                )}
                <span className={cn("border px-2 py-0.5", chargesPaid ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text")}>
                  {chargesPaid ? "Payment cleared" : "Payment deferred"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-adminreg-border bg-adminreg-border sm:w-[300px] sm:grid-cols-1 sm:border-l sm:border-t-0">
              <div className="bg-adminreg-card p-4">
                <div className="font-plexmono text-[9px] uppercase text-adminreg-muted2">Triage priority</div>
                {currentPriority ? (
                  <span className={cn("mt-1 inline-block border px-2 py-1 text-xs font-bold uppercase", PRIORITY_CHIP[currentPriority])}>{currentPriority}</span>
                ) : (
                  <div className="mt-1 border border-dashed border-adminreg-border px-2 py-1 text-center font-plexmono text-[10px] uppercase tracking-[0.03em] text-adminreg-muted">Awaiting triage</div>
                )}
              </div>
              <div className="bg-adminreg-card p-4">
                <div className="font-plexmono text-[9px] uppercase text-adminreg-muted2">Time in ED</div>
                <div className="mt-1 font-plexmono text-2xl font-bold text-adminreg-text">{STAGE_ELAPSED[stage]}</div>
                <div className="font-plexmono text-[10px] text-adminreg-muted">Arrived {ARRIVED_AT} · {closed ? "closed" : "open"}</div>
              </div>
            </div>
          </div>

          {/* Stage state chips */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {ED_STAGE_DEFS.map((s, i) => (
              <span key={s.name} className={cn("border px-2.5 py-1 font-semibold", i === stage ? "border-adminreg-olive bg-adminreg-olive text-adminreg-card" : "border-adminreg-border bg-adminreg-card text-adminreg-muted")}>
                {i + 1} · {s.name}
              </span>
            ))}
          </div>

          {stage === 0 && (
            <>
              <Panel>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-adminreg-text">Patient not yet identified</div>
                    <div className="text-xs text-adminreg-muted">{identityProvisional ? "ON — structured placeholder instead of a name" : "OFF — patient gave a name"}</div>
                  </div>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => setIdentityProvisional((v) => !v)}
                    className={cn("h-6 w-12 border transition-colors disabled:opacity-60", identityProvisional ? "border-adminreg-olive bg-adminreg-olive" : "border-adminreg-border bg-adminreg-bg")}
                    aria-pressed={identityProvisional}
                    aria-label="Patient not yet identified"
                  />
                </div>
                {identityProvisional ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <FieldLabel>Sex</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {(["Male", "Female", "Unknown"] as const).map((s) => (
                          <button key={s} type="button" disabled={!editable} onClick={() => setSex(s)} className={cn("border px-3 py-1.5 text-xs font-semibold disabled:opacity-60", sex === s ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Approximate age</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {["Child < 12", "12–30", "30–50", "50–70", "70+"].map((a) => (
                          <button key={a} type="button" disabled={!editable} onClick={() => setAgeBand(a)} className={cn("border px-3 py-1.5 text-xs font-semibold disabled:opacity-60", ageBand === a ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>{a}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Distinguishing marks · optional</FieldLabel>
                      <input value={marks} onChange={(e) => setMarks(e.target.value)} disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-olive disabled:opacity-60" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <FieldLabel>Name</FieldLabel>
                    <input value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} placeholder="As given by patient or attendant" className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-olive disabled:opacity-60" />
                  </div>
                )}
              </Panel>

              <Panel>
                <SectionLabel>Presenting complaint · required</SectionLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ED_COMPLAINTS.map((c) => (
                    <button key={c} type="button" disabled={!editable} onClick={() => setComplaint(c)} className={cn("border px-3.5 py-3 text-left text-sm font-semibold disabled:opacity-60", complaint === c ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-text")}>{c}</button>
                  ))}
                </div>
              </Panel>

              <Panel>
                <SectionLabel>Vitals</SectionLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["sbp", "Systolic BP", "mmHg"],
                      ["dbp", "Diastolic BP", "mmHg"],
                      ["hr", "Heart rate", "/min"],
                      ["spo2", "SpO₂", "%"],
                      ["rr", "Resp. rate", "/min"],
                      ["temp", "Temp", "°C"],
                      ["gcs", "GCS", "/15"],
                    ] as const
                  ).map(([key, label, unit]) => {
                    const bad = isOutOfRange(key, vitals)
                    return (
                      <div key={key} className={cn("border p-2.5", bad ? "border-adminreg-red bg-adminreg-red-soft" : "border-adminreg-border bg-adminreg-bg")}>
                        <div className="font-plexmono text-[9px] uppercase text-adminreg-muted2">{label}</div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <input
                            value={vitals[key]}
                            onChange={(e) => setVitals((v) => ({ ...v, [key]: e.target.value }))}
                            disabled={!editable}
                            className={cn("w-full bg-transparent font-plexmono text-xl font-bold focus:outline-none disabled:opacity-60", bad ? "text-adminreg-red-text" : "text-adminreg-text")}
                          />
                          <span className="text-[10px] text-adminreg-muted">{unit}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {vitalsOutCount > 0 && (
                  <p className="mt-2 text-xs font-semibold text-adminreg-red-text">
                    {vitalsOutCount} outside normal range: {outs.map((o) => o.label).join(" · ")}
                  </p>
                )}
              </Panel>

              <Panel className={cn(triageAttempted && !priority && "border-adminreg-red")}>
                <SectionLabel>Triage priority · required</SectionLabel>
                <div className="space-y-2">
                  {ED_PRIORITY_DEFS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      disabled={!editable}
                      onClick={() => setPriority(p.key)}
                      className={cn(
                        "flex w-full items-center justify-between border-l-[4px] border px-4 py-3 text-left disabled:opacity-60",
                        priority === p.key ? "border-adminreg-olive bg-adminreg-olive-soft" : "border-adminreg-border bg-adminreg-bg",
                        p.key === "IMMEDIATE" ? "border-l-adminreg-red" : p.key === "URGENT" ? "border-l-adminreg-amber" : "border-l-adminreg-olive"
                      )}
                    >
                      <span>
                        <span className="block text-sm font-extrabold text-adminreg-text">{p.label}</span>
                        <span className="block text-xs text-adminreg-muted">{p.hint}</span>
                      </span>
                      {priority === p.key && <span className="font-plexmono text-[10px] font-bold uppercase text-adminreg-olive-dark">Selected</span>}
                    </button>
                  ))}
                </div>
                {triageAttempted && !priority && (
                  <p className="mt-3 text-xs font-semibold text-adminreg-red-text">Set a triage priority — it decides this patient&apos;s place on the board.</p>
                )}
              </Panel>

              <Panel>
                <SectionLabel>Payment at arrival</SectionLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["deferred", "Treat first — collect later", "Flagged provisional; resolved before disposition"],
                      ["collected", "Collected at arrival", "ED registration + deposit taken now"],
                    ] as const
                  ).map(([key, label, hint]) => (
                    <button key={key} type="button" disabled={!editable} onClick={() => { setPaymentAtArrival(key); setChargesPaid(key === "collected") }} className={cn("border px-3.5 py-3 text-left disabled:opacity-60", paymentAtArrival === key ? "border-adminreg-indigo bg-adminreg-indigo-soft" : "border-adminreg-border bg-adminreg-bg")}>
                      <span className="block text-sm font-bold text-adminreg-text">{label}</span>
                      <span className="block text-xs text-adminreg-muted">{hint}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              {editable && (
                <div className="space-y-2">
                  {triageAttempted && !priority && (
                    <InlineWarning>Priority is required. Identity and payment can stay provisional — both must be resolved before disposition.</InlineWarning>
                  )}
                  <AdminButton type="button" accent="indigo" className="w-full sm:w-auto" onClick={saveTriage}>
                    Save triage → Assessment
                  </AdminButton>
                </div>
              )}
            </>
          )}

          {stage === 1 && (
            <>
              {escalation && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-l-[3px] border-adminreg-red bg-adminreg-red-soft px-4 py-3">
                  <span className="text-sm font-semibold text-adminreg-red-text">Escalation active — {escalation}. Rapid response paged; the flag stays on the banner until a senior stands it down.</span>
                  {editable && <AdminButton type="button" variant="secondary" onClick={standDown}>Stand down — stabilised</AdminButton>}
                </div>
              )}

              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <SectionLabel>Patient getting worse?</SectionLabel>
                    <p className="text-xs text-adminreg-muted">Flags the case for the senior doctor and rapid response team immediately. You stay on this screen.</p>
                  </div>
                  {editable && !escalation && !escalating && (
                    <AdminButton type="button" variant="danger" onClick={() => setEscalating(true)}>⚠ Deteriorating — escalate</AdminButton>
                  )}
                </div>
                {escalating && (
                  <div className="mt-3 space-y-2 border-t border-adminreg-divider pt-3">
                    <FieldLabel>What changed? One tap, then page.</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {ESCALATION_REASONS.map((r) => (
                        <button key={r} type="button" onClick={() => setEscalationPick(r)} className={cn("border px-3 py-2 text-xs font-semibold", escalationPick === r ? "border-adminreg-red bg-adminreg-red text-adminreg-card" : "border-adminreg-border bg-adminreg-bg text-adminreg-text")}>{r}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <AdminButton type="button" variant="danger" disabled={!escalationPick} onClick={confirmEscalation}>Page senior + rapid response now</AdminButton>
                      <AdminButton type="button" variant="secondary" onClick={() => { setEscalating(false); setEscalationPick(null) }}>Cancel</AdminButton>
                    </div>
                  </div>
                )}
              </Panel>

              <Panel>
                <SectionLabel>ED treatment record · newest first</SectionLabel>
                {editable && (
                  <div className="mb-3 space-y-2">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Doctor's note — findings, reassessment, plan" className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-olive" />
                    <AdminButton type="button" accent="indigo" onClick={addNote} disabled={!note.trim()}>Add note to record</AdminButton>
                  </div>
                )}
                <div className="divide-y divide-adminreg-divider">
                  {events.map((e, i) => (
                    <div key={i} className="grid grid-cols-[52px_1fr] gap-3 py-2.5">
                      <div className="font-plexmono text-xs text-adminreg-muted">{e.time}</div>
                      <div>
                        <div className="font-plexmono text-[9.5px] font-bold uppercase tracking-[0.04em] text-adminreg-muted2">{e.kind} · {e.by}</div>
                        <div className="text-sm text-adminreg-text">{e.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {editable && (
                <Panel>
                  <SectionLabel>Treatment given · tap to record</SectionLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TREATMENT_OPTIONS.map((t) => (
                      <button key={t} type="button" onClick={() => recordTreatment(t)} className="border border-adminreg-border bg-adminreg-bg px-3 py-2.5 text-left text-sm font-semibold text-adminreg-text hover:border-adminreg-olive">
                        {t}
                        <span className="block text-[11px] font-normal text-adminreg-muted">Tap to record as given</span>
                      </button>
                    ))}
                  </div>
                </Panel>
              )}

              <Panel>
                <SectionLabel>Diagnostics · orders &amp; results</SectionLabel>
                <DxOrderPanel editable={editable} compact visitId={ENCOUNTER_ID} patientLabel={patientLabel} orderingDoctor="Dr. R. Shah · Emergency (ED)" onConfirm={onOrderConfirmed} />
                {orderedTests.length > 0 && <p className="mt-3 text-xs text-adminreg-muted">Ordered this encounter: {orderedTests.join(", ")} — results post back to this record.</p>}
              </Panel>

              {editable && (
                <div className="flex justify-end">
                  <AdminButton type="button" accent="indigo" onClick={() => router.push("/ed/encounter?stage=2")}>Ready for disposition →</AdminButton>
                </div>
              )}
            </>
          )}

          {stage === 2 && (
            <>
              {closed === "discharged" && (
                <Panel className="border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft">
                  <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-olive-dark">Encounter closed · discharged home · 11:42 · Dr. R. Shah</div>
                  <div className="mt-1 text-base font-extrabold text-adminreg-text">Discharge instructions printed for {patientLabel}</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-adminreg-text">
                    {FOLLOW_UP_ITEMS.filter((_, i) => followUp[i]).map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </Panel>
              )}
              {closed === "handed-off" && (
                <Panel className="border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft">
                  <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-olive-dark">Encounter closed · handed off to IPD · 11:42</div>
                  <div className="mt-1 text-base font-extrabold text-adminreg-text">{patientLabel} is on the IPD admission worklist → {admitDept}, {admitBed} bed</div>
                  <p className="mt-1 text-sm text-adminreg-muted">Care continues under IPD. The IPD record links back to {ENCOUNTER_ID}.</p>
                  <a href="/ipd/stay?stage=1" className="mt-3 inline-block">
                    <AdminButton type="button" accent="indigo">Open IPD admission worklist →</AdminButton>
                  </a>
                </Panel>
              )}

              <Panel>
                <SectionLabel>Before this encounter can close</SectionLabel>
                {identityResolved ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-adminreg-text">Confirmed as {fullName.trim()} · UHID-0011231. Triage placeholder kept on the audit trail.</div>
                    <span className="border border-adminreg-olive bg-adminreg-olive-soft px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase text-adminreg-olive-dark">ID confirmed</span>
                  </div>
                ) : identityProvisional ? (
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-adminreg-text">Identity — provisional</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!editable} placeholder="Full name — as on ID proof" className="border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm disabled:opacity-60" />
                      <input value={ageOrDob} onChange={(e) => setAgeOrDob(e.target.value)} disabled={!editable} placeholder="Age / DOB" className="border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm disabled:opacity-60" />
                      <input value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={!editable} placeholder="Mobile (+91)" className="border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm disabled:opacity-60" />
                      <input value={idProof} onChange={(e) => setIdProof(e.target.value)} disabled={!editable} placeholder="ID proof — Aadhaar / Voter ID / DL no." className="border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm disabled:opacity-60" />
                    </div>
                    {editable && <AdminButton type="button" accent="indigo" disabled={!fullName.trim() || !ageOrDob.trim() || !mobile.trim() || !idProof.trim()} onClick={confirmIdentity}>Confirm identity — issue UHID</AdminButton>}
                  </div>
                ) : null}

                <div className="mt-5 border-t border-adminreg-divider pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-adminreg-text">ED charges</span>
                    <span className={cn("border px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase", chargesPaid ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text")}>{chargesPaid ? "Payment cleared" : "Payment deferred"}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>ED consultation</span><span className="font-plexmono">₹{CONSULT_FEE.toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between"><span>Procedures &amp; treatment given</span><span className="font-plexmono">₹{PROCEDURE_FEE.toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between"><span>Diagnostics (STAT)</span><span className="font-plexmono">₹{DIAGNOSTICS_FEE.toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between border-t border-adminreg-divider pt-1 font-bold"><span>Total</span><span className="font-plexmono">₹{TOTAL_CHARGES.toLocaleString("en-IN")}</span></div>
                  </div>
                  {!chargesPaid && editable && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["Cash", "Card", "UPI", "Cashless / TPA"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={cn("border px-3 py-1.5 text-xs font-semibold", paymentMethod === m ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>{m}</button>
                      ))}
                      <AdminButton type="button" accent="indigo" onClick={() => setChargesPaid(true)}>Collect ₹{TOTAL_CHARGES.toLocaleString("en-IN")} → generate receipt</AdminButton>
                    </div>
                  )}
                </div>
              </Panel>

              {!closed && (
                <Panel>
                  <SectionLabel>Disposition decision</SectionLabel>
                  <div className="space-y-2">
                    {(
                      [
                        ["home", "Discharge home", "Treated in ED. Generates discharge instructions and closes the encounter."],
                        ["admit", "Admit to IPD", "Sends this encounter to the IPD admission worklist, sourced from ED."],
                      ] as const
                    ).map(([key, label, hint]) => (
                      <button key={key} type="button" disabled={!editable} onClick={() => setDecision(key)} className={cn("block w-full border px-4 py-3 text-left disabled:opacity-60", decision === key ? "border-adminreg-indigo bg-adminreg-indigo-soft" : "border-adminreg-border bg-adminreg-bg")}>
                        <span className="block text-base font-extrabold text-adminreg-text">{label}</span>
                        <span className="block text-xs text-adminreg-muted">{hint}</span>
                      </button>
                    ))}
                  </div>

                  {blockers.length > 0 && (
                    <div className="mt-3">
                      <InlineWarning>Blocked — {blockers.join(" and ")}. Resolve both above; an encounter cannot close with either flag open.</InlineWarning>
                    </div>
                  )}

                  {decision === "home" && (
                    <div className="mt-4 space-y-3 border-t border-adminreg-divider pt-4">
                      <SectionLabel>Confirm — discharge instructions</SectionLabel>
                      <FieldLabel>Diagnosis</FieldLabel>
                      <div className="border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm">Blunt chest wall contusion, left — no fracture or pneumothorax</div>
                      <FieldLabel>Follow-up advice</FieldLabel>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {FOLLOW_UP_ITEMS.map((f, i) => (
                          <label key={f} className={cn("flex cursor-pointer items-start gap-2 border px-3 py-2 text-xs", followUp[i] ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-text" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>
                            <input type="checkbox" checked={followUp[i]} onChange={(e) => setFollowUp((arr) => arr.map((v, j) => (j === i ? e.target.checked : v)))} disabled={!editable} className="mt-0.5" />
                            {f}
                          </label>
                        ))}
                      </div>
                      {editable && <AdminButton type="button" accent="indigo" disabled={blockers.length > 0} onClick={confirmDischarge}>Confirm discharge — print instructions &amp; close encounter</AdminButton>}
                    </div>
                  )}

                  {decision === "admit" && (
                    <div className="mt-4 space-y-3 border-t border-adminreg-divider pt-4">
                      <SectionLabel>Confirm — admission request to IPD</SectionLabel>
                      <FieldLabel>ED diagnosis / reason for admission</FieldLabel>
                      <input value={admitDiagnosis} onChange={(e) => setAdmitDiagnosis(e.target.value)} disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm disabled:opacity-60" />
                      <FieldLabel>Admitting department</FieldLabel>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ED_ADMIT_DEPARTMENTS.map((d) => (
                          <button key={d} type="button" disabled={!editable} onClick={() => setAdmitDept(d)} className={cn("border px-3 py-2 text-left text-sm font-semibold disabled:opacity-60", admitDept === d ? "border-adminreg-indigo bg-adminreg-indigo-soft" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>{d}</button>
                        ))}
                      </div>
                      <FieldLabel>Bed category</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {ED_BED_CATEGORIES.map((b) => (
                          <button key={b} type="button" disabled={!editable} onClick={() => setAdmitBed(b)} className={cn("border px-3 py-2 text-xs font-semibold disabled:opacity-60", admitBed === b ? "border-adminreg-indigo bg-adminreg-indigo-soft" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>{b}</button>
                        ))}
                      </div>
                      <InlineInfo>Appears on the IPD admission worklist as a NEW · FROM ED row. IPD Stage 1 opens with this encounter carried over.</InlineInfo>
                      {editable && <AdminButton type="button" accent="indigo" disabled={blockers.length > 0 || !admitDiagnosis.trim()} onClick={confirmAdmit}>Confirm — send to IPD admission worklist</AdminButton>}
                    </div>
                  )}
                </Panel>
              )}
            </>
          )}

          {stage === 0 && triaged && <InlineInfo>Triage saved — the encounter has moved to Assessment &amp; Treatment.</InlineInfo>}
          {stage === 0 && vitalsOutCount === 0 && <InlineInfo>All recorded vitals are within the normal range.</InlineInfo>}
          {stage === 0 && (
            <div className="text-xs text-adminreg-muted">
              ED board — this patient is #{selfPosition} of {board.length}. Untriaged arrivals sit at the top until a priority is set.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
