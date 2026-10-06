"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AdminButton, AdminDrawer } from "@/components/meditrack/admin/register"
import { SectionLabel, FieldLabel, FieldValue, Panel, InlineInfo, InlineWarning } from "@/components/meditrack/opd/shared/ui"

// ---------------------------------------------------------------------------
// Admission routes on IPD Stage 1 — Emergency (fast entry → pending completion)
// and Direct / planned (pre-booked list + walk-in intake). Frontend/UI only:
// local demo state, same convention as the rest of IPD.
// ---------------------------------------------------------------------------

export type AdmissionRoute = "opd" | "emergency" | "planned"

export function parseRoute(value: string | null): AdmissionRoute {
  return value === "emergency" || value === "planned" ? value : "opd"
}

const EMERGENCY_COMPLAINTS = ["Chest pain", "Breathlessness", "Road traffic injury", "Unconscious / collapse", "Seizure", "Burns", "Poisoning / overdose", "Other"] as const
const EMERGENCY_DOCTORS = [
  { name: "Dr. K. Menon", note: "Casualty CMO · on duty" },
  { name: "Dr. R. Shah", note: "Casualty MO · on duty" },
  { name: "Dr. Anjali Nair", note: "Cardiology · on call" },
] as const
const EMERGENCY_BEDS = [
  { name: "ICU", free: "2 free" },
  { name: "HDU", free: "1 free" },
  { name: "General ward", free: "9 free" },
  { name: "Casualty observation", free: "4 free" },
] as const

type EmergencyState = "empty" | "submit-blocked" | "unidentified-ready" | "case-created" | "pending" | "complete"

const EMERGENCY_STATES: { key: EmergencyState; label: string }[] = [
  { key: "empty", label: "1 · Empty" },
  { key: "submit-blocked", label: "2 · Submit blocked" },
  { key: "unidentified-ready", label: "3 · Unidentified, ready" },
  { key: "case-created", label: "4 · Case created" },
  { key: "pending", label: "5 · Pending completion" },
  { key: "complete", label: "6 · Complete registration" },
]

interface EmergencyPreset {
  complaint: string | null
  doctor: string | null
  bed: string | null
  unidentified: boolean
  name: string
  sex: "Male" | "Female" | "Unknown"
  ageBand: string
  marks: string
}

const PRESETS: Record<EmergencyState, EmergencyPreset> = {
  empty: { complaint: null, doctor: null, bed: null, unidentified: false, name: "", sex: "Male", ageBand: "", marks: "" },
  "submit-blocked": { complaint: "Chest pain", doctor: null, bed: null, unidentified: false, name: "", sex: "Male", ageBand: "", marks: "" },
  "unidentified-ready": { complaint: "Road traffic injury", doctor: "Dr. K. Menon", bed: "ICU", unidentified: true, name: "", sex: "Male", ageBand: "12–30", marks: "Tattoo \"OM\" on right wrist; red helmet" },
  "case-created": { complaint: "Road traffic injury", doctor: "Dr. K. Menon", bed: "ICU", unidentified: true, name: "", sex: "Male", ageBand: "30–50", marks: "" },
  pending: { complaint: null, doctor: null, bed: null, unidentified: false, name: "", sex: "Male", ageBand: "", marks: "" },
  complete: { complaint: null, doctor: null, bed: null, unidentified: false, name: "", sex: "Male", ageBand: "", marks: "" },
}

const PENDING_CASES = [
  { id: "ER-20260811-0014", label: "Unidentified male · ~30–50 y", complaint: "Road traffic injury", doctor: "Dr. K. Menon", bed: "ICU-02", since: "26 h 10 m", overdue: true, registrationDone: false, depositDone: false },
  { id: "ER-20260812-0016", label: "Sunita Pawar · 45 / F", complaint: "Breathlessness", doctor: "Dr. R. Shah", bed: "HDU-01", since: "9 h 40 m", overdue: false, registrationDone: true, depositDone: false },
  { id: "ER-20260812-0018", label: "Unidentified female · ~70+ y", complaint: "Unconscious / collapse", doctor: "Dr. K. Menon", bed: "GEN-07", since: "3 h 05 m", overdue: false, registrationDone: false, depositDone: false },
] as const

function Chip({ tone, children }: { tone: "pending" | "done" | "overdue"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap border px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase tracking-[0.03em]",
        tone === "done" ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : tone === "overdue" ? "border-adminreg-red bg-adminreg-red-soft text-adminreg-red-text" : "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text"
      )}
    >
      {children}
    </span>
  )
}

function OptionButton({ active, onClick, disabled, children, tone = "indigo" }: { active: boolean; onClick: () => void; disabled?: boolean; children: ReactNode; tone?: "indigo" | "ipd" }) {
  const activeClass = tone === "ipd" ? "border-adminreg-ipd bg-adminreg-ipd/10 text-adminreg-ipd" : "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark"
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn("border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60", active ? activeClass : "border-adminreg-border bg-adminreg-bg text-adminreg-text hover:border-adminreg-muted")}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Route selector — shown at the top of Admission Decision.
// ---------------------------------------------------------------------------

export function AdmissionRouteSelector({ route, onChange, opdCount, emergencyPending, plannedToday }: { route: AdmissionRoute; onChange: (r: AdmissionRoute) => void; opdCount: number; emergencyPending: number; plannedToday: number }) {
  const cards: { key: AdmissionRoute; title: string; meta: string; hint: string; tone: string }[] = [
    { key: "opd", title: "From OPD referral", meta: `${opdCount} waiting`, hint: "Doctor-referred patients, OPD context carried over.", tone: "text-adminreg-text" },
    { key: "emergency", title: "Emergency", meta: `${emergencyPending} pending completion`, hint: "Stabilise first — open a case sheet now, register later.", tone: "text-adminreg-red-text" },
    { key: "planned", title: "Direct / planned", meta: `${plannedToday} pre-booked today`, hint: "Advance bookings and walk-ins with no OPD visit.", tone: "text-adminreg-text" },
  ]
  return (
    <div>
      <FieldLabel>Admission entry — how is this patient arriving?</FieldLabel>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={cn("border px-4 py-3 text-left transition-colors", route === c.key ? "border-adminreg-indigo bg-adminreg-indigo-soft" : c.key === "emergency" ? "border-adminreg-red bg-adminreg-red-soft/40" : "border-adminreg-border bg-adminreg-card hover:border-adminreg-muted")}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn("text-sm font-bold", c.tone)}>{c.title}</span>
              <span className="font-plexmono text-[9.5px] font-bold uppercase text-adminreg-muted">{c.meta}</span>
            </div>
            <p className="mt-1 text-xs text-adminreg-muted">{c.hint}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Emergency — fast entry, case sheet, pending completion, complete registration.
// ---------------------------------------------------------------------------

export function EmergencyAdmissionPanel({ editable }: { editable: boolean }) {
  const [view, setView] = useState<"new" | "pending">("new")
  const [state, setState] = useState<EmergencyState>("submit-blocked")
  const [preset, setPreset] = useState<EmergencyPreset>(PRESETS["submit-blocked"])
  const [triedSubmit, setTriedSubmit] = useState(true)
  const [caseOpened, setCaseOpened] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  function selectState(next: EmergencyState) {
    if (next === "pending") {
      setView("pending")
      setState("pending")
      return
    }
    setView("new")
    setState(next)
    setPreset(PRESETS[next])
    setTriedSubmit(next === "submit-blocked")
    setCaseOpened(null)
  }

  const patch = (p: Partial<EmergencyPreset>) => setPreset((prev) => ({ ...prev, ...p }))
  const identityOk = preset.unidentified || preset.name.trim().length > 0
  const missing: string[] = []
  if (!preset.doctor) missing.push("doctor")
  if (!preset.bed) missing.push("bed category")
  if (!preset.complaint) missing.push("complaint")
  if (!identityOk) missing.push("name")
  const ready = missing.length === 0

  function openCase() {
    if (!ready) {
      setTriedSubmit(true)
      return
    }
    setCaseOpened("ER-20260812-0019")
    setState("case-created")
  }

  if (completing) {
    const c = PENDING_CASES.find((x) => x.id === completing)!
    return <CompleteRegistration caseId={c.id} label={c.label} complaint={c.complaint} doctor={c.doctor} bed={c.bed} since={c.since} onBack={() => setCompleting(null)} editable={editable} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => selectState("empty")} className={cn("border px-5 py-2.5 text-sm font-bold", view === "new" ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card" : "border-adminreg-border bg-adminreg-card text-adminreg-text")}>New case</button>
        <button type="button" onClick={() => selectState("pending")} className={cn("border px-5 py-2.5 text-sm font-bold", view === "pending" ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card" : "border-adminreg-border bg-adminreg-card text-adminreg-text")}>Pending completion · {PENDING_CASES.length}</button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 font-plexmono text-[10px] uppercase text-adminreg-muted">
        <span className="mr-1">State</span>
        {EMERGENCY_STATES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => selectState(s.key)}
            className={cn("border px-2 py-1 text-[10px] font-semibold normal-case", (view === "pending" ? s.key === "pending" : state === s.key) ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card" : "border-adminreg-border bg-adminreg-card text-adminreg-muted")}
          >
            {s.label}
          </button>
        ))}
      </div>

      {view === "pending" ? (
        <PendingCompletionList onComplete={(id) => setCompleting(id)} />
      ) : state === "case-created" && caseOpened ? (
        <Panel className="border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft">
          <div className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-olive-dark">Case sheet opened · 12 Aug 10:21 · A. Bhatt, casualty desk</div>
          <div className="mt-1 text-lg font-extrabold text-adminreg-text">{caseOpened} · Unidentified male · ~12–30 y</div>
          <p className="mt-1 text-sm text-adminreg-text">{preset.complaint} · {preset.doctor} · {preset.bed} requested</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip tone="pending">● Registration pending</Chip>
            <Chip tone="pending">● Deposit pending</Chip>
          </div>
          <p className="mt-3 text-sm text-adminreg-text">Bed allocation can proceed now. Neither pending item blocks the bed or treatment; both stay on the case and on the Pending completion list until they are cleared.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminButton type="button" accent="indigo" onClick={() => setState("pending")}>Proceed to bed allocation →</AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => setView("pending")}>Open pending completion</AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => selectState("empty")}>New case</AdminButton>
          </div>
        </Panel>
      ) : (
        <>
          <Panel>
            <SectionLabel>1 · Presenting complaint · required</SectionLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EMERGENCY_COMPLAINTS.map((c) => (
                <OptionButton key={c} active={preset.complaint === c} disabled={!editable} onClick={() => patch({ complaint: c })}>{c}</OptionButton>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>2 · Doctor · required</SectionLabel>
            <div className="space-y-2">
              {EMERGENCY_DOCTORS.map((d) => (
                <OptionButton key={d.name} active={preset.doctor === d.name} disabled={!editable} onClick={() => patch({ doctor: d.name })}>
                  <span className="block">{d.name}</span>
                  <span className="block text-xs font-normal text-adminreg-muted">{d.note}</span>
                </OptionButton>
              ))}
            </div>
            {triedSubmit && !preset.doctor && <p className="mt-2 text-xs font-semibold text-adminreg-red-text">Pick the treating doctor.</p>}
          </Panel>

          <Panel>
            <SectionLabel>3 · Bed category needed · required</SectionLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EMERGENCY_BEDS.map((b) => (
                <OptionButton key={b.name} active={preset.bed === b.name} disabled={!editable} onClick={() => patch({ bed: b.name })}>
                  <span className="block">{b.name}</span>
                  <span className="block text-xs font-normal text-adminreg-muted">{b.free}</span>
                </OptionButton>
              ))}
            </div>
            {triedSubmit && !preset.bed && <p className="mt-2 text-xs font-semibold text-adminreg-red-text">Pick the bed category.</p>}
          </Panel>

          <Panel>
            <SectionLabel>4 · Identity</SectionLabel>
            <div className="flex items-center justify-between border border-adminreg-border bg-adminreg-bg px-3.5 py-3">
              <div>
                <div className="text-sm font-bold text-adminreg-text">Patient not yet identified</div>
                <div className="text-xs text-adminreg-muted">{preset.unidentified ? "ON — recording a structured placeholder instead of a name" : "OFF — patient gave a name"}</div>
              </div>
              <button
                type="button"
                disabled={!editable}
                onClick={() => patch({ unidentified: !preset.unidentified })}
                aria-pressed={preset.unidentified}
                className={cn("h-6 w-12 border transition-colors disabled:opacity-60", preset.unidentified ? "border-adminreg-ipd bg-adminreg-ipd" : "border-adminreg-border bg-adminreg-card")}
              />
            </div>
            {preset.unidentified ? (
              <div className="mt-3 space-y-3">
                <div>
                  <FieldLabel>Sex</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {(["Male", "Female", "Unknown"] as const).map((s) => (
                      <OptionButton key={s} active={preset.sex === s} disabled={!editable} onClick={() => patch({ sex: s })}>{s}</OptionButton>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Approximate age</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {["Child < 12", "12–30", "30–50", "50–70", "70+"].map((a) => (
                      <OptionButton key={a} active={preset.ageBand === a} disabled={!editable} onClick={() => patch({ ageBand: a })}>{a}</OptionButton>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Distinguishing marks · optional</FieldLabel>
                  <input value={preset.marks} disabled={!editable} onChange={(e) => patch({ marks: e.target.value })} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" />
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <FieldLabel>Name</FieldLabel>
                <input value={preset.name} disabled={!editable} onChange={(e) => patch({ name: e.target.value })} placeholder="As given by patient or attendant" className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" />
                {triedSubmit && !identityOk && <p className="mt-2 text-xs font-semibold text-adminreg-red-text">Enter a name, or switch on &quot;not yet identified&quot; and record sex and approximate age.</p>}
              </div>
            )}
          </Panel>

          <div className={cn("border-l-[3px] px-4 py-3", ready ? "border-adminreg-ipd bg-adminreg-card" : "border-adminreg-red bg-adminreg-red-soft/50")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-red-text">Required to open a case sheet</div>
                <div className="text-sm text-adminreg-text">{ready ? "All required fields set. Everything else — address, ID proof, insurance, deposit — is collected later from Pending completion." : `Still needed: ${missing.join(", ")}.`}</div>
              </div>
              {editable && <AdminButton type="button" accent="indigo" onClick={openCase} className={!ready ? "opacity-60" : ""}>Open case sheet →</AdminButton>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PendingCompletionList({ onComplete }: { onComplete: (id: string) => void }) {
  return (
    <Panel>
      <SectionLabel>Pending completion</SectionLabel>
      <p className="mb-3 text-xs text-adminreg-muted">Emergency cases already on a bed with registration or deposit still open. A row leaves this list only when both chips are cleared.</p>
      <div className="font-plexmono text-[9.5px] uppercase text-adminreg-muted">3 cases with open items · sorted by time since arrival · completion due 24 h · admin → system config</div>
      <div className="mt-3 space-y-2.5">
        {PENDING_CASES.map((c) => (
          <div key={c.id} className={cn("border p-3.5", c.overdue ? "border-adminreg-red bg-adminreg-red-soft/40" : "border-adminreg-border bg-adminreg-card")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-adminreg-text">{c.label}</div>
                <div className="font-plexmono text-[10px] text-adminreg-muted">{c.id} · {c.bed}</div>
                <div className="text-xs text-adminreg-muted">{c.complaint} · {c.doctor}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!c.registrationDone ? <Chip tone="pending">● Registration pending</Chip> : <Chip tone="done">✓ Registration complete</Chip>}
                {!c.depositDone && <Chip tone="pending">● Deposit pending</Chip>}
                <span className={cn("font-plexmono text-sm font-bold", c.overdue ? "text-adminreg-red-text" : "text-adminreg-muted")}>{c.since}</span>
                <AdminButton type="button" accent={c.overdue ? undefined : "indigo"} variant={c.overdue ? "danger" : "primary"} onClick={() => onComplete(c.id)}>{c.overdue ? "Complete now →" : "Complete →"}</AdminButton>
              </div>
            </div>
            {c.overdue && (
              <div className="mt-3 border-l-[3px] border-adminreg-red bg-adminreg-red-soft px-3 py-2 text-xs font-semibold text-adminreg-red-text">
                OVERDUE — {c.since} since arrival, completion is due within 24 h. The patient is on {c.bed} with no registered identity or deposit.
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function CompleteRegistration({ caseId, label, complaint, doctor, bed, since, onBack, editable }: { caseId: string; label: string; complaint: string; doctor: string; bed: string; since: string; onBack: () => void; editable: boolean }) {
  const [fullName, setFullName] = useState("")
  const [ageDob, setAgeDob] = useState("")
  const [mobile, setMobile] = useState("")
  const [idProof, setIdProof] = useState("")
  const [kin, setKin] = useState("")
  const [done, setDone] = useState(false)
  return (
    <div className="space-y-4">
      <div className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">Stage 1 · Emergency · complete registration · {caseId}</div>
      <button type="button" onClick={onBack} className="text-xs font-semibold text-adminreg-indigo-dark underline">← Back to pending completion</button>

      <Panel className="border-l-[3px] border-adminreg-red bg-adminreg-red-soft/40">
        <SectionLabel>Identity on file at entry</SectionLabel>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div><FieldLabel>Sex</FieldLabel><FieldValue>Male</FieldValue></div>
          <div><FieldLabel>Approx. age</FieldLabel><FieldValue>30–50 y</FieldValue></div>
          <div><FieldLabel>Distinguishing marks</FieldLabel><FieldValue>Healed scar on left forearm; blue kurta; brought by 108 ambulance</FieldValue></div>
        </div>
      </Panel>

      <Panel>
        <SectionLabel>Case</SectionLabel>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><FieldLabel>Case</FieldLabel><FieldValue>{caseId}</FieldValue></div>
          <div><FieldLabel>Presenting complaint</FieldLabel><FieldValue>{complaint}</FieldValue></div>
          <div><FieldLabel>Doctor</FieldLabel><FieldValue>{doctor}</FieldValue></div>
          <div><FieldLabel>Bed</FieldLabel><FieldValue>{bed}</FieldValue></div>
          <div><FieldLabel>Since arrival</FieldLabel><FieldValue>{since}</FieldValue></div>
          <div><FieldLabel>Label</FieldLabel><FieldValue>{label}</FieldValue></div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <SectionLabel>Confirm or replace identity</SectionLabel>
          <Chip tone="pending">● Registration pending</Chip>
        </div>
        <p className="mb-3 text-xs text-adminreg-muted">Replaces the placeholder with a registered identity. The placeholder stays on the audit trail so staff can match earlier notes.</p>
        {done ? (
          <InlineInfo>Identity confirmed — UHID issued. Registration is now complete for {caseId}.</InlineInfo>
        ) : (
          <div className="space-y-3">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <input value={fullName} disabled={!editable} onChange={(e) => setFullName(e.target.value)} placeholder="As on ID proof" className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><FieldLabel>Age / date of birth</FieldLabel><input value={ageDob} disabled={!editable} onChange={(e) => setAgeDob(e.target.value)} placeholder="e.g. 34 or 12-03-1991" className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
              <div><FieldLabel>Mobile</FieldLabel><input value={mobile} disabled={!editable} onChange={(e) => setMobile(e.target.value)} placeholder="+91" className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
              <div><FieldLabel>ID proof</FieldLabel><input value={idProof} disabled={!editable} onChange={(e) => setIdProof(e.target.value)} placeholder="Aadhaar / Voter ID / DL no." className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
              <div><FieldLabel>Next of kin / attendant</FieldLabel><input value={kin} disabled={!editable} onChange={(e) => setKin(e.target.value)} placeholder="Name, relation, mobile" className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
            </div>
            {editable && <AdminButton type="button" accent="indigo" disabled={!fullName.trim() || !ageDob.trim() || !mobile.trim() || !idProof.trim()} onClick={() => setDone(true)}>Confirm identity — issue UHID</AdminButton>}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <SectionLabel>Payment clearance</SectionLabel>
          <Chip tone="pending">● Deposit pending</Chip>
        </div>
        <p className="mb-3 text-xs text-adminreg-muted">Deposit and any TPA pre-authorization are handled on the existing Deposit &amp; Pre-auth screen. Registration does not have to be finished first.</p>
        <AdminButton type="button" accent="indigo" disabled={!editable}>Complete payment clearance → Deposit &amp; Pre-auth</AdminButton>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Direct / planned — pre-booked list and walk-in intake.
// ---------------------------------------------------------------------------

interface Booking {
  id: string
  time: string
  patient: string
  ageSex: string
  reason: string
  doctor: string
  workup: string
  workupTone: "done" | "partial" | "none"
}

const SEED_BOOKINGS: Booking[] = [
  { id: "B1", time: "08:30", patient: "Meera Kulkarni", ageSex: "52 / F", reason: "Elective right total knee replacement", doctor: "Dr. S. Raghavan · Orthopaedics", workup: "4 / 4 complete", workupTone: "done" },
  { id: "B2", time: "10:00", patient: "Vikram Joshi", ageSex: "61 / M", reason: "Elective coronary angiography", doctor: "Dr. Anjali Nair · Cardiology", workup: "Partial · 2 / 4", workupTone: "partial" },
  { id: "B3", time: "11:30", patient: "Nazia Khan", ageSex: "29 / F", reason: "Planned LSCS at 39 weeks", doctor: "Dr. L. Pillai · Obstetrics", workup: "4 / 4 complete", workupTone: "done" },
  { id: "B4", time: "14:00", patient: "Harish Gowda", ageSex: "47 / M", reason: "Laparoscopic cholecystectomy", doctor: "Dr. V. Iyer · General Surgery", workup: "Not started · 0 / 3", workupTone: "none" },
]

const BOOKING_DATES = ["Wed 12 Aug · today", "Thu 13 Aug", "Fri 14 Aug", "Sat 15 Aug", "Mon 17 Aug"] as const
const BOOKING_REASONS = ["Elective surgery", "Planned procedure", "Medical management", "Obstetric / delivery", "Day-care infusion"] as const

export function PlannedAdmissionPanel({ editable }: { editable: boolean }) {
  const [tab, setTab] = useState<"pre" | "walk">("pre")
  const [date, setDate] = useState<(typeof BOOKING_DATES)[number]>(BOOKING_DATES[0])
  const [bookings, setBookings] = useState<Booking[]>(SEED_BOOKINGS)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDoctor, setNewDoctor] = useState("Dr. S. Raghavan · Orthopaedics")
  const [newTime, setNewTime] = useState("08:00")
  const [newReason, setNewReason] = useState<(typeof BOOKING_REASONS)[number]>("Elective surgery")
  const [picked, setPicked] = useState<string | null>(null)

  function saveBooking() {
    if (!newName.trim()) return
    setBookings((b) => [...b, { id: `B${b.length + 1}`, time: newTime, patient: newName.trim(), ageSex: "— / —", reason: newReason, doctor: newDoctor, workup: "Not started · 0 / 3", workupTone: "none" }])
    setNewName("")
    setDrawerOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["pre", "walk"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("border px-5 py-2.5 text-sm font-bold", tab === t ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card" : "border-adminreg-border bg-adminreg-card text-adminreg-text")}>
            {t === "pre" ? "Pre-booked" : "Walk-in"}
          </button>
        ))}
      </div>

      {tab === "pre" ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {BOOKING_DATES.map((d) => (
              <button key={d} type="button" onClick={() => setDate(d)} className={cn("border px-3 py-1.5 text-xs font-semibold", date === d ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border-adminreg-border bg-adminreg-card text-adminreg-muted")}>{d}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">{bookings.length} to check in · {date}</span>
            {editable && <AdminButton type="button" accent="indigo" onClick={() => setDrawerOpen(true)}>+ New advance booking</AdminButton>}
          </div>
          <div className="border border-adminreg-border bg-adminreg-card">
            <div className="grid grid-cols-[70px_1fr_150px] gap-3 border-b border-adminreg-divider bg-adminreg-header px-4 py-2 font-plexmono text-[9.5px] uppercase text-adminreg-muted">
              <span>Time</span><span>Patient · reason · doctor</span><span className="text-right">Workup</span>
            </div>
            {bookings.map((b) => (
              <button key={b.id} type="button" onClick={() => setPicked(b.id)} className={cn("grid w-full grid-cols-[70px_1fr_150px] items-center gap-3 border-b border-adminreg-divider px-4 py-3 text-left last:border-0", picked === b.id ? "bg-adminreg-indigo-soft/60" : "hover:bg-adminreg-bg")}>
                <span className="font-plexmono text-sm font-bold text-adminreg-text">{b.time}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-adminreg-text">{b.patient} <span className="font-plexmono text-[10px] font-normal text-adminreg-muted">{b.ageSex}</span></span>
                  <span className="block text-xs text-adminreg-text">{b.reason}</span>
                  <span className="block text-xs text-adminreg-muted">{b.doctor}</span>
                </span>
                <span className="text-right">
                  <span className={cn("inline-block border px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase", b.workupTone === "done" ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : b.workupTone === "partial" ? "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text" : "border-dashed border-adminreg-border text-adminreg-muted")}>{b.workup}</span>
                </span>
              </button>
            ))}
          </div>
          {picked ? (
            <InlineInfo>Pre-booked patient selected — identity and workup carry forward into admission. Open the booking to continue.</InlineInfo>
          ) : (
            <div className="border border-dashed border-adminreg-border px-4 py-5 text-sm text-adminreg-muted">Select a pre-booked patient to pull their identity and workup forward.</div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <SectionLabel>Patient registration</SectionLabel>
            <div className="space-y-3">
              <div><FieldLabel>Full name</FieldLabel><input placeholder="As on ID proof" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Age / DOB</FieldLabel><input placeholder="e.g. 34 or 12-03-1991" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
                <div><FieldLabel>Sex</FieldLabel><input placeholder="Male / Female" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Mobile</FieldLabel><input placeholder="+91" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
                <div><FieldLabel>ID proof</FieldLabel><input placeholder="Aadhaar / Voter ID" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
              </div>
              <div><FieldLabel>Address</FieldLabel><input placeholder="House, street, city, PIN" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel>
              <SectionLabel>Admission details</SectionLabel>
              <div className="space-y-3">
                <div><FieldLabel>Admitting consultant</FieldLabel><input placeholder="Search doctor" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
                <div><FieldLabel>Provisional diagnosis / reason</FieldLabel><input placeholder="e.g. Acute appendicitis" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel>Bed category</FieldLabel><input placeholder="General / Semi-private" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
                  <div><FieldLabel>Expected length of stay</FieldLabel><input placeholder="e.g. 3 days" disabled={!editable} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" /></div>
                </div>
              </div>
            </Panel>
            <InlineWarning>No prior OPD visit or advance booking on file. Deposit and pre-authorization follow at Stage 3.</InlineWarning>
            {editable && <AdminButton type="button" accent="indigo" className="w-full">Generate admission order → Bed allocation</AdminButton>}
          </div>
        </div>
      )}

      <AdminDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="New advance booking"
        description="Adds a row to the shared advance-admission list read by IPD Stage 1 (Direct / planned → Pre-booked) and Admin scheduling."
        badge={{ label: "IPD · admission desk · new", tone: "neutral" }}
        footer={
          <>
            <AdminButton type="button" variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</AdminButton>
            <AdminButton type="button" accent="indigo" disabled={!newName.trim()} onClick={saveBooking}>Save booking</AdminButton>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div>
            <FieldLabel>1 · Patient</FieldLabel>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="UHID, phone number, or ABHA — or full name for a new patient" className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-adminreg-muted">Search the patient master first. If there is no match you can capture a new patient here without leaving the booking.</p>
          </div>
          <div>
            <FieldLabel>2 · Admitting doctor</FieldLabel>
            <select value={newDoctor} onChange={(e) => setNewDoctor(e.target.value)} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm">
              <option>Dr. S. Raghavan · Orthopaedics</option>
              <option>Dr. Anjali Nair · Cardiology</option>
              <option>Dr. L. Pillai · Obstetrics</option>
              <option>Dr. V. Iyer · General Surgery</option>
            </select>
            <p className="mt-1 font-plexmono text-[9.5px] uppercase text-adminreg-muted">From Admin → Providers · active, IPD privileges</p>
          </div>
          <div>
            <FieldLabel>3 · Arrival time</FieldLabel>
            <select value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm">
              <option>08:00</option><option>10:00</option><option>12:00</option><option>14:00</option>
            </select>
          </div>
          <div>
            <FieldLabel>4 · Reason for admission</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {BOOKING_REASONS.map((r) => (
                <OptionButton key={r} active={newReason === r} onClick={() => setNewReason(r)}>{r}</OptionButton>
              ))}
            </div>
          </div>
        </div>
      </AdminDrawer>
    </div>
  )
}
