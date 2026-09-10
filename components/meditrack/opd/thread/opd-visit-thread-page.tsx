"use client"

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
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
import { BranchSelect, useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"
import { useGetDepartmentDoctors } from "@/queries/meditrack/opd-booking"
import {
  useCollectFee,
  useFeeCollectionByAppointment,
  useFeeEstimate,
  useLiveQueue,
  useReassignToken,
  useUpdateFeePaymentMethod,
  useUpdateTokenStatus,
  useVoidFeeItem,
  useWaiveFee,
  type FeeItem,
  type OpdFeeCollection,
  type OpdToken as OpdQueueToken,
} from "@/queries/meditrack/opd-fee-token"
import {
  RegistrationConflictError,
  useCreatePatientRegistration,
  usePatientDetail,
  useRegistrationSearch,
  useUpdatePatientRegistration,
  useUploadRegistrationCards,
  type RegistrationSearchResult,
} from "@/queries/meditrack/patient-registration"
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
import { DxOrderPanel } from "@/components/meditrack/opd/shared/DxOrderPanel"
import { RxAddPanel } from "@/components/meditrack/opd/shared/RxAddPanel"
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
// Registration search — driven by api/patients/registration-search.
// ---------------------------------------------------------------------------
type RegOutcome = "idle" | "no-match" | "single" | "multiple"

interface ActiveRegPatient {
  id: string
  name: string
  ageSex: string
  uhid: string
  phone: string
  abha: string
  gender?: string
  dateOfBirth?: string
}

interface NewPatientForm {
  fullName: string
  dob: string
  gender: string
  mobile: string
}

interface PendingCard {
  key: string
  name: string
  file: File | null
}

const EMPTY_NEW_PATIENT: NewPatientForm = { fullName: "", dob: "", gender: "", mobile: "" }

const GENDER_OPTIONS = ["Female", "Male", "Other"]

function normalizeGender(value?: string | null) {
  if (!value) return ""
  const trimmed = value.trim()
  return GENDER_OPTIONS.find((g) => g.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
}

function formatAgeSex(age?: number | null, gender?: string | null) {
  return `${age != null ? age : "—"} / ${gender || "—"}`
}

function formatLastVisit(value?: string | null) {
  if (!value) return "No prior visit on file"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No prior visit on file"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function ageFromDob(value?: string | null) {
  if (!value) return null
  const dob = new Date(value)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
  return age
}

function toIsoDob(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const slash = trimmed.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/)
  if (slash) {
    const dd = slash[1].padStart(2, "0")
    const mm = slash[2].padStart(2, "0")
    const yyyy = slash[3]
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function mapSearchResult(r: RegistrationSearchResult): ActiveRegPatient {
  return {
    id: r.id,
    name: r.name,
    ageSex: formatAgeSex(r.age, r.gender),
    uhid: r.uhid || "—",
    phone: r.phone || "—",
    abha: r.abha || "Not linked",
    gender: r.gender || undefined,
    dateOfBirth: undefined,
  }
}

function newPatientErrors(form: NewPatientForm): Partial<Record<keyof NewPatientForm, string>> {
  const errs: Partial<Record<keyof NewPatientForm, string>> = {}
  if (!form.fullName.trim()) errs.fullName = "Full name is required"
  if (!form.dob.trim()) errs.dob = "Date of birth is required"
  else if (!toIsoDob(form.dob)) errs.dob = "Use YYYY-MM-DD or DD/MM/YYYY"
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
  bannerText: string | null
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
  bannerText: null,
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

// Field *specs* only — the live value/onChange pair is bound at render time
// from `tmp`, otherwise a drawer config stored in state would freeze the
// value it was built with and never reflect typing or prefill.
interface FieldSpec {
  key: string
  label: string
  type: AdminFieldType
  defaultValue?: string
  placeholder?: string
  helper?: string
  options?: { value: string; label: string }[]
}

interface DrawerCfg {
  badge?: { label: string; tone: DrawerBadgeTone }
  title: string
  subtitle?: string
  wide?: boolean
  consequenceNote?: string
  merge?: boolean
  saveLabel: string
  onSave: () => void | Promise<void>
  fields: FieldSpec[]
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
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const s = Number(searchParams.get("stage") ?? 0)
  const from = searchParams.get("from")
  const appointmentId = searchParams.get("appointmentId") || ""
  const editable = isStageEditable(role, s)
  const {
    companyId,
    branchId,
    setBranchId,
    clinicId,
    hasBranch,
    branches,
    isLoadingBranches,
    noBranchMessage,
  } = useBranchScope()
  const selectedBranch = branches.find((b) => b.id === branchId)

  const registrationSearch = useRegistrationSearch()
  const createPatient = useCreatePatientRegistration()
  const updatePatient = useUpdatePatientRegistration()
  const uploadCards = useUploadRegistrationCards()
  const collectFee = useCollectFee()
  const waiveFee = useWaiveFee()
  const voidFeeItem = useVoidFeeItem()
  const updateFeePaymentMethod = useUpdateFeePaymentMethod()
  const updateTokenStatus = useUpdateTokenStatus()
  const reassignToken = useReassignToken()

  const [dismissedDeepLink, setDismissedDeepLink] = useState(false)
  const [state, setState] = useState<ThreadState>(INITIAL_STATE)
  const [tmp, setTmp] = useState<Record<string, string>>({})
  // A drawer's onSave is stored in state, so it would close over the `tmp`
  // snapshot taken when the drawer was opened — read through the ref instead.
  const tmpRef = useRef<Record<string, string>>({})
  useEffect(() => {
    tmpRef.current = tmp
  }, [tmp])
  const [drawer, setDrawer] = useState<DrawerCfg | null>(null)
  const [modal, setModal] = useState<ModalCfg | null>(null)
  const [modalReason, setModalReason] = useState("")
  const [modalAck, setModalAck] = useState(false)

  // Registration (Stage 0) — backend-backed search / register / update.
  const [regOutcome, setRegOutcome] = useState<RegOutcome>("idle")
  const [regQuery, setRegQuery] = useState("")
  const [regResults, setRegResults] = useState<RegistrationSearchResult[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [newPatientOrigin, setNewPatientOrigin] = useState<"search" | "direct">("direct")
  const [newPatientForm, setNewPatientForm] = useState<NewPatientForm>(EMPTY_NEW_PATIENT)
  const [newPatientTouched, setNewPatientTouched] = useState(false)
  const [activePatient, setActivePatient] = useState<ActiveRegPatient | null>(null)
  const [pendingDuplicateConfirm, setPendingDuplicateConfirm] = useState(false)
  const editConfirmDuplicate = useRef(false)

  // ABHA number plus patient cards, shown in the "Visit opened" panel of
  // Stage 0. Cards follow the clinic-license pattern: add a row, name it,
  // attach a file.
  const [abhaNumber, setAbhaNumber] = useState("")
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([])

  // Fee collection (Stage 1) and token / queue (Stage 2) — backend-backed.
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [collection, setCollection] = useState<OpdFeeCollection | null>(null)
  const [pendingWaiverReason, setPendingWaiverReason] = useState<string | null>(null)
  const [locallyVoided, setLocallyVoided] = useState<number[]>([])
  const [activeToken, setActiveToken] = useState<OpdQueueToken | null>(null)
  const [reassignNote, setReassignNote] = useState<{ header: string; body: string } | null>(null)

  // Registration search only returns age/gender, so pull the full record for
  // the selected patient — Edit needs date of birth and the linked ABHA.
  const patientDetail = usePatientDetail(activePatient?.id)

  useEffect(() => {
    const detail = patientDetail.data
    if (!detail) return
    setActivePatient((prev) => {
      if (!prev || prev.id !== detail.id) return prev
      const gender = normalizeGender(detail.gender) || prev.gender
      const dateOfBirth = detail.dateOfBirth || prev.dateOfBirth
      const phone = detail.phone || prev.phone
      const uhid = detail.registrationNumber || prev.uhid
      const abha = detail.abhaNumber || detail.nationalId || prev.abha
      const ageSex = formatAgeSex(ageFromDob(dateOfBirth), gender)
      if (
        prev.gender === gender &&
        prev.dateOfBirth === dateOfBirth &&
        prev.phone === phone &&
        prev.uhid === uhid &&
        prev.abha === abha &&
        prev.ageSex === ageSex
      ) {
        return prev
      }
      return { ...prev, gender, dateOfBirth, phone, uhid, abha, ageSex }
    })
    const linkedAbha = detail.abhaNumber || detail.nationalId
    if (linkedAbha) setAbhaNumber((prev) => prev || linkedAbha)
  }, [patientDetail.data])

  // A fee already collected for this appointment survives a page reload.
  const { data: existingCollection } = useFeeCollectionByAppointment(appointmentId || undefined)

  useEffect(() => {
    if (!existingCollection) return
    setCollection(existingCollection)
    setPaymentMethod(existingCollection.paymentMethod || "Cash")
    if (existingCollection.token) setActiveToken(existingCollection.token)
  }, [existingCollection])

  const { data: feeEstimate } = useFeeEstimate(
    { appointmentId: appointmentId || undefined, patientId: activePatient?.id, clinicId },
    (s === 1 || s === 2) && !collection
  )

  const feeCharges: FeeItem[] = collection?.charges ?? feeEstimate?.charges ?? []
  const payableCharges = feeCharges.filter((c, i) => !c.isVoid && !locallyVoided.includes(i))
  const anyChargeVoided = feeCharges.some((c) => c.isVoid) || locallyVoided.length > 0
  const feeWaived = collection?.isWaived || !!pendingWaiverReason
  const waiverReason = collection?.waiverReason || pendingWaiverReason
  const totalPayable = feeWaived ? 0 : payableCharges.reduce((sum, c) => sum + (c.amount || 0), 0)
  const feeDoctorId = collection?.userId || feeEstimate?.userId || ""
  const feeDepartmentId = collection?.departmentId || feeEstimate?.departmentId || ""
  const feeDepartmentName = collection?.departmentName || feeEstimate?.departmentName || "—"
  const feeDoctorName = collection?.userName || feeEstimate?.userName || "—"

  const tokenCancelled = activeToken?.status === "Cancelled"
  const queueDate = activeToken?.tokenDate
    ? activeToken.tokenDate.slice(0, 10)
    : new Date().toLocaleDateString("en-CA")
  const { data: liveQueue, isLoading: liveQueueLoading } = useLiveQueue(
    {
      clinicId,
      companyId: companyId || undefined,
      date: queueDate,
    },
    s === 2 && !!clinicId
  )
  const missedTokens = liveQueue?.missedTokens ?? []

  const { data: reassignDoctors = [] } = useGetDepartmentDoctors(
    activeToken?.departmentId || undefined,
    clinicId,
    s === 2 && !!activeToken?.departmentId
  )

  const invalidateQueue = () =>
    void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-live-queue"] })

  function addPendingCard() {
    setPendingCards((list) => [...list, { key: `card-${Date.now()}-${list.length}`, name: "", file: null }])
  }

  function updatePendingCard(key: string, patch: Partial<PendingCard>) {
    setPendingCards((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function removePendingCard(key: string) {
    setPendingCards((list) => list.filter((item) => item.key !== key))
  }

  // Day-of check-in hands the appointment's patient over on the URL. Look the
  // patient up through registration-search so Stage 0 shows live record data
  // rather than whatever the booking row happened to carry.
  const checkinPhone = searchParams.get("phone") || ""
  const checkinName = searchParams.get("name") || ""
  const checkinRef = searchParams.get("ref") || ""
  const checkinPrefillDone = useRef(false)

  useEffect(() => {
    if (s !== 0 || checkinPrefillDone.current) return
    const seed = checkinPhone.trim() || checkinName.trim()
    if (seed.length < 3) return
    checkinPrefillDone.current = true
    setRegQuery(seed)
    void runRegistrationSearch({ query: seed, autoSelect: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, checkinPhone, checkinName])

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

  // Consultation (Stage 4) — "Order diagnostics" expands the same DxOrderPanel
  // in place rather than navigating, per the addendum spec.
  const [inlineDxOpen, setInlineDxOpen] = useState(false)

  function fileAdmissionReferral() {
    if (!admitReason.trim()) return
    setDemoReferralState("pending")
  }

  function resetRegSearchUi() {
    setSelectedCandidate(null)
    setShowNewPatientForm(false)
    setPendingDuplicateConfirm(false)
  }

  function clearRegistrationSearch() {
    setRegQuery("")
    setRegResults([])
    setRegOutcome("idle")
    setNewPatientForm(EMPTY_NEW_PATIENT)
    setNewPatientTouched(false)
    resetRegSearchUi()
  }

  function openNewPatientForm(origin: "search" | "direct") {
    setNewPatientOrigin(origin)
    setNewPatientForm({ ...EMPTY_NEW_PATIENT, mobile: origin === "search" ? regQuery : "" })
    setNewPatientTouched(false)
    setPendingDuplicateConfirm(false)
    setShowNewPatientForm(true)
  }

  async function runRegistrationSearch(override?: { query: string; autoSelect?: boolean }) {
    const q = (override?.query ?? regQuery).trim()
    if (q.length < 3) {
      if (!override) {
        toast({ title: "Enter at least 3 characters", description: "Search by UHID, phone, or ABHA.", variant: "destructive" })
      }
      return
    }
    try {
      const data = await registrationSearch.mutateAsync(q)
      setRegResults(data.results)
      setSelectedCandidate(null)
      setShowNewPatientForm(false)
      if (data.matchType === "none" || data.results.length === 0) setRegOutcome("no-match")
      else if (data.results.length === 1) setRegOutcome("single")
      else setRegOutcome("multiple")

      if (override?.autoSelect && data.results.length === 1) {
        const patient = mapSearchResult(data.results[0])
        activatePatient(patient, `Checked in — visit opened for ${patient.name}.`)
        return
      }

      if (override?.autoSelect && data.results.length === 0) {
        // Booked as a walk-in with no patient record yet — carry the booking's
        // name/phone into new-patient capture.
        setNewPatientOrigin("search")
        setNewPatientForm({ ...EMPTY_NEW_PATIENT, fullName: checkinName.trim(), mobile: checkinPhone.trim() })
        setNewPatientTouched(false)
        setShowNewPatientForm(true)
      }
    } catch (err) {
      toast({
        title: "Search failed",
        description: getToastErrorMessage(err, "Could not search patients"),
        variant: "destructive",
      })
    }
  }

  function activatePatient(patient: ActiveRegPatient, banner: string) {
    setActivePatient(patient)
    setAbhaNumber(patient.abha && patient.abha !== "Not linked" ? patient.abha : "")
    setPendingCards([])
    patch({ bannerText: banner })
  }

  async function submitNewPatient(openVisit: boolean, confirmDuplicate = false) {
    setNewPatientTouched(true)
    if (Object.keys(newPatientErrors(newPatientForm)).length > 0) return
    const dob = toIsoDob(newPatientForm.dob)
    if (!dob) return

    try {
      const created = await createPatient.mutateAsync({
        name: newPatientForm.fullName.trim(),
        dateOfBirth: dob,
        gender: newPatientForm.gender.trim(),
        phone: newPatientForm.mobile.trim(),
        confirmDuplicate: confirmDuplicate || pendingDuplicateConfirm,
      })
      const patient: ActiveRegPatient = {
        id: created.id,
        name: created.name,
        ageSex: formatAgeSex(ageFromDob(created.dateOfBirth), created.gender),
        uhid: created.registrationNumber || "Pending UHID",
        phone: created.phone || newPatientForm.mobile.trim(),
        abha: created.abhaNumber || created.nationalId || "Not linked",
        gender: created.gender || undefined,
        dateOfBirth: created.dateOfBirth || dob,
      }
      setShowNewPatientForm(false)
      setPendingDuplicateConfirm(false)
      setRegOutcome("idle")
      setRegResults([])
      activatePatient(patient, openVisit ? `${patient.name} registered — visit opened.` : `${patient.name} registered. No visit opened yet.`)
    } catch (err) {
      if (err instanceof RegistrationConflictError) {
        setPendingDuplicateConfirm(true)
        toast({
          title: "Possible duplicate",
          description: `${err.candidates.length || "Some"} similar patient(s) found. Click again to register anyway, or select an existing match.`,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Could not register patient",
        description: getToastErrorMessage(err, "Registration failed"),
        variant: "destructive",
      })
    }
  }

  async function saveAbhaDetails() {
    if (!activePatient) {
      toast({ title: "No patient selected", description: "Search or register a patient first.", variant: "destructive" })
      return
    }

    const readyCards = pendingCards.filter((c) => c.name.trim() && c.file)
    const incomplete = pendingCards.find((c) => (c.name.trim() && !c.file) || (!c.name.trim() && c.file))
    if (incomplete) {
      toast({
        title: "Card incomplete",
        description: "Each card needs both a name and a file before saving.",
        variant: "destructive",
      })
      return
    }

    try {
      const updated = await updatePatient.mutateAsync({
        id: activePatient.id,
        abhaNumber: abhaNumber.trim() || null,
      })
      if (readyCards.length) {
        await uploadCards.mutateAsync({
          patientId: activePatient.id,
          cards: readyCards.map((c) => ({
            label: c.name.trim(),
            number: /abha/i.test(c.name) ? abhaNumber.trim() || undefined : undefined,
            file: c.file as File,
          })),
        })
        setPendingCards([])
      }
      setActivePatient((prev) =>
        prev
          ? {
              ...prev,
              abha: updated.abhaNumber || updated.nationalId || abhaNumber.trim() || "Not linked",
            }
          : prev
      )
      patch({
        bannerText: readyCards.length
          ? `Saved — ${readyCards.length} card${readyCards.length > 1 ? "s" : ""} uploaded.`
          : "ABHA details saved.",
      })
      toast({
        title: "Saved",
        description: readyCards.length ? "ABHA number and cards uploaded." : "ABHA number updated.",
      })
    } catch (err) {
      toast({
        title: "Could not save ABHA",
        description: getToastErrorMessage(err, "Update failed"),
        variant: "destructive",
      })
    }
  }

  const patch = (p: Partial<ThreadState>) => setState((prev) => ({ ...prev, ...p }))
  const goToStage = (n: number) => {
    // Keep the appointment/patient context across stages — the fee and token
    // calls are built from it.
    const params = new URLSearchParams(searchParams.toString())
    params.set("stage", String(Math.max(0, Math.min(8, n))))
    router.push(`/opd/visit-thread?${params}`)
  }

  function closeDrawer() {
    setDrawer(null)
    tmpRef.current = {}
    setTmp({})
  }
  function closeModal() {
    setModal(null)
  }
  function openDrawer(cfg: DrawerCfg, initial: Record<string, string> = {}) {
    tmpRef.current = initial
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

  function field(
    key: string,
    label: string,
    type: AdminFieldType,
    opts: { default?: string; placeholder?: string; helper?: string; options?: (string | { value: string; label: string })[] } = {}
  ): FieldSpec {
    return {
      key,
      label,
      type,
      defaultValue: opts.default,
      placeholder: opts.placeholder,
      helper: opts.helper,
      options: opts.options?.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
    }
  }

  function toFieldDescriptor(spec: FieldSpec): AdminFieldDescriptor {
    const { defaultValue, key, ...rest } = spec
    return {
      ...rest,
      id: key,
      value: tmp[key] ?? defaultValue ?? "",
      onChange: (v) => setTmp((prev) => ({ ...prev, [key]: v })),
    }
  }

  function badge(label: string): { label: string; tone: DrawerBadgeTone } {
    return { label, tone: MODE_BADGE_TONE[label] ?? "neutral" }
  }

  function handleDrawerSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void drawer?.onSave()
  }

  // ----- derived data -----
  const activeStage = STAGE_DEFS[s]

  const queueRows = (liveQueue?.activeQueue ?? []).map((t) => {
    const isThisVisit = !!activeToken && t.id === activeToken.id
    const cancelled = t.status === "Cancelled"
    const done = t.status === "Completed"
    const doctorLabel = [t.userName, t.departmentName].filter(Boolean).join(" — ")
    const patientLabel = cancelled
      ? `${t.patientName} — CANCELLED`
      : isThisVisit
        ? `${t.patientName} (you)`
        : t.patientName
    return {
      id: t.id,
      token: t.tokenNumber,
      name: doctorLabel ? `${patientLabel} · ${doctorLabel}` : patientLabel,
      wait: cancelled ? "Cancelled" : t.waitTimeLabel,
      className: cancelled || done
        ? SUPERSEDED_CLASS
        : isThisVisit
          ? "text-adminreg-indigo-dark font-extrabold"
          : "text-adminreg-muted",
    }
  })

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
  const openRegEdit = () => {
    if (!activePatient) {
      toast({ title: "No patient selected", description: "Search or register a patient first.", variant: "destructive" })
      return
    }
    if (patientDetail.isLoading) {
      toast({ title: "Loading patient record", description: "Please try again in a moment." })
      return
    }
    const detail = patientDetail.data
    editConfirmDuplicate.current = false
    const currentDob = detail?.dateOfBirth || activePatient.dateOfBirth || ""
    const currentGender = normalizeGender(detail?.gender || activePatient.gender)
    const currentPhone = detail?.phone || (activePatient.phone === "—" ? "" : activePatient.phone)
    openDrawer(
      {
        badge: badge("LIVE EDIT"),
        title: "Edit demographics",
        saveLabel: updatePatient.isPending ? "Saving…" : "Save",
        onSave: async () => {
          const values = tmpRef.current
          const name = values.name?.trim()
          const phone = values.phone?.trim()
          const gender = values.gender?.trim()
          const dob = toIsoDob(values.dob || "")
          if (!name || !phone || !gender || !dob) {
            toast({
              title: "All fields required",
              description: "Name, date of birth, gender and phone must all be filled.",
              variant: "destructive",
            })
            return
          }
          try {
            const updated = await updatePatient.mutateAsync({
              id: activePatient.id,
              name,
              phone,
              gender,
              dateOfBirth: dob,
              confirmDuplicate: editConfirmDuplicate.current,
            })
            const nextDob = updated.dateOfBirth || dob
            const nextGender = updated.gender || gender
            setActivePatient((prev) =>
              prev
                ? {
                    ...prev,
                    name: updated.name || name,
                    phone: updated.phone || phone,
                    uhid: updated.registrationNumber || prev.uhid,
                    abha: updated.abhaNumber || updated.nationalId || prev.abha,
                    gender: nextGender,
                    dateOfBirth: nextDob,
                    ageSex: formatAgeSex(ageFromDob(nextDob), nextGender),
                  }
                : prev
            )
            void queryClient.invalidateQueries({ queryKey: ["meditrack", "patient-detail", activePatient.id] })
            patch({ bannerText: "Demographics updated." })
            closeDrawer()
          } catch (err) {
            if (err instanceof RegistrationConflictError) {
              editConfirmDuplicate.current = true
              toast({
                title: "Possible duplicate",
                description: `${err.candidates.length || "Some"} similar patient(s) found. Save again to apply these changes anyway.`,
                variant: "destructive",
              })
              return
            }
            toast({
              title: "Could not update patient",
              description: getToastErrorMessage(err, "Update failed"),
              variant: "destructive",
            })
          }
        },
        fields: [
          field("name", "Full name", "text"),
          field("dob", "Date of birth", "date"),
          field("gender", "Gender", "select", {
            options: [
              { value: "", label: "Select gender" },
              ...GENDER_OPTIONS,
              ...(currentGender && !GENDER_OPTIONS.includes(currentGender) ? [currentGender] : []),
            ],
          }),
          field("phone", "Phone", "text"),
        ],
      },
      {
        name: detail?.name || activePatient.name,
        dob: currentDob ? currentDob.slice(0, 10) : "",
        gender: currentGender,
        phone: currentPhone,
      }
    )
  }
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

  const openFeeVoid = (charge: FeeItem, index: number) =>
    openModal({
      badge: badge("VOID"),
      title: "Void collected fee?",
      lines: collection
        ? [
            `Receipt ${collection.receiptNumber} has already been printed and cannot be un-issued.`,
            "A credit note will be generated and a refund initiated to the original payment method.",
          ]
        : ["This charge has not been collected yet — it will be dropped from the payable list."],
      reasonField: true,
      reasonPlaceholder: "e.g. Duplicate charge entered in error",
      confirmLabel: "Void fee",
      onConfirm: async (reason: string) => {
        if (!collection) {
          setLocallyVoided((prev) => [...prev, index])
          patch({ bannerText: `${charge.chargeName} removed from the payable list.` })
          closeModal()
          return
        }
        try {
          const updated = await voidFeeItem.mutateAsync({
            id: collection.id,
            itemId: charge.id,
            voidReason: reason?.trim() || "Charge voided",
          })
          setCollection(updated)
          patch({ bannerText: `Charge voided on receipt ${updated.receiptNumber}.` })
          closeModal()
        } catch (err) {
          toast({ title: "Could not void charge", description: getToastErrorMessage(err, "Void failed"), variant: "destructive" })
        }
      },
    })

  const openWaiver = () =>
    openDrawer({
      badge: badge("OVERRIDE"),
      title: "Waive consultation fee",
      saveLabel: "Apply waiver",
      onSave: async () => {
        const reason = tmpRef.current.reason?.trim()
        if (!reason) {
          toast({ title: "Reason required", description: "A waiver bypasses a system rule and must be justified.", variant: "destructive" })
          return
        }
        if (!collection) {
          setPendingWaiverReason(reason)
          patch({ bannerText: "Fee waived — applies when payment is confirmed." })
          closeDrawer()
          return
        }
        try {
          const updated = await waiveFee.mutateAsync({ id: collection.id, waiverReason: reason })
          setCollection(updated)
          setPaymentMethod(updated.paymentMethod || "Waived")
          patch({ bannerText: "Fee waived." })
          closeDrawer()
        } catch (err) {
          toast({ title: "Could not waive fee", description: getToastErrorMessage(err, "Waiver failed"), variant: "destructive" })
        }
      },
      fields: [field("reason", "Reason (required — bypasses system rule)", "textarea", { placeholder: "e.g. Follow-up window expired 2 days ago, approved by shift supervisor" })],
    })

  async function choosePaymentMethod(method: string) {
    setPaymentMethod(method)
    if (!collection) return
    try {
      const updated = await updateFeePaymentMethod.mutateAsync({ id: collection.id, paymentMethod: method })
      setCollection(updated)
    } catch (err) {
      toast({ title: "Could not change payment method", description: getToastErrorMessage(err, "Update failed"), variant: "destructive" })
    }
  }

  async function confirmPaymentAndIssueToken() {
    if (collection) {
      goNext()
      return
    }
    if (!feeDoctorId) {
      toast({
        title: "No consulting doctor on this visit",
        description: "Open the visit from a booked appointment so the doctor is known before collecting the fee.",
        variant: "destructive",
      })
      return
    }
    try {
      const created = await collectFee.mutateAsync({
        appointmentId: appointmentId || null,
        patientId: activePatient?.id || feeEstimate?.patientId || null,
        userId: feeDoctorId,
        departmentId: feeDepartmentId || null,
        clinicId: clinicId || feeEstimate?.clinicId || null,
        paymentMethod,
        isWaived: !!pendingWaiverReason,
        waiverReason: pendingWaiverReason,
        visitType: feeEstimate?.visitType,
        charges: payableCharges.map((c) => ({ tariffId: c.tariffId, chargeName: c.chargeName, amount: c.amount })),
      })
      setCollection(created)
      setPaymentMethod(created.paymentMethod || paymentMethod)
      setLocallyVoided([])
      if (created.token) setActiveToken(created.token)
      invalidateQueue()
      patch({
        bannerText: created.token
          ? `Payment collected — receipt ${created.receiptNumber}. Token ${created.token.tokenNumber} issued.`
          : `Payment collected — receipt ${created.receiptNumber}.`,
      })
      goNext()
    } catch (err) {
      toast({ title: "Could not collect fee", description: getToastErrorMessage(err, "Collection failed"), variant: "destructive" })
    }
  }

  const openReassign = () => {
    if (!activeToken) return
    openDrawer({
      badge: badge("LIVE EDIT"),
      title: "Reassign department / doctor",
      saveLabel: "Reassign",
      onSave: async () => {
        const doctorId = tmpRef.current.doctor
        const reason = tmpRef.current.reason?.trim()
        if (!doctorId) {
          toast({ title: "Select a doctor", description: "Choose who the patient is being moved to.", variant: "destructive" })
          return
        }
        try {
          const updated = await reassignToken.mutateAsync({
            tokenId: activeToken.id,
            newDoctorUserId: doctorId,
            reason: reason || null,
          })
          setActiveToken(updated)
          setReassignNote({
            header: `REASSIGNED · ${ROLE_LABEL[role] ?? "Front desk"}${reason ? ` · Reason: ${reason}` : ""}`,
            body: `Moved to ${updated.departmentName}, ${updated.userName}. New token ${updated.tokenNumber}.`,
          })
          invalidateQueue()
          patch({ bannerText: `Reassigned to ${updated.userName} — new token ${updated.tokenNumber}.` })
          closeDrawer()
        } catch (err) {
          toast({ title: "Could not reassign", description: getToastErrorMessage(err, "Reassign failed"), variant: "destructive" })
        }
      },
      fields: [
        field("doctor", "Doctor", "select", {
          options: [
            { value: "", label: reassignDoctors.length ? "Select doctor" : "No doctors found for this department" },
            ...reassignDoctors.map((d) => ({ value: d.providerId, label: d.providerName })),
          ],
        }),
        field("reason", "Reason", "text", { placeholder: "e.g. Originally booked under wrong department" }),
      ],
    })
  }

  const openTokenVoid = () => {
    if (!activeToken) return
    openModal({
      badge: badge("VOID"),
      title: `Cancel token ${activeToken.tokenNumber}?`,
      lines: ["The slot stays visible in the queue, marked cancelled — not renumbered, so other tokens keep their expected position."],
      reasonField: true,
      reasonPlaceholder: "e.g. Patient left before being called",
      confirmLabel: "Cancel token",
      onConfirm: async (reason: string) => {
        try {
          const updated = await updateTokenStatus.mutateAsync({
            tokenId: activeToken.id,
            status: "Cancelled",
            reason: reason?.trim() || "Cancelled at front desk",
          })
          setActiveToken(updated)
          invalidateQueue()
          patch({ bannerText: `Token ${updated.tokenNumber} cancelled.` })
          closeModal()
        } catch (err) {
          toast({ title: "Could not cancel token", description: getToastErrorMessage(err, "Cancel failed"), variant: "destructive" })
        }
      },
    })
  }

  async function requeueToken(target: OpdQueueToken) {
    try {
      const updated = await updateTokenStatus.mutateAsync({
        tokenId: target.id,
        status: "Waiting",
        reason: "Re-queued at front desk",
      })
      invalidateQueue()
      patch({ bannerText: `${updated.patientName} re-queued as token ${updated.tokenNumber}.` })
    } catch (err) {
      toast({ title: "Could not re-queue", description: getToastErrorMessage(err, "Re-queue failed"), variant: "destructive" })
    }
  }

  async function callInPatient() {
    if (activeToken && activeToken.status !== "InConsultation" && activeToken.status !== "Cancelled") {
      try {
        const updated = await updateTokenStatus.mutateAsync({ tokenId: activeToken.id, status: "InConsultation" })
        setActiveToken(updated)
        invalidateQueue()
      } catch (err) {
        toast({ title: "Could not call in patient", description: getToastErrorMessage(err, "Update failed"), variant: "destructive" })
        return
      }
    }
    goNext()
  }

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
        <BranchSelect
          value={branchId}
          onValueChange={setBranchId}
          branches={branches}
          isLoading={isLoadingBranches}
        />
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
                  <span className="font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-muted">
                    {regOutcome === "idle" && "Pre-search"}
                    {regOutcome === "no-match" && "No match"}
                    {regOutcome === "single" && "1 match"}
                    {regOutcome === "multiple" && `${regResults.length} matches`}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    value={regQuery}
                    onChange={(e) => setRegQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editable) {
                        e.preventDefault()
                        void runRegistrationSearch()
                      }
                    }}
                    placeholder="UHID, phone number, or ABHA number"
                    disabled={!editable}
                    className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                  />
                  {editable && (
                    <AdminButton type="button" onClick={() => void runRegistrationSearch()} className="flex-shrink-0" disabled={registrationSearch.isPending}>
                      {registrationSearch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </AdminButton>
                  )}
                  {editable && (regQuery || regOutcome !== "idle" || showNewPatientForm) && (
                    <AdminButton type="button" variant="secondary" onClick={clearRegistrationSearch} className="flex-shrink-0">
                      Clear
                    </AdminButton>
                  )}
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
                    {pendingDuplicateConfirm && (
                      <div className="mb-3 border border-adminreg-amber bg-adminreg-amber-soft px-3 py-2 text-xs text-adminreg-amber-text">
                        Similar patient(s) found. Click register again to confirm create anyway.
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
                          type="date"
                          value={newPatientForm.dob}
                          onChange={(e) => setNewPatientForm((f) => ({ ...f, dob: e.target.value }))}
                          className={cn(
                            "w-full border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo",
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
                        <select
                          value={newPatientForm.gender}
                          onChange={(e) => setNewPatientForm((f) => ({ ...f, gender: e.target.value }))}
                          className={cn(
                            "w-full border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo",
                            newPatientTouched && newPatientErrors(newPatientForm).gender ? "border-adminreg-red" : "border-adminreg-border",
                            !newPatientForm.gender && "text-adminreg-muted2"
                          )}
                        >
                          <option value="">Select gender</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
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
                      <AdminButton type="button" accent="indigo" onClick={() => void submitNewPatient(true)} disabled={createPatient.isPending}>
                        {createPatient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {pendingDuplicateConfirm ? "Confirm duplicate & open visit" : "Register and open visit"}
                      </AdminButton>
                      <AdminButton type="button" variant="secondary" onClick={() => void submitNewPatient(false)} disabled={createPatient.isPending}>
                        Save without opening a visit
                      </AdminButton>
                      <button
                        type="button"
                        onClick={clearRegistrationSearch}
                        disabled={createPatient.isPending}
                        className="self-center text-[11px] text-adminreg-muted underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
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
                      Query &quot;{regQuery}&quot; · {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <p className="mt-2 text-xs text-adminreg-indigo-dark">No existing record, so nothing can be attached to the wrong UHID here. Continue into new-patient capture below.</p>
                    {editable && <AdminButton type="button" accent="indigo" className="mt-2.5" onClick={() => openNewPatientForm("search")}>Continue to new-patient capture</AdminButton>}
                  </div>
                ) : regOutcome === "single" || (regOutcome === "multiple" && selectedCandidate !== null) ? (
                  (() => {
                    const candidate = regOutcome === "single" ? regResults[0] : regResults[selectedCandidate!]
                    if (!candidate) return null
                    const matched = (candidate.matchedOn || []).join(", ") || "query"
                    return (
                      <div className="mt-3.5 border-t-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3.5">
                        {regOutcome === "multiple" && (
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-olive-dark">Selected from {regResults.length} candidates</span>
                            <span onClick={() => setSelectedCandidate(null)} className="cursor-pointer text-[11px] text-adminreg-olive-dark underline">← Back to the list</span>
                          </div>
                        )}
                        <div className="mb-1.5 text-sm font-bold text-adminreg-olive-dark">{candidate.name}</div>
                        <div className="grid grid-cols-2 gap-2.5 text-xs text-adminreg-text">
                          <div><FieldLabel>Age / Sex</FieldLabel><FieldValue>{formatAgeSex(candidate.age, candidate.gender)}</FieldValue></div>
                          <div><FieldLabel>UHID</FieldLabel><FieldValue>{candidate.uhid || "—"}</FieldValue></div>
                          <div><FieldLabel>Phone</FieldLabel><FieldValue>{candidate.phone || "—"}</FieldValue></div>
                          <div><FieldLabel>ABHA</FieldLabel><FieldValue>{candidate.abha || "Not linked"}</FieldValue></div>
                        </div>
                        <div className="mt-2.5 border-t border-adminreg-olive/30 pt-2.5 text-xs text-adminreg-olive-dark">
                          Last seen {formatLastVisit(candidate.lastVisitDate)} · matched on {matched}
                        </div>
                        <p className="mt-2.5 text-[11px] text-adminreg-muted">Confirm identity with the patient — name and age spoken back, not just read out — before a visit is created against this UHID.</p>
                        {editable && (
                          <div className="mt-2.5 flex items-center gap-3">
                            <AdminButton
                              type="button"
                              accent="indigo"
                              onClick={() => activatePatient(mapSearchResult(candidate), `Visit opened for ${candidate.name}.`)}
                            >
                              Confirm &amp; open visit
                            </AdminButton>
                            <span
                              onClick={() => {
                                setRegOutcome("idle")
                                resetRegSearchUi()
                                setRegResults([])
                              }}
                              className="cursor-pointer text-[11px] text-adminreg-indigo underline"
                            >
                              Not this person? Refine search
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <div className="mt-3.5 border border-adminreg-amber bg-adminreg-amber-soft p-3.5">
                    <div className="mb-2 text-xs font-bold text-adminreg-amber-text">{regResults.length} records match — select the right person</div>
                    <p className="mb-2.5 text-[11px] text-adminreg-amber-text">Check age and last visit against the person standing at the desk before selecting.</p>
                    <div className="space-y-2">
                      {regResults.map((c, i) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 border border-adminreg-border bg-adminreg-card px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-adminreg-text">{c.name} <span className="font-plexmono text-[10px] font-normal text-adminreg-muted">— {c.uhid || "no UHID"}</span></div>
                            <div className="text-[11px] text-adminreg-muted">{formatAgeSex(c.age, c.gender)} · last visit {formatLastVisit(c.lastVisitDate)}</div>
                            <div className="text-[11px] italic text-adminreg-muted">Matched on {(c.matchedOn || []).join(", ") || "query"}</div>
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
                  {editable && activePatient && (
                    <div className="flex gap-3">
                      <LinkAction tone="edit" onClick={openRegEdit}>Edit</LinkAction>
                      <LinkAction tone="void" onClick={openVisitVoid}>Cancel visit</LinkAction>
                    </div>
                  )}
                </div>
                {activePatient ? (
                  <>
                    <div className="my-2.5 grid grid-cols-2 gap-2.5">
                      <div><FieldLabel>Full name</FieldLabel><FieldValue>{activePatient.name}</FieldValue></div>
                      <div><FieldLabel>Age / Sex</FieldLabel><FieldValue>{activePatient.ageSex}</FieldValue></div>
                      <div><FieldLabel>Phone</FieldLabel><FieldValue>{activePatient.phone}</FieldValue></div>
                      <div><FieldLabel>UHID</FieldLabel><FieldValue>{activePatient.uhid}</FieldValue></div>
                      {checkinRef && (
                        <div className="col-span-2">
                          <FieldLabel>Checked in from appointment</FieldLabel>
                          <FieldValue>{checkinRef}</FieldValue>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 border-t border-adminreg-divider pt-3">
                      <FieldLabel>ABHA (Ayushman Bharat Health Account)</FieldLabel>
                      <input
                        value={abhaNumber}
                        onChange={(e) => setAbhaNumber(e.target.value)}
                        placeholder="Ayushman health account no."
                        disabled={!editable}
                        className="mt-1.5 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                      />

                      <div className="mt-3.5 flex items-center justify-between gap-2">
                        <div>
                          <FieldLabel>Cards</FieldLabel>
                          <p className="mt-0.5 text-[11px] text-adminreg-muted">PDF or image · name each card</p>
                        </div>
                        {editable && (
                          <AdminButton type="button" variant="secondary" onClick={addPendingCard}>
                            <Plus className="h-3.5 w-3.5" />
                            Add card
                          </AdminButton>
                        )}
                      </div>

                      {pendingCards.length === 0 ? (
                        <p className="mt-2 text-[11px] text-adminreg-muted">
                          No cards attached yet. Use Add card to attach an ABHA or insurance card.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {pendingCards.map((card) => (
                            <div key={card.key} className="border border-adminreg-border bg-adminreg-bg p-2.5">
                              <div className="flex items-end gap-2">
                                <div className="min-w-0 flex-1">
                                  <FieldLabel>Card name</FieldLabel>
                                  <input
                                    value={card.name}
                                    onChange={(e) => updatePendingCard(card.key, { name: e.target.value })}
                                    placeholder="e.g. ABHA Card"
                                    disabled={!editable}
                                    className="mt-1 w-full border border-adminreg-border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <FieldLabel>Upload</FieldLabel>
                                  <label
                                    className={cn(
                                      "mt-1 flex h-[38px] cursor-pointer items-center gap-2 border border-dashed border-adminreg-border bg-adminreg-card px-2.5 text-sm text-adminreg-muted hover:text-adminreg-text",
                                      !editable && "pointer-events-none opacity-60"
                                    )}
                                  >
                                    <Upload className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{card.file ? card.file.name : "Choose PDF or image…"}</span>
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      disabled={!editable}
                                      className="hidden"
                                      onChange={(e) => updatePendingCard(card.key, { file: e.target.files?.[0] ?? null })}
                                    />
                                  </label>
                                </div>
                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() => removePendingCard(card.key)}
                                    className="mb-2.5 flex-shrink-0 text-adminreg-muted hover:text-adminreg-red-text"
                                    aria-label="Remove card"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {editable && (
                        <AdminButton
                          type="button"
                          variant="secondary"
                          className="mt-2.5"
                          onClick={() => void saveAbhaDetails()}
                          disabled={updatePatient.isPending || uploadCards.isPending}
                        >
                          {(updatePatient.isPending || uploadCards.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save ABHA &amp; cards
                        </AdminButton>
                      )}
                    </div>
                    {editable && (
                      <AdminButton type="button" accent="indigo" className="mt-4" onClick={goNext}>
                        Open visit → Fee collection
                      </AdminButton>
                    )}
                  </>
                ) : (
                  <div className="mt-3.5 border border-dashed border-adminreg-border bg-adminreg-bg p-5 text-center">
                    <p className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">No patient selected</p>
                    <p className="mt-1.5 text-xs text-adminreg-muted">Search and confirm an existing patient, or register a new one to open the visit panel.</p>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {s === 1 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="border border-adminreg-border bg-adminreg-card">
                <div className="grid grid-cols-[1.6fr_1fr_90px] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Charge</span><span>Amount (₹)</span><span /></div>
                {feeCharges.length === 0 && (
                  <div className="border-t border-adminreg-divider px-4 py-2.5 text-sm text-adminreg-muted">
                    No charges to collect for this visit yet.
                  </div>
                )}
                {feeCharges.map((charge, index) => {
                  const voided = charge.isVoid || locallyVoided.includes(index)
                  return (
                    <div key={charge.id || `${charge.chargeName}-${index}`} className="grid grid-cols-[1.6fr_1fr_90px] items-center border-t border-adminreg-divider px-4 py-2.5 text-sm">
                      <span className={voided ? SUPERSEDED_CLASS : ""}>{charge.chargeName} {voided && <SupersededTag />}</span>
                      <span className={cn("font-plexmono", voided && SUPERSEDED_CLASS)}>{charge.amount}</span>
                      {editable && !voided && <LinkAction tone="void" onClick={() => openFeeVoid(charge, index)}>Void</LinkAction>}
                    </div>
                  )
                })}
                {anyChargeVoided && collection && (
                  <div className="border-t border-adminreg-divider px-4 py-2.5 text-[11px] text-adminreg-amber-text">
                    Receipt {collection.receiptNumber} already printed and cannot be un-issued. A credit note is generated; refund initiated to the original payment method.
                  </div>
                )}
                <div className="grid grid-cols-[1.6fr_1fr_90px] border-t border-adminreg-divider bg-adminreg-header px-4 py-2.5 text-sm font-bold"><span>Total payable</span><span className="font-plexmono">₹{totalPayable}</span><span /></div>
              </div>
              <Panel>
                <SectionLabel>Payment method</SectionLabel>
                <div className="mb-3.5 flex flex-wrap gap-2">
                  {(feeEstimate?.availablePaymentMethods?.length ? feeEstimate.availablePaymentMethods : ["Cash", "UPI", "Card", "Cashless / TPA"]).map((m) => {
                    const active = paymentMethod === m
                    return (
                      <button key={m} type="button" disabled={!editable} onClick={() => void choosePaymentMethod(m)} className={cn("px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60", active ? "border-[1.5px] border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border border-adminreg-border bg-adminreg-bg text-adminreg-muted")}>
                        {m}
                      </button>
                    )
                  })}
                </div>
                <p className="mb-3.5 text-[11px] text-adminreg-muted">Switching method before the visit proceeds is a live edit — no reason required.</p>
                {paymentMethod === "Cashless / TPA" && <div className="mb-3.5"><InlineWarning>Cashless pre-authorization pending. Confirm approval or collect out-of-pocket before issuing the token.</InlineWarning></div>}
                {editable && <AdminButton type="button" variant="secondary" className="mb-3.5" onClick={openWaiver} disabled={waiveFee.isPending}>Override — waive fee</AdminButton>}
                {feeWaived && (
                  <AddendumNote header={`OVERRIDE · ${ROLE_LABEL[role] ?? "Front desk"}${waiverReason ? ` · Reason: ${waiverReason}` : ""}`}>Fee waived — nothing to collect for this visit.</AddendumNote>
                )}
                {collection && (
                  <p className="mt-3.5 text-[11px] text-adminreg-muted">
                    Receipt {collection.receiptNumber} · ₹{collection.amountPaid} {collection.paymentStatus?.toLowerCase()} via {collection.paymentMethod}
                    {collection.token ? ` · token ${collection.token.tokenNumber}` : ""}
                  </p>
                )}
                {editable && (
                  <AdminButton type="button" accent="indigo" className="mt-4" onClick={() => void confirmPaymentAndIssueToken()} disabled={collectFee.isPending}>
                    {collectFee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {collection ? "Continue → Token & queue" : "Confirm payment → Assign token"}
                  </AdminButton>
                )}
              </Panel>
            </div>
          )}

          {s === 2 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Panel>
                <div className="flex justify-between"><SectionLabel>Assignment</SectionLabel>{editable && activeToken && <LinkAction tone="edit" onClick={openReassign}>Reassign</LinkAction>}</div>
                <FieldLabel>Department</FieldLabel><div className="mb-2.5"><FieldValue>{activeToken?.departmentName || feeDepartmentName}</FieldValue></div>
                <FieldLabel>Doctor</FieldLabel><div className="mb-2.5"><FieldValue>{activeToken?.userName || feeDoctorName}</FieldValue></div>
                {reassignNote && <AddendumNote header={reassignNote.header}>{reassignNote.body}</AddendumNote>}
                <div className="mt-2.5"><FieldLabel>Visit type</FieldLabel></div>
                <div className="mb-3.5 mt-1.5 flex gap-2">
                  {["Walk-in", "Pre-booked"].map((type) => {
                    const active = (activeToken?.visitType || feeEstimate?.visitType || "Walk-in") === type
                    return (
                      <span key={type} className={cn("px-3 py-1.5 text-xs", active ? "border-[1.5px] border-adminreg-indigo bg-adminreg-indigo-soft font-bold text-adminreg-indigo-dark" : "border border-adminreg-border bg-adminreg-bg font-semibold text-adminreg-muted")}>
                        {type}
                      </span>
                    )
                  })}
                </div>
                <div className="bg-adminreg-sidebar px-4 py-4 text-center text-adminreg-card">
                  <div className="font-plexmono text-[10px] tracking-[0.05em] text-adminreg-sidebar-text-muted">TOKEN</div>
                  <div className={cn("mt-1 font-plexmono text-[34px] font-bold", tokenCancelled && "opacity-50 line-through")}>{activeToken?.tokenNumber || "—"}</div>
                </div>
                {editable && activeToken && !tokenCancelled && <button type="button" onClick={openTokenVoid} className="mt-2.5 block text-[11px] text-adminreg-amber-text underline">Cancel token</button>}
              </Panel>
              <Panel>
                {liveQueue?.statusAlertMessage && <div className="mb-3.5"><InlineWarning>⚠ {liveQueue.statusAlertMessage}</InlineWarning></div>}
                <SectionLabel>
                  Live queue
                  {selectedBranch?.name
                    ? ` — ${selectedBranch.name}`
                    : liveQueue?.departmentName
                      ? ` — ${liveQueue.departmentName}`
                      : " — all tokens today"}
                </SectionLabel>
                {!hasBranch && (
                  <p className="border-t border-adminreg-divider py-2.5 text-sm text-adminreg-red">{noBranchMessage}</p>
                )}
                {hasBranch && liveQueueLoading && (
                  <p className="border-t border-adminreg-divider py-2.5 text-sm text-adminreg-muted">Loading queue…</p>
                )}
                {hasBranch && !liveQueueLoading && queueRows.length === 0 && (
                  <p className="border-t border-adminreg-divider py-2.5 text-sm text-adminreg-muted">No patients in the queue right now.</p>
                )}
                {queueRows.map((q) => (
                  <div key={q.id} className="flex items-center justify-between border-t border-adminreg-divider py-2.5">
                    <span className={cn("font-plexmono font-bold", q.className)}>{q.token}</span>
                    <span className={cn("ml-3.5 flex-1 text-sm", q.className)}>{q.name}</span>
                    <span className="text-[11px] text-adminreg-muted">{q.wait}</span>
                  </div>
                ))}
                <p className="mt-2.5 text-[11px] text-adminreg-muted">Cancelled tokens keep their slot marked, not renumbered — patients tracking their token number by ear shouldn&apos;t see numbers shift under them.</p>
                {missedTokens.map((missed) => (
                  <div key={missed.id} className="mt-2 flex items-center justify-between border-t border-dashed border-adminreg-border py-2.5">
                    <span className="text-sm text-adminreg-amber-text">{missed.tokenNumber} — {missed.patientName} — {missed.missedReason || "did not respond when called"}</span>
                    {editable && <AdminButton type="button" variant="secondary" onClick={() => void requeueToken(missed)} disabled={updateTokenStatus.isPending}>Re-queue</AdminButton>}
                  </div>
                ))}
                {editable && (
                  <AdminButton type="button" accent="indigo" className="mt-4" onClick={() => void callInPatient()} disabled={updateTokenStatus.isPending}>
                    Called in → Vitals &amp; triage
                  </AdminButton>
                )}
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
                {/* {editable && <AdminButton type="button" variant="secondary" className="mt-3" onClick={openAddendum}>+ Add addendum</AdminButton>} */}

                {editable && (
                  <>
                    <div className="mt-5"><SectionLabel>Next step</SectionLabel></div>
                    <div className="mb-3.5 flex flex-wrap gap-2">
                      <AdminButton type="button" accent="indigo" onClick={() => setInlineDxOpen((v) => !v)}>{inlineDxOpen ? "Close diagnostics order" : "Order diagnostics"}</AdminButton>
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
                {editable && inlineDxOpen && (
                  <div className="mb-3.5">
                    <DxOrderPanel
                      editable={editable}
                      compact
                      visitId={PATIENT.visitId}
                      patientLabel={`${PATIENT.name} · ${PATIENT.ageSex}`}
                      orderingDoctor="Dr. Anjali Nair · Cardiology"
                    />
                  </div>
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
              <div className="space-y-6">
              <DxOrderPanel
                editable={editable}
                visitId={PATIENT.visitId}
                patientLabel={`${PATIENT.name} · ${PATIENT.ageSex}`}
                orderingDoctor="Dr. Anjali Nair · Cardiology"
              />
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
              </div>
            )
          )}

          {s === 6 && (
            <div className="space-y-4">
              <RxAddPanel
                editable={editable}
                prescriberReg="MCI/KA-2011-44821"
                prescriberName="Dr. Anjali Nair"
                existingDrugs={rx.map((r) => r.drug)}
              />
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
            drawer.fields.map((f) => <AdminFormField key={f.key} {...toFieldDescriptor(f)} />)
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
