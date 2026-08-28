"use client"

import { Fragment, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  AdminButton,
  AdminDrawer,
  AdminModal,
  AdminBanner,
  AdminFormField,
  type AdminFieldDescriptor,
  type AdminFieldType,
  type DrawerBadgeTone,
} from "@/components/meditrack/admin/register"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { ROLE_LABEL, isStageEditable } from "@/components/meditrack/layout/register/rbac"
import {
  SectionLabel,
  FieldLabel,
  FieldValue,
  Panel,
  LinkAction,
  SupersededTag,
  AddendumNote,
  ResultTag,
  CriticalBanner,
  InlineWarning,
  InlineInfo,
  ViewOnlyBanner,
} from "@/components/meditrack/opd/shared/ui"
import { STAGE_DEFS, MODE_BADGE_TONE, SUPERSEDED_CLASS } from "./theme"
// Admission referral (Stage 5) — reviewable via a 5-state chip row, same
// convention as the Registration search-outcome chips.
type DemoReferralState = "not-referred" | "confirming" | "pending" | "processing" | "admitted"

const REFERRAL_STATE_CHIPS: { key: DemoReferralState; label: string }[] = [
  { key: "not-referred", label: "Not referred" },
  { key: "confirming", label: "Confirming" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "admitted", label: "Admitted" },
]

const REFERRAL_STATE_BADGE: Partial<Record<DemoReferralState, string>> = {
  confirming: "Not yet sent to admission desk",
  pending: "Pending pickup",
  processing: "Being processed by admission desk",
  admitted: "Admitted",
}

// ---------------------------------------------------------------------------
// Frontend/UI only — the OPD "visit thread" (Registration through Visit
// Closure). Mirrors the Arogya HMS OPD design spec: one continuous
// sequential hand-off across roles, with live-edit / amendment / void as
// three distinct, clearly-labelled interaction patterns (never silently
// overwriting or deleting a prior entry). All state is local React state.
// Renders inside UnifiedShell — the relay-spine sidebar itself lives there
// (components/meditrack/layout/register/UnifiedSidebar) so it can stay in
// sync with the URL's ?stage= across the shell + content boundary.
// ---------------------------------------------------------------------------

const PATIENT = { name: "Meera Kulkarni", ageSex: "34 / Female", uhid: "UHID-0004821", visitId: "OPD-20260812-0091" }

// ---------------------------------------------------------------------------
// Registration search — four distinct outcome states (§1 of the handoff),
// switched via a demo "SEARCH OUTCOME" chip row rather than real search
// logic, same convention as Day-of Check-in's found/not-found toggle.
// ---------------------------------------------------------------------------
type RegOutcome = "idle" | "no-match" | "single" | "multiple"

const REG_OUTCOME_CHIPS: { key: RegOutcome; label: string }[] = [
  { key: "idle", label: "Pre-search" },
  { key: "no-match", label: "No match" },
  { key: "single", label: "1 match" },
  { key: "multiple", label: "3 matches" },
]

interface RegCandidate {
  name: string
  ageSex: string
  uhid: string
  phone: string
  abha: string
  lastVisit: string
  department: string
  doctor: string
  visitCount: number
  relation: string
}

const REG_SINGLE_MATCH: RegCandidate = {
  name: "Meera Kulkarni",
  ageSex: "34 / Female",
  uhid: "UHID-0004821",
  phone: "+91 98457 20142",
  abha: "42-7719-3308-1145",
  lastVisit: "04 Jun 2026",
  department: "Cardiology",
  doctor: "Dr. Anjali Nair",
  visitCount: 7,
  relation: "Self",
}

const REG_MULTI_CANDIDATES: RegCandidate[] = [
  { ...REG_SINGLE_MATCH, relation: "Self" },
  { name: "Meera S. Kulkarni", ageSex: "61 / Female", uhid: "UHID-0011932", phone: "+91 98457 20142", abha: "Not linked", lastVisit: "19 Feb 2025", department: "Orthopaedics", doctor: "Dr. S. Raghavan", visitCount: 2, relation: "Mother — shares the same contact number" },
  { name: "Rohit Kulkarni", ageSex: "8 / Male", uhid: "UHID-0009044", phone: "+91 98457 20142", abha: "Not linked", lastVisit: "28 Jan 2026", department: "Pediatrics", doctor: "Dr. Priya Iyer", visitCount: 3, relation: "Son — shares the same contact number" },
]

interface NewPatientForm {
  fullName: string
  dob: string
  gender: string
  mobile: string
}

const EMPTY_NEW_PATIENT: NewPatientForm = { fullName: "", dob: "", gender: "", mobile: "" }

function newPatientErrors(form: NewPatientForm): Partial<Record<keyof NewPatientForm, string>> {
  const errs: Partial<Record<keyof NewPatientForm, string>> = {}
  if (!form.fullName.trim()) errs.fullName = "Full name is required"
  if (!form.dob.trim()) errs.dob = "Date of birth is required"
  if (!form.gender.trim()) errs.gender = "Gender is required"
  if (!form.mobile.trim()) errs.mobile = "Mobile number is required"
  return errs
}

interface Addendum {
  by: string
  time: string
  reason: string
  text: string
}

interface ThreadState {
  diagnosticsSkipped: boolean
  tpaSelected: boolean
  bannerText: string | null
  regAmended: boolean
  feeVoided: boolean
  waiverApplied: boolean
  tokenCancelled: boolean
  reassigned: boolean
  vitalsAmended: boolean
  retriaged: boolean
  addendums: Addendum[]
  cxrCancelled: boolean
  ecgAmended: boolean
  rxAmended: boolean
  billLineVoided: boolean
  returnProcessed: boolean
  pharmBillVoided: boolean
  supervisorApproved: boolean
  followupCancelled: boolean
  mergePick: Record<"name" | "phone" | "address" | "history", "A" | "B">
}

const INITIAL_STATE: ThreadState = {
  diagnosticsSkipped: false,
  tpaSelected: false,
  bannerText: null,
  regAmended: false,
  feeVoided: false,
  waiverApplied: false,
  tokenCancelled: false,
  reassigned: false,
  vitalsAmended: false,
  retriaged: false,
  addendums: [],
  cxrCancelled: false,
  ecgAmended: false,
  rxAmended: false,
  billLineVoided: false,
  returnProcessed: false,
  pharmBillVoided: false,
  supervisorApproved: false,
  followupCancelled: false,
  mergePick: { name: "A", phone: "A", address: "A", history: "B" },
}

interface DrawerCfg {
  badge?: { label: string; tone: DrawerBadgeTone }
  title: string
  subtitle?: string
  wide?: boolean
  consequenceNote?: string
  merge?: boolean
  saveLabel: string
  onSave: () => void
  fields: AdminFieldDescriptor[]
}

interface ModalCfg {
  badge?: { label: string; tone: DrawerBadgeTone }
  title: string
  lines: string[]
  reasonField?: boolean
  reasonPlaceholder?: string
  heavy?: boolean
  confirmLabel: string
  onConfirm: (reason: string, ack: boolean) => void
}

// ---------------------------------------------------------------------------

export function OpdVisitThreadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role } = useStaffRole()

  const s = Number(searchParams.get("stage") ?? 0)
  const from = searchParams.get("from")
  const editable = isStageEditable(role, s)

  const [dismissedDeepLink, setDismissedDeepLink] = useState(false)
  const [state, setState] = useState<ThreadState>(INITIAL_STATE)
  const [tmp, setTmp] = useState<Record<string, string>>({})
  const [drawer, setDrawer] = useState<DrawerCfg | null>(null)
  const [modal, setModal] = useState<ModalCfg | null>(null)
  const [modalReason, setModalReason] = useState("")
  const [modalAck, setModalAck] = useState(false)

  // Registration search (Stage 0) — see REG_OUTCOME_CHIPS above.
  const [regOutcome, setRegOutcome] = useState<RegOutcome>("idle")
  const [regQuery, setRegQuery] = useState("")
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [newPatientOrigin, setNewPatientOrigin] = useState<"search" | "direct">("direct")
  const [newPatientForm, setNewPatientForm] = useState<NewPatientForm>(EMPTY_NEW_PATIENT)
  const [newPatientTouched, setNewPatientTouched] = useState(false)
  const [visitOpenedFromCapture, setVisitOpenedFromCapture] = useState(false)

  // Admission referral (Stage 5 → IPD) — §3 of the handoff: "one record, two
  // desks". See ipd-stay-page.tsx's worklist for the other side of this
  // same story (independent demo state, not a live shared store).
  //
  // One state variable drives both the confirm panel and the referral card,
  // switched via a review chip row — same convention as Registration's
  // "search outcome" chips — rather than a forward-only progression, so any
  // state can be inspected directly.
  const [demoReferralState, setDemoReferralState] = useState<DemoReferralState>("not-referred")
  const [admitReason, setAdmitReason] = useState("Unstable angina with a rising troponin — needs a monitored bed and inpatient workup today.")

  function fileAdmissionReferral() {
    if (!admitReason.trim()) return
    setDemoReferralState("pending")
  }

  function selectRegOutcome(o: RegOutcome) {
    setRegOutcome(o)
    setSelectedCandidate(null)
    setShowNewPatientForm(false)
  }
  function openNewPatientForm(origin: "search" | "direct") {
    setNewPatientOrigin(origin)
    setNewPatientForm({ ...EMPTY_NEW_PATIENT, mobile: origin === "search" ? regQuery : "" })
    setNewPatientTouched(false)
    setShowNewPatientForm(true)
  }
  function submitNewPatient(openVisit: boolean) {
    setNewPatientTouched(true)
    if (Object.keys(newPatientErrors(newPatientForm)).length > 0) return
    setShowNewPatientForm(false)
    if (openVisit) setVisitOpenedFromCapture(true)
    patch({ bannerText: openVisit ? `${newPatientForm.fullName} registered — visit opened.` : `${newPatientForm.fullName} registered. No visit opened yet.` })
  }

  const patch = (p: Partial<ThreadState>) => setState((prev) => ({ ...prev, ...p }))
  const goToStage = (n: number) => router.push(`/opd/visit-thread?stage=${Math.max(0, Math.min(8, n))}`)

  function closeDrawer() {
    setDrawer(null)
    setTmp({})
  }
  function closeModal() {
    setModal(null)
  }
  function openDrawer(cfg: DrawerCfg, initial: Record<string, string> = {}) {
    setTmp(initial)
    setDrawer(cfg)
  }
  function openModal(cfg: ModalCfg) {
    setModalReason("")
    setModalAck(false)
    setModal(cfg)
  }
  function doSave(bannerMsg: string, extra: Partial<ThreadState> = {}) {
    return () => {
      patch({ ...extra, bannerText: bannerMsg })
      closeDrawer()
    }
  }
  function doConfirm(bannerMsg: string, extra: Partial<ThreadState> = {}) {
    return (reason: string, ack: boolean) => {
      void reason
      void ack
      patch({ ...extra, bannerText: bannerMsg })
      closeModal()
    }
  }

  function field(key: string, label: string, type: AdminFieldType, opts: { default?: string; placeholder?: string; helper?: string; options?: string[] } = {}): AdminFieldDescriptor {
    return {
      key,
      label,
      type,
      value: tmp[key] ?? opts.default ?? "",
      onChange: (v) => setTmp((prev) => ({ ...prev, [key]: v })),
      placeholder: opts.placeholder,
      helper: opts.helper,
      options: opts.options?.map((o) => ({ value: o, label: o })),
    }
  }

  function badge(label: string): { label: string; tone: DrawerBadgeTone } {
    return { label, tone: MODE_BADGE_TONE[label] ?? "neutral" }
  }

  function handleDrawerSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    drawer?.onSave()
  }

  // ----- derived data -----
  const activeStage = STAGE_DEFS[s]

  const queue = [
    { token: "C-012", name: "Rajesh Kumar", wait: "In consultation", className: "text-adminreg-muted" },
    { token: "C-013", name: "Sunita Patil", wait: "Next · ~5 min", className: "text-adminreg-text" },
    {
      token: "C-014",
      name: state.tokenCancelled ? "Meera Kulkarni — CANCELLED" : "Meera Kulkarni (you)",
      wait: state.tokenCancelled ? "—" : "~18 min",
      className: state.tokenCancelled ? SUPERSEDED_CLASS : "text-adminreg-indigo-dark font-extrabold",
    },
    { token: "C-015", name: "Faisal Ahmed", wait: "~28 min", className: "text-adminreg-muted" },
    { token: "C-016", name: "Deepa Reddy", wait: "~38 min", className: "text-adminreg-muted" },
  ]

  const vitalsRaw = [
    { label: "BP", value: "128/82", unit: "mmHg", crit: false },
    { label: "PULSE", value: "88", unit: "bpm", crit: false },
    { label: "TEMP", value: "98.6", unit: "°F", crit: false },
    { label: "SPO2", value: "91", unit: "%", crit: true },
    { label: "WEIGHT", value: "64", unit: "kg", crit: false },
  ]

  const history = [
    { time: "04 Jun 2026", by: "Dr. Anjali Nair", what: "Routine follow-up — BP controlled, continue Atenolol 50mg." },
    { time: "12 Jan 2026", by: "Dr. Anjali Nair", what: "Diagnosed hypertension, started Atenolol 50mg OD." },
    { time: "Today 09:31", by: "Kavita Rao (Nurse)", what: "Vitals recorded. SpO2 91% — flagged critical." },
    { time: "Today 09:18", by: "Ajay Bhatt (Front Desk)", what: "Token C-014 issued, Cardiology, walk-in." },
  ]

  const rx = [
    { drug: "Salbutamol Inhaler", dose: "2 puffs QID", duration: "5 days", schedule: null as string | null, note: null as string | null, superseded: false },
    {
      drug: "Amoxicillin 500mg",
      dose: "1 cap TDS",
      duration: "5 days",
      schedule: "SCHEDULE H",
      note: "Dispensed only against this prescription — logged to the statutory H register.",
      superseded: state.rxAmended,
    },
    { drug: "Atenolol 50mg", dose: "1 tab OD", duration: "Continue", schedule: null, note: null, superseded: false },
  ]

  const summaryLines = [
    { k: "Visit ID", v: PATIENT.visitId },
    { k: "Doctor", v: "Dr. Anjali Nair — Cardiology" },
    { k: "Diagnosis (provisional)", v: "Early bronchospasm; hypertension, controlled" },
    { k: "Tests ordered", v: "ECG (normal), Chest X-ray (voided)" },
    { k: "Prescription", v: "3 items — 1 Schedule H" },
    { k: "Amount collected", v: "₹700 consultation + ₹336 pharmacy" },
  ]

  // ----- drawer/modal openers -----
  const openRegEdit = () =>
    openDrawer(
      { badge: badge("LIVE EDIT"), title: "Edit demographics", saveLabel: "Save", onSave: doSave("Demographics updated."), fields: [field("name", "Full name", "text"), field("phone", "Phone", "text")] },
      { name: PATIENT.name, phone: "+91 98457 20142" }
    )
  const openRegAmend = () =>
    openDrawer({
      badge: badge("AMENDMENT"),
      title: "Correct demographics (post-registration)",
      saveLabel: "Apply amendment",
      consequenceNote: "This will also update 3 past visit records linked to UHID-0004821.",
      onSave: doSave("Demographics amended across linked records.", { regAmended: true }),
      fields: [field("dob", "Corrected date of birth", "text", { placeholder: "DD/MM/YYYY" }), field("reason", "Reason", "textarea", { placeholder: "e.g. DOB corrected — original entry had a transposed digit" })],
    })
  const openVisitVoid = () =>
    openModal({
      badge: badge("VOID"),
      title: "Cancel this visit?",
      lines: ["The visit record is kept, marked cancelled — never deleted."],
      reasonField: true,
      reasonPlaceholder: "e.g. Patient left before registration completed",
      confirmLabel: "Cancel visit",
      onConfirm: doConfirm("Visit cancelled.", {}),
    })

  const MERGE_FIELDS = {
    name: { label: "Name", a: "Meera Kulkarni", b: "Meera S. Kulkarni" },
    phone: { label: "Phone", a: "+91 98457 20142", b: "+91 97721 30881" },
    address: { label: "Address", a: "HSR Layout, Bengaluru", b: "(not on file)" },
    history: { label: "Visit history", a: "4 visits", b: "1 visit" },
  } as const
  const openMerge = () =>
    openDrawer({
      badge: badge("MERGE REVIEW"),
      title: "Merge duplicate patient records",
      subtitle: "Pick which value wins per field, then confirm. UHID-0011932 will be retired and cross-referenced.",
      wide: true,
      merge: true,
      saveLabel: "Merge records",
      onSave: doSave("Records merged. UHID-0011932 retired and linked to UHID-0004821."),
      fields: [],
    })

  const openFeeVoid = () =>
    openModal({
      badge: badge("VOID"),
      title: "Void collected fee?",
      lines: ["Receipt REC-00842 has already been printed and cannot be un-issued.", "A credit note will be generated and a refund initiated to the original payment method."],
      reasonField: true,
      reasonPlaceholder: "e.g. Duplicate charge entered in error",
      confirmLabel: "Void fee",
      onConfirm: doConfirm("Fee voided. Credit note CN-0091 generated.", { feeVoided: true }),
    })
  const openWaiver = () =>
    openDrawer({
      badge: badge("OVERRIDE"),
      title: "Waive consultation fee",
      saveLabel: "Apply waiver",
      onSave: doSave("Fee waived.", { waiverApplied: true }),
      fields: [field("reason", "Reason (required — bypasses system rule)", "textarea", { placeholder: "e.g. Follow-up window expired 2 days ago, approved by shift supervisor" })],
    })

  const openReassign = () =>
    openDrawer({
      badge: badge("LIVE EDIT"),
      title: "Reassign department / doctor",
      saveLabel: "Reassign",
      onSave: doSave("Reassigned to Cardiology.", { reassigned: true }),
      fields: [field("dept", "Department", "select", { options: ["Cardiology", "General Medicine", "Orthopedics"] }), field("reason", "Reason", "text", { placeholder: "e.g. Originally booked under wrong department" })],
    })
  const openTokenVoid = () =>
    openModal({
      badge: badge("VOID"),
      title: "Cancel token C-014?",
      lines: ["The slot stays visible in the queue, marked cancelled — not renumbered, so other tokens keep their expected position."],
      reasonField: true,
      reasonPlaceholder: "e.g. Patient left before being called",
      confirmLabel: "Cancel token",
      onConfirm: doConfirm("Token C-014 cancelled.", { tokenCancelled: true }),
    })
  const requeue = () => patch({ bannerText: "Priya Shah re-queued as new token C-017." })

  const openVitalsEdit = () =>
    openDrawer({ badge: badge("LIVE EDIT"), title: "Edit vitals (not yet reviewed)", saveLabel: "Save", onSave: doSave("Vitals updated."), fields: [field("spo2", "SpO2 (%)", "text", { default: "91" })] })
  const openVitalsAmend = () =>
    openDrawer({
      badge: badge("AMENDMENT"),
      title: "Correct vitals (already reviewed)",
      saveLabel: "Apply amendment",
      consequenceNote: "Dr. Anjali Nair already reviewed and acted on the original SpO2 reading — she will be notified of this correction.",
      onSave: doSave("Vitals amended. Doctor notified.", { vitalsAmended: true }),
      fields: [field("newSpo2", "Corrected SpO2 (%)", "text", { default: "96" }), field("reason", "Reason", "text", { placeholder: "e.g. Re-checked with second device — first reading likely faulty probe" })],
    })
  const retriageAction = () => patch({ retriaged: true, bannerText: "Re-assessment logged." })

  const openAddendum = () =>
    openDrawer({
      badge: badge("AMENDMENT"),
      title: "Add addendum to signed notes",
      saveLabel: "Add addendum",
      onSave: () => {
        setState((prev) => ({
          ...prev,
          addendums: [...prev.addendums, { by: "Dr. Anjali Nair", time: "12 Aug, 10:05", reason: tmp.reason || "Clarification", text: tmp.text || "" }],
          bannerText: "Addendum added — original note unchanged.",
        }))
        closeDrawer()
      },
      fields: [field("text", "Addendum text", "textarea", { placeholder: "What is being clarified or added..." }), field("reason", "Reason", "text", { placeholder: "e.g. Clarify wheeze severity for referring physician" })],
    })
  const openCancelOrder = () =>
    openModal({
      badge: badge("VOID"),
      title: "Cancel Chest X-ray order?",
      lines: ["Order will be cancelled before sample/scan collection. This reflects immediately on the Diagnostics screen.", "Payment already collected will be reversed via credit note — same mechanism as a fee void."],
      reasonField: true,
      reasonPlaceholder: "e.g. Clinically no longer indicated after review",
      confirmLabel: "Cancel order",
      onConfirm: doConfirm("Chest X-ray order cancelled.", { cxrCancelled: true }),
    })

  const openEcgEdit = () => openDrawer({ badge: badge("LIVE EDIT"), title: "Edit ECG order", saveLabel: "Save", onSave: doSave("Order updated."), fields: [field("note", "Order note", "text")] })
  const openEcgAmend = () =>
    openDrawer({
      badge: badge("AMENDMENT"),
      title: "Correct ECG result",
      saveLabel: "Apply correction",
      consequenceNote: "Dr. Anjali Nair already reviewed the original result — she will be notified of this correction.",
      onSave: doSave("Result corrected. Original preserved as superseded.", { ecgAmended: true }),
      fields: [field("reason", "Reason", "text", { placeholder: "e.g. Transcription error caught on recheck" })],
    })

  const openReturn = () =>
    openDrawer({
      badge: badge("RETURN"),
      title: "Process medicine return",
      saveLabel: "Log return",
      onSave: doSave("Return logged. Original dispense entry retained.", { returnProcessed: true }),
      fields: [
        field("item", "Item", "select", { options: ["Amoxicillin 500mg", "Salbutamol Inhaler"] }),
        field("qty", "Quantity", "text", { placeholder: "e.g. 1" }),
        field("reason", "Reason", "text", { placeholder: "e.g. Patient reaction, pack unopened" }),
      ],
    })
  const voidBillLine = () => patch({ billLineVoided: true })
  const openBillVoid = () =>
    openModal({
      badge: badge("VOID"),
      title: "Void entire bill?",
      lines: ["A GST credit note will be generated; invoice INV-00845 stays on file, marked voided, not deleted."],
      reasonField: true,
      reasonPlaceholder: "e.g. Bill raised against wrong visit",
      confirmLabel: "Void bill",
      onConfirm: doConfirm("Bill voided. Credit note CN-0094 generated.", { pharmBillVoided: true }),
    })

  const openSummaryEdit = () =>
    openDrawer({ badge: badge("LIVE EDIT"), title: "Edit visit summary (pre-close)", saveLabel: "Save", onSave: doSave("Summary updated."), fields: [field("diag", "Provisional diagnosis", "text", { default: "Early bronchospasm; hypertension, controlled" })] })
  const cancelFollowup = () => patch({ followupCancelled: true, bannerText: "Follow-up cancelled." })
  const openReopen = () =>
    openModal({
      badge: badge("SUPERVISOR OVERRIDE REQUIRED"),
      title: "Reopen closed visit?",
      heavy: true,
      lines: ["Reopening a closed visit is unusual — it has already fed into ABDM sync and generated reports.", "This requires a supervisor to authorize."],
      reasonField: true,
      reasonPlaceholder: "e.g. Follow-up date needs correction, caught after close",
      confirmLabel: "Authorize & reopen",
      onConfirm: doConfirm("Visit reopened by supervisor override.", { supervisorApproved: true }),
    })

  const goNext = () => goToStage(s + 1)

  return (
    <div className="min-h-full">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-adminreg-border bg-adminreg-header px-4 py-4 font-archivo sm:px-6 md:px-8">
        <div>
          <div className="mb-1 font-plexmono text-[10px] tracking-[0.05em] text-adminreg-muted">
            OPD — STAGE {s + 1} OF 9
          </div>
          <h1 className="text-[21px] font-extrabold tracking-[-0.01em] text-adminreg-text">{activeStage.name}</h1>
        </div>
      </div>

      {!editable && <ViewOnlyBanner role={ROLE_LABEL[role]} />}

      {from === "providers" && !dismissedDeepLink && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-adminreg-indigo bg-adminreg-indigo-soft px-4 py-2.5 font-archivo text-xs text-adminreg-indigo-dark sm:px-6 md:px-8">
          <span>↳ Viewing via Doctor Management — Dr. Anjali Nair · Cardiology</span>
          <div className="flex flex-shrink-0 items-center gap-3">
            <a href="/admin/providers" className="font-semibold underline">Back to Doctor Management</a>
            <button type="button" onClick={() => setDismissedDeepLink(true)} className="text-adminreg-indigo-dark hover:opacity-70">✕</button>
          </div>
        </div>
      )}

      {state.bannerText && (
        <div className="px-4 pt-6 sm:px-6 md:px-8">
          <AdminBanner message={state.bannerText} onDismiss={() => patch({ bannerText: null })} />
        </div>
      )}

      <div className="px-4 pb-16 pt-6 font-archivo sm:px-6 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          {s === 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel>
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <SectionLabel>Search existing patient</SectionLabel>
                  <div className="flex flex-wrap gap-1">
                    <span className="mr-1 self-center font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Search outcome</span>
                    {REG_OUTCOME_CHIPS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => selectRegOutcome(c.key)}
                        className={cn(
                          "border px-2 py-1 font-plexmono text-[9.5px] font-bold uppercase tracking-[0.03em] transition-colors",
                          regOutcome === c.key ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted hover:text-adminreg-text"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={regQuery}
                    onChange={(e) => setRegQuery(e.target.value)}
                    placeholder="UHID, phone number, or ABHA number"
                    disabled={!editable}
                    className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                  />
                  {editable && <AdminButton type="button" onClick={() => selectRegOutcome("no-match")} className="flex-shrink-0">Search</AdminButton>}
                </div>

                {showNewPatientForm ? (
                  <div className="mt-3.5 border border-adminreg-border bg-adminreg-bg p-3.5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">
                        {newPatientOrigin === "search" ? `Reached from search · 0 records found` : "Direct entry · no search run"}
                      </span>
                      <span className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">New patient capture</span>
                    </div>

                    {newPatientTouched && Object.keys(newPatientErrors(newPatientForm)).length > 0 && (
                      <div className="mb-3 border border-adminreg-red bg-adminreg-red-soft px-3 py-2 text-xs font-semibold text-adminreg-red-text">
                        {Object.keys(newPatientErrors(newPatientForm)).length} of 4 mandatory fields still need attention
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <div className="mb-1 flex items-center justify-between">
                          <FieldLabel>Full name</FieldLabel>
                          <span className="font-plexmono text-[9px] uppercase text-adminreg-amber-text">Required</span>
                        </div>
                        <input
                          value={newPatientForm.fullName}
                          onChange={(e) => setNewPatientForm((f) => ({ ...f, fullName: e.target.value }))}
                          placeholder="As spelled on the ID document"
                          className={cn(
                            "w-full border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo",
                            newPatientTouched && newPatientErrors(newPatientForm).fullName ? "border-adminreg-red" : "border-adminreg-border"
                          )}
                        />
                        {newPatientTouched && newPatientErrors(newPatientForm).fullName && <p className="mt-1 text-[11px] text-adminreg-red-text">{newPatientErrors(newPatientForm).fullName}</p>}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <FieldLabel>Date of birth</FieldLabel>
                          <span className="font-plexmono text-[9px] uppercase text-adminreg-amber-text">Required</span>
                        </div>
                        <input
                          value={newPatientForm.dob}
                          onChange={(e) => setNewPatientForm((f) => ({ ...f, dob: e.target.value }))}
                          placeholder="DD / MM / YYYY"
                          className={cn(
                            "w-full border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo",
                            newPatientTouched && newPatientErrors(newPatientForm).dob ? "border-adminreg-red" : "border-adminreg-border"
                          )}
                        />
                        {newPatientTouched && newPatientErrors(newPatientForm).dob && <p className="mt-1 text-[11px] text-adminreg-red-text">{newPatientErrors(newPatientForm).dob}</p>}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <FieldLabel>Gender</FieldLabel>
                          <span className="font-plexmono text-[9px] uppercase text-adminreg-amber-text">Required</span>
                        </div>
                        <input
                          value={newPatientForm.gender}
                          onChange={(e) => setNewPatientForm((f) => ({ ...f, gender: e.target.value }))}
                          placeholder="Female / Male / Other"
                          className={cn(
                            "w-full border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo",
                            newPatientTouched && newPatientErrors(newPatientForm).gender ? "border-adminreg-red" : "border-adminreg-border"
                          )}
                        />
                        {newPatientTouched && newPatientErrors(newPatientForm).gender && <p className="mt-1 text-[11px] text-adminreg-red-text">{newPatientErrors(newPatientForm).gender}</p>}
                      </div>
                      <div className="col-span-2">
                        <div className="mb-1 flex items-center justify-between">
                          <FieldLabel>Mobile</FieldLabel>
                          <span className="flex items-center gap-1.5">
                            {newPatientOrigin === "search" && newPatientForm.mobile && (
                              <span className="border border-adminreg-border bg-adminreg-card px-1.5 py-0.5 font-plexmono text-[8.5px] uppercase text-adminreg-muted">Prefilled from search</span>
                            )}
                            <span className="font-plexmono text-[9px] uppercase text-adminreg-amber-text">Required</span>
                          </span>
                        </div>
                        <input
                          value={newPatientForm.mobile}
                          onChange={(e) => setNewPatientForm((f) => ({ ...f, mobile: e.target.value }))}
                          placeholder="+91 98457 20142"
                          className={cn(
                            "w-full border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo",
                            newPatientTouched && newPatientErrors(newPatientForm).mobile ? "border-adminreg-red" : "border-adminreg-border"
                          )}
                        />
                        {newPatientTouched && newPatientErrors(newPatientForm).mobile && <p className="mt-1 text-[11px] text-adminreg-red-text">{newPatientErrors(newPatientForm).mobile}</p>}
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-2">
                      <AdminButton type="button" accent="indigo" onClick={() => submitNewPatient(true)}>Register and open visit</AdminButton>
                      <AdminButton type="button" variant="secondary" onClick={() => submitNewPatient(false)}>Save without opening a visit</AdminButton>
                    </div>
                    <p className="mt-2.5 text-[11px] text-adminreg-muted">Name, date of birth, gender and mobile number are required before either action will save.</p>
                  </div>
                ) : regOutcome === "idle" ? (
                  <div className="mt-3.5 border border-dashed border-adminreg-border bg-adminreg-bg p-5 text-center">
                    <p className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">No search run yet</p>
                    <p className="mt-1.5 text-xs text-adminreg-muted">Enter a UHID, phone number, or ABHA number. All three indexes are searched together and the outcome appears here.</p>
                    {editable && (
                      <p className="mt-2.5 text-xs text-adminreg-muted">
                        Patient says they have never been here before?{" "}
                        <span onClick={() => openNewPatientForm("direct")} className="cursor-pointer font-semibold text-adminreg-indigo underline">Register new patient</span>
                      </p>
                    )}
                  </div>
                ) : regOutcome === "no-match" ? (
                  <div className="mt-3.5 border border-adminreg-indigo bg-adminreg-indigo-soft p-3.5">
                    <div className="mb-1.5 text-xs font-bold text-adminreg-indigo-dark">Search completed · 0 records found</div>
                    <div className="font-plexmono text-[10px] text-adminreg-indigo-dark">
                      Query &quot;{regQuery || "+91 98457 20142"}&quot; · {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      <br />
                      UHID index ✕ &nbsp; Phone index ✕ &nbsp; ABHA registry ✕
                    </div>
                    <p className="mt-2 text-xs text-adminreg-indigo-dark">No existing record, so nothing can be attached to the wrong UHID here. Continue into new-patient capture below.</p>
                    {editable && <AdminButton type="button" accent="indigo" className="mt-2.5" onClick={() => openNewPatientForm("search")}>Continue to new-patient capture</AdminButton>}
                  </div>
                ) : regOutcome === "single" || (regOutcome === "multiple" && selectedCandidate !== null) ? (
                  (() => {
                    const candidate = regOutcome === "single" ? REG_SINGLE_MATCH : REG_MULTI_CANDIDATES[selectedCandidate!]
                    return (
                      <div className="mt-3.5 border-t-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3.5">
                        {regOutcome === "multiple" && (
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-olive-dark">Selected from 3 candidates</span>
                            <span onClick={() => setSelectedCandidate(null)} className="cursor-pointer text-[11px] text-adminreg-olive-dark underline">← Back to the list</span>
                          </div>
                        )}
                        <div className="mb-1.5 text-sm font-bold text-adminreg-olive-dark">{candidate.name}</div>
                        <div className="grid grid-cols-2 gap-2.5 text-xs text-adminreg-text">
                          <div><FieldLabel>Age / Sex</FieldLabel><FieldValue>{candidate.ageSex}</FieldValue></div>
                          <div><FieldLabel>UHID</FieldLabel><FieldValue>{candidate.uhid}</FieldValue></div>
                          <div><FieldLabel>Phone</FieldLabel><FieldValue>{candidate.phone}</FieldValue></div>
                          <div><FieldLabel>ABHA</FieldLabel><FieldValue>{candidate.abha}</FieldValue></div>
                        </div>
                        <div className="mt-2.5 border-t border-adminreg-olive/30 pt-2.5 text-xs text-adminreg-olive-dark">
                          Last seen {candidate.lastVisit} · {candidate.department}, {candidate.doctor} · {candidate.visitCount} visits on record
                        </div>
                        <p className="mt-2.5 text-[11px] text-adminreg-muted">Confirm identity with the patient — name and age spoken back, not just read out — before a visit is created against this UHID.</p>
                        {editable && (
                          <div className="mt-2.5 flex items-center gap-3">
                            <AdminButton type="button" accent="indigo" onClick={() => patch({ bannerText: `Visit opened for ${candidate.name}.` })}>Confirm &amp; open visit</AdminButton>
                            <span onClick={() => selectRegOutcome("idle")} className="cursor-pointer text-[11px] text-adminreg-indigo underline">Not this person? Refine search</span>
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <div className="mt-3.5 border border-adminreg-amber bg-adminreg-amber-soft p-3.5">
                    <div className="mb-2 text-xs font-bold text-adminreg-amber-text">3 records match — select the right person</div>
                    <p className="mb-2.5 text-[11px] text-adminreg-amber-text">One phone number, three registered people. Check age and last visit against the person standing at the desk before selecting.</p>
                    <div className="space-y-2">
                      {REG_MULTI_CANDIDATES.map((c, i) => (
                        <div key={c.uhid} className="flex items-center justify-between gap-3 border border-adminreg-border bg-adminreg-card px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-adminreg-text">{c.name} <span className="font-plexmono text-[10px] font-normal text-adminreg-muted">— {c.uhid}</span></div>
                            <div className="text-[11px] text-adminreg-muted">{c.ageSex} · last visit {c.lastVisit} · {c.department}</div>
                            <div className="text-[11px] italic text-adminreg-muted">{c.relation}</div>
                          </div>
                          {editable && <AdminButton type="button" variant="secondary" className="flex-shrink-0" onClick={() => setSelectedCandidate(i)}>Select</AdminButton>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      {editable && <span onClick={() => openNewPatientForm("direct")} className="cursor-pointer text-[11px] text-adminreg-muted underline">None of these — register as new</span>}
                      {editable && <AdminButton type="button" variant="secondary" onClick={openMerge}>Review &amp; merge records</AdminButton>}
                    </div>
                  </div>
                )}
              </Panel>
              <Panel>
                <div className="flex items-start justify-between">
                  <SectionLabel>Visit opened</SectionLabel>
                  {editable && (
                    <div className="flex gap-3">
                      <LinkAction tone="edit" onClick={openRegEdit}>Edit</LinkAction>
                      <LinkAction tone="amend" onClick={openRegAmend}>Amend (post-registration)</LinkAction>
                      <LinkAction tone="void" onClick={openVisitVoid}>Cancel visit</LinkAction>
                    </div>
                  )}
                </div>
                <div className="my-2.5 grid grid-cols-2 gap-2.5">
                  <div><FieldLabel>Full name</FieldLabel><FieldValue>{PATIENT.name}</FieldValue></div>
                  <div><FieldLabel>Age / Sex</FieldLabel><FieldValue>{PATIENT.ageSex}</FieldValue></div>
                  <div><FieldLabel>Phone</FieldLabel><FieldValue>+91 98457 20142</FieldValue></div>
                  <div><FieldLabel>UHID</FieldLabel><FieldValue>{PATIENT.uhid}</FieldValue></div>
                </div>
                {state.regAmended && (
                  <AddendumNote header="AMENDMENT · A. Bhatt · 12 Aug 2026, 10:12 · Reason: DOB corrected — original entry had a transposed digit">
                    DOB corrected to 14 Mar 1992. This update also applied to 3 linked past visit records under this UHID.
                  </AddendumNote>
                )}
                <div className="mt-3 border-t border-adminreg-divider pt-3">
                  <FieldLabel>ABHA (Ayushman Bharat Health Account)</FieldLabel>
                  <div className="mt-1 flex items-center justify-between gap-3 border border-adminreg-red bg-adminreg-red-soft px-3 py-2.5">
                    <span className="text-xs text-adminreg-red-text">Linking failed — OTP verification timed out</span>
                    {editable && <AdminButton type="button" variant="secondary">Retry</AdminButton>}
                  </div>
                </div>
                {editable && <AdminButton type="button" accent="indigo" className="mt-4" onClick={goNext}>Open visit → Fee collection</AdminButton>}
              </Panel>
            </div>
          )}

          {s === 1 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="border border-adminreg-border bg-adminreg-card">
                <div className="grid grid-cols-[1.6fr_1fr_90px] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Charge</span><span>Amount (₹)</span><span /></div>
                <div className="grid grid-cols-[1.6fr_1fr_90px] items-center border-t border-adminreg-divider px-4 py-2.5 text-sm">
                  <span className={state.feeVoided ? SUPERSEDED_CLASS : ""}>Specialist consultation — Cardiology {state.feeVoided && <SupersededTag />}</span>
                  <span className={cn("font-plexmono", state.feeVoided && SUPERSEDED_CLASS)}>700</span>
                  {editable && !state.feeVoided && <LinkAction tone="void" onClick={openFeeVoid}>Void</LinkAction>}
                </div>
                {state.feeVoided && <div className="border-t border-adminreg-divider px-4 py-2.5 text-[11px] text-adminreg-amber-text">Receipt REC-00842 already printed and cannot be un-issued. Credit note CN-0091 generated; refund initiated to original payment method.</div>}
                <div className="grid grid-cols-[1.6fr_1fr_90px] border-t border-adminreg-divider bg-adminreg-header px-4 py-2.5 text-sm font-bold"><span>Total payable</span><span className="font-plexmono">{state.feeVoided ? "₹0" : "₹700"}</span><span /></div>
              </div>
              <Panel>
                <SectionLabel>Payment method</SectionLabel>
                <div className="mb-3.5 flex flex-wrap gap-2">
                  {["Cash", "UPI", "Card", "Cashless / TPA"].map((m) => {
                    const active = state.tpaSelected ? m === "Cashless / TPA" : m === "Cash"
                    return (
                      <button key={m} type="button" disabled={!editable} onClick={() => patch({ tpaSelected: m === "Cashless / TPA" })} className={cn("px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60", active ? "border-[1.5px] border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>
                        {m}
                      </button>
                    )
                  })}
                </div>
                <p className="mb-3.5 text-[11px] text-adminreg-muted">Switching method before the visit proceeds is a live edit — no reason required.</p>
                {state.tpaSelected && <div className="mb-3.5"><InlineWarning>Star Health pre-authorization pending. Token cannot be issued until approved or patient pays out-of-pocket.</InlineWarning></div>}
                {editable && <AdminButton type="button" variant="secondary" className="mb-3.5" onClick={openWaiver}>Override — waive fee</AdminButton>}
                {state.waiverApplied && (
                  <AddendumNote header="OVERRIDE · A. Bhatt · Reason: Follow-up window expired 2 days ago, approved by shift supervisor">Fee waived — system&apos;s free-follow-up rule bypassed.</AddendumNote>
                )}
                {editable && <AdminButton type="button" accent="indigo" className="mt-4" onClick={goNext}>Confirm payment → Assign token</AdminButton>}
              </Panel>
            </div>
          )}

          {s === 2 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Panel>
                <div className="flex justify-between"><SectionLabel>Assignment</SectionLabel>{editable && <LinkAction tone="edit" onClick={openReassign}>Reassign</LinkAction>}</div>
                <FieldLabel>Department</FieldLabel><div className="mb-2.5"><FieldValue>Cardiology</FieldValue></div>
                <FieldLabel>Doctor</FieldLabel><div className="mb-2.5"><FieldValue>Dr. Anjali Nair</FieldValue></div>
                {state.reassigned && <AddendumNote header="REASSIGNED · A. Bhatt · Reason: Originally booked under wrong department">Moved to Cardiology, Dr. Anjali Nair.</AddendumNote>}
                <div className="mt-2.5"><FieldLabel>Visit type</FieldLabel></div>
                <div className="mb-3.5 mt-1.5 flex gap-2">
                  <span className="border-[1.5px] border-adminreg-indigo bg-adminreg-indigo-soft px-3 py-1.5 text-xs font-bold text-adminreg-indigo-dark">Walk-in</span>
                  <span className="border border-adminreg-border bg-adminreg-bg px-3 py-1.5 text-xs font-semibold text-adminreg-muted">Pre-booked</span>
                </div>
                <div className="bg-adminreg-sidebar px-4 py-4 text-center text-adminreg-card">
                  <div className="font-plexmono text-[10px] tracking-[0.05em] text-adminreg-sidebar-text-muted">TOKEN</div>
                  <div className={cn("mt-1 font-plexmono text-[34px] font-bold", state.tokenCancelled && "opacity-50 line-through")}>C-014</div>
                </div>
                {editable && !state.tokenCancelled && <button type="button" onClick={openTokenVoid} className="mt-2.5 block text-[11px] text-adminreg-amber-text underline">Cancel token</button>}
              </Panel>
              <Panel>
                <div className="mb-3.5"><InlineWarning>⚠ Dr. Anjali Nair running approx. 25 min behind. Queue times adjusted.</InlineWarning></div>
                <SectionLabel>Live queue — Cardiology</SectionLabel>
                {queue.map((q) => (
                  <div key={q.token} className="flex items-center justify-between border-t border-adminreg-divider py-2.5">
                    <span className={cn("font-plexmono font-bold", q.className)}>{q.token}</span>
                    <span className={cn("ml-3.5 flex-1 text-sm", q.className)}>{q.name}</span>
                    <span className="text-[11px] text-adminreg-muted">{q.wait}</span>
                  </div>
                ))}
                <p className="mt-2.5 text-[11px] text-adminreg-muted">Cancelled tokens keep their slot marked, not renumbered — patients tracking their token number by ear shouldn&apos;t see numbers shift under them.</p>
                <div className="mt-2 flex items-center justify-between border-t border-dashed border-adminreg-border py-2.5">
                  <span className="text-sm text-adminreg-amber-text">C-011 — Priya Shah — did not respond when called</span>
                  {editable && <AdminButton type="button" variant="secondary" onClick={requeue}>Re-queue</AdminButton>}
                </div>
                {editable && <AdminButton type="button" accent="indigo" className="mt-4" onClick={goNext}>Called in → Vitals &amp; triage</AdminButton>}
              </Panel>
            </div>
          )}

          {s === 3 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2">Vitals</h2>
                {editable && (
                  <div className="flex gap-2.5">
                    <LinkAction tone="edit" onClick={openVitalsEdit}>Edit</LinkAction>
                    <LinkAction tone="amend" onClick={openVitalsAmend}>Correct (already reviewed)</LinkAction>
                    <AdminButton type="button" variant="danger" onClick={retriageAction}>Re-assess — condition changed</AdminButton>
                  </div>
                )}
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {vitalsRaw.map((v) => (
                  <div key={v.label} className={cn("p-3.5 text-center", v.crit ? "border-2 border-adminreg-red bg-adminreg-red-soft" : "border border-adminreg-border bg-adminreg-card")}>
                    <div className={cn("font-plexmono text-[10px] tracking-[0.04em]", v.crit ? "text-adminreg-red-text" : "text-adminreg-muted2")}>{v.label}</div>
                    <div className={cn("mt-1.5 font-plexmono text-[28px] font-bold", v.crit ? "text-adminreg-red-text" : "text-adminreg-text")}>{v.value}</div>
                    <div className={cn("mt-0.5 text-[11px]", v.crit ? "text-adminreg-red-text" : "text-adminreg-muted2")}>{v.unit}</div>
                  </div>
                ))}
              </div>
              {state.vitalsAmended && (
                <div className="mb-3.5">
                  <AddendumNote header="AMENDMENT · K. Rao (Nurse) · Reason: Re-checked with second device — first reading likely faulty probe">
                    SpO2 <span className={SUPERSEDED_CLASS}>91%</span>
                    <SupersededTag /> — corrected to <strong>96%</strong>. Dr. Anjali Nair has been notified of this correction.
                  </AddendumNote>
                </div>
              )}
              {state.retriaged && <div className="mb-3.5"><InlineInfo>Re-assessment logged — patient moved back to nurse queue for fresh vitals before doctor review.</InlineInfo></div>}
              <CriticalBanner title="CRITICAL: SpO2 91% — below safe threshold" description="Escalate to doctor immediately." action={editable ? <AdminButton type="button" variant="danger" className="ml-auto">Escalate now</AdminButton> : undefined} />
              <Panel className="max-w-[640px]">
                <SectionLabel>Chief complaint</SectionLabel>
                <textarea rows={3} disabled={!editable} defaultValue="Breathlessness on exertion since 2 days, mild chest tightness." className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-70" />
              </Panel>
              {editable && <AdminButton type="button" accent="indigo" className="mt-4" onClick={goNext}>Send to doctor → Consultation</AdminButton>}
            </div>
          )}

          {s === 4 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <Panel className="mb-3.5">
                  <SectionLabel>Visit history thread</SectionLabel>
                  {history.map((h) => (
                    <div key={h.time + h.what} className="border-t border-adminreg-divider py-2.5">
                      <div className="font-plexmono text-[11px] text-adminreg-muted">{h.time} · {h.by}</div>
                      <div className="mt-0.5 text-xs text-adminreg-text">{h.what}</div>
                    </div>
                  ))}
                </Panel>
                <div className="border border-adminreg-red bg-adminreg-red-soft px-4 py-3.5 text-xs text-adminreg-red-text">Nurse escalation: SpO2 91% flagged at triage.</div>
              </div>
              <Panel>
                <div className="flex justify-between">
                  <h2 className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2">Clinical notes — signed</h2>
                  <span className="font-plexmono text-[10px] text-adminreg-muted">Dr. Anjali Nair · 12 Aug, 09:58</span>
                </div>
                <div className="border-b border-adminreg-divider py-2.5 text-sm leading-relaxed">Mild wheeze on auscultation. Suspected early bronchospasm. Advise ECG and chest X-ray to rule out cardiac cause given SpO2 flag.</div>
                <div className="space-y-2.5 pt-2.5">
                  {state.addendums.map((a, i) => (
                    <AddendumNote key={i} header={`ADDENDUM · ${a.by} · ${a.time} · Reason: ${a.reason}`}>{a.text}</AddendumNote>
                  ))}
                </div>
                {editable && <AdminButton type="button" variant="secondary" className="mt-3" onClick={openAddendum}>+ Add addendum</AdminButton>}

                {editable && (
                  <>
                    <div className="mt-5"><SectionLabel>Next step</SectionLabel></div>
                    <div className="mb-3.5 flex flex-wrap gap-2">
                      <AdminButton type="button" accent="indigo" onClick={goNext}>Order diagnostics</AdminButton>
                      <AdminButton type="button" variant="secondary" onClick={() => { patch({ diagnosticsSkipped: true }); goToStage(6) }}>Skip — prescribe directly</AdminButton>
                      <AdminButton type="button" variant="secondary">Refer to specialist</AdminButton>
                      {demoReferralState === "not-referred" && (
                        <AdminButton type="button" variant="secondary" className="border-adminreg-ipd text-adminreg-ipd hover:bg-adminreg-ipd/10" onClick={() => setDemoReferralState("confirming")}>
                          Admission needed (→ IPD)
                        </AdminButton>
                      )}
                      {demoReferralState === "confirming" && (
                        <AdminButton type="button" className="border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90">
                          Admission needed (→ IPD)
                        </AdminButton>
                      )}
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between bg-adminreg-header px-3.5 py-2.5">
                  <span className="text-xs">Chest X-ray — ordered</span>
                  {!state.cxrCancelled ? (editable && <LinkAction tone="void" onClick={openCancelOrder}>Cancel before collection</LinkAction>) : <SupersededTag />}
                </div>

                {editable && demoReferralState === "confirming" && (
                  <div className="mt-3.5 border-t-[3px] border-adminreg-ipd bg-adminreg-ipd/[0.06] p-3.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div>
                        <span className="mb-1.5 inline-block border border-adminreg-ipd bg-adminreg-card px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase tracking-[0.04em] text-adminreg-ipd">
                          {REFERRAL_STATE_BADGE.confirming}
                        </span>
                        <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-ipd">Confirm admission referral</div>
                      </div>
                      <span onClick={() => setDemoReferralState("not-referred")} className="cursor-pointer text-[11px] text-adminreg-muted underline">Cancel</span>
                    </div>
                    <p className="mb-2.5 text-xs text-adminreg-muted">This does not cancel anything already ordered in this consultation — it just opens a referral for the admission desk to pick up.</p>
                    <FieldLabel>Admission reason</FieldLabel>
                    <textarea
                      value={admitReason}
                      onChange={(e) => setAdmitReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. Unstable angina with a rising troponin — needs a monitored bed and inpatient workup today."
                      className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-ipd"
                    />
                    <div className="mt-2.5 border border-adminreg-border bg-adminreg-card p-3">
                      <p className="mb-1.5 font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-muted2">Carried into the referral — exactly what admission desk will see</p>
                      <div className="space-y-2 text-xs text-adminreg-text">
                        <div>
                          <div className="font-semibold">Working diagnosis</div>
                          <div>Suspected early bronchospasm; cardiac cause not excluded</div>
                          <div className="text-[10px] text-adminreg-muted">Clinical notes, signed 09:58</div>
                        </div>
                        <div>
                          <div className="font-semibold">Vitals at referral</div>
                          <div>BP 168/104 · HR 96 · SpO2 91% (flagged at triage)</div>
                          <div className="text-[10px] text-adminreg-muted">Vitals &amp; Triage</div>
                        </div>
                        <div>
                          <div className="font-semibold">Diagnostics on file</div>
                          <div>Chest X-ray ordered 09:58 — awaiting collection</div>
                          <div className="text-[10px] text-adminreg-muted">Diagnostics, this visit</div>
                        </div>
                        <div>
                          <div className="font-semibold">Referring doctor</div>
                          <div>Dr. Anjali Nair · Cardiology</div>
                          <div className="text-[10px] text-adminreg-muted">OPD-20260812-0091</div>
                        </div>
                      </div>
                    </div>
                    <AdminButton type="button" className="mt-3 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90" disabled={!admitReason.trim()} onClick={fileAdmissionReferral}>
                      Confirm admission — bed allocation (→ IPD)
                    </AdminButton>
                  </div>
                )}

                {(demoReferralState === "pending" || demoReferralState === "processing" || demoReferralState === "admitted") && (
                  <div className="mt-3.5">
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      <span className="mr-1 self-center font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Referral state</span>
                      {REFERRAL_STATE_CHIPS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setDemoReferralState(c.key)}
                          className={cn(
                            "border px-2 py-1 font-plexmono text-[9.5px] font-bold uppercase tracking-[0.03em] transition-colors",
                            demoReferralState === c.key ? "border-adminreg-ipd bg-adminreg-ipd text-adminreg-card" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted hover:text-adminreg-text"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    <div className={cn("border-t-[3px] p-3.5", demoReferralState === "admitted" ? "border-adminreg-olive bg-adminreg-olive-soft" : "border-adminreg-ipd bg-adminreg-ipd/[0.06]")}>
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className={cn("font-plexmono text-[10px] font-bold uppercase tracking-[0.04em]", demoReferralState === "admitted" ? "text-adminreg-olive-dark" : "text-adminreg-ipd")}>
                          Admission referral · REF-20260812-0031
                        </span>
                        <span className={cn("border px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase", demoReferralState === "admitted" ? "border-adminreg-olive text-adminreg-olive-dark" : "border-adminreg-ipd text-adminreg-ipd")}>
                          {REFERRAL_STATE_BADGE[demoReferralState]}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex gap-2.5">
                          <span className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 border border-adminreg-ipd bg-adminreg-ipd" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-adminreg-text">Referral filed by doctor</span>
                              <span className="flex-shrink-0 font-plexmono text-[10px] text-adminreg-muted">12 Aug, 09:58</span>
                            </div>
                            <p className="text-[11px] text-adminreg-muted">Reason and carried-over context sent to the admission desk.</p>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <span className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0 border border-adminreg-ipd", demoReferralState !== "pending" && "bg-adminreg-ipd")} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-adminreg-text">Picked up by admission desk</span>
                              <span className="flex-shrink-0 font-plexmono text-[10px] text-adminreg-muted">{demoReferralState === "pending" ? "—" : "12 Aug, 10:04"}</span>
                            </div>
                            <p className="text-[11px] text-adminreg-muted">
                              {demoReferralState === "pending" ? "Waiting. Sitting on the IPD referral worklist, unclaimed." : "A. Bhatt opened the referral and is completing Stage 1."}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <span className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0 border border-adminreg-ipd", demoReferralState === "admitted" && "bg-adminreg-ipd")} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-adminreg-text">Admission order generated</span>
                              <span className="flex-shrink-0 font-plexmono text-[10px] text-adminreg-muted">{demoReferralState === "admitted" ? "12 Aug, 10:11" : "—"}</span>
                            </div>
                            <p className="text-[11px] text-adminreg-muted">
                              {demoReferralState === "admitted" ? "Bed GM-004, General Medicine. The stay is live in IPD." : "Pending — no bed committed yet."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 border-t border-adminreg-divider pt-2.5 text-[11px] text-adminreg-muted">
                        Reason filed: {admitReason}
                        <br />
                        Chest X-ray ordered 09:58 is unaffected and still awaiting collection.
                      </p>
                      {demoReferralState === "admitted" && (
                        <a href="/ipd/stay?stage=1" className="mt-2 inline-block text-[11px] font-semibold text-adminreg-olive-dark underline">Open IPD admission IPD-20260809-0042 →</a>
                      )}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {s === 5 && (
            state.diagnosticsSkipped ? (
              <div className="border border-dashed border-adminreg-border p-10 text-center text-sm text-adminreg-muted">
                This stage was skipped — Dr. Anjali Nair chose to prescribe directly.
                {editable && <div className="mt-3"><AdminButton type="button" variant="secondary" onClick={() => patch({ diagnosticsSkipped: false })}>Undo — order diagnostics now</AdminButton></div>}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Panel>
                  <SectionLabel>Ordered tests</SectionLabel>
                  <div className="flex items-center justify-between border-t border-adminreg-divider py-2 text-sm"><span>ECG</span><span className="font-plexmono text-adminreg-muted">₹350</span>{editable && <LinkAction tone="edit" onClick={openEcgEdit}>Edit</LinkAction>}</div>
                  <div className="flex items-center justify-between border-t border-adminreg-divider py-2 text-sm">
                    <span className={state.cxrCancelled ? SUPERSEDED_CLASS : ""}>Chest X-ray</span>
                    <span className={cn("font-plexmono text-adminreg-muted", state.cxrCancelled && SUPERSEDED_CLASS)}>₹600</span>
                    {!state.cxrCancelled ? (editable && <LinkAction tone="void" onClick={openCancelOrder}>Void</LinkAction>) : <SupersededTag />}
                  </div>
                  {state.cxrCancelled && <p className="mt-2 text-[11px] text-adminreg-amber-text">Cancelled by Dr. Nair before sample collection. Same reversal mechanism as fee void — credit note CN-0093 issued.</p>}
                  <div className="mt-3.5"><InlineInfo>Covered under Star Health TPA — pre-authorized.</InlineInfo></div>
                </Panel>
                <Panel>
                  <SectionLabel>Results</SectionLabel>
                  <div className="border-t border-adminreg-divider py-2.5">
                    <div className="flex items-center justify-between"><span className="text-sm">ECG</span><ResultTag tone={state.ecgAmended ? "amber" : "green"}>{state.ecgAmended ? "AMENDED" : "NORMAL"}</ResultTag></div>
                    {state.ecgAmended ? (
                      <div className="mt-2">
                        <AddendumNote header="AMENDMENT · M. Pillai (Lab) · Reason: Transcription error caught on recheck">
                          Result <span className={SUPERSEDED_CLASS}>Irregular rhythm noted</span>
                          <SupersededTag /> — corrected to <strong>Normal sinus rhythm</strong>. Dr. Anjali Nair notified — original reading had already been reviewed.
                        </AddendumNote>
                      </div>
                    ) : (
                      editable && <LinkAction tone="amend" onClick={openEcgAmend}>Correct result (already reviewed)</LinkAction>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-adminreg-divider py-2.5"><span className="text-sm">Chest X-ray</span><ResultTag tone="amber">PENDING RADIOLOGIST</ResultTag></div>
                  <div className="mt-3.5"><CriticalBanner title="⚠ CRITICAL RESULT — Serum Potassium 6.4 mmol/L" description="Auto-flagged and pushed to doctor." /></div>
                  {editable && <AdminButton type="button" accent="indigo" className="mt-2" onClick={goNext}>Back to doctor → e-Prescription</AdminButton>}
                </Panel>
              </div>
            )
          )}

          {s === 6 && (
            <div>
              <div className="border border-adminreg-border bg-adminreg-card">
                <div className="grid grid-cols-[1.2fr_1fr_80px_90px_1fr] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Drug</span><span>Dosage</span><span>Duration</span><span>Schedule</span><span /></div>
                {rx.map((r) => (
                  <div key={r.drug} className={cn("border-t border-adminreg-divider px-4 py-2.5", r.schedule && "bg-adminreg-red-soft/40")}>
                    <div className="grid grid-cols-[1.2fr_1fr_80px_90px_1fr] items-center">
                      <span className={cn("text-sm font-semibold", r.superseded && SUPERSEDED_CLASS)}>{r.drug}</span>
                      <span className={cn("text-sm", r.superseded && SUPERSEDED_CLASS)}>{r.dose}</span>
                      <span className={cn("font-plexmono text-xs", r.superseded && SUPERSEDED_CLASS)}>{r.duration}</span>
                      {r.schedule ? <span className="w-fit border-[1.5px] border-adminreg-red bg-adminreg-red-soft px-2 py-0.5 text-[11px] font-bold text-adminreg-red-text">{r.schedule}</span> : <span className="text-xs text-adminreg-muted">—</span>}
                      <span />
                    </div>
                    {r.note && <p className="mt-1.5 text-[11px] text-adminreg-amber-text">{r.note}</p>}
                  </div>
                ))}
              </div>
              {state.rxAmended && (
                <div className="mt-3.5 max-w-[640px]">
                  <AddendumNote header="AMENDMENT · Dr. Anjali Nair · Reason: Duration under-specified at time of dispensing">
                    Amoxicillin 500mg <SupersededTag /> — new entry RX-00913 issued (5 → 7 days). Original Schedule H register entry retained; correction logged as a linked entry, not a replacement.
                  </AddendumNote>
                </div>
              )}
              <div className="mt-3.5 max-w-[640px]"><InlineWarning>⚠ Interaction check: Salbutamol with existing Atenolol may reduce bronchodilator effect.</InlineWarning></div>
              {editable && <AdminButton type="button" accent="indigo" className="mt-4" onClick={goNext}>Send to pharmacy → Dispensing</AdminButton>}
            </div>
          )}

          {s === 7 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="border border-adminreg-border bg-adminreg-card">
                <div className="grid grid-cols-[1.3fr_1fr_70px_80px_1fr] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Drug</span><span>Stock</span><span>Qty</span><span>Amount</span><span /></div>
                <div className={cn("grid grid-cols-[1.3fr_1fr_70px_80px_1fr] items-center border-t border-adminreg-divider px-4 py-2.5 text-sm", state.billLineVoided && "bg-adminreg-red-soft/40")}>
                  <span className={state.billLineVoided ? SUPERSEDED_CLASS : ""}>Amoxicillin 500mg</span>
                  <span className={state.billLineVoided ? SUPERSEDED_CLASS : "text-adminreg-olive-dark"}>In stock</span>
                  <span className={cn("font-plexmono", state.billLineVoided && SUPERSEDED_CLASS)}>10</span>
                  <span className={cn("font-plexmono", state.billLineVoided && SUPERSEDED_CLASS)}>₹120</span>
                  {!state.billLineVoided ? (editable && <LinkAction tone="void" onClick={voidBillLine}>Void</LinkAction>) : <SupersededTag />}
                </div>
                <div className="grid grid-cols-[1.3fr_1fr_70px_80px_1fr] items-center border-t border-adminreg-divider bg-adminreg-red-soft px-4 py-2.5 text-sm">
                  <span>Salbutamol Inhaler</span><span className="font-bold text-adminreg-red-text">Only 2 left</span><span className="font-plexmono">1</span><span className="font-plexmono">₹180</span><span />
                </div>
                <div className="border-t border-adminreg-divider px-4 py-2.5 text-[11px] text-adminreg-red-text">Stock shortage — dispensing 1 of 1 available; reorder flagged.</div>
                <div className="flex items-center justify-between gap-3 border-t border-adminreg-amber bg-adminreg-amber-soft px-4 py-3">
                  <div>
                    <div className="text-[11px] font-bold text-adminreg-amber-text">SCHEDULE H1 REGISTER</div>
                    <div className="mt-0.5 text-[11px] text-adminreg-amber-text">Register clean for this visit — no H1-class items dispensed.</div>
                  </div>
                  {editable && <AdminButton type="button" variant="secondary" onClick={openReturn}>Process return</AdminButton>}
                </div>
                {state.returnProcessed && (
                  <div className="m-4">
                    <AddendumNote header="RETURN · S. Verma (Pharmacist) · Reason: Patient reaction, pack unopened">1× Amoxicillin 500mg returned. Original dispense entry retained on record, cross-referenced to return RET-00071.</AddendumNote>
                  </div>
                )}
              </div>
              <Panel>
                <SectionLabel>Bill summary</SectionLabel>
                <div className="flex justify-between py-1.5 text-sm"><span>Subtotal</span><span className="font-plexmono">₹300.00</span></div>
                <div className="flex justify-between py-1.5 text-sm"><span>GST (12%)</span><span className="font-plexmono">₹36.00</span></div>
                <div className="mt-1.5 flex justify-between border-t border-adminreg-divider py-2 text-sm font-bold"><span>Total</span><span className="font-plexmono">₹336.00</span></div>
                {editable && <button type="button" onClick={openBillVoid} className="my-2.5 block text-[11px] text-adminreg-amber-text underline">Void entire bill</button>}
                {state.pharmBillVoided && <p className="mb-2.5 text-[11px] text-adminreg-amber-text">Invoice INV-00845 voided. GST credit note CN-0094 generated; original invoice remains on file.</p>}
                {editable && <AdminButton type="button" accent="indigo" className="mt-1.5" onClick={goNext}>Collect payment → Close visit</AdminButton>}
              </Panel>
            </div>
          )}

          {s === 8 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
              <Panel>
                <div className="flex justify-between"><SectionLabel>Visit summary</SectionLabel>{editable && <LinkAction tone="edit" onClick={openSummaryEdit}>Edit (pre-close)</LinkAction>}</div>
                {summaryLines.map((l) => (
                  <div key={l.k} className="flex justify-between border-t border-adminreg-divider py-2 text-sm"><span className="text-adminreg-muted">{l.k}</span><span className="text-right">{l.v}</span></div>
                ))}
                <div className="mt-3.5"><InlineWarning>1 report pending — Chest X-ray radiologist read.</InlineWarning></div>
              </Panel>
              <Panel>
                <div className="flex justify-between"><SectionLabel>Follow-up</SectionLabel>{editable && <LinkAction tone="void" onClick={cancelFollowup}>Cancel</LinkAction>}</div>
                {state.followupCancelled ? (
                  <div className={cn("text-sm", SUPERSEDED_CLASS)}>26 Aug 2026 — Dr. Anjali Nair, Cardiology <SupersededTag /></div>
                ) : (
                  <div className="mb-3.5"><FieldValue>26 Aug 2026 — Dr. Anjali Nair, Cardiology</FieldValue></div>
                )}
                <div className="mt-4"><SectionLabel>ABDM / ABHA sync</SectionLabel></div>
                <div className="mb-4 flex items-center justify-between gap-3 border border-adminreg-red bg-adminreg-red-soft px-3 py-2.5 text-xs text-adminreg-red-text">
                  <span>Sync failed — records not pushed</span>
                  {editable && <AdminButton type="button" variant="secondary">Retry sync</AdminButton>}
                </div>
                {editable && <AdminButton type="button" accent="indigo" className="mb-2.5">Close visit</AdminButton>}

                {!state.supervisorApproved ? (
                  <div className="border-t border-adminreg-divider pt-3.5">
                    <SectionLabel>Visit is closed</SectionLabel>
                    <div className="mb-2.5"><InlineWarning>Your role ({ROLE_LABEL[role]}) cannot reopen a closed visit. This action requires supervisor override.</InlineWarning></div>
                    {editable && <AdminButton type="button" variant="secondary" onClick={openReopen}>Request supervisor override to reopen</AdminButton>}
                  </div>
                ) : (
                  <AddendumNote header="REOPENED · Supervisor: R. Desai · Reason: Follow-up date needs correction, caught after close">
                    Visit reopened. ABDM sync and prior reports referencing this visit may need to be regenerated.
                  </AddendumNote>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>

      {/* Generic drawer */}
      {drawer && (
        <AdminDrawer open={!!drawer} onOpenChange={(o) => !o && closeDrawer()} title={drawer.title} description={drawer.subtitle} badge={drawer.badge} consequenceNote={drawer.consequenceNote} wide={drawer.wide} onSubmit={handleDrawerSubmit}
          footer={<><AdminButton type="button" variant="secondary" onClick={closeDrawer}>Cancel</AdminButton><AdminButton type="submit" accent="indigo">{drawer.saveLabel}</AdminButton></>}
        >
          {drawer.merge ? (
            <div className="grid grid-cols-3 gap-px bg-adminreg-border">
              <div className="bg-adminreg-header px-2.5 py-2 text-[11px] font-bold text-adminreg-muted">Field</div>
              <div className="bg-adminreg-header px-2.5 py-2 text-[11px] font-bold text-adminreg-muted">UHID-0004821</div>
              <div className="bg-adminreg-header px-2.5 py-2 text-[11px] font-bold text-adminreg-muted">UHID-0011932</div>
              {(Object.keys(MERGE_FIELDS) as (keyof typeof MERGE_FIELDS)[]).map((k) => {
                const cfg = MERGE_FIELDS[k]
                const picked = state.mergePick[k]
                return (
                  <Fragment key={k}>
                    <div className="bg-adminreg-card px-2.5 py-2.5 text-xs text-adminreg-muted">{cfg.label}</div>
                    <div onClick={() => setState((prev) => ({ ...prev, mergePick: { ...prev.mergePick, [k]: "A" } }))} className={cn("cursor-pointer px-2.5 py-2.5 text-xs", picked === "A" ? "border-[1.5px] border-adminreg-indigo bg-adminreg-indigo-soft" : "border border-transparent bg-adminreg-card")}>{cfg.a}</div>
                    <div onClick={() => setState((prev) => ({ ...prev, mergePick: { ...prev.mergePick, [k]: "B" } }))} className={cn("cursor-pointer px-2.5 py-2.5 text-xs", picked === "B" ? "border-[1.5px] border-adminreg-indigo bg-adminreg-indigo-soft" : "border border-transparent bg-adminreg-card")}>{cfg.b}</div>
                  </Fragment>
                )
              })}
            </div>
          ) : (
            drawer.fields.map((f) => <AdminFormField {...f} />)
          )}
        </AdminDrawer>
      )}

      {/* Generic modal */}
      {modal && (
        <AdminModal
          open={!!modal}
          onOpenChange={(o) => !o && closeModal()}
          title={modal.title}
          lines={modal.lines}
          badge={modal.badge}
          danger
          accent="indigo"
          confirmLabel={modal.confirmLabel}
          onConfirm={() => modal.onConfirm(modalReason, modalAck)}
        >
          {modal.reasonField && (
            <div className="mt-3">
              <FieldLabel>Reason *</FieldLabel>
              <input value={modalReason} onChange={(e) => setModalReason(e.target.value)} placeholder={modal.reasonPlaceholder} className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo" />
            </div>
          )}
          {modal.heavy && (
            <label className="mt-2.5 flex items-start gap-2 text-xs text-adminreg-text">
              <input type="checkbox" checked={modalAck} onChange={(e) => setModalAck(e.target.checked)} />
              I understand this affects ABDM sync and reports already generated for this visit.
            </label>
          )}
        </AdminModal>
      )}
    </div>
  )
}
