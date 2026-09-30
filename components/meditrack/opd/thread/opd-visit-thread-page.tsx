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
import { ROLE_LABEL, firstVisibleStage, isStageEditable, isStageVisible } from "@/components/meditrack/layout/register/rbac"
import { BranchSelect, useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGetDepartmentDoctors } from "@/queries/meditrack/opd-booking"
import { useGetMediTrackUserById } from "@/queries/meditrack/users"
import {
  useCollectFee,
  useFeeCollectionByAppointment,
  useFeeEstimate,
  useLiveQueue,
  useReassignToken,
  useUpdateFeePaymentMethod,
  useUpdateTokenStatus,
  useVoidFeeItem,
  createRazorpayOrder,
  isRazorpayMethod,
  openRazorpayCheckout,
  verifyRazorpayPayment,
  type FeeItem,
  type OpdFeeCollection,
  type OpdToken as OpdQueueToken,
} from "@/queries/meditrack/opd-fee-token"
import {
  diagnosticVisitKey,
  isGuid,
  useAmendDiagnosticResult,
  useDiagnosticVisit,
  useUpdateDiagnosticOrder,
  useVoidDiagnosticOrder,
  type DiagnosticOrder,
} from "@/queries/meditrack/opd-diagnostics"
import {
  RegistrationConflictError,
  useCreatePatientRegistration,
  usePatientDetail,
  useRegistrationSearch,
  useUpdatePatientRegistration,
  useUploadRegistrationCards,
  type RegistrationSearchResult,
} from "@/queries/meditrack/patient-registration"
import { useGetPatientFiles, type PatientFileItem } from "@/queries/patientFiles/get-patient-files"
import { useOpdVitals, useSaveOpdVitals } from "@/queries/meditrack/opd-vitals"
import {
  usePrescriptionVisit,
  useSendPrescriptionToPharmacy,
} from "@/queries/meditrack/opd-prescription"
import {
  useDispenseAndBill,
  usePharmacyVisitOrder,
  useReturnPharmacyMedicine,
  useVoidPharmacyBill,
} from "@/queries/meditrack/opd-pharmacy"
import {
  useAmendConsultationNote,
  useConsultationAmendments,
  useConsultationContext,
  useConsultationNote,
  useCreateConsultationNote,
} from "@/queries/meditrack/opd-consultation"
import {
  admissionReferralByVisitKey,
  useCreateAdmissionReferral,
  useGetAdmissionReferralByVisit,
} from "@/queries/meditrack/opd-admission-referral"
import {
  useCloseVisit,
  useCollectVisitBalance,
  useGetVisitBalance,
  useGetVisitClosureStatus,
  useOverrideVisitBalance,
  useReopenVisit,
} from "@/queries/meditrack/opd-visit-closure"
import { getUserId } from "@/utils/clientCookie"
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

const REFERRAL_STATE_BADGE: Record<string, string> = {
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

function formatPharmacyRupees(value: number, withPaise = false) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: withPaise ? 2 : 0,
    maximumFractionDigits: withPaise ? 2 : 0,
  })}`
}

function toPharmacyPaymentMethod(method?: string | null) {
  const value = (method || "Cash").toLowerCase()
  if (value.includes("upi")) return "UPI"
  if (value.includes("card")) return "Card"
  if (value.includes("tpa") || value.includes("cashless") || value.includes("insurance")) return "Insurance"
  return "Cash"
}

function collectedHeading(source: string, description: string, department?: string | null) {
  const kind = source.toLowerCase()
  if (kind.includes("consult")) {
    const base = description || "Specialist consultation"
    return department && department !== "—" ? `${base} — ${department}` : base
  }
  if (kind.includes("pharm")) return (description || "Pharmacy").replace(/item\(s\)/i, "items")
  return description || source
}

function collectedCaption(source: string, paymentMethod?: string | null, receiptNumber?: string | null) {
  const kind = source.toLowerCase()
  const when = kind.includes("consult")
    ? "Collected at check-in"
    : kind.includes("pharm")
      ? "Collected at dispensing"
      : "Collected at closure"
  const document = receiptNumber
    ? `${kind.includes("pharm") ? "invoice" : "receipt"} ${receiptNumber}`
    : null
  return [when, paymentMethod, document].filter(Boolean).join(" · ")
}

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

interface SavedCardView {
  id: string
  name: string
  fileName: string
  filePath: string
  fileType: string
  file?: File | null
}

const EMPTY_NEW_PATIENT: NewPatientForm = { fullName: "", dob: "", gender: "", mobile: "" }

function fileAttachments(file: PatientFileItem) {
  const record = file as PatientFileItem & { Attachments?: PatientFileItem["attachments"] }
  const raw = record.attachments ?? record.Attachments ?? []
  return Array.isArray(raw) ? raw : []
}

function firstAttachmentMeta(file: PatientFileItem) {
  const raw = fileAttachments(file)[0] as unknown as Record<string, string | undefined> | undefined
  return {
    fileName: raw?.fileName || raw?.FileName || "Card",
    filePath: raw?.filePath || raw?.FilePath || "",
    fileType: raw?.fileType || raw?.FileType || "",
  }
}

const EMPTY_VITALS_DRAFT = {
  bloodPressure: "",
  pulse: "",
  spo2: "",
  tempF: "",
  weightKg: "",
}

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "unknown", label: "Other" },
] as const

function toApiGender(value?: string | null) {
  if (!value) return ""
  const g = value.trim().toLowerCase()
  if (g === "male" || g === "m") return "male"
  if (g === "female" || g === "f") return "female"
  if (g === "other" || g === "unknown" || g === "o") return "unknown"
  return ""
}

function genderLabel(value?: string | null) {
  const g = toApiGender(value)
  return GENDER_OPTIONS.find((o) => o.value === g)?.label || value || ""
}

function normalizeGender(value?: string | null) {
  return toApiGender(value)
}

function formatAgeSex(age?: number | null, gender?: string | null) {
  return `${age != null ? age : "—"} / ${genderLabel(gender) || "—"}`
}

function celsiusToFahrenheit(c?: number | null) {
  if (c == null || Number.isNaN(Number(c))) return ""
  return String(Math.round(((Number(c) * 9) / 5 + 32) * 10) / 10)
}

function formatVitalsHistorySummary(v: {
  bloodPressure?: string | null
  heartRateBpm?: number | null
  temperatureC?: number | null
  spo2?: number | null
  weightKg?: number | null
}) {
  const parts: string[] = []
  if (v.bloodPressure?.trim()) parts.push(`BP ${v.bloodPressure.trim()}`)
  if (v.heartRateBpm != null) parts.push(`Pulse ${v.heartRateBpm} bpm`)
  const tempF = celsiusToFahrenheit(v.temperatureC)
  if (tempF) parts.push(`Temp ${tempF}°F`)
  if (v.spo2 != null) parts.push(`SpO2 ${v.spo2}%`)
  if (v.weightKg != null) parts.push(`Weight ${v.weightKg} kg`)
  return parts.join(" · ")
}

function fahrenheitToCelsius(value: string): number | null {
  const n = Number(value)
  if (!value.trim() || Number.isNaN(n)) return null
  return Math.round((((n - 32) * 5) / 9) * 10) / 10
}

function parseOptionalNumber(value: string): number | null {
  const n = Number(value)
  if (!value.trim() || Number.isNaN(n)) return null
  return n
}

function isBpCritical(bp?: string | null) {
  if (!bp) return false
  const parts = bp.split("/")
  if (parts.length !== 2) return false
  const sys = Number(parts[0].trim())
  const dia = Number(parts[1].trim())
  if (Number.isNaN(sys) || Number.isNaN(dia)) return false
  return sys < 100 || sys > 150 || dia < 60 || dia > 100
}

function isPulseCritical(n?: number | null) {
  return n != null && (n < 60 || n > 100)
}

function isTempCCritical(c?: number | null) {
  return c != null && (c < 35 || c > 38)
}

function isSpo2Critical(n?: number | null) {
  return n != null && n < 92
}

function formatLastVisit(value?: string | null) {
  if (!value) return "No prior visit on file"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No prior visit on file"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function formatConsultWhen(value?: string | null, withTime = false) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return `Today ${time}`
  if (withTime) {
    return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${time}`
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function referralStatusLabel(status?: string | null) {
  const key = (status || "pending").toLowerCase()
  return REFERRAL_STATE_BADGE[key] || REFERRAL_STATE_BADGE.pending
}

function fallbackReferralTimeline(
  status?: string | null,
  createdAt?: string | null,
  bedAssignment?: string | null
) {
  const s = (status || "pending").toLowerCase()
  const picked = s === "processing" || s === "admitted"
  const admitted = s === "admitted"
  return [
    {
      step: "filed",
      label: "Referral filed by doctor",
      completed: true,
      timestamp: createdAt || null,
      detail: "Reason and carried-over context sent to the admission desk.",
    },
    {
      step: "picked-up",
      label: "Picked up by admission desk",
      completed: picked,
      timestamp: null as string | null,
      detail: picked
        ? "Admission desk opened the referral and is completing Stage 1."
        : "Waiting. Sitting on the IPD referral worklist, unclaimed.",
    },
    {
      step: "admitted",
      label: "Admission order generated",
      completed: admitted,
      timestamp: null as string | null,
      detail: admitted
        ? bedAssignment
          ? `Bed ${bedAssignment}. The stay is live in IPD.`
          : "The stay is live in IPD."
        : "Pending — no bed committed yet.",
    },
  ]
}

function consultationNoteBody(note?: {
  physicalExamFindings?: string | null
  diagnosis?: string | null
  treatmentPlan?: string | null
} | null) {
  if (!note) return ""
  return [note.physicalExamFindings, note.diagnosis, note.treatmentPlan]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
}

function consultationDoctorLabel(note?: {
  doctorName?: string | null
  veterinarian?: { firstName?: string; lastName?: string } | null
} | null) {
  const nested = [note?.veterinarian?.firstName, note?.veterinarian?.lastName].filter(Boolean).join(" ").trim()
  return note?.doctorName?.trim() || nested || ""
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

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  const iso = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : ""
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
  cancelLabel?: string
  danger?: boolean
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

  useEffect(() => {
    if (isStageVisible(role, s)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("stage", String(firstVisibleStage(role)))
    router.replace(`/opd/visit-thread?${params.toString()}`)
  }, [role, s, router, searchParams])
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
  const [razorpayPending, setRazorpayPending] = useState(false)
  const voidFeeItem = useVoidFeeItem()
  const updateFeePaymentMethod = useUpdateFeePaymentMethod()
  const updateTokenStatus = useUpdateTokenStatus()
  const reassignToken = useReassignToken()
  const saveOpdVitals = useSaveOpdVitals()
  const [chiefComplaint, setChiefComplaint] = useState("")
  const [vitalsDraft, setVitalsDraft] = useState(EMPTY_VITALS_DRAFT)
  const [editingVitalKey, setEditingVitalKey] = useState<string | null>(null)
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

  // Registration (Stage 0) — backend-backed search / register / update 
  const [regOutcome, setRegOutcome] = useState<RegOutcome>("idle")
  const [regQuery, setRegQuery] = useState("")
  const [regResults, setRegResults] = useState<RegistrationSearchResult[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [newPatientOrigin, setNewPatientOrigin] = useState<"search" | "direct">("direct")
  const [newPatientForm, setNewPatientForm] = useState<NewPatientForm>(EMPTY_NEW_PATIENT)
  const [newPatientTouched, setNewPatientTouched] = useState(false)
  const [completingPatient, setCompletingPatient] = useState<RegistrationSearchResult | null>(null)
  const completingPrefillId = useRef<string | null>(null)
  const [activePatient, setActivePatient] = useState<ActiveRegPatient | null>(null)
  const [pendingDuplicateConfirm, setPendingDuplicateConfirm] = useState(false)
  const editConfirmDuplicate = useRef(false)

  // ABHA number plus patient cards, shown in the "Visit opened" panel of
  // Stage 0. Cards follow the clinic-license pattern: add a row, name it,
  // attach a file.
  const [abhaNumber, setAbhaNumber] = useState("")
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([])
  const [justSavedCards, setJustSavedCards] = useState<SavedCardView[]>([])
  const [cardPreview, setCardPreview] = useState<{ name: string; url: string; type: string } | null>(null)

  // Fee collection (Stage 1) and token / queue (Stage 2) — backend-backed.
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [closurePayMethod, setClosurePayMethod] = useState("Cash")
  const [collection, setCollection] = useState<OpdFeeCollection | null>(null)
  const [locallyVoided, setLocallyVoided] = useState<number[]>([])
  const [activeToken, setActiveToken] = useState<OpdQueueToken | null>(null)
  const [reassignNote, setReassignNote] = useState<{ header: string; body: string } | null>(null)

  // Full record for Edit after the visit is open, and to prefill DOB/gender
  // on the capture form after Select.
  const patientDetail = usePatientDetail(completingPatient?.id || activePatient?.id)
  const patientFilesQuery = useGetPatientFiles(activePatient?.id || "")
  const apiSavedCards: SavedCardView[] = (patientFilesQuery.data?.items ?? []).map((file) => ({
    id: file.id,
    name: file.name || "Card",
    ...firstAttachmentMeta(file),
  }))
  const savedCards: SavedCardView[] = [
    ...apiSavedCards,
    ...justSavedCards.filter(
      (local) =>
        !apiSavedCards.some(
          (api) => api.name.trim().toLowerCase() === local.name.trim().toLowerCase()
        )
    ),
  ]

  useEffect(() => {
    setJustSavedCards([])
  }, [activePatient?.id])

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
    if (linkedAbha && activePatient?.id === detail.id) setAbhaNumber((prev) => prev || linkedAbha)
  }, [patientDetail.data, activePatient?.id])

  useEffect(() => {
    if (!completingPatient) {
      completingPrefillId.current = null
      return
    }
    if (completingPrefillId.current !== completingPatient.id) {
      completingPrefillId.current = completingPatient.id
    }
    const detail = patientDetail.data
    if (!detail || detail.id !== completingPatient.id) return
    setNewPatientForm((prev) => {
      const next = {
        fullName: prev.fullName.trim() ? prev.fullName : detail.name || completingPatient.name || "",
        dob: prev.dob.trim() ? prev.dob : toDateInputValue(detail.dateOfBirth),
        gender: prev.gender.trim() ? prev.gender : normalizeGender(detail.gender || completingPatient.gender),
        mobile: prev.mobile.trim() ? prev.mobile : detail.phone || completingPatient.phone || "",
      }
      if (
        next.fullName === prev.fullName &&
        next.dob === prev.dob &&
        next.gender === prev.gender &&
        next.mobile === prev.mobile
      ) {
        return prev
      }
      return next
    })
  }, [completingPatient, patientDetail.data])

  // A fee already collected for this appointment survives a page reload.
  const { data: existingCollection, isLoading: collectionLoading } = useFeeCollectionByAppointment(appointmentId || undefined)

  useEffect(() => {
    if (!existingCollection) return
    setCollection(existingCollection)
    setPaymentMethod(existingCollection.paymentMethod || "Cash")
    if (existingCollection.token) setActiveToken(existingCollection.token)
  }, [existingCollection])

  useEffect(() => {
    if (!collection) return
    const params = new URLSearchParams(searchParams.toString())
    let changed = false
    if (isGuid(collection.visitId) && params.get("visitId") !== collection.visitId) {
      params.set("visitId", collection.visitId as string)
      changed = true
    }
    if (collection.appointmentId && !params.get("appointmentId")) {
      params.set("appointmentId", collection.appointmentId)
      changed = true
    }
    if (collection.patientName && !params.get("name")) {
      params.set("name", collection.patientName)
      changed = true
    }
    if (collection.patientUhid && params.get("uhid") !== collection.patientUhid) {
      params.set("uhid", collection.patientUhid)
      changed = true
    }
    if (collection.patientPhone && !params.get("phone")) {
      params.set("phone", collection.patientPhone)
      changed = true
    }
    const collectionClinicId = collection.clinicId || collection.token?.clinicId || ""
    if (isGuid(collectionClinicId) && !params.get("clinicId")) {
      params.set("clinicId", collectionClinicId)
      changed = true
    }
    if (!changed) return
    router.replace(`/opd/visit-thread?${params.toString()}`)
    // searchParams is read for current URL values; collection fields are the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection?.visitId, collection?.appointmentId, collection?.patientName, collection?.patientUhid, collection?.patientPhone, collection?.clinicId, collection?.token?.clinicId, router])

  const urlUserId = searchParams.get("userId") || searchParams.get("providerId") || ""
  const urlDepartmentId = searchParams.get("departmentId") || ""
  const urlClinicId = searchParams.get("clinicId") || ""

  const { data: feeEstimate } = useFeeEstimate(
    {
      appointmentId: appointmentId || undefined,
      patientId: activePatient?.id,
      clinicId: appointmentId ? undefined : clinicId,
      userId: urlUserId || undefined,
      departmentId: urlDepartmentId || undefined,
    },
    ((s === 0 && !!appointmentId) || s === 1 || s === 2) && !collection
  )

  const visitClinicId =
    (isGuid(feeEstimate?.clinicId) && feeEstimate.clinicId) ||
    (isGuid(urlClinicId) && urlClinicId) ||
    (isGuid(collection?.clinicId) && collection.clinicId) ||
    (isGuid(collection?.token?.clinicId) && collection.token.clinicId) ||
    clinicId ||
    ""

  useEffect(() => {
    const knownClinic =
      (isGuid(feeEstimate?.clinicId) && feeEstimate.clinicId) ||
      (isGuid(urlClinicId) && urlClinicId) ||
      (isGuid(collection?.clinicId) && collection.clinicId) ||
      (isGuid(collection?.token?.clinicId) && collection.token.clinicId) ||
      ""
    if (!knownClinic || branchId === knownClinic) return
    setBranchId(knownClinic)
  }, [feeEstimate?.clinicId, urlClinicId, collection?.clinicId, collection?.token?.clinicId, branchId, setBranchId])

  useEffect(() => {
    if (!isGuid(feeEstimate?.clinicId)) return
    const params = new URLSearchParams(searchParams.toString())
    if (params.get("clinicId") === feeEstimate.clinicId) return
    params.set("clinicId", feeEstimate.clinicId as string)
    router.replace(`/opd/visit-thread?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeEstimate?.clinicId, router])

  const feeDoctorId = collection?.userId || feeEstimate?.userId || urlUserId || ""
  const feeDepartmentId = collection?.departmentId || feeEstimate?.departmentId || urlDepartmentId || ""
  const feeDepartmentName = collection?.departmentName || feeEstimate?.departmentName || "—"
  const feeDoctorName = collection?.userName || feeEstimate?.userName || "—"

  const { data: consultingDoctor } = useGetMediTrackUserById(
    feeDoctorId,
    (s === 1 || s === 2) && !collection && !!feeDoctorId
  )

  const doctorConsultationFee = (() => {
    const fromUser = Number(consultingDoctor?.rate)
    if (Number.isFinite(fromUser) && fromUser > 0) return fromUser
    return null
  })()

  const feeCharges: FeeItem[] = (() => {
    const raw = collection?.charges ?? feeEstimate?.charges ?? []
    if (collection || doctorConsultationFee == null) return raw
    let applied = false
    const next = raw.map((c) => {
      if (c.isVoid || applied) return c
      applied = true
      return { ...c, amount: doctorConsultationFee }
    })
    if (next.length === 0) {
      return [
        {
          id: "doctor-consultation",
          tariffId: null,
          chargeName: feeDoctorName !== "—" ? `Consultation — ${feeDoctorName}` : "Consultation",
          amount: doctorConsultationFee,
          isVoid: false,
        },
      ]
    }
    return next
  })()
  const payableCharges = feeCharges.filter((c, i) => !c.isVoid && !locallyVoided.includes(i))
  const anyChargeVoided = feeCharges.some((c) => c.isVoid) || locallyVoided.length > 0
  const feeWaived = !!collection?.isWaived
  const waiverReason = collection?.waiverReason
  const totalPayable = feeWaived ? 0 : payableCharges.reduce((sum, c) => sum + (c.amount || 0), 0)

  const visitIdParam = searchParams.get("visitId") || ""
  const diagnosticVisitId = isGuid(collection?.visitId)
    ? collection.visitId!
    : isGuid(visitIdParam)
      ? visitIdParam
      : ""
  const vitalsQuery = useOpdVitals(diagnosticVisitId, (s === 3 || s === 4) && !!diagnosticVisitId)
  const vitals = vitalsQuery.data ?? null
  const vitalsPatientId = collection?.patientId || activePatient?.id || feeEstimate?.patientId || ""
  const consultContextQuery = useConsultationContext(diagnosticVisitId, (s === 4 || s === 8) && !!diagnosticVisitId)
  const consultContext = consultContextQuery.data
  const consultAppointmentId = isGuid(appointmentId)
    ? appointmentId
    : isGuid(collection?.appointmentId)
      ? collection.appointmentId!
      : isGuid(consultContext?.appointmentId)
        ? consultContext.appointmentId
        : ""
  const consultNoteQuery = useConsultationNote(consultAppointmentId, (s === 4 || s === 8) && !!consultAppointmentId)
  const consultNote = consultNoteQuery.data ?? null
  const consultAmendmentsQuery = useConsultationAmendments(consultNote?.id, s === 4 && !!consultNote?.id)
  const createConsultationNote = useCreateConsultationNote()
  const amendConsultationNote = useAmendConsultationNote()
  const consultAddendums = consultAmendmentsQuery.data ?? []
  const createAdmissionReferral = useCreateAdmissionReferral()
  const referralStatusQuery = useGetAdmissionReferralByVisit(diagnosticVisitId, s === 4 && !!diagnosticVisitId)

  useEffect(() => {
    if (vitals?.chiefComplaint != null) setChiefComplaint(vitals.chiefComplaint)
    if (!vitals) return
    setVitalsDraft({
      bloodPressure: vitals.bloodPressure || "",
      pulse: vitals.heartRateBpm != null ? String(vitals.heartRateBpm) : "",
      tempF: celsiusToFahrenheit(vitals.temperatureC),
      spo2: vitals.spo2 != null ? String(vitals.spo2) : "",
      weightKg: vitals.weightKg != null ? String(vitals.weightKg) : "",
    })
  }, [vitals?.id, vitals?.updatedAt, vitals?.chiefComplaint])

  const dxVisitQuery = useDiagnosticVisit(diagnosticVisitId, (s === 4 || s === 5 || s === 8) && !!diagnosticVisitId)
  const rxVisitQuery = usePrescriptionVisit(diagnosticVisitId, (s === 6 || s === 7 || s === 8) && !!diagnosticVisitId)
  const closureQuery = useGetVisitClosureStatus(diagnosticVisitId, s === 8 && !!diagnosticVisitId)
  const balanceQuery = useGetVisitBalance(diagnosticVisitId, s === 8 && !!diagnosticVisitId)
  const closeVisit = useCloseVisit()
  const collectVisitBalance = useCollectVisitBalance()
  const overrideVisitBalance = useOverrideVisitBalance()
  const reopenVisit = useReopenVisit()
  const closure = closureQuery.data
  const visitBalance = balanceQuery.data
  const pharmacyOrderQuery = usePharmacyVisitOrder(diagnosticVisitId, s === 7 && !!diagnosticVisitId)
  const sendRxToPharmacy = useSendPrescriptionToPharmacy()
  const dispenseAndBill = useDispenseAndBill()
  const voidPharmacyBill = useVoidPharmacyBill()
  const returnPharmacyMedicine = useReturnPharmacyMedicine()
  const [pharmacyVoidedProductIds, setPharmacyVoidedProductIds] = useState<string[]>([])
  const voidDxOrder = useVoidDiagnosticOrder()
  const updateDxOrder = useUpdateDiagnosticOrder()
  const amendDxResult = useAmendDiagnosticResult()
  const dxVisit = dxVisitQuery.data
  const dxOrders = dxVisit?.orders ?? []
  const dxPatientLabel = dxVisit?.patient?.name
    ? `${dxVisit.patient.name}${dxVisit.patient.uhid ? ` · ${dxVisit.patient.uhid}` : dxVisit.patient.age != null ? ` · ${dxVisit.patient.age} / ${dxVisit.patient.gender || "—"}` : ""}`
    : activePatient
      ? `${activePatient.name}${activePatient.uhid && activePatient.uhid !== "—" ? ` · ${activePatient.uhid}` : ` · ${activePatient.ageSex}`}`
      : collection?.patientName
        ? `${collection.patientName}${collection.patientUhid ? ` · ${collection.patientUhid}` : ""}`
        : searchParams.get("name") || ""
  const dxOrderingDoctor =
    feeDoctorName !== "—"
      ? `${feeDoctorName}${feeDepartmentName !== "—" ? ` · ${feeDepartmentName}` : ""}`
      : dxVisit?.patient?.providerName
        ? `${dxVisit.patient.providerName}${dxVisit.patient.departmentName ? ` · ${dxVisit.patient.departmentName}` : ""}`
        : "Dr. Anjali Nair · Cardiology"

  const rxVisit = rxVisitQuery.data
  const rxLines = rxVisit?.lines ?? []
  const rxInteractions = rxVisit?.interactions ?? []
  const rxCanEdit = editable && (rxVisit?.canEdit ?? true)
  const rxPrescriberName = rxVisit?.prescribedByName || (feeDoctorName !== "—" ? feeDoctorName : "Dr. Anjali Nair")
  const rxPrescriberReg = rxVisit?.prescriberRegistrationNumber || ""
  const pharmacyOrder = pharmacyOrderQuery.data
  const pharmacyExisting = pharmacyOrder?.existingDispensing ?? null
  const pharmacyIsDispensed = Boolean(pharmacyOrder?.isDispensed || pharmacyExisting)
  const pharmacyItems = pharmacyOrder?.items ?? []
  const pharmacyCreditNote = pharmacyExisting?.creditNote ?? null
  const pharmacyBillableItems = pharmacyItems.filter((item) => !pharmacyVoidedProductIds.includes(item.productId))
  const pharmacyLiveSubtotal = pharmacyBillableItems.reduce((sum, item) => sum + item.unitPrice * item.quantityToDispense, 0)
  const pharmacyLiveGst = pharmacyBillableItems.reduce((sum, item) => sum + item.gstAmount, 0)
  const pharmacySubtotal = pharmacyExisting?.subtotal ?? pharmacyLiveSubtotal
  const pharmacyGst = pharmacyExisting?.gstAmount ?? pharmacyLiveGst
  const pharmacyTotal = pharmacyExisting?.totalAmount ?? pharmacyLiveSubtotal + pharmacyLiveGst
  const pharmacyGstRate = pharmacyExisting?.gstRate ?? pharmacyOrder?.gstRate ?? 12

  useEffect(() => {
    setPharmacyVoidedProductIds([])
  }, [diagnosticVisitId])

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
    (s === 2 || s >= 3) && Boolean(clinicId || companyId)
  )
  const missedTokens = liveQueue?.missedTokens ?? []
  const todayPatientOptions = [...(liveQueue?.activeQueue ?? []), ...(liveQueue?.missedTokens ?? [])]
    .filter((token, index, all) => all.findIndex((t) => t.id === token.id) === index)
    .filter((token) => token.status !== "Cancelled")
    .filter((token) => Boolean(token.appointmentId || token.id))
  const visitTokenKey = (token: OpdQueueToken) => token.appointmentId || token.id
  const selectedPatientKey = appointmentId || activeToken?.appointmentId || ""
  const awaitingVisitContext = Boolean(appointmentId) && collectionLoading

  const { data: reassignDoctors = [] } = useGetDepartmentDoctors(
    activeToken?.departmentId || undefined,
    clinicId,
    s === 2 && !!activeToken?.departmentId
  )
  const { data: consultDoctors = [] } = useGetDepartmentDoctors(
    feeDepartmentId || undefined,
    clinicId,
    s === 4 && !!feeDepartmentId
  )

  const invalidateQueue = () =>
    void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-live-queue"] })

  useEffect(() => {
    return () => {
      if (cardPreview?.url?.startsWith("blob:")) URL.revokeObjectURL(cardPreview.url)
    }
  }, [cardPreview?.url])

  function addPendingCard() {
    setPendingCards((list) => [...list, { key: `card-${Date.now()}-${list.length}`, name: "", file: null }])
  }

  function updatePendingCard(key: string, patch: Partial<PendingCard>) {
    setPendingCards((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function removePendingCard(key: string) {
    setPendingCards((list) => list.filter((item) => item.key !== key))
  }

  function openCardPreview(file: File) {
    const url = URL.createObjectURL(file)
    setCardPreview((prev) => {
      if (prev?.url?.startsWith("blob:")) URL.revokeObjectURL(prev.url)
      return { name: file.name, url, type: file.type || "" }
    })
  }

  function openSavedCardPreview(card: SavedCardView) {
    if (card.file) {
      openCardPreview(card.file)
      return
    }
    if (!card.filePath && !card.fileName) return
    const fileKey = (card.filePath.split("/").pop() || card.fileName).trim()
    const url = `/api/get-file/${encodeURIComponent(fileKey)}`
    setCardPreview((prev) => {
      if (prev?.url?.startsWith("blob:")) URL.revokeObjectURL(prev.url)
      return { name: card.name || card.fileName, url, type: card.fileType || "" }
    })
  }

  function closeCardPreview() {
    setCardPreview((prev) => {
      if (prev?.url?.startsWith("blob:")) URL.revokeObjectURL(prev.url)
      return null
    })
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

  // Admission referral (Consultation → IPD). Confirm panel is local until
  // POST /api/AdmissionReferral; the status card then follows GET .../visit/{visitId}.
  const [referralConfirming, setReferralConfirming] = useState(false)
  const [admitReason, setAdmitReason] = useState("Unstable angina with a rising troponin — needs a monitored bed and inpatient workup today.")
  const [filedReferral, setFiledReferral] = useState<{
    id: string
    referralCode: string
    status: string
    admissionReason: string
    createdAt: string
  } | null>(null)

  const referralStatusView = referralStatusQuery.data ?? null
  const referralStatus = (referralStatusView?.status || filedReferral?.status || "pending").toLowerCase()
  const hasReferral = Boolean(referralStatusView || filedReferral)
  const referralCode = referralStatusView?.referralCode || filedReferral?.referralCode || ""
  const referralReason = filedReferral?.admissionReason || (referralStatusView ? "—" : admitReason)
  const referralTimeline = referralStatusView?.timeline?.length
    ? referralStatusView.timeline
    : fallbackReferralTimeline(referralStatus, filedReferral?.createdAt, referralStatusView?.bedAssignment)

  // Consultation (Stage 4) — "Order diagnostics" expands the same DxOrderPanel
  // in place rather than navigating, per the addendum spec.
  const [inlineDxOpen, setInlineDxOpen] = useState(false)
  const [clinicalNotesDraft, setClinicalNotesDraft] = useState("")
  const [followUpDraft, setFollowUpDraft] = useState("")

  async function fileAdmissionReferral() {
    if (!admitReason.trim()) return
    if (!isGuid(diagnosticVisitId)) {
      toast({
        title: "No visit yet",
        description: "Collect the consultation fee first — the referral attaches to that visit.",
        variant: "destructive",
      })
      return
    }
    try {
      const created = await createAdmissionReferral.mutateAsync({
        visitId: diagnosticVisitId,
        admissionReason: admitReason.trim(),
      })
      setFiledReferral(created)
      setReferralConfirming(false)
      patch({ bannerText: `Admission referral ${created.referralCode} filed.` })
    } catch (err) {
      const message = getToastErrorMessage(err, "Referral failed")
      if (/already has an admission referral/i.test(message)) {
        setReferralConfirming(false)
        void queryClient.invalidateQueries({ queryKey: admissionReferralByVisitKey(diagnosticVisitId) })
      }
      toast({
        title: "Could not file admission referral",
        description: message,
        variant: "destructive",
      })
    }
  }

  function resetRegSearchUi() {
    setSelectedCandidate(null)
    setShowNewPatientForm(false)
    setPendingDuplicateConfirm(false)
    setCompletingPatient(null)
    completingPrefillId.current = null
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
    setCompletingPatient(null)
    completingPrefillId.current = null
    setNewPatientOrigin(origin)
    setNewPatientForm({ ...EMPTY_NEW_PATIENT, mobile: origin === "search" ? regQuery : "" })
    setNewPatientTouched(false)
    setPendingDuplicateConfirm(false)
    setShowNewPatientForm(true)
  }

  function openExistingPatientForm(candidate: RegistrationSearchResult) {
    setCompletingPatient(candidate)
    completingPrefillId.current = candidate.id
    setNewPatientOrigin("search")
    setNewPatientForm({
      fullName: candidate.name || "",
      dob: "",
      gender: normalizeGender(candidate.gender),
      mobile: candidate.phone || "",
    })
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
      setCompletingPatient(null)
      completingPrefillId.current = null
      setShowNewPatientForm(false)
      if (data.matchType === "none" || data.results.length === 0) {
        setRegOutcome("no-match")
      } else if (data.results.length === 1) {
        setRegOutcome("single")
        openExistingPatientForm(data.results[0])
      } else {
        setRegOutcome("multiple")
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
    setJustSavedCards([])
    patch({ bannerText: banner })
  }

  async function submitNewPatient(openVisit: boolean, confirmDuplicate = false) {
    setNewPatientTouched(true)
    if (Object.keys(newPatientErrors(newPatientForm)).length > 0) return
    const dob = toIsoDob(newPatientForm.dob)
    if (!dob) return

    if (completingPatient) {
      try {
        const updated = await updatePatient.mutateAsync({
          id: completingPatient.id,
          name: newPatientForm.fullName.trim(),
          dateOfBirth: dob,
          gender: toApiGender(newPatientForm.gender),
          phone: newPatientForm.mobile.trim(),
          confirmDuplicate,
        })
        editConfirmDuplicate.current = false
        const nextDob = updated.dateOfBirth || dob
        const nextGender = updated.gender || newPatientForm.gender.trim()
        const patient: ActiveRegPatient = {
          id: updated.id || completingPatient.id,
          name: updated.name || newPatientForm.fullName.trim(),
          ageSex: formatAgeSex(ageFromDob(nextDob), nextGender),
          uhid: updated.registrationNumber || completingPatient.uhid || "—",
          phone: updated.phone || newPatientForm.mobile.trim(),
          abha: updated.abhaNumber || updated.nationalId || completingPatient.abha || "Not linked",
          gender: nextGender,
          dateOfBirth: nextDob,
        }
        setShowNewPatientForm(false)
        setCompletingPatient(null)
        completingPrefillId.current = null
        setPendingDuplicateConfirm(false)
        setRegOutcome("idle")
        setRegResults([])
        if (openVisit) {
          activatePatient(patient, `Visit opened for ${patient.name}.`)
        } else {
          toast({ title: "Saved", description: `${patient.name}'s details were updated.` })
        }
        void queryClient.invalidateQueries({ queryKey: ["meditrack", "patient-detail", completingPatient.id] })
      } catch (err) {
        if (err instanceof RegistrationConflictError) {
          askContinueDuplicate(err, () => void submitNewPatient(openVisit, true))
          return
        }
        toast({
          title: "Could not save patient",
          description: getToastErrorMessage(err, "Update failed"),
          variant: "destructive",
        })
      }
      return
    }

    try {
      const created = await createPatient.mutateAsync({
        name: newPatientForm.fullName.trim(),
        dateOfBirth: dob,
        gender: toApiGender(newPatientForm.gender),
        phone: newPatientForm.mobile.trim(),
        confirmDuplicate,
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
        askContinueDuplicate(err, () => void submitNewPatient(openVisit, true))
        return
      }
      toast({
        title: "Could not register patient",
        description: getToastErrorMessage(err, "Registration failed"),
        variant: "destructive",
      })
    }
  }

  async function saveVisitCards() {
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
    if (!readyCards.length) {
      toast({ title: "No cards to save", description: "Add a named file, for example ABHA Card.", variant: "destructive" })
      return
    }

    try {
      await uploadCards.mutateAsync({
        patientId: activePatient.id,
        cards: readyCards.map((c) => ({
          label: c.name.trim(),
          file: c.file as File,
        })),
      })
      setJustSavedCards(
        readyCards.map((c) => ({
          id: `local-${c.key}`,
          name: c.name.trim(),
          fileName: (c.file as File).name,
          filePath: "",
          fileType: (c.file as File).type || "",
          file: c.file,
        }))
      )
      setPendingCards([])
      try {
        await queryClient.refetchQueries({ queryKey: ["patient-files", activePatient.id] })
      } catch {
        // Upload already succeeded — keep the cards visible from justSavedCards.
      }
      patch({
        bannerText: `Saved — ${readyCards.length} card${readyCards.length > 1 ? "s" : ""} uploaded.`,
      })
      toast({
        title: "Saved",
        description: "Cards uploaded.",
      })
    } catch (err) {
      toast({
        title: "Could not save cards",
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

  function changeVisitBranch(id: string) {
    setBranchId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set("clinicId", id)
    params.delete("appointmentId")
    params.delete("name")
    params.delete("patientId")
    params.delete("userId")
    params.delete("departmentId")
    setActiveToken(null)
    router.replace(`/opd/visit-thread?${params.toString()}`)
  }

  function openVisitFromToken(token: OpdQueueToken) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("stage", String(s))
    if (token.appointmentId) params.set("appointmentId", token.appointmentId)
    if (token.userId) params.set("userId", token.userId)
    if (token.departmentId) params.set("departmentId", token.departmentId)
    if (token.clinicId) params.set("clinicId", token.clinicId)
    if (token.patientName) params.set("name", token.patientName)
    if (token.patientId) params.set("patientId", token.patientId)
    router.push(`/opd/visit-thread?${params}`)
    setActiveToken(token)
  }

  const firstQueueTokenId = todayPatientOptions[0]?.id

  useEffect(() => {
    if (appointmentId || activeToken) return
    if (s < 3 || !firstQueueTokenId) return
    const first = todayPatientOptions[0]
    if (first) openVisitFromToken(first)
  }, [appointmentId, activeToken, s, firstQueueTokenId])

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

  function askContinueDuplicate(err: RegistrationConflictError, onYes: () => void) {
    const n = err.candidates.length
    const who = n > 0 ? `${n} patient${n === 1 ? "" : "s"}` : "another patient"
    openModal({
      title: "This number already exists",
      lines: [`This number already exists with ${who}. Do you want to continue?`],
      confirmLabel: "Yes",
      cancelLabel: "No",
      danger: false,
      onConfirm: () => {
        closeModal()
        onYes()
      },
    })
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
    { key: "bloodPressure", label: "BP", value: vitalsDraft.bloodPressure.trim() || "—", unit: "mmHg", placeholder: "128/82", crit: isBpCritical(vitalsDraft.bloodPressure) },
    { key: "pulse", label: "PULSE", value: vitalsDraft.pulse.trim() || "—", unit: "bpm", placeholder: "88", crit: isPulseCritical(parseOptionalNumber(vitalsDraft.pulse)) },
    { key: "tempF", label: "TEMP", value: vitalsDraft.tempF.trim() || "—", unit: "°F", placeholder: "98.6", crit: isTempCCritical(fahrenheitToCelsius(vitalsDraft.tempF)) },
    { key: "spo2", label: "SPO2", value: vitalsDraft.spo2.trim() || "—", unit: "%", placeholder: "98", crit: isSpo2Critical(parseOptionalNumber(vitalsDraft.spo2)) },
    { key: "weightKg", label: "WEIGHT", value: vitalsDraft.weightKg.trim() || "—", unit: "kg", placeholder: "64", crit: false },
  ]

  const vitalsReadyToSave =
    Boolean(vitalsDraft.bloodPressure.trim()) &&
    Boolean(vitalsDraft.pulse.trim()) &&
    Boolean(vitalsDraft.tempF.trim()) &&
    Boolean(vitalsDraft.spo2.trim()) &&
    Boolean(vitalsDraft.weightKg.trim()) &&
    Boolean(chiefComplaint.trim())

  const criticalBanner = vitals?.isEmergencyEscalation
    ? isSpo2Critical(vitals.spo2)
      ? { title: `CRITICAL: SpO2 ${vitals.spo2}% — below safe threshold`, description: "Escalate to doctor immediately." }
      : isPulseCritical(vitals.heartRateBpm)
        ? { title: `CRITICAL: Pulse ${vitals.heartRateBpm} bpm — outside 60–100`, description: "Escalate to doctor immediately." }
        : isTempCCritical(vitals.temperatureC)
          ? { title: `CRITICAL: Temperature ${celsiusToFahrenheit(vitals.temperatureC)}°F — outside safe range`, description: "Escalate to doctor immediately." }
          : isBpCritical(vitals.bloodPressure)
            ? { title: `CRITICAL: BP ${vitals.bloodPressure} — outside safe range`, description: "Escalate to doctor immediately." }
            : { title: "CRITICAL: Vitals outside safe threshold", description: "Escalate to doctor immediately." }
    : null

  const signedNoteBody = consultationNoteBody(consultNote)
  const signedNoteDoctor = consultationDoctorLabel(consultNote) || (feeDoctorName !== "—" ? feeDoctorName : "")
  const signedNoteWhen = formatConsultWhen(consultNote?.signedAt || consultNote?.visitDate, true)
  const visitHistory = (() => {
    const rows: { key: string; time: string; by: string; what: string }[] = []
    const past = (consultContext?.pastRecords ?? []).filter((record) => record.id !== consultNote?.id)
    for (const record of past) {
      rows.push({
        key: record.id,
        time: formatConsultWhen(record.visitDate) || formatLastVisit(record.visitDate),
        by: record.doctorName?.trim() || "Doctor",
        what: record.diagnosis?.trim() || record.chiefComplaint?.trim() || record.outcome?.trim() || "Consultation recorded.",
      })
    }
    if (vitals) {
      const vitalsSummary = formatVitalsHistorySummary(vitals)
      rows.push({
        key: `vitals-${vitals.id}`,
        time: formatConsultWhen(vitals.updatedAt || vitals.createdAt) || "Today",
        by: "Nurse",
        what: vitals.isEmergencyEscalation
          ? `Vitals recorded${vitalsSummary ? `. ${vitalsSummary}` : ""} — flagged critical.`
          : `Vitals recorded${vitalsSummary ? `. ${vitalsSummary}.` : "."}`,
      })
    }
    if (activeToken) {
      const visitType = (activeToken.visitType || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
      rows.push({
        key: `token-${activeToken.id}`,
        time: formatConsultWhen(activeToken.createdAt) || "Today",
        by: "Front Desk",
        what: `Token ${activeToken.tokenNumber} issued${activeToken.departmentName ? `, ${activeToken.departmentName}` : ""}${visitType ? `, ${visitType}` : ""}.`,
      })
    }
    return rows
  })()

  const rx = rxLines.map((line) => {
    const schedule = (line.schedule || "").toUpperCase()
    return {
      id: line.id,
      drug: line.brand || line.generic || "—",
      dose: [line.doseAmount != null ? String(line.doseAmount) : null, line.doseUnit, line.frequency].filter(Boolean).join(" ") || line.sig || "—",
      duration: line.durationLabel || (line.durationUnit === "continue" ? "Continue" : line.duration != null ? `${line.duration} ${line.durationUnit || "days"}` : "—"),
      schedule: schedule === "H" ? "SCHEDULE H" : schedule === "H1" ? "SCHEDULE H1" : schedule === "X" ? "SCHEDULE X" : (line.schedule || null),
      note: line.scheduleNote || line.overrideReason || line.directions || null,
      superseded: false,
    }
  })

  const coverageItems = visitBalance?.coverageConfirmedItems ?? []
  const dueItems = (visitBalance?.dueItems ?? []).filter((item) => !item.overrideReason)
  const collectedItems = visitBalance?.alreadyCollectedItems ?? []
  const payableNow = dueItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const outstanding = payableNow > 0
  const closureStatus = (closure?.closureStatus || "open").toLowerCase()
  const visitIsClosed = closureStatus === "closed" || closureStatus === "converted_to_ipd"
  const visitIsPending = closureStatus === "pending"
  const pendingItems = closure?.pendingItems ?? []

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
          const gender = toApiGender(values.gender)
          const dob = toIsoDob(values.dob || "")
          if (!name || !phone || !gender || !dob) {
            toast({
              title: "All fields required",
              description: "Name, date of birth, gender and phone must all be filled.",
              variant: "destructive",
            })
            return
          }
          const saveDemographics = async (confirmDuplicate: boolean) => {
            const updated = await updatePatient.mutateAsync({
              id: activePatient.id,
              name,
              phone,
              gender,
              dateOfBirth: dob,
              confirmDuplicate,
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
          }
          try {
            await saveDemographics(false)
          } catch (err) {
            if (err instanceof RegistrationConflictError) {
              askContinueDuplicate(err, () => {
                void saveDemographics(true).catch((retryErr) => {
                  toast({
                    title: "Could not update patient",
                    description: getToastErrorMessage(retryErr, "Update failed"),
                    variant: "destructive",
                  })
                })
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
      let transactionReference: string | null = null
      if (isRazorpayMethod(paymentMethod) && totalPayable > 0) {
        setRazorpayPending(true)
        const order = await createRazorpayOrder(totalPayable, appointmentId || undefined)
        const checkout = await openRazorpayCheckout({
          order,
          description: `${feeDoctorName !== "—" ? feeDoctorName : "Consultation"} · ${paymentMethod}`,
          prefillName: feeEstimate?.patientName || activePatient?.name || searchParams.get("name") || "",
          prefillContact: feeEstimate?.patientPhone || activePatient?.phone || searchParams.get("phone") || "",
          preferredMethod: paymentMethod.toLowerCase().includes("card") ? "card" : "upi",
        })
        transactionReference = await verifyRazorpayPayment(checkout)
        setRazorpayPending(false)
      }
      const created = await collectFee.mutateAsync({
        appointmentId: appointmentId || null,
        patientId: activePatient?.id || feeEstimate?.patientId || null,
        userId: feeDoctorId,
        departmentId: feeDepartmentId || null,
        clinicId: appointmentId
          ? isGuid(feeEstimate?.clinicId)
            ? feeEstimate.clinicId
            : isGuid(urlClinicId)
              ? urlClinicId
              : null
          : clinicId || null,
        paymentMethod,
        transactionReference,
        isWaived: false,
        waiverReason: null,
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
      setRazorpayPending(false)
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

  function vitalsSnapshotFromForm(values: Record<string, string>, extra: { isCompleted?: boolean; isRetriage?: boolean; notes?: string | null } = {}) {
    const complaint = (values.chiefComplaint ?? chiefComplaint).trim()
    return {
      visitId: diagnosticVisitId,
      patientId: vitalsPatientId || null,
      bloodPressure: values.bloodPressure?.trim() || vitals?.bloodPressure || null,
      heartRateBpm: parseOptionalNumber(values.pulse ?? "") ?? vitals?.heartRateBpm ?? null,
      temperatureC: fahrenheitToCelsius(values.tempF ?? "") ?? vitals?.temperatureC ?? null,
      spo2: parseOptionalNumber(values.spo2 ?? values.newSpo2 ?? "") ?? vitals?.spo2 ?? null,
      weightKg: parseOptionalNumber(values.weightKg ?? "") ?? vitals?.weightKg ?? null,
      chiefComplaint: complaint || vitals?.chiefComplaint || null,
      notes: extra.notes ?? vitals?.notes ?? null,
      isRetriage: extra.isRetriage ?? vitals?.isRetriage ?? false,
      isCompleted: extra.isCompleted ?? vitals?.isCompleted ?? false,
    }
  }

  async function persistVitals(payload: ReturnType<typeof vitalsSnapshotFromForm>) {
    if (!isGuid(diagnosticVisitId)) {
      toast({ title: "No visit yet", description: "Collect the fee first so a visit exists for these vitals.", variant: "destructive" })
      return null
    }
    if (!payload.chiefComplaint?.trim()) {
      toast({ title: "Chief complaint required", description: "Enter the chief complaint before saving vitals.", variant: "destructive" })
      return null
    }
    try {
      const saved = await saveOpdVitals.mutateAsync({ id: vitals?.id, ...payload })
      setChiefComplaint(saved.chiefComplaint || payload.chiefComplaint || "")
      return saved
    } catch (err) {
      toast({
        title: "Could not save vitals",
        description: getToastErrorMessage(err, "Update failed"),
        variant: "destructive",
      })
      return null
    }
  }

  const openVitalsEdit = () => {
    if (!isGuid(diagnosticVisitId)) {
      toast({ title: "No visit yet", description: "Collect the fee first so a visit exists for these vitals.", variant: "destructive" })
      return
    }
    setEditingVitalKey(null)
    openDrawer(
      {
        badge: badge("LIVE EDIT"),
        title: vitals ? "Edit vitals (not yet reviewed)" : "Record vitals",
        saveLabel: saveOpdVitals.isPending ? "Saving…" : "Save",
        onSave: async () => {
          const saved = await persistVitals(vitalsSnapshotFromForm(tmpRef.current))
          if (!saved) return
          patch({ bannerText: "Vitals updated." })
          closeDrawer()
        },
        fields: [
          field("bloodPressure", "BP (mmHg)", "text", { placeholder: "128/82" }),
          field("pulse", "Pulse (bpm)", "text"),
          field("tempF", "Temp (°F)", "text"),
          field("spo2", "SpO2 (%)", "text"),
          field("weightKg", "Weight (kg)", "text"),
          field("chiefComplaint", "Chief complaint", "textarea", { placeholder: "Why the patient is here today" }),
        ],
      },
      {
        bloodPressure: vitalsDraft.bloodPressure,
        pulse: vitalsDraft.pulse,
        tempF: vitalsDraft.tempF,
        spo2: vitalsDraft.spo2,
        weightKg: vitalsDraft.weightKg,
        chiefComplaint: chiefComplaint || vitals?.chiefComplaint || "",
      }
    )
  }

  function currentVitalsForm(overrides: Record<string, string> = {}) {
    return {
      ...vitalsDraft,
      chiefComplaint: chiefComplaint || vitals?.chiefComplaint || "",
      ...overrides,
    }
  }

  function startVitalBoxEdit(key: string) {
    if (!isGuid(diagnosticVisitId)) {
      toast({ title: "No visit yet", description: "Collect the fee first so a visit exists for these vitals.", variant: "destructive" })
      return
    }
    setEditingVitalKey(key)
  }

  async function saveDraftVitals(isCompleted = false) {
    if (!vitalsReadyToSave) {
      toast({
        title: "Fill all vitals first",
        description: "Enter BP, pulse, temp, SpO2, weight and chief complaint, then save.",
        variant: "destructive",
      })
      return null
    }
    setEditingVitalKey(null)
    const saved = await persistVitals(
      vitalsSnapshotFromForm(currentVitalsForm(), {
        isCompleted,
        isRetriage: vitals?.isRetriage,
      })
    )
    if (!saved) return null
    patch({ bannerText: isCompleted ? "Vitals saved — sending to doctor." : "Vitals saved." })
    return saved
  }

  const openVitalsAmend = () => {
    if (!vitals?.id) {
      toast({ title: "No vitals on file", description: "Record vitals first, then correct them.", variant: "destructive" })
      return
    }
    openDrawer(
      {
        badge: badge("AMENDMENT"),
        title: "Correct vitals (already reviewed)",
        saveLabel: saveOpdVitals.isPending ? "Saving…" : "Apply amendment",
        consequenceNote: "The original reading stays in the visit history. The doctor will see the corrected values.",
        onSave: async () => {
          const values = tmpRef.current
          const saved = await persistVitals(
            vitalsSnapshotFromForm(
              { ...values, spo2: values.newSpo2 || values.spo2 },
              { notes: values.reason?.trim() || vitals.notes, isCompleted: vitals.isCompleted }
            )
          )
          if (!saved) return
          patch({ bannerText: "Vitals amended. Doctor notified.", vitalsAmended: true })
          closeDrawer()
        },
        fields: [
          field("newSpo2", "Corrected SpO2 (%)", "text"),
          field("reason", "Reason", "text", { placeholder: "e.g. Re-checked with second device — first reading likely faulty probe" }),
        ],
      },
      {
        newSpo2: vitals.spo2 != null ? String(vitals.spo2) : "",
        reason: "",
      }
    )
  }

  const retriageAction = async () => {
    if (!vitals?.id) {
      toast({ title: "No vitals on file", description: "Record vitals before logging a re-assessment.", variant: "destructive" })
      return
    }
    const saved = await persistVitals(
      vitalsSnapshotFromForm(
        {
          bloodPressure: vitals.bloodPressure || "",
          pulse: vitals.heartRateBpm != null ? String(vitals.heartRateBpm) : "",
          tempF: celsiusToFahrenheit(vitals.temperatureC),
          spo2: vitals.spo2 != null ? String(vitals.spo2) : "",
          weightKg: vitals.weightKg != null ? String(vitals.weightKg) : "",
          chiefComplaint: chiefComplaint || vitals.chiefComplaint || "",
        },
        { isRetriage: true, isCompleted: false }
      )
    )
    if (!saved) return
    patch({ retriaged: true, bannerText: "Re-assessment logged." })
  }

  async function sendToDoctor() {
    const saved = await saveDraftVitals(true)
    if (!saved) return
    goNext()
  }

  const openAddendum = () =>
    openDrawer({
      badge: badge("AMENDMENT"),
      title: "Add addendum to signed notes",
      saveLabel: amendConsultationNote.isPending ? "Saving…" : "Add addendum",
      onSave: async () => {
        const text = tmpRef.current.text?.trim()
        const reason = tmpRef.current.reason?.trim()
        if (!text) {
          toast({ title: "Addendum text required", description: "Enter what is being clarified or added.", variant: "destructive" })
          return
        }
        if (!consultNote?.id) {
          toast({ title: "No signed note", description: "Sign clinical notes before adding an addendum.", variant: "destructive" })
          return
        }
        const amendedBy = getUserId() || feeDoctorId
        if (!isGuid(amendedBy)) {
          toast({ title: "Could not add addendum", description: "Signed-in user is missing.", variant: "destructive" })
          return
        }
        try {
          await amendConsultationNote.mutateAsync({
            id: consultNote.id,
            amendmentText: text,
            reason: reason || null,
            amendedBy,
          })
          patch({ bannerText: "Addendum added — original note unchanged." })
          closeDrawer()
        } catch (err) {
          toast({ title: "Could not add addendum", description: getToastErrorMessage(err, "Addendum failed"), variant: "destructive" })
        }
      },
      fields: [field("text", "Addendum text", "textarea", { placeholder: "What is being clarified or added..." }), field("reason", "Reason", "text", { placeholder: "e.g. Clarify wheeze severity for referring physician" })],
    })

  async function signClinicalNotes(opts?: { outcome?: string; referredToUserId?: string | null }) {
    if (!isGuid(diagnosticVisitId)) {
      toast({ title: "No visit yet", description: "Collect the consultation fee first — notes attach to that visit.", variant: "destructive" })
      return false
    }
    const findings = clinicalNotesDraft.trim()
    if (!findings && opts?.outcome !== "refer_specialist") {
      toast({ title: "Notes required", description: "Enter clinical notes before signing.", variant: "destructive" })
      return false
    }
    const veterinarianId = getUserId() || feeDoctorId || null
    try {
      await createConsultationNote.mutateAsync({
        clinicId: isGuid(clinicId) ? clinicId : collection?.clinicId || null,
        visitId: diagnosticVisitId,
        veterinarianId: isGuid(veterinarianId) ? veterinarianId : null,
        visitDate: new Date().toISOString(),
        chiefComplaint: vitals?.chiefComplaint || chiefComplaint || null,
        physicalExamFindings: findings || null,
        followUpInstructions: followUpDraft.trim() || null,
        weightKg: vitals?.weightKg ?? null,
        temperatureCelsius: vitals?.temperatureC ?? null,
        heartRate: vitals?.heartRateBpm ?? null,
        outcome: opts?.outcome || null,
        referredToUserId: opts?.referredToUserId || null,
      })
      setClinicalNotesDraft("")
      setFollowUpDraft("")
      patch({
        bannerText: opts?.outcome === "refer_specialist"
          ? "Referral recorded — clinical notes signed."
          : "Clinical notes signed.",
      })
      return true
    } catch (err) {
      toast({ title: "Could not sign notes", description: getToastErrorMessage(err, "Sign failed"), variant: "destructive" })
      return false
    }
  }

  const openReferSpecialist = () => {
    if (consultNote?.id) {
      toast({
        title: "Notes already signed",
        description: "Add an addendum if this referral needs documenting.",
      })
      return
    }
    openDrawer({
      badge: badge("LIVE EDIT"),
      title: "Refer to specialist",
      saveLabel: createConsultationNote.isPending ? "Saving…" : "Refer",
      onSave: async () => {
        const referredToUserId = tmpRef.current.doctor
        if (!isGuid(referredToUserId)) {
          toast({ title: "Select a doctor", description: "Choose who the patient is being referred to.", variant: "destructive" })
          return
        }
        const saved = await signClinicalNotes({ outcome: "refer_specialist", referredToUserId })
        if (saved) closeDrawer()
      },
      fields: [
        field("doctor", "Specialist", "select", {
          options: [
            { value: "", label: consultDoctors.length ? "Select doctor" : "No doctors found for this department" },
            ...consultDoctors.map((d) => ({ value: d.providerId, label: d.providerName })),
          ],
        }),
      ],
    })
  }

  const refreshDx = () => {
    if (diagnosticVisitId) void queryClient.invalidateQueries({ queryKey: diagnosticVisitKey(diagnosticVisitId) })
    void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-dx-worklist"] })
    void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-dx-catalogue"] })
  }

  const openVoidOrder = (order: DiagnosticOrder) =>
    openModal({
      badge: badge("VOID"),
      title: `Cancel ${order.testName || "this"} order?`,
      lines: ["Order will be cancelled before sample/scan collection. This reflects immediately on the Diagnostics screen.", "Payment already collected will be reversed via credit note — same mechanism as a fee void."],
      reasonField: true,
      reasonPlaceholder: "e.g. Clinically no longer indicated after review",
      confirmLabel: "Cancel order",
      onConfirm: async (reason) => {
        try {
          await voidDxOrder.mutateAsync({ orderId: order.id, reason: reason.trim() || "No longer indicated" })
          refreshDx()
          patch({ bannerText: `${order.testName || "Order"} cancelled.` })
          closeModal()
        } catch (err) {
          toast({
            title: "Could not void order",
            description: getToastErrorMessage(err, "Void failed"),
            variant: "destructive",
          })
        }
      },
    })

  const openOrderEdit = (order: DiagnosticOrder) =>
    openDrawer(
      {
        badge: badge("LIVE EDIT"),
        title: `Edit ${order.testName || "order"}`,
        saveLabel: "Save",
        onSave: async () => {
          try {
            await updateDxOrder.mutateAsync({ orderId: order.id, orderNote: tmpRef.current.note || "" })
            refreshDx()
            patch({ bannerText: "Order updated." })
            closeDrawer()
          } catch (err) {
            toast({
              title: "Could not update order",
              description: getToastErrorMessage(err, "Update failed"),
              variant: "destructive",
            })
          }
        },
        fields: [field("note", "Order note", "text")],
      },
      { note: order.orderNote || "" }
    )

  const openResultAmend = (order: DiagnosticOrder) => {
    const result = order.result
    if (!result) return
    openDrawer(
      {
        badge: badge("AMENDMENT"),
        title: `Correct ${order.testName || "result"}`,
        saveLabel: "Apply correction",
        consequenceNote: `${order.orderedByName || "The ordering doctor"} already reviewed the original result — they will be notified of this correction.`,
        onSave: async () => {
          try {
            const next = tmpRef.current.value?.trim()
            const numeric = next ? Number(next) : NaN
            await amendDxResult.mutateAsync({
              resultId: result.id,
              reason: tmpRef.current.reason?.trim() || "Correction",
              valueText: Number.isNaN(numeric) ? next || result.valueText : undefined,
              valueNumeric: Number.isNaN(numeric) ? undefined : numeric,
              unit: result.unit,
            })
            refreshDx()
            patch({ bannerText: "Result corrected. Original preserved as superseded." })
            closeDrawer()
          } catch (err) {
            toast({
              title: "Could not amend result",
              description: getToastErrorMessage(err, "Amendment failed"),
              variant: "destructive",
            })
          }
        },
        fields: [
          field("value", "Corrected result", "text"),
          field("reason", "Reason", "text", { placeholder: "e.g. Transcription error caught on recheck" }),
        ],
      },
      { value: result.valueNumeric != null ? String(result.valueNumeric) : result.valueText || "", reason: "" }
    )
  }

  const openReturn = () => {
    const returnable = (pharmacyExisting?.items ?? []).filter((item) => !item.isVoid && item.quantityDispensed > 0)
    if (!pharmacyExisting || returnable.length === 0) {
      toast({ title: "Nothing to return", description: "Dispense the prescription before logging a return.", variant: "destructive" })
      return
    }
    openDrawer({
      badge: badge("RETURN"),
      title: "Process medicine return",
      saveLabel: returnPharmacyMedicine.isPending ? "Logging…" : "Log return",
      onSave: async () => {
        const values = tmpRef.current
        const itemId = values.item
        const qty = Number(values.qty)
        const reason = values.reason?.trim()
        if (!itemId || !qty || qty <= 0 || !reason) {
          toast({ title: "Return details required", description: "Choose an item, quantity and reason.", variant: "destructive" })
          return
        }
        try {
          const returned = await returnPharmacyMedicine.mutateAsync({
            dispensingId: pharmacyExisting.id,
            visitId: diagnosticVisitId,
            itemId,
            quantityReturned: qty,
            reason,
            restockInventory: true,
          })
          patch({
            returnProcessed: true,
            bannerText: `Return logged. Original dispense entry retained${returned.drugName ? ` for ${returned.drugName}` : ""}.`,
          })
          closeDrawer()
        } catch (err) {
          toast({
            title: "Could not log return",
            description: getToastErrorMessage(err, "Return failed"),
            variant: "destructive",
          })
        }
      },
      fields: [
        field("item", "Item", "select", {
          options: returnable.map((item) => ({ value: item.id, label: item.drugName })),
        }),
        field("qty", "Quantity", "text", { placeholder: "e.g. 1" }),
        field("reason", "Reason", "text", { placeholder: "e.g. Patient reaction, pack unopened" }),
      ],
    })
  }
  const voidBillLine = (productId: string) => {
    setPharmacyVoidedProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]))
    patch({ billLineVoided: true })
  }
  const openBillVoid = () =>
    openModal({
      badge: badge("VOID"),
      title: "Void entire bill?",
      lines: [
        pharmacyExisting?.receiptNumber
          ? `A GST credit note will be generated; invoice ${pharmacyExisting.receiptNumber} stays on file, marked voided, not deleted.`
          : "A GST credit note will be generated; the original invoice stays on file, marked voided, not deleted.",
      ],
      reasonField: true,
      reasonPlaceholder: "e.g. Bill raised against wrong visit",
      confirmLabel: "Void bill",
      onConfirm: (reason) => {
        void (async () => {
          if (!pharmacyExisting) {
            toast({ title: "No bill yet", description: "Collect payment before voiding a pharmacy bill.", variant: "destructive" })
            return
          }
          if (!reason.trim()) {
            toast({ title: "Reason required", description: "Enter a reason to void this bill.", variant: "destructive" })
            return
          }
          try {
            const note = await voidPharmacyBill.mutateAsync({
              dispensingId: pharmacyExisting.id,
              visitId: diagnosticVisitId,
              reason: reason.trim(),
              restockInventory: true,
            })
            patch({
              pharmBillVoided: true,
              bannerText: `Bill voided. Credit note ${note.creditNoteNumber} generated.`,
            })
            closeModal()
          } catch (err) {
            toast({
              title: "Could not void bill",
              description: getToastErrorMessage(err, "Void failed"),
              variant: "destructive",
            })
          }
        })()
      },
    })

  const openReopen = () =>
    openModal({
      badge: badge("REOPEN VISIT"),
      title: "Reopen closed visit?",
      reasonField: true,
      reasonPlaceholder: "e.g. Follow-up date needs correction, caught after close",
      confirmLabel: "Reopen visit",
      lines: ["Reopening a closed visit is unusual. Enter a reason to continue."],
      onConfirm: (reason) => {
        void (async () => {
          if (!reason.trim()) {
            toast({ title: "Reason required", description: "Say why this visit is being reopened.", variant: "destructive" })
            return
          }
          if (!isGuid(diagnosticVisitId)) {
            toast({ title: "No visit selected", variant: "destructive" })
            return
          }
          try {
            await reopenVisit.mutateAsync({ visitId: diagnosticVisitId, reason: reason.trim() })
            closeModal()
            toast({ title: "Visit reopened" })
          } catch (err) {
            toast({
              title: "Could not reopen visit",
              description: getToastErrorMessage(err, "Reopen failed"),
              variant: "destructive",
            })
          }
        })()
      },
    })

  const openBalanceOverride = () =>
    openModal({
      badge: badge("OVERRIDE"),
      title: "Close without collecting?",
      reasonField: true,
      reasonPlaceholder: "e.g. Patient will settle this at a later counter",
      confirmLabel: "Override — close without collecting",
      lines: ["Requires a reason. Same weight as the fee waiver at check-in."],
      onConfirm: (reason) => {
        void (async () => {
          if (!reason.trim()) {
            toast({ title: "Reason required", description: "Say why this balance is being closed without collection.", variant: "destructive" })
            return
          }
          if (!isGuid(diagnosticVisitId)) {
            toast({ title: "No visit selected", variant: "destructive" })
            return
          }
          try {
            const result = await overrideVisitBalance.mutateAsync({
              visitId: diagnosticVisitId,
              reason: reason.trim(),
            })
            closeModal()
            toast({
              title: "Balance overridden",
              description: `${result.itemsOverridden} item${result.itemsOverridden === 1 ? "" : "s"} · ${formatPharmacyRupees(result.amountOverridden)} closed without collecting.`,
            })
          } catch (err) {
            toast({
              title: "Could not override the balance",
              description: getToastErrorMessage(err, "Override failed"),
              variant: "destructive",
            })
          }
        })()
      },
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
          {(dxPatientLabel || searchParams.get("name")) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-adminreg-muted">
              <span>{dxPatientLabel || searchParams.get("name")}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <BranchSelect
            value={visitClinicId || branchId}
            onValueChange={changeVisitBranch}
            branches={branches}
            isLoading={isLoadingBranches}
          />
          {s >= 3 && (
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted sm:inline">
                Patient
              </span>
              <Select
                value={selectedPatientKey || undefined}
                onValueChange={(id) => {
                  const token = todayPatientOptions.find((t) => visitTokenKey(t) === id)
                  if (token) openVisitFromToken(token)
                }}
                disabled={liveQueueLoading || todayPatientOptions.length === 0}
              >
                <SelectTrigger
                  className={cn(
                    "h-10 w-[220px] border-adminreg-border bg-adminreg-border/30 text-sm font-medium text-adminreg-text shadow-none",
                    "hover:bg-adminreg-border/40 focus:ring-adminreg-olive"
                  )}
                >
                  <SelectValue placeholder={liveQueueLoading ? "Loading…" : "Select patient"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedPatientKey &&
                    !todayPatientOptions.some((t) => visitTokenKey(t) === selectedPatientKey) && (
                      <SelectItem value={selectedPatientKey}>
                        {dxPatientLabel || searchParams.get("name") || "Current patient"}
                      </SelectItem>
                    )}
                  {todayPatientOptions.map((token) => (
                    <SelectItem key={token.id} value={visitTokenKey(token)}>
                      {token.patientName || token.tokenNumber || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
                        {completingPatient
                          ? `${completingPatient.uhid || "Existing record"} · fill any missing details`
                          : newPatientOrigin === "search"
                            ? `Reached from search · 0 records found`
                            : "Direct entry · no search run"}
                      </span>
                      <span className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted">
                        {completingPatient ? "Complete patient details" : "New patient capture"}
                      </span>
                    </div>

                    {newPatientTouched && Object.keys(newPatientErrors(newPatientForm)).length > 0 && (
                      <div className="mb-3 border border-adminreg-red bg-adminreg-red-soft px-3 py-2 text-xs font-semibold text-adminreg-red-text">
                        {Object.keys(newPatientErrors(newPatientForm)).length} of 4 mandatory fields still need attention
                      </div>
                    )}
                    {pendingDuplicateConfirm && (
                      <div className="mb-3 border border-adminreg-amber bg-adminreg-amber-soft px-3 py-2 text-xs text-adminreg-amber-text">
                        Similar patient(s) found. Choose Yes to continue with this number, or No to stay on this form.
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
                          {GENDER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {newPatientTouched && newPatientErrors(newPatientForm).gender && <p className="mt-1 text-[11px] text-adminreg-red-text">{newPatientErrors(newPatientForm).gender}</p>}
                      </div>
                      <div className="col-span-2">
                        <div className="mb-1 flex items-center justify-between">
                          <FieldLabel>Mobile</FieldLabel>
                          <span className="flex items-center gap-1.5">
                            {newPatientOrigin === "search" && newPatientForm.mobile && (
                              <span className="border border-adminreg-border bg-adminreg-card px-1.5 py-0.5 font-plexmono text-[8.5px] uppercase text-adminreg-muted">
                                {completingPatient ? "From selected record" : "Prefilled from search"}
                              </span>
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
                      <AdminButton
                        type="button"
                        accent="indigo"
                        onClick={() => void submitNewPatient(true)}
                        disabled={createPatient.isPending || updatePatient.isPending}
                      >
                        {(createPatient.isPending || updatePatient.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {completingPatient
                          ? "Confirm and open visit"
                          : "Register and open visit"}
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={() => void submitNewPatient(false)}
                        disabled={createPatient.isPending || updatePatient.isPending}
                      >
                        Save without opening a visit
                      </AdminButton>
                      <button
                        type="button"
                        onClick={() => {
                          if (completingPatient) {
                            setShowNewPatientForm(false)
                            setCompletingPatient(null)
                            completingPrefillId.current = null
                            setNewPatientForm(EMPTY_NEW_PATIENT)
                            setNewPatientTouched(false)
                            setPendingDuplicateConfirm(false)
                            return
                          }
                          clearRegistrationSearch()
                        }}
                        disabled={createPatient.isPending || updatePatient.isPending}
                        className="self-center text-[11px] text-adminreg-muted underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="mt-2.5 text-[11px] text-adminreg-muted">
                      {completingPatient
                        ? "Name, date of birth, gender and mobile are required. Empty fields on this record can be filled here before the visit opens."
                        : "Name, date of birth, gender and mobile number are required before either action will save."}
                    </p>
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
                              onClick={() => openExistingPatientForm(candidate)}
                            >
                              Continue to details
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
                          {editable && <AdminButton type="button" variant="secondary" className="flex-shrink-0" onClick={() => openExistingPatientForm(c)}>Select</AdminButton>}
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
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <FieldLabel>Cards</FieldLabel>
                          <p className="mt-0.5 text-[11px] text-adminreg-muted">PDF or image — ABHA, insurance, ID. Name each card.</p>
                        </div>
                        {editable && (
                          <AdminButton type="button" variant="secondary" onClick={addPendingCard}>
                            <Plus className="h-3.5 w-3.5" />
                            Add card
                          </AdminButton>
                        )}
                      </div>

                      {savedCards.length === 0 && pendingCards.length === 0 ? (
                        <p className="mt-2 text-[11px] text-adminreg-muted">
                          No cards attached yet. Add an ABHA card or any other ID / insurance card.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {savedCards.map((card) => (
                            <div key={card.id} className="border border-adminreg-border bg-adminreg-bg p-2.5">
                              <div className="flex items-end gap-2">
                                <div className="min-w-0 flex-1">
                                  <FieldLabel>Card name</FieldLabel>
                                  <div className="mt-1 border border-adminreg-border bg-adminreg-card px-2.5 py-2 text-sm text-adminreg-text">
                                    {card.name || "Card"}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <FieldLabel>Upload</FieldLabel>
                                  <button
                                    type="button"
                                    onClick={() => openSavedCardPreview(card)}
                                    className="mt-1 flex h-[38px] w-full cursor-pointer items-center gap-2 border border-dashed border-adminreg-border bg-adminreg-card px-2.5 text-left text-sm text-adminreg-text hover:border-adminreg-indigo"
                                    title="Click to preview"
                                  >
                                    <Upload className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate underline">{card.fileName}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
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
                                  {card.file ? (
                                    <button
                                      type="button"
                                      onClick={() => openCardPreview(card.file as File)}
                                      className="mt-1 flex h-[38px] w-full cursor-pointer items-center gap-2 border border-dashed border-adminreg-border bg-adminreg-card px-2.5 text-left text-sm text-adminreg-text hover:border-adminreg-indigo"
                                      title="Click to preview"
                                    >
                                      <Upload className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate underline">{card.file.name}</span>
                                    </button>
                                  ) : (
                                    <label
                                      className={cn(
                                        "mt-1 flex h-[38px] cursor-pointer items-center gap-2 border border-dashed border-adminreg-border bg-adminreg-card px-2.5 text-sm text-adminreg-muted hover:text-adminreg-text",
                                        !editable && "pointer-events-none opacity-60"
                                      )}
                                    >
                                      <Upload className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">Choose PDF or image…</span>
                                      <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        disabled={!editable}
                                        className="hidden"
                                        onChange={(e) => updatePendingCard(card.key, { file: e.target.files?.[0] ?? null })}
                                      />
                                    </label>
                                  )}
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

                      {editable && pendingCards.length > 0 && (
                        <AdminButton
                          type="button"
                          variant="secondary"
                          className="mt-2.5"
                          onClick={() => void saveVisitCards()}
                          disabled={updatePatient.isPending || uploadCards.isPending}
                        >
                          {(updatePatient.isPending || uploadCards.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save cards
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
                {isRazorpayMethod(paymentMethod) && !collection && (
                  <p className="mb-3.5 text-[11px] text-adminreg-muted">
                    UPI and Card open Razorpay test checkout. Use Razorpay test cards / UPI — no real money is charged.
                  </p>
                )}
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
                  <AdminButton type="button" accent="indigo" className="mt-4" onClick={() => void confirmPaymentAndIssueToken()} disabled={collectFee.isPending || razorpayPending}>
                    {(collectFee.isPending || razorpayPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {collection
                      ? "Continue → Token & queue"
                      : isRazorpayMethod(paymentMethod) && totalPayable > 0
                        ? "Pay with Razorpay → Assign token"
                        : "Confirm payment → Assign token"}
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
                {editable && isStageEditable(role, 3) && (
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
                    <LinkAction tone="edit" onClick={openVitalsEdit}>Edit all</LinkAction>
                    <LinkAction tone="amend" onClick={openVitalsAmend}>Correct (already reviewed)</LinkAction>
                    <AdminButton type="button" variant="danger" onClick={() => void retriageAction()} disabled={saveOpdVitals.isPending}>Re-assess — condition changed</AdminButton>
                  </div>
                )}
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {vitalsRaw.map((v) => {
                  const editing = editingVitalKey === v.key
                  return (
                    <div key={v.key} className={cn("relative p-3.5 text-center", v.crit ? "border-2 border-adminreg-red bg-adminreg-red-soft" : "border border-adminreg-border bg-adminreg-card")}>
                      {editable && (
                        <div className="absolute right-2 top-2">
                          <LinkAction tone="edit" onClick={() => startVitalBoxEdit(v.key)}>Edit</LinkAction>
                        </div>
                      )}
                      <div className={cn("font-plexmono text-[10px] tracking-[0.04em]", v.crit ? "text-adminreg-red-text" : "text-adminreg-muted2")}>{v.label}</div>
                      {editing ? (
                        <input
                          autoFocus
                          value={vitalsDraft[v.key as keyof typeof vitalsDraft]}
                          onChange={(e) => setVitalsDraft((prev) => ({ ...prev, [v.key]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              e.preventDefault()
                              setEditingVitalKey(null)
                            }
                          }}
                          placeholder={v.placeholder}
                          className="mt-1.5 w-full border border-adminreg-indigo bg-adminreg-card px-1 py-1 text-center font-plexmono text-[22px] font-bold text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo"
                        />
                      ) : (
                        <div className={cn("mt-1.5 font-plexmono text-[28px] font-bold", v.crit ? "text-adminreg-red-text" : "text-adminreg-text")}>{v.value}</div>
                      )}
                      <div className={cn("mt-0.5 text-[11px]", v.crit ? "text-adminreg-red-text" : "text-adminreg-muted2")}>{v.unit}</div>
                    </div>
                  )
                })}
              </div>
              {state.vitalsAmended && vitals && (
                <div className="mb-3.5">
                  <AddendumNote header={`AMENDMENT · ${ROLE_LABEL[role] ?? "Nurse"}${vitals.notes ? ` · Reason: ${vitals.notes}` : ""}`}>
                    SpO2 corrected to <strong>{vitals.spo2 != null ? `${vitals.spo2}%` : "—"}</strong>. The doctor will see the updated reading.
                  </AddendumNote>
                </div>
              )}
              {(state.retriaged || vitals?.isRetriage) && (
                <div className="mb-3.5">
                  <InlineInfo>Re-assessment logged — patient moved back to nurse queue for fresh vitals before doctor review.</InlineInfo>
                </div>
              )}
              {criticalBanner && (
                <CriticalBanner
                  title={criticalBanner.title}
                  description={criticalBanner.description}
                  action={
                    editable ? (
                      <AdminButton
                        type="button"
                        variant="danger"
                        className="ml-auto"
                        onClick={() =>
                          toast({
                            title: "Escalated",
                            description: "This visit is flagged for the doctor from the vitals thresholds.",
                          })
                        }
                      >
                        Escalate now
                      </AdminButton>
                    ) : undefined
                  }
                />
              )}
              <Panel className="max-w-[640px]">
                <SectionLabel>Chief complaint</SectionLabel>
                {vitalsQuery.isLoading && !vitals && (
                  <p className="mb-2 text-[11px] text-adminreg-muted">Loading vitals…</p>
                )}
                {!isGuid(diagnosticVisitId) && (
                  <p className="mb-2 text-[11px] text-adminreg-amber-text">Collect the consultation fee first — vitals attach to that visit.</p>
                )}
                <textarea
                  rows={3}
                  disabled={!editable}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Why the patient is here today"
                  className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-70"
                />
              </Panel>
              {editable && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {vitalsReadyToSave && (
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={() => void saveDraftVitals(false)}
                      disabled={saveOpdVitals.isPending}
                    >
                      {saveOpdVitals.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save vitals
                    </AdminButton>
                  )}
                  <AdminButton
                    type="button"
                    accent="indigo"
                    onClick={() => void sendToDoctor()}
                    disabled={saveOpdVitals.isPending}
                  >
                    {saveOpdVitals.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send to doctor → Consultation
                  </AdminButton>
                </div>
              )}
            </div>
          )}

          {s === 4 && awaitingVisitContext && (
            <Panel className="max-w-[720px]">
              <p className="text-sm text-adminreg-muted">Loading this visit…</p>
            </Panel>
          )}
          {s === 4 && !awaitingVisitContext && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <Panel className="mb-3.5">
                  <SectionLabel>Visit history thread</SectionLabel>
                  {consultContextQuery.isLoading && visitHistory.length === 0 && (
                    <div className="border-t border-adminreg-divider py-2.5 text-xs text-adminreg-muted">Loading visit history…</div>
                  )}
                  {visitHistory.map((h) => (
                    <div key={h.key} className="border-t border-adminreg-divider py-2.5">
                      <div className="font-plexmono text-[11px] text-adminreg-muted">{h.time} · {h.by}</div>
                      <div className="mt-0.5 text-xs text-adminreg-text">{h.what}</div>
                    </div>
                  ))}
                  {!consultContextQuery.isLoading && visitHistory.length === 0 && (
                    <div className="border-t border-adminreg-divider py-2.5 text-xs text-adminreg-muted">No prior visits on file.</div>
                  )}
                </Panel>
                {vitals?.isEmergencyEscalation && (
                  <div className="border border-adminreg-red bg-adminreg-red-soft px-4 py-3.5 text-xs text-adminreg-red-text">
                    Nurse escalation: {criticalBanner?.title || "Vitals flagged at triage."}
                  </div>
                )}
              </div>
              <Panel>
                <div className="flex justify-between">
                  <h2 className="font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2">
                    {consultNote ? "Clinical notes — signed" : "Clinical notes"}
                  </h2>
                  <span className="font-plexmono text-[10px] text-adminreg-muted">
                    {consultNote
                      ? [signedNoteDoctor, signedNoteWhen].filter(Boolean).join(" · ")
                      : consultNoteQuery.isLoading
                        ? "Loading…"
                        : ""}
                  </span>
                </div>
                {consultNote ? (
                  <div className="border-b border-adminreg-divider py-2.5 text-sm leading-relaxed">
                    {signedNoteBody || "—"}
                    {consultNote.followUpInstructions ? (
                      <div className="mt-2 text-xs text-adminreg-muted">Follow-up: {consultNote.followUpInstructions}</div>
                    ) : null}
                  </div>
                ) : editable ? (
                  <>
                    <textarea
                      rows={4}
                      value={clinicalNotesDraft}
                      onChange={(e) => setClinicalNotesDraft(e.target.value)}
                      placeholder="Findings, impression, and plan"
                      className="mt-2 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm leading-relaxed text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo"
                    />
                    <FieldLabel>Follow-up</FieldLabel>
                    <input
                      value={followUpDraft}
                      onChange={(e) => setFollowUpDraft(e.target.value)}
                      placeholder="e.g. Review in 7 days, Cardiology OPD"
                      className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo"
                    />
                  </>
                ) : (
                  <div className="border-b border-adminreg-divider py-2.5 text-sm leading-relaxed text-adminreg-muted">
                    No notes signed for this visit yet.
                  </div>
                )}
                <div className="space-y-2.5 pt-2.5">
                  {consultAddendums.map((a) => (
                    <AddendumNote
                      key={a.id}
                      header={`ADDENDUM · ${a.amendedByName || "Doctor"} · ${formatConsultWhen(a.amendedAt, true)} · Reason: ${a.reason || "Clarification"}`}
                    >
                      {a.amendmentText}
                    </AddendumNote>
                  ))}
                </div>
                {editable && consultNote && (
                  <AdminButton type="button" variant="secondary" className="mt-3" onClick={openAddendum}>+ Add addendum</AdminButton>
                )}
                {editable && !consultNote && (
                  <AdminButton
                    type="button"
                    accent="indigo"
                    className="mt-3"
                    onClick={() => void signClinicalNotes()}
                    disabled={createConsultationNote.isPending || !clinicalNotesDraft.trim()}
                  >
                    {createConsultationNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign notes
                  </AdminButton>
                )}

                {editable && (
                  <>
                    <div className="mt-5"><SectionLabel>Next step</SectionLabel></div>
                    <div className="mb-3.5 flex flex-wrap gap-2">
                      <AdminButton type="button" accent="indigo" onClick={() => setInlineDxOpen((v) => !v)}>{inlineDxOpen ? "Close diagnostics order" : "Order diagnostics"}</AdminButton>
                      <AdminButton type="button" variant="secondary" onClick={() => { patch({ diagnosticsSkipped: true }); goToStage(6) }}>Skip — prescribe directly</AdminButton>
                      <AdminButton type="button" variant="secondary" onClick={openReferSpecialist}>Refer to specialist</AdminButton>
                      {!hasReferral && !referralConfirming && (
                        <AdminButton type="button" variant="secondary" className="border-adminreg-ipd text-adminreg-ipd hover:bg-adminreg-ipd/10" onClick={() => setReferralConfirming(true)}>
                          Admission needed (→ IPD)
                        </AdminButton>
                      )}
                      {referralConfirming && !hasReferral && (
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
                      visitId={diagnosticVisitId || PATIENT.visitId}
                      patientLabel={dxPatientLabel}
                      orderingDoctor={dxOrderingDoctor}
                      clinicId={clinicId}
                      paymentMethod={collection?.paymentMethod}
                      existingOrders={dxOrders.map((o) => ({
                        id: o.id,
                        name: o.testName || "Test",
                        price: o.amount || 0,
                        statusLabel: o.statusLabel,
                        isVoid: o.isVoid,
                      }))}
                      onConfirm={refreshDx}
                    />
                  </div>
                )}
                {dxOrders.filter((o) => !o.isVoid && o.canVoid).map((order) => (
                  <div key={order.id} className="flex items-center justify-between bg-adminreg-header px-3.5 py-2.5">
                    <span className="text-xs">{order.testName} — {order.statusLabel || "ordered"}</span>
                    {editable && <LinkAction tone="void" onClick={() => openVoidOrder(order)}>Cancel before collection</LinkAction>}
                  </div>
                ))}

                {editable && referralConfirming && !hasReferral && (
                  <div className="mt-3.5 border-t-[3px] border-adminreg-ipd bg-adminreg-ipd/[0.06] p-3.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div>
                        <span className="mb-1.5 inline-block border border-adminreg-ipd bg-adminreg-card px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase tracking-[0.04em] text-adminreg-ipd">
                          {REFERRAL_STATE_BADGE.confirming}
                        </span>
                        <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-ipd">Confirm admission referral</div>
                      </div>
                      <span onClick={() => setReferralConfirming(false)} className="cursor-pointer text-[11px] text-adminreg-muted underline">Cancel</span>
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
                          <div>{signedNoteBody || consultNote?.diagnosis || "—"}</div>
                          <div className="text-[10px] text-adminreg-muted">
                            {consultNote ? `Clinical notes, signed ${signedNoteWhen || ""}`.trim() : "Clinical notes not signed"}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">Vitals at referral</div>
                          <div>
                            BP {vitals?.bloodPressure || "—"} · HR {vitals?.heartRateBpm ?? "—"} · SpO2 {vitals?.spo2 ?? "—"}
                            {vitals?.isEmergencyEscalation ? " (flagged at triage)" : ""}
                          </div>
                          <div className="text-[10px] text-adminreg-muted">Vitals &amp; Triage</div>
                        </div>
                        <div>
                          <div className="font-semibold">Diagnostics on file</div>
                          <div>
                            {dxOrders.filter((o) => !o.isVoid).length
                              ? dxOrders.filter((o) => !o.isVoid).map((o) => `${o.testName || "Test"}${o.statusLabel ? ` — ${o.statusLabel}` : ""}`).join(", ")
                              : "—"}
                          </div>
                          <div className="text-[10px] text-adminreg-muted">Diagnostics, this visit</div>
                        </div>
                        <div>
                          <div className="font-semibold">Referring doctor</div>
                          <div>{dxOrderingDoctor}</div>
                          <div className="text-[10px] text-adminreg-muted">{diagnosticVisitId || PATIENT.visitId}</div>
                        </div>
                      </div>
                    </div>
                    <AdminButton
                      type="button"
                      className="mt-3 border-adminreg-ipd bg-adminreg-ipd text-adminreg-card hover:bg-adminreg-ipd/90"
                      disabled={!admitReason.trim() || createAdmissionReferral.isPending}
                      onClick={() => void fileAdmissionReferral()}
                    >
                      {createAdmissionReferral.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm admission — bed allocation (→ IPD)
                    </AdminButton>
                  </div>
                )}

                {hasReferral && (
                  <div className="mt-3.5">
                    <div className={cn("border-t-[3px] p-3.5", referralStatus === "admitted" ? "border-adminreg-olive bg-adminreg-olive-soft" : "border-adminreg-ipd bg-adminreg-ipd/[0.06]")}>
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className={cn("font-plexmono text-[10px] font-bold uppercase tracking-[0.04em]", referralStatus === "admitted" ? "text-adminreg-olive-dark" : "text-adminreg-ipd")}>
                          Admission referral · {referralCode || "—"}
                        </span>
                        <span className={cn("border px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase", referralStatus === "admitted" ? "border-adminreg-olive text-adminreg-olive-dark" : "border-adminreg-ipd text-adminreg-ipd")}>
                          {referralStatusLabel(referralStatus)}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {referralTimeline.map((step) => (
                          <div key={step.step || step.label} className="flex gap-2.5">
                            <span className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0 border border-adminreg-ipd", step.completed && "bg-adminreg-ipd")} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-adminreg-text">{step.label}</span>
                                <span className="flex-shrink-0 font-plexmono text-[10px] text-adminreg-muted">
                                  {formatConsultWhen(step.timestamp, true) || "—"}
                                </span>
                              </div>
                              {step.detail && <p className="text-[11px] text-adminreg-muted">{step.detail}</p>}
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="mt-3 border-t border-adminreg-divider pt-2.5 text-[11px] text-adminreg-muted">
                        Reason filed: {referralReason}
                      </p>
                      {referralStatus === "admitted" && (
                        <a
                          href={referralStatusView?.ipdAdmissionId ? `/ipd/stay?stage=1&admissionId=${referralStatusView.ipdAdmissionId}` : "/ipd/stay?stage=1"}
                          className="mt-2 inline-block text-[11px] font-semibold text-adminreg-olive-dark underline"
                        >
                          Open IPD admission{referralStatusView?.ipdAdmissionId ? ` ${referralStatusView.ipdAdmissionId}` : ""} →
                        </a>
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
            ) : awaitingVisitContext ? (
              <Panel className="max-w-[720px]">
                <p className="text-sm text-adminreg-muted">Loading this visit…</p>
              </Panel>
            ) : (
              <div className="space-y-6">
              {role === "labtech" ? (
                <DxOrderPanel
                  editable={editable}
                  visitId={diagnosticVisitId}
                  patientLabel={dxPatientLabel}
                  orderingDoctor={dxOrderingDoctor}
                  clinicId={clinicId}
                  paymentMethod={collection?.paymentMethod}
                  existingOrders={dxOrders.map((o) => ({
                    id: o.id,
                    name: o.testName || "Test",
                    price: o.amount || 0,
                    statusLabel: o.statusLabel,
                    isVoid: o.isVoid,
                  }))}
                  onConfirm={refreshDx}
                />
              ) : (
                <InlineInfo>
                  Doctors order tests from Consultation. This stage is for Lab / Radiology Tech — sample collection, imaging, and result entry.
                  {" "}
                  <a href="/opd/diagnostics?screen=sample-collection" className="font-semibold underline">Open Sample Collection →</a>
                </InlineInfo>
              )}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Panel>
                  <SectionLabel>Ordered tests</SectionLabel>
                  {dxVisitQuery.isLoading && dxOrders.length === 0 && (
                    <div className="border-t border-adminreg-divider py-2 text-sm text-adminreg-muted">Loading orders…</div>
                  )}
                  {!dxVisitQuery.isLoading && dxOrders.length === 0 && (
                    <div className="border-t border-adminreg-divider py-2 text-sm text-adminreg-muted">No tests ordered on this visit yet.</div>
                  )}
                  {dxOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between border-t border-adminreg-divider py-2 text-sm">
                      <span className={order.isVoid ? SUPERSEDED_CLASS : ""}>{order.testName}</span>
                      <span className={cn("font-plexmono text-adminreg-muted", order.isVoid && SUPERSEDED_CLASS)}>₹{(order.amount || 0).toLocaleString("en-IN")}</span>
                      {order.isVoid ? (
                        <SupersededTag />
                      ) : editable && order.canEdit ? (
                        <LinkAction tone="edit" onClick={() => openOrderEdit(order)}>Edit</LinkAction>
                      ) : editable && order.canVoid ? (
                        <LinkAction tone="void" onClick={() => openVoidOrder(order)}>Void</LinkAction>
                      ) : null}
                    </div>
                  ))}
                  {dxOrders.some((o) => o.isVoid) && (
                    <p className="mt-2 text-[11px] text-adminreg-amber-text">
                      {dxOrders.filter((o) => o.isVoid).map((o) => o.voidReason
                        ? `${o.testName} cancelled. ${o.voidReason}`
                        : `${o.testName} cancelled before sample collection.`).join(" ")}
                    </p>
                  )}
                  {dxVisit?.tpaLabel && <div className="mt-3.5"><InlineInfo>{dxVisit.tpaLabel}</InlineInfo></div>}
                  {dxOrders.some((o) => !o.isVoid && !o.sampleCollectedAt) && (
                    <p className="mt-2 text-[11px] text-adminreg-muted">
                      Confirmed lab tests go to{" "}
                      <a href="/opd/diagnostics?screen=sample-collection" className="font-semibold underline">Sample Collection</a>
                      . Scans go to{" "}
                      <a href="/opd/diagnostics?screen=imaging-performed" className="font-semibold underline">Imaging Performed</a>
                      . Continue this visit with Back to doctor → e-Prescription.
                    </p>
                  )}
                </Panel>
                <Panel>
                  <SectionLabel>Results</SectionLabel>
                  {dxOrders.filter((o) => !o.isVoid).map((order) => {
                    const live = order.result
                    const amended = (order.history?.length ?? 0) > 0 && !!live
                    const pending = !live
                    const tone: "green" | "amber" = pending || live?.abnormalFlag || live?.status === "PendingRadiologist" || amended ? "amber" : "green"
                    const tag = live?.abnormalFlag === "CRITICAL"
                      ? "CRITICAL"
                      : live?.abnormalFlag === "ABNORMAL"
                        ? "ABNORMAL"
                        : live?.status === "PendingRadiologist"
                          ? "PENDING RADIOLOGIST"
                          : amended
                            ? "AMENDED"
                            : live?.display || order.statusLabel || "PENDING"
                    const superseded = order.history?.[0]
                    return (
                      <div key={order.id} className="border-t border-adminreg-divider py-2.5">
                        <div className="flex items-center justify-between"><span className="text-sm">{order.testName}</span><ResultTag tone={tone}>{tag}</ResultTag></div>
                        {amended && live && (
                          <div className="mt-2">
                            <AddendumNote header={`AMENDMENT · ${live.enteredByName || "Lab"} · Reason: ${live.amendmentReason || "Correction"}`}>
                              Result {superseded?.display ? <><span className={SUPERSEDED_CLASS}>{superseded.display}</span><SupersededTag /> — corrected to <strong>{live.display}</strong>.</> : <>Corrected to <strong>{live.display}</strong>.</>}
                            </AddendumNote>
                          </div>
                        )}
                        {editable && live?.canAmend && !amended && (
                          <LinkAction tone="amend" onClick={() => openResultAmend(order)}>Correct result (already reviewed)</LinkAction>
                        )}
                      </div>
                    )
                  })}
                  {dxVisit?.criticalAlerts?.map((alert) => (
                    <div key={alert.resultId} className="mt-3.5">
                      <CriticalBanner title={`⚠ CRITICAL RESULT — ${alert.display || alert.testName}`} description={alert.notifiedDoctor ? "Auto-flagged and pushed to doctor." : "Auto-flagged."} />
                    </div>
                  ))}
                  {editable && <AdminButton type="button" accent="indigo" className="mt-2" onClick={goNext}>Back to doctor → e-Prescription</AdminButton>}
                </Panel>
              </div>
              </div>
            )
          )}

          {s === 6 && (
            <div className="space-y-4">
              <RxAddPanel
                editable={rxCanEdit}
                visitId={diagnosticVisitId}
                clinicId={clinicId}
                statusLabel={rxVisit?.statusLabel || "Not yet sent to pharmacy"}
                prescriberReg={rxPrescriberReg}
                prescriberName={rxPrescriberName}
                existingDrugs={rx.map((r) => r.drug)}
              />
              <div className="border border-adminreg-border bg-adminreg-card">
                <div className="grid grid-cols-[1.2fr_1fr_80px_90px_1fr] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Drug</span><span>Dosage</span><span>Duration</span><span>Schedule</span><span /></div>
                {rx.map((r) => (
                  <div key={r.id} className={cn("border-t border-adminreg-divider px-4 py-2.5", r.schedule && "bg-adminreg-red-soft/40")}>
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
              {rxInteractions.map((interaction, index) => (
                <div key={`${interaction.genericA}-${interaction.genericB}-${index}`} className="mt-3.5 max-w-[640px]">
                  <InlineWarning>⚠ Interaction check: {interaction.message || `${interaction.genericA} with ${interaction.genericB}.`}</InlineWarning>
                </div>
              ))}
              {editable && (
                <AdminButton
                  type="button"
                  accent="indigo"
                  className="mt-4"
                  disabled={sendRxToPharmacy.isPending}
                  onClick={() => {
                    void (async () => {
                      if (!isGuid(diagnosticVisitId)) {
                        toast({ title: "No visit yet", description: "Collect the consultation fee first — the prescription attaches to that visit.", variant: "destructive" })
                        return
                      }
                      try {
                        await sendRxToPharmacy.mutateAsync(diagnosticVisitId)
                        goNext()
                      } catch (err) {
                        toast({
                          title: "Could not send to pharmacy",
                          description: err instanceof Error ? err.message : "Try again.",
                          variant: "destructive",
                        })
                      }
                    })()
                  }}
                >
                  {sendRxToPharmacy.isPending ? "Sending…" : "Send to pharmacy → Dispensing"}
                </AdminButton>
              )}
            </div>
          )}

          {s === 7 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="border border-adminreg-border bg-adminreg-card">
                <div className="grid grid-cols-[1.3fr_1fr_70px_80px_1fr] bg-adminreg-header px-4 py-2.5 text-[11px] font-bold text-adminreg-muted"><span>Drug</span><span>Stock</span><span>Qty</span><span>Amount</span><span /></div>
                {pharmacyOrderQuery.isLoading && (
                  <div className="border-t border-adminreg-divider px-4 py-8 text-sm text-adminreg-muted">Loading pharmacy order…</div>
                )}
                {pharmacyOrderQuery.isError && (
                  <div className="border-t border-adminreg-divider px-4 py-8 text-sm text-adminreg-red">
                    {getToastErrorMessage(pharmacyOrderQuery.error, "Failed to load pharmacy order")}
                  </div>
                )}
                {!pharmacyOrderQuery.isLoading && !pharmacyOrderQuery.isError && pharmacyItems.length === 0 && (
                  <div className="border-t border-adminreg-divider px-4 py-8 text-sm text-adminreg-muted">
                    {isGuid(diagnosticVisitId) ? "No prescription items to dispense." : "Select a patient to load the prescription."}
                  </div>
                )}
                {pharmacyItems.map((item) => {
                  const lineVoided = pharmacyVoidedProductIds.includes(item.productId)
                  const lowStock = /only |shortage|out of stock/i.test(item.stockStatus)
                  const qty = item.quantityToDispense
                  const amount = item.unitPrice * qty
                  return (
                    <div key={item.productId}>
                      <div className={cn(
                        "grid grid-cols-[1.3fr_1fr_70px_80px_1fr] items-center border-t border-adminreg-divider px-4 py-2.5 text-sm",
                        lineVoided && "bg-adminreg-red-soft/40",
                        !lineVoided && lowStock && "bg-adminreg-red-soft"
                      )}>
                        <span className={lineVoided ? SUPERSEDED_CLASS : ""}>{item.drugName}{item.strength ? ` ${item.strength}` : ""}</span>
                        <span className={lineVoided ? SUPERSEDED_CLASS : lowStock ? "font-bold text-adminreg-red-text" : "text-adminreg-olive-dark"}>{item.stockStatus || "—"}</span>
                        <span className={cn("font-plexmono", lineVoided && SUPERSEDED_CLASS)}>{qty}</span>
                        <span className={cn("font-plexmono", lineVoided && SUPERSEDED_CLASS)}>{formatPharmacyRupees(amount)}</span>
                        {!lineVoided ? (editable && !pharmacyIsDispensed && <LinkAction tone="void" onClick={() => voidBillLine(item.productId)}>Void</LinkAction>) : <SupersededTag />}
                      </div>
                      {item.quantityShortfall > 0 && !lineVoided && (
                        <div className="border-t border-adminreg-divider px-4 py-2.5 text-[11px] text-adminreg-red-text">
                          {item.shortfallReason || item.stockStatus}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="flex items-center justify-between gap-3 border-t border-adminreg-amber bg-adminreg-amber-soft px-4 py-3">
                  <div>
                    <div className="text-[11px] font-bold text-adminreg-amber-text">SCHEDULE H1 REGISTER</div>
                    <div className="mt-0.5 text-[11px] text-adminreg-amber-text">
                      {pharmacyOrder?.hasControlledSubstances
                        ? `H1/X items on this visit: ${pharmacyItems.filter((i) => i.isControlledSubstance).map((i) => i.drugName).join(", ") || "controlled substances present"}.`
                        : "Register clean for this visit — no H1-class items dispensed."}
                    </div>
                  </div>
                  {editable && <AdminButton type="button" variant="secondary" onClick={openReturn}>Process return</AdminButton>}
                </div>
                {state.returnProcessed && (
                  <div className="m-4">
                    <AddendumNote header="RETURN · Pharmacist · Reason: logged from dispensing">Original dispense entry retained on record, cross-referenced to the return.</AddendumNote>
                  </div>
                )}
              </div>
              <Panel>
                <SectionLabel>Bill summary</SectionLabel>
                <div className="flex justify-between py-1.5 text-sm"><span>Subtotal</span><span className="font-plexmono">{formatPharmacyRupees(pharmacySubtotal, true)}</span></div>
                <div className="flex justify-between py-1.5 text-sm"><span>GST ({Math.round(pharmacyGstRate)}%)</span><span className="font-plexmono">{formatPharmacyRupees(pharmacyGst, true)}</span></div>
                <div className="mt-1.5 flex justify-between border-t border-adminreg-divider py-2 text-sm font-bold"><span>Total</span><span className="font-plexmono">{formatPharmacyRupees(pharmacyTotal, true)}</span></div>
                {editable && <button type="button" onClick={openBillVoid} className="my-2.5 block text-[11px] text-adminreg-amber-text underline">Void entire bill</button>}
                {(state.pharmBillVoided || pharmacyCreditNote) && (
                  <p className="mb-2.5 text-[11px] text-adminreg-amber-text">
                    Invoice {pharmacyExisting?.receiptNumber || "pharmacy bill"} voided. GST credit note {pharmacyCreditNote?.creditNoteNumber || ""} generated; original invoice remains on file.
                  </p>
                )}
                {editable && (
                  <AdminButton
                    type="button"
                    accent="indigo"
                    className="mt-1.5"
                    disabled={dispenseAndBill.isPending || pharmacyOrderQuery.isLoading || pharmacyItems.length === 0}
                    onClick={() => {
                      void (async () => {
                        if (pharmacyIsDispensed || pharmacyCreditNote) {
                          goNext()
                          return
                        }
                        const items = pharmacyBillableItems
                          .map((item) => ({
                            productId: item.productId,
                            inventoryId: item.inventoryId || null,
                            drugName: item.drugName,
                            batchNumber: item.batchNumber || null,
                            lotNumber: item.lotNumber || null,
                            quantityPrescribed: item.quantityPrescribed,
                            quantityDispensed: item.quantityToDispense,
                            quantityShortfall: item.quantityShortfall,
                            dispenseAction: item.dispenseAction,
                            shortfallReason: item.shortfallReason || null,
                            unitPrice: item.unitPrice,
                            gstRate: item.gstRate,
                            isControlledSubstance: item.isControlledSubstance,
                            controlledSchedule: item.controlledSchedule || null,
                          }))
                        if (items.length === 0) {
                          toast({ title: "Nothing to dispense", description: "All lines were voided.", variant: "destructive" })
                          return
                        }
                        try {
                          await dispenseAndBill.mutateAsync({
                            visitId: diagnosticVisitId,
                            patientId: pharmacyOrder?.patientId || collection?.patientId || null,
                            prescribedBy: pharmacyOrder?.doctorId || collection?.userId || null,
                            paymentMethod: toPharmacyPaymentMethod(collection?.paymentMethod),
                            paymentStatus: "Paid",
                            items,
                          })
                          goNext()
                        } catch (err) {
                          toast({
                            title: "Could not collect pharmacy payment",
                            description: getToastErrorMessage(err, "Dispense failed"),
                            variant: "destructive",
                          })
                        }
                      })()
                    }}
                  >
                    {dispenseAndBill.isPending ? "Collecting…" : "Collect payment → Close visit"}
                  </AdminButton>
                )}
              </Panel>
            </div>
          )}

          {s === 8 && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-adminreg-border bg-adminreg-header px-4 py-3">
                <div className="font-plexmono text-[11px] font-bold uppercase tracking-[0.06em] text-adminreg-muted">
                  Visit balance · collected at closure
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-plexmono text-[10px] uppercase tracking-[0.06em] text-adminreg-muted2">Balance state</span>
                  {(["Outstanding balance", "All cashless — zero balance"] as const).map((label) => {
                    const active = balanceQuery.isSuccess && (label === "Outstanding balance" ? outstanding : !outstanding)
                    return (
                      <span
                        key={label}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold",
                          active
                            ? "border border-adminreg-border bg-adminreg-card text-adminreg-text"
                            : "border border-adminreg-border bg-transparent text-adminreg-muted"
                        )}
                      >
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {(balanceQuery.isLoading || closureQuery.isLoading) && (
                <p className="mb-4 text-sm text-adminreg-muted">Loading visit balance…</p>
              )}
              {balanceQuery.isError && (
                <div className="mb-4"><InlineWarning>Could not load the visit balance.</InlineWarning></div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <div className="border border-adminreg-border bg-adminreg-card p-[18px]">
                  <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.06em] text-adminreg-muted2">
                    Due now — self-pay diagnostics
                  </div>
                  {dueItems.length === 0 && (
                    <p className="mt-3 text-sm text-adminreg-muted">No self-pay diagnostics due on this visit.</p>
                  )}
                  {dueItems.map((item) => (
                    <div key={item.orderId} className="mt-3 flex items-baseline justify-between gap-4 text-sm">
                      <span>
                        {item.testName || "Test"}
                        {(item.testCode || item.orderNumber) && (
                          <span className="ml-2 font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2">
                            {item.testCode || item.orderNumber}
                          </span>
                        )}
                      </span>
                      <span className="font-plexmono">{formatPharmacyRupees(item.amount)}</span>
                    </div>
                  ))}
                  <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-adminreg-text pt-2 text-sm font-bold">
                    <span>Payable now</span>
                    <span className="font-plexmono">{formatPharmacyRupees(payableNow)}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-adminreg-muted">Accrued at ordering (Diagnostics), not collected there.</p>

                  {coverageItems.length > 0 && (
                    <div className="mt-6">
                      <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.06em] text-adminreg-muted2">
                        Coverage-confirmed — not payable
                      </div>
                      {coverageItems.map((item) => (
                        <div key={item.orderId} className="mt-3">
                          <div className="flex items-baseline justify-between gap-4 text-sm">
                            <span>
                              {item.testName || "Test"}
                              {(item.testCode) && (
                                <span className="ml-2 font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2">{item.testCode}</span>
                              )}
                            </span>
                            <span className="font-plexmono text-adminreg-muted">{formatPharmacyRupees(item.amount)}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-adminreg-indigo">
                            {[item.tpaName, item.tpaPreauthRef ? `pre-auth ${item.tpaPreauthRef}` : null, "coverage confirmed at ordering"].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6">
                    <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.06em] text-adminreg-muted2">
                      Already collected this visit
                    </div>
                    {collectedItems.length === 0 && (
                      <p className="mt-3 text-sm text-adminreg-muted">Nothing collected yet.</p>
                    )}
                    {collectedItems.map((item, index) => (
                      <div key={`${item.source}-${item.receiptNumber || "none"}-${item.description}-${index}`} className="mt-3">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="flex flex-wrap items-center gap-2">
                            {collectedHeading(item.source, item.description, feeDepartmentName)}
                            <span className="border border-adminreg-olive px-1.5 py-0.5 font-plexmono text-[9px] font-bold uppercase tracking-wide text-adminreg-olive-dark">Settled</span>
                          </span>
                          <span className="font-plexmono">{formatPharmacyRupees(item.amount)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-adminreg-muted">
                          {collectedCaption(item.source, item.paymentMethod, item.receiptNumber)}
                        </p>
                      </div>
                    ))}
                    <p className="mt-4 text-[11px] text-adminreg-muted">
                      Three separate transactions — consultation at check-in, pharmacy at dispensing, diagnostics here. They are not merged into a single bill.
                    </p>
                  </div>
                </div>

                <Panel>
                  <SectionLabel>Payment method</SectionLabel>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {["Cash", "Card", "UPI"].map((method) => {
                      const active = closurePayMethod === method
                      return (
                        <button
                          key={method}
                          type="button"
                          disabled={!editable || visitIsClosed}
                          onClick={() => setClosurePayMethod(method)}
                          className={cn(
                            "px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                            active
                              ? "border-[1.5px] border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark"
                              : "border border-adminreg-border bg-adminreg-bg text-adminreg-muted"
                          )}
                        >
                          {method}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mb-4 text-[11px] text-adminreg-muted">Same collection step as check-in — mode, collect, receipt.</p>
                  {isRazorpayMethod(closurePayMethod) && (
                    <p className="mb-4 text-[11px] text-adminreg-muted">
                      UPI and Card open Razorpay test checkout. Use Razorpay test cards / UPI — no real money is charged.
                    </p>
                  )}

                  {editable && outstanding && !visitIsClosed && (
                    <AdminButton
                      type="button"
                      accent="indigo"
                      className="w-full"
                      disabled={collectVisitBalance.isPending || razorpayPending || !isGuid(diagnosticVisitId)}
                      onClick={() => {
                        void (async () => {
                          if (!isGuid(diagnosticVisitId)) {
                            toast({ title: "No visit selected", variant: "destructive" })
                            return
                          }
                          try {
                            let transactionReference: string | null = null
                            if (isRazorpayMethod(closurePayMethod)) {
                              setRazorpayPending(true)
                              const order = await createRazorpayOrder(payableNow, diagnosticVisitId)
                              const checkout = await openRazorpayCheckout({
                                order,
                                description: `Diagnostics balance · ${closurePayMethod}`,
                                prefillName: closure?.patientName || activePatient?.name || "",
                                prefillContact: closure?.patientPhone || activePatient?.phone || "",
                                preferredMethod: closurePayMethod.toLowerCase().includes("card") ? "card" : "upi",
                              })
                              transactionReference = await verifyRazorpayPayment(checkout)
                              setRazorpayPending(false)
                            }
                            const result = await collectVisitBalance.mutateAsync({
                              visitId: diagnosticVisitId,
                              paymentMethod: closurePayMethod,
                              transactionReference,
                            })
                            toast({
                              title: "Diagnostics collected",
                              description: `Receipt ${result.receiptNumber} · ${formatPharmacyRupees(result.amountCollected)}`,
                            })
                          } catch (err) {
                            setRazorpayPending(false)
                            toast({
                              title: "Could not collect the balance",
                              description: getToastErrorMessage(err, "Collection failed"),
                              variant: "destructive",
                            })
                          }
                        })()
                      }}
                    >
                      {(collectVisitBalance.isPending || razorpayPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {collectVisitBalance.isPending || razorpayPending
                        ? "Collecting…"
                        : isRazorpayMethod(closurePayMethod)
                          ? `Pay with Razorpay → ${formatPharmacyRupees(payableNow)}`
                          : `Collect ${formatPharmacyRupees(payableNow)} → generate receipt`}
                    </AdminButton>
                  )}

                  {editable && outstanding && !visitIsClosed && (
                    <div className="mt-3">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        className="w-full"
                        disabled={overrideVisitBalance.isPending || !isGuid(diagnosticVisitId)}
                        onClick={openBalanceOverride}
                      >
                        {overrideVisitBalance.isPending ? "Overriding…" : "Override — close without collecting"}
                      </AdminButton>
                      <p className="mt-2 text-[11px] text-adminreg-muted">Requires a reason. Same weight as the fee waiver at check-in.</p>
                    </div>
                  )}

                  {!outstanding && balanceQuery.isSuccess && (
                    <p className="text-sm text-adminreg-muted">Nothing left to collect. Covered tests stay with the TPA; settled charges already have their own receipts.</p>
                  )}

                  {visitIsPending && (
                    <div className="mt-4"><InlineWarning>Visit close is pending unfinished reports or tests.</InlineWarning></div>
                  )}
                  {pendingItems.length > 0 && !visitIsClosed && (
                    <p className="mt-3 text-[11px] text-adminreg-muted">
                      {pendingItems.length} report{pendingItems.length === 1 ? "" : "s"} still unfinished. Closing now marks the visit pending.
                    </p>
                  )}

                  {editable && !visitIsClosed && (
                    <AdminButton
                      type="button"
                      variant="secondary"
                      className="mt-4 w-full"
                      disabled={closeVisit.isPending || !isGuid(diagnosticVisitId)}
                      onClick={() => {
                        void (async () => {
                          if (!isGuid(diagnosticVisitId)) {
                            toast({ title: "No visit selected", variant: "destructive" })
                            return
                          }
                          try {
                            const result = await closeVisit.mutateAsync(diagnosticVisitId)
                            const status = (result.closureStatus || "").toLowerCase()
                            toast({
                              title: status === "pending"
                                ? "Visit marked pending"
                                : status === "converted_to_ipd"
                                  ? "Visit converted to IPD"
                                  : "Visit closed",
                              description: status === "pending"
                                ? "Unfinished tests are still on this visit."
                                : undefined,
                            })
                          } catch (err) {
                            toast({
                              title: "Could not close visit",
                              description: getToastErrorMessage(err, "Close failed"),
                              variant: "destructive",
                            })
                          }
                        })()
                      }}
                    >
                      {closeVisit.isPending ? "Closing…" : "Close visit"}
                    </AdminButton>
                  )}

                  {visitIsClosed && (
                    <div className="mt-4 border-t border-adminreg-divider pt-3.5">
                      <SectionLabel>{closureStatus === "converted_to_ipd" ? "Converted to IPD" : "Visit is closed"}</SectionLabel>
                      {closure?.admissionReferralCode && (
                        <p className="mb-2.5 text-sm text-adminreg-muted">Referral {closure.admissionReferralCode}</p>
                      )}
                      {editable ? (
                        <AdminButton type="button" variant="secondary" onClick={openReopen} disabled={reopenVisit.isPending}>
                          {reopenVisit.isPending ? "Reopening…" : "Reopen visit"}
                        </AdminButton>
                      ) : (
                        <InlineWarning>Your role ({ROLE_LABEL[role]}) cannot reopen a closed visit. Front Desk owns close and reopen.</InlineWarning>
                      )}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card file preview */}
      {cardPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeCardPreview}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col border border-adminreg-border bg-adminreg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-adminreg-divider px-4 py-2.5">
              <span className="truncate text-sm font-semibold text-adminreg-text">{cardPreview.name}</span>
              <button
                type="button"
                onClick={closeCardPreview}
                className="flex-shrink-0 text-adminreg-muted hover:text-adminreg-text"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-adminreg-bg p-3">
              {cardPreview.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cardPreview.url} alt={cardPreview.name} className="mx-auto max-h-[78vh] max-w-full object-contain" />
              ) : (
                <iframe
                  src={cardPreview.url}
                  title={cardPreview.name}
                  className="h-[78vh] w-full border-0 bg-adminreg-card"
                />
              )}
            </div>
          </div>
        </div>
      )}

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
          danger={modal.danger !== false}
          accent="indigo"
          confirmLabel={modal.confirmLabel}
          cancelLabel={modal.cancelLabel}
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
