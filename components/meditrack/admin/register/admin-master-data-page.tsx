"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { cn } from "@/lib/utils"
import {
  ConfirmDialog,
  DetailDrawer,
  FormDialog,
  InfoRow,
  MtButton,
  RowActions,
  TableSkeleton,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { useBranchScope } from "./use-branch-scope"
import {
  useCreateDiagnosisCode,
  useCreateDrug,
  useCreateLabTest,
  useCreateStock,
  useDeleteDiagnosisCode,
  useDeleteDrug,
  useDeleteLabTest,
  useDeleteStock,
  useGetDiagnosisCodes,
  useGetDrugs,
  useGetLabTests,
  useGetStock,
  useUpdateDiagnosisCode,
  useUpdateDrug,
  useUpdateLabTest,
  useUpdateStock,
  type MediTrackDiagnosisCode,
  type MediTrackDrug,
  type MediTrackLabTest,
  type MediTrackStock,
} from "@/queries/meditrack/master-data"
import {
  useCreateTpa,
  useDeleteTpa,
  useGetTpas,
  useUpdateTpa,
  type MediTrackTpa,
} from "@/queries/meditrack/tpas"

type MasterTab = "drugs" | "tests" | "diagnosis" | "insurance" | "pharmacy"

const TABS: { key: MasterTab; label: string; cardTitle: string; addLabel: string; editLabel: string }[] = [
  { key: "drugs", label: "Drugs", cardTitle: "Drug Master", addLabel: "Add drug", editLabel: "Edit drug" },
  { key: "tests", label: "Tests", cardTitle: "Test Master", addLabel: "Add test", editLabel: "Edit test" },
  { key: "diagnosis", label: "Diagnosis Codes", cardTitle: "ICD Master", addLabel: "Add code", editLabel: "Edit code" },
  { key: "insurance", label: "Insurance / TPA", cardTitle: "Payer Master", addLabel: "Add payer", editLabel: "Edit payer" },
  { key: "pharmacy", label: "Pharmacy Stock", cardTitle: "Stock Master", addLabel: "Add stock entry", editLabel: "Edit stock entry" },
]

const SCHEDULE_CLASS =
  "border border-adminreg-red bg-adminreg-red-soft px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-adminreg-red-text"

const TONE_CLASS: Record<"valid" | "warning" | "critical", string> = {
  valid: "text-adminreg-olive-700",
  warning: "text-adminreg-amber-text",
  critical: "text-adminreg-red-text",
}

const SCHEDULE_OPTIONS = ["None", "G", "H", "H1", "X", "M", "P"]
const UNIT_OPTIONS = ["Tablet", "Capsule", "Vial", "Syrup", "Injection"]
const ICD_VERSIONS = ["ICD-10", "ICD-11"]
const PAYER_TYPES = ["TPA", "Government scheme"]
const EMPANELMENT_OPTIONS = ["Empanelled", "Renewal pending", "Not empanelled"]
const STOCK_STATUS_OPTIONS = ["In stock", "Low stock", "Critical stock"]

const EMPTY_DRUG = { name: "", schedule: SCHEDULE_OPTIONS[0], unit: UNIT_OPTIONS[0] }
const EMPTY_TEST = { name: "", code: "", sample: "", tat: "" }
const EMPTY_DIAGNOSIS = { code: "", description: "", version: ICD_VERSIONS[0] }
const EMPTY_PAYER = { name: "", type: PAYER_TYPES[0], empanelment: EMPANELMENT_OPTIONS[0] }
const EMPTY_STOCK = { drug: "", batch: "", expiry: "", qty: "", status: STOCK_STATUS_OPTIONS[0] }

function empanelmentTone(v?: string | null): "valid" | "warning" | "critical" {
  if (v === "Empanelled") return "valid"
  if (v === "Renewal pending") return "warning"
  return "critical"
}

function stockTone(v?: string | null): "valid" | "warning" | "critical" {
  if (v === "In stock") return "valid"
  if (v === "Low stock") return "warning"
  return "critical"
}

function formatSchedule(schedule?: string | null) {
  if (!schedule || schedule === "None") return null
  const trimmed = schedule.trim()
  if (/^sch\.?\s*/i.test(trimmed)) return trimmed
  return `Sch. ${trimmed}`
}

function scheduleToForm(schedule?: string | null) {
  if (!schedule) return "None"
  const cleaned = schedule.replace(/^sch\.?\s*/i, "").trim()
  return SCHEDULE_OPTIONS.includes(cleaned) ? cleaned : "None"
}

function formatLastEdited(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function formatExpiry(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-IN", { month: "2-digit", year: "numeric" })
}

function expiryToForm(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${month}/${date.getUTCFullYear()}`
}

function parseExpiryIso(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const mmYyyy = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (mmYyyy) {
    return new Date(Date.UTC(Number(mmYyyy[2]), Number(mmYyyy[1]) - 1, 1)).toISOString()
  }
  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-adminreg-border bg-adminreg-header text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
          {headers.map((h) => (
            <th key={h} className={cn("px-5 py-3", h === "Action" && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Row({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      className={cn(
        "border-b border-adminreg-divider last:border-0",
        onClick && "cursor-pointer hover:bg-adminreg-header/40"
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-sm text-adminreg-muted">
        {message}
      </td>
    </tr>
  )
}

type WithClinic = { clinicId?: string | null; clinicName?: string | null }

export function AdminMasterDataPage() {
  const { toast } = useToast()
  const { branches } = useBranchScope()
  const [tab, setTab] = useState<MasterTab>("drugs")
  const active = TABS.find((t) => t.key === tab)!

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>()
    branches.forEach((b) => map.set(b.id, b.name))
    return map
  }, [branches])

  function resolveBranchName(row: WithClinic) {
    if (!row.clinicId) return null
    return row.clinicName || branchNameById.get(row.clinicId) || null
  }

  const { data: drugsData, isLoading: loadingDrugs, isError: drugsError, error: drugsErr } = useGetDrugs(
    { pageNumber: 1, pageSize: 100 },
    tab === "drugs"
  )
  const { data: testsData, isLoading: loadingTests, isError: testsError, error: testsErr } = useGetLabTests(
    { pageNumber: 1, pageSize: 100 },
    tab === "tests"
  )
  const {
    data: diagnosisData,
    isLoading: loadingDiagnosis,
    isError: diagnosisError,
    error: diagnosisErr,
  } = useGetDiagnosisCodes({ pageNumber: 1, pageSize: 100 }, tab === "diagnosis")
  const { data: tpasData, isLoading: loadingTpas, isError: tpasError, error: tpasErr } = useGetTpas(
    { pageNumber: 1, pageSize: 100 },
    tab === "insurance"
  )
  const { data: stockData, isLoading: loadingStock, isError: stockError, error: stockErr } = useGetStock(
    { pageNumber: 1, pageSize: 100 },
    tab === "pharmacy"
  )

  const createDrug = useCreateDrug()
  const updateDrug = useUpdateDrug()
  const deleteDrug = useDeleteDrug()
  const createLabTest = useCreateLabTest()
  const updateLabTest = useUpdateLabTest()
  const deleteLabTest = useDeleteLabTest()
  const createDiagnosisCode = useCreateDiagnosisCode()
  const updateDiagnosisCode = useUpdateDiagnosisCode()
  const deleteDiagnosisCode = useDeleteDiagnosisCode()
  const createTpa = useCreateTpa()
  const updateTpa = useUpdateTpa()
  const deleteTpa = useDeleteTpa()
  const createStock = useCreateStock()
  const updateStock = useUpdateStock()
  const deleteStock = useDeleteStock()

  const drugs = drugsData?.items ?? []
  const tests = testsData?.items ?? []
  const diagnosisCodes = diagnosisData?.items ?? []
  const payers = tpasData?.items ?? []
  const stock = stockData?.items ?? []

  const drugsHaveBranch = drugs.some((d) => !!d.clinicId)
  const testsHaveBranch = tests.some((t) => !!t.clinicId)
  const diagnosisHaveBranch = diagnosisCodes.some((d) => !!d.clinicId)
  const payersHaveBranch = payers.some((p) => !!p.clinicId)
  const stockHaveBranch = stock.some((s) => !!s.clinicId)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [editingDrug, setEditingDrug] = useState<MediTrackDrug | null>(null)
  const [editingTest, setEditingTest] = useState<MediTrackLabTest | null>(null)
  const [editingDiagnosis, setEditingDiagnosis] = useState<MediTrackDiagnosisCode | null>(null)
  const [editingPayer, setEditingPayer] = useState<MediTrackTpa | null>(null)
  const [editingStock, setEditingStock] = useState<MediTrackStock | null>(null)

  const [viewDrug, setViewDrug] = useState<MediTrackDrug | null>(null)
  const [viewTest, setViewTest] = useState<MediTrackLabTest | null>(null)
  const [viewDiagnosis, setViewDiagnosis] = useState<MediTrackDiagnosisCode | null>(null)
  const [viewPayer, setViewPayer] = useState<MediTrackTpa | null>(null)
  const [viewStock, setViewStock] = useState<MediTrackStock | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)

  const [drugForm, setDrugForm] = useState(EMPTY_DRUG)
  const [testForm, setTestForm] = useState(EMPTY_TEST)
  const [diagnosisForm, setDiagnosisForm] = useState(EMPTY_DIAGNOSIS)
  const [payerForm, setPayerForm] = useState(EMPTY_PAYER)
  const [stockForm, setStockForm] = useState(EMPTY_STOCK)

  const isSaving =
    createDrug.isPending ||
    updateDrug.isPending ||
    createLabTest.isPending ||
    updateLabTest.isPending ||
    createDiagnosisCode.isPending ||
    updateDiagnosisCode.isPending ||
    createTpa.isPending ||
    updateTpa.isPending ||
    createStock.isPending ||
    updateStock.isPending

  const isDeleting =
    deleteDrug.isPending ||
    deleteLabTest.isPending ||
    deleteDiagnosisCode.isPending ||
    deleteTpa.isPending ||
    deleteStock.isPending

  function resetForms() {
    setDrugForm(EMPTY_DRUG)
    setTestForm(EMPTY_TEST)
    setDiagnosisForm(EMPTY_DIAGNOSIS)
    setPayerForm(EMPTY_PAYER)
    setStockForm(EMPTY_STOCK)
  }

  function openAdd() {
    resetForms()
    setAddOpen(true)
  }

  function openEditDrug(row: MediTrackDrug) {
    setEditingDrug(row)
    setDrugForm({
      name: row.name || "",
      schedule: scheduleToForm(row.schedule),
      unit: row.unit && UNIT_OPTIONS.includes(row.unit) ? row.unit : UNIT_OPTIONS[0],
    })
    setEditOpen(true)
  }

  function openEditTest(row: MediTrackLabTest) {
    setEditingTest(row)
    setTestForm({
      name: row.name || "",
      code: row.code || "",
      sample: row.sampleType || "",
      tat: row.tat || "",
    })
    setEditOpen(true)
  }

  function openEditDiagnosis(row: MediTrackDiagnosisCode) {
    setEditingDiagnosis(row)
    setDiagnosisForm({
      code: row.code || "",
      description: row.description || "",
      version: row.icdVersion || ICD_VERSIONS[0],
    })
    setEditOpen(true)
  }

  function openEditPayer(row: MediTrackTpa) {
    setEditingPayer(row)
    setPayerForm({
      name: row.tpaName || "",
      type: row.payerType && PAYER_TYPES.includes(row.payerType) ? row.payerType : PAYER_TYPES[0],
      empanelment:
        row.empanelmentStatus && EMPANELMENT_OPTIONS.includes(row.empanelmentStatus)
          ? row.empanelmentStatus
          : EMPANELMENT_OPTIONS[0],
    })
    setEditOpen(true)
  }

  function openEditStock(row: MediTrackStock) {
    setEditingStock(row)
    setStockForm({
      drug: row.drugName || "",
      batch: row.batch || "",
      expiry: expiryToForm(row.expiry),
      qty: String(row.quantityOnHand ?? 0),
      status: row.status && STOCK_STATUS_OPTIONS.includes(row.status) ? row.status : STOCK_STATUS_OPTIONS[0],
    })
    setEditOpen(true)
  }

  function openDelete(id: string, label: string) {
    setDeleteTarget({ id, label })
    setDeleteOpen(true)
  }

  function closeEdit() {
    setEditOpen(false)
    setEditingDrug(null)
    setEditingTest(null)
    setEditingDiagnosis(null)
    setEditingPayer(null)
    setEditingStock(null)
    resetForms()
  }

  function closeView() {
    setViewOpen(false)
    setViewDrug(null)
    setViewTest(null)
    setViewDiagnosis(null)
    setViewPayer(null)
    setViewStock(null)
  }

  async function handleSave(e: FormEvent<HTMLFormElement>, mode: "add" | "edit") {
    e.preventDefault()
    try {
      switch (tab) {
        case "drugs": {
          const payload = {
            name: drugForm.name.trim(),
            schedule: drugForm.schedule === "None" ? null : drugForm.schedule,
            unit: drugForm.unit,
          }
          if (mode === "add") {
            await createDrug.mutateAsync(payload)
            toast({ title: "Drug added", description: `${payload.name} added to the drug master.` })
          } else if (editingDrug) {
            await updateDrug.mutateAsync({
              id: editingDrug.id,
              ...payload,
              hsnCode: editingDrug.hsnCode,
              isActive: editingDrug.isActive,
            })
            toast({ title: "Drug updated", description: `${payload.name} was saved.` })
          }
          break
        }
        case "tests": {
          const payload = {
            name: testForm.name.trim(),
            code: testForm.code.trim() || null,
            sampleType: testForm.sample.trim() || null,
            tat: testForm.tat.trim() || null,
          }
          if (mode === "add") {
            await createLabTest.mutateAsync(payload)
            toast({ title: "Test added", description: `${payload.name} added to the test master.` })
          } else if (editingTest) {
            await updateLabTest.mutateAsync({
              id: editingTest.id,
              ...payload,
              isActive: editingTest.isActive,
            })
            toast({ title: "Test updated", description: `${payload.name} was saved.` })
          }
          break
        }
        case "diagnosis": {
          const payload = {
            code: diagnosisForm.code.trim(),
            description: diagnosisForm.description.trim() || null,
            icdVersion: diagnosisForm.version,
          }
          if (mode === "add") {
            await createDiagnosisCode.mutateAsync(payload)
            toast({ title: "Code added", description: `${payload.code} added to the ICD master.` })
          } else if (editingDiagnosis) {
            await updateDiagnosisCode.mutateAsync({
              id: editingDiagnosis.id,
              ...payload,
              isActive: editingDiagnosis.isActive,
            })
            toast({ title: "Code updated", description: `${payload.code} was saved.` })
          }
          break
        }
        case "insurance": {
          const payload = {
            tpaName: payerForm.name.trim(),
            payerType: payerForm.type,
            empanelmentStatus: payerForm.empanelment,
          }
          if (mode === "add") {
            await createTpa.mutateAsync(payload)
            toast({ title: "Payer added", description: `${payload.tpaName} added to the payer master.` })
          } else if (editingPayer) {
            await updateTpa.mutateAsync({
              id: editingPayer.id,
              ...payload,
              discountPercent: editingPayer.discountPercent,
              overrideRates: editingPayer.overrideRates,
              effectiveDate: editingPayer.effectiveDate,
              isActive: editingPayer.isActive,
            })
            toast({ title: "Payer updated", description: `${payload.tpaName} was saved.` })
          }
          break
        }
        case "pharmacy": {
          const payload = {
            drugName: stockForm.drug.trim(),
            batch: stockForm.batch.trim() || null,
            expiry: parseExpiryIso(stockForm.expiry),
            quantityOnHand: Number(stockForm.qty) || 0,
            status: stockForm.status,
          }
          if (mode === "add") {
            await createStock.mutateAsync(payload)
            toast({ title: "Stock entry added", description: `${payload.drugName} added to the stock master.` })
          } else if (editingStock) {
            await updateStock.mutateAsync({ id: editingStock.id, ...payload })
            toast({ title: "Stock updated", description: `${payload.drugName} was saved.` })
          }
          break
        }
      }
      if (mode === "add") {
        setAddOpen(false)
        resetForms()
      } else {
        closeEdit()
      }
    } catch (err) {
      toast({
        title: "Could not save",
        description: getToastErrorMessage(err, "Failed to save master data"),
        variant: "destructive",
      })
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      switch (tab) {
        case "drugs":
          await deleteDrug.mutateAsync(deleteTarget.id)
          break
        case "tests":
          await deleteLabTest.mutateAsync(deleteTarget.id)
          break
        case "diagnosis":
          await deleteDiagnosisCode.mutateAsync(deleteTarget.id)
          break
        case "insurance":
          await deleteTpa.mutateAsync(deleteTarget.id)
          break
        case "pharmacy":
          await deleteStock.mutateAsync(deleteTarget.id)
          break
      }
      toast({ title: "Deleted", description: `${deleteTarget.label} was removed.` })
      setDeleteOpen(false)
      setDeleteTarget(null)
    } catch (err) {
      toast({
        title: "Could not delete",
        description: getToastErrorMessage(err, "Failed to delete"),
        variant: "destructive",
      })
    }
  }

  const formFields = (
    <>
      {tab === "drugs" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Drug name</Label>
            <Input
              value={drugForm.name}
              onChange={(e) => setDrugForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Paracetamol 500mg"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Schedule</Label>
            <Select value={drugForm.schedule} onValueChange={(v) => setDrugForm((f) => ({ ...f, schedule: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "None" ? "None" : `Sch. ${s}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Unit</Label>
            <Select value={drugForm.unit} onValueChange={(v) => setDrugForm((f) => ({ ...f, unit: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {tab === "tests" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Test name</Label>
            <Input
              value={testForm.name}
              onChange={(e) => setTestForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Lipid Profile"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
            <Input
              value={testForm.code}
              onChange={(e) => setTestForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. LAB-LIP-01"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Sample type</Label>
            <Input
              value={testForm.sample}
              onChange={(e) => setTestForm((f) => ({ ...f, sample: e.target.value }))}
              placeholder="e.g. Serum"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">TAT</Label>
            <Input
              value={testForm.tat}
              onChange={(e) => setTestForm((f) => ({ ...f, tat: e.target.value }))}
              placeholder="e.g. 6 hrs"
            />
          </div>
        </>
      )}

      {tab === "diagnosis" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
            <Input
              value={diagnosisForm.code}
              onChange={(e) => setDiagnosisForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. J45.909"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Description</Label>
            <Input
              value={diagnosisForm.description}
              onChange={(e) => setDiagnosisForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Unspecified asthma, uncomplicated"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">ICD version</Label>
            <Select
              value={diagnosisForm.version}
              onValueChange={(v) => setDiagnosisForm((f) => ({ ...f, version: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICD_VERSIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {tab === "insurance" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Payer name</Label>
            <Input
              value={payerForm.name}
              onChange={(e) => setPayerForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. HDFC Ergo Health"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Type</Label>
            <Select value={payerForm.type} onValueChange={(v) => setPayerForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Empanelment</Label>
            <Select
              value={payerForm.empanelment}
              onValueChange={(v) => setPayerForm((f) => ({ ...f, empanelment: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPANELMENT_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {tab === "pharmacy" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Drug</Label>
            <Input
              value={stockForm.drug}
              onChange={(e) => setStockForm((f) => ({ ...f, drug: e.target.value }))}
              placeholder="e.g. Metformin 500mg"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Batch</Label>
            <Input
              value={stockForm.batch}
              onChange={(e) => setStockForm((f) => ({ ...f, batch: e.target.value }))}
              placeholder="e.g. MET-2605"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Expiry</Label>
              <Input
                value={stockForm.expiry}
                onChange={(e) => setStockForm((f) => ({ ...f, expiry: e.target.value }))}
                placeholder="e.g. 06/2027"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Qty on hand</Label>
              <Input
                type="number"
                min={0}
                value={stockForm.qty}
                onChange={(e) => setStockForm((f) => ({ ...f, qty: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Status</Label>
            <Select value={stockForm.status} onValueChange={(v) => setStockForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </>
  )

  const isLoading =
    (tab === "drugs" && loadingDrugs) ||
    (tab === "tests" && loadingTests) ||
    (tab === "diagnosis" && loadingDiagnosis) ||
    (tab === "insurance" && loadingTpas) ||
    (tab === "pharmacy" && loadingStock)

  const loadError =
    (tab === "drugs" && drugsError && getToastErrorMessage(drugsErr, "Failed to load drugs")) ||
    (tab === "tests" && testsError && getToastErrorMessage(testsErr, "Failed to load tests")) ||
    (tab === "diagnosis" && diagnosisError && getToastErrorMessage(diagnosisErr, "Failed to load diagnosis codes")) ||
    (tab === "insurance" && tpasError && getToastErrorMessage(tpasErr, "Failed to load payers")) ||
    (tab === "pharmacy" && stockError && getToastErrorMessage(stockErr, "Failed to load stock")) ||
    null

  const viewTitle =
    viewDrug?.name ||
    viewTest?.name ||
    viewDiagnosis?.code ||
    viewPayer?.tpaName ||
    viewStock?.drugName ||
    "Details"

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Master Data"
        subtitle="Drugs, tests, diagnosis codes, payers and pharmacy stock — shared across OPD and IPD."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "border px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.key
                ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700"
                : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AdminCard
        title={active.cardTitle}
        noPadding
        action={
          <div className="flex items-center gap-2">
            <MtButton variant="outline" className="gap-2" type="button">
              <Upload className="h-4 w-4" />
              Bulk import
            </MtButton>
            <MtButton className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              {active.addLabel}
            </MtButton>
          </div>
        }
      >
        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : loadError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{loadError}</p>
        ) : (
          <>
            {tab === "drugs" && (
              <TableShell
                headers={
                  drugsHaveBranch
                    ? ["Drug", "Schedule", "Unit", "Branch", "Last edited", "Action"]
                    : ["Drug", "Schedule", "Unit", "Last edited", "Action"]
                }
              >
                {drugs.length === 0 ? (
                  <EmptyRow colSpan={drugsHaveBranch ? 6 : 5} message="No drugs yet. Add a drug to get started." />
                ) : (
                  drugs.map((d) => {
                    const schedule = formatSchedule(d.schedule)
                    const branch = resolveBranchName(d)
                    return (
                      <Row
                        key={d.id}
                        onClick={() => {
                          setViewDrug(d)
                          setViewOpen(true)
                        }}
                      >
                        <td className="px-5 py-3 font-medium text-adminreg-text">{d.name}</td>
                        <td className="px-5 py-3">
                          {!schedule ? (
                            <span className="text-adminreg-muted">—</span>
                          ) : (
                            <span className={SCHEDULE_CLASS}>{schedule}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">{d.unit || "—"}</td>
                        {drugsHaveBranch && (
                          <td className="px-5 py-3 text-adminreg-muted">{branch || "—"}</td>
                        )}
                        <td className="px-5 py-3 text-adminreg-muted">{formatLastEdited(d.lastUpdated)}</td>
                        <td className="px-5 py-3 text-right">
                          <RowActions
                            actions={[
                              { icon: Pencil, label: "Edit", onClick: () => openEditDrug(d) },
                              {
                                icon: Trash2,
                                label: "Delete",
                                destructive: true,
                                onClick: () => openDelete(d.id, d.name),
                              },
                            ]}
                          />
                        </td>
                      </Row>
                    )
                  })
                )}
              </TableShell>
            )}

            {tab === "tests" && (
              <TableShell
                headers={
                  testsHaveBranch
                    ? ["Test", "Code", "Sample type", "TAT", "Branch", "Last edited", "Action"]
                    : ["Test", "Code", "Sample type", "TAT", "Last edited", "Action"]
                }
              >
                {tests.length === 0 ? (
                  <EmptyRow colSpan={testsHaveBranch ? 7 : 6} message="No tests yet. Add a test to get started." />
                ) : (
                  tests.map((t) => {
                    const branch = resolveBranchName(t)
                    return (
                      <Row
                        key={t.id}
                        onClick={() => {
                          setViewTest(t)
                          setViewOpen(true)
                        }}
                      >
                        <td className="px-5 py-3 font-medium text-adminreg-text">{t.name}</td>
                        <td className="px-5 py-3 font-mono text-xs">{t.code || "—"}</td>
                        <td className="px-5 py-3 text-adminreg-muted">{t.sampleType || "—"}</td>
                        <td className="px-5 py-3">{t.tat || "—"}</td>
                        {testsHaveBranch && (
                          <td className="px-5 py-3 text-adminreg-muted">{branch || "—"}</td>
                        )}
                        <td className="px-5 py-3 text-adminreg-muted">{formatLastEdited(t.updatedAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <RowActions
                            actions={[
                              { icon: Pencil, label: "Edit", onClick: () => openEditTest(t) },
                              {
                                icon: Trash2,
                                label: "Delete",
                                destructive: true,
                                onClick: () => openDelete(t.id, t.name),
                              },
                            ]}
                          />
                        </td>
                      </Row>
                    )
                  })
                )}
              </TableShell>
            )}

            {tab === "diagnosis" && (
              <TableShell
                headers={
                  diagnosisHaveBranch
                    ? ["Code", "Description", "ICD version", "Branch", "Last edited", "Action"]
                    : ["Code", "Description", "ICD version", "Last edited", "Action"]
                }
              >
                {diagnosisCodes.length === 0 ? (
                  <EmptyRow
                    colSpan={diagnosisHaveBranch ? 6 : 5}
                    message="No diagnosis codes yet. Add a code to get started."
                  />
                ) : (
                  diagnosisCodes.map((d) => {
                    const branch = resolveBranchName(d)
                    return (
                      <Row
                        key={d.id}
                        onClick={() => {
                          setViewDiagnosis(d)
                          setViewOpen(true)
                        }}
                      >
                        <td className="px-5 py-3 font-mono text-xs">{d.code}</td>
                        <td className="px-5 py-3 font-medium text-adminreg-text">{d.description || "—"}</td>
                        <td className="px-5 py-3 text-adminreg-muted">{d.icdVersion}</td>
                        {diagnosisHaveBranch && (
                          <td className="px-5 py-3 text-adminreg-muted">{branch || "—"}</td>
                        )}
                        <td className="px-5 py-3 text-adminreg-muted">{formatLastEdited(d.updatedAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <RowActions
                            actions={[
                              { icon: Pencil, label: "Edit", onClick: () => openEditDiagnosis(d) },
                              {
                                icon: Trash2,
                                label: "Delete",
                                destructive: true,
                                onClick: () => openDelete(d.id, d.code),
                              },
                            ]}
                          />
                        </td>
                      </Row>
                    )
                  })
                )}
              </TableShell>
            )}

            {tab === "insurance" && (
              <TableShell
                headers={
                  payersHaveBranch
                    ? ["Payer", "Type", "Empanelment", "Branch", "Last edited", "Action"]
                    : ["Payer", "Type", "Empanelment", "Last edited", "Action"]
                }
              >
                {payers.length === 0 ? (
                  <EmptyRow colSpan={payersHaveBranch ? 6 : 5} message="No payers yet. Add a payer to get started." />
                ) : (
                  payers.map((p) => {
                    const branch = resolveBranchName(p)
                    const tone = empanelmentTone(p.empanelmentStatus)
                    return (
                      <Row
                        key={p.id}
                        onClick={() => {
                          setViewPayer(p)
                          setViewOpen(true)
                        }}
                      >
                        <td className="px-5 py-3 font-medium text-adminreg-text">{p.tpaName}</td>
                        <td className="px-5 py-3 text-adminreg-muted">{p.payerType || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={cn("text-xs font-semibold", TONE_CLASS[tone])}>
                            {p.empanelmentStatus || "—"}
                          </span>
                        </td>
                        {payersHaveBranch && (
                          <td className="px-5 py-3 text-adminreg-muted">{branch || "—"}</td>
                        )}
                        <td className="px-5 py-3 text-adminreg-muted">{formatLastEdited(p.updatedAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <RowActions
                            actions={[
                              { icon: Pencil, label: "Edit", onClick: () => openEditPayer(p) },
                              {
                                icon: Trash2,
                                label: "Delete",
                                destructive: true,
                                onClick: () => openDelete(p.id, p.tpaName),
                              },
                            ]}
                          />
                        </td>
                      </Row>
                    )
                  })
                )}
              </TableShell>
            )}

            {tab === "pharmacy" && (
              <TableShell
                headers={
                  stockHaveBranch
                    ? ["Drug", "Batch", "Expiry", "Qty on hand", "Status", "Branch", "Action"]
                    : ["Drug", "Batch", "Expiry", "Qty on hand", "Status", "Action"]
                }
              >
                {stock.length === 0 ? (
                  <EmptyRow
                    colSpan={stockHaveBranch ? 7 : 6}
                    message="No stock entries yet. Add a stock entry to get started."
                  />
                ) : (
                  stock.map((s) => {
                    const branch = resolveBranchName(s)
                    const tone = stockTone(s.status)
                    return (
                      <Row
                        key={s.id}
                        onClick={() => {
                          setViewStock(s)
                          setViewOpen(true)
                        }}
                      >
                        <td className="px-5 py-3 font-medium text-adminreg-text">{s.drugName || "—"}</td>
                        <td className="px-5 py-3 font-mono text-xs">{s.batch || "—"}</td>
                        <td className="px-5 py-3 font-mono text-xs">{formatExpiry(s.expiry)}</td>
                        <td className="px-5 py-3">{(s.quantityOnHand ?? 0).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3">
                          <span className={cn("text-xs font-semibold", TONE_CLASS[tone])}>{s.status || "—"}</span>
                        </td>
                        {stockHaveBranch && (
                          <td className="px-5 py-3 text-adminreg-muted">{branch || "—"}</td>
                        )}
                        <td className="px-5 py-3 text-right">
                          <RowActions
                            actions={[
                              { icon: Pencil, label: "Edit", onClick: () => openEditStock(s) },
                              {
                                icon: Trash2,
                                label: "Delete",
                                destructive: true,
                                onClick: () => openDelete(s.id, s.drugName || "Stock entry"),
                              },
                            ]}
                          />
                        </td>
                      </Row>
                    )
                  })
                )}
              </TableShell>
            )}
          </>
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title={active.addLabel}
        onSubmit={(e) => handleSave(e, "add")}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {active.addLabel}
            </MtButton>
          </>
        }
      >
        {formFields}
      </FormDialog>

      <FormDialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeEdit()
          else setEditOpen(true)
        }}
        title={active.editLabel}
        onSubmit={(e) => handleSave(e, "edit")}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={closeEdit}>
              Cancel
            </MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {formFields}
      </FormDialog>

      <DetailDrawer open={viewOpen} onOpenChange={(open) => (!open ? closeView() : setViewOpen(true))} title={viewTitle}>
        <div className="divide-y divide-adminreg-border">
          {viewDrug && (
            <>
              <InfoRow label="Drug" value={viewDrug.name} />
              <InfoRow label="Schedule" value={formatSchedule(viewDrug.schedule) || "—"} />
              <InfoRow label="Unit" value={viewDrug.unit || "—"} />
              <InfoRow label="HSN code" value={viewDrug.hsnCode || "—"} />
              <InfoRow label="Status" value={viewDrug.isActive ? "Active" : "Inactive"} />
              {viewDrug.clinicId ? (
                <InfoRow label="Branch" value={resolveBranchName(viewDrug) || "—"} />
              ) : null}
              <InfoRow label="Last edited" value={formatLastEdited(viewDrug.lastUpdated)} />
            </>
          )}
          {viewTest && (
            <>
              <InfoRow label="Test" value={viewTest.name} />
              <InfoRow label="Code" value={viewTest.code || "—"} />
              <InfoRow label="Sample type" value={viewTest.sampleType || "—"} />
              <InfoRow label="TAT" value={viewTest.tat || "—"} />
              <InfoRow label="Status" value={viewTest.isActive ? "Active" : "Inactive"} />
              {viewTest.clinicId ? (
                <InfoRow label="Branch" value={resolveBranchName(viewTest) || "—"} />
              ) : null}
              <InfoRow label="Last edited" value={formatLastEdited(viewTest.updatedAt)} />
            </>
          )}
          {viewDiagnosis && (
            <>
              <InfoRow label="Code" value={viewDiagnosis.code} />
              <InfoRow label="Description" value={viewDiagnosis.description || "—"} />
              <InfoRow label="ICD version" value={viewDiagnosis.icdVersion} />
              <InfoRow label="Status" value={viewDiagnosis.isActive ? "Active" : "Inactive"} />
              {viewDiagnosis.clinicId ? (
                <InfoRow label="Branch" value={resolveBranchName(viewDiagnosis) || "—"} />
              ) : null}
              <InfoRow label="Last edited" value={formatLastEdited(viewDiagnosis.updatedAt)} />
            </>
          )}
          {viewPayer && (
            <>
              <InfoRow label="Payer" value={viewPayer.tpaName} />
              <InfoRow label="Type" value={viewPayer.payerType || "—"} />
              <InfoRow label="Empanelment" value={viewPayer.empanelmentStatus || "—"} />
              <InfoRow label="Discount %" value={viewPayer.discountPercent || "—"} />
              <InfoRow label="Status" value={viewPayer.isActive ? "Active" : "Inactive"} />
              {viewPayer.clinicId ? (
                <InfoRow label="Branch" value={resolveBranchName(viewPayer) || "—"} />
              ) : null}
              <InfoRow label="Last edited" value={formatLastEdited(viewPayer.updatedAt)} />
            </>
          )}
          {viewStock && (
            <>
              <InfoRow label="Drug" value={viewStock.drugName || "—"} />
              <InfoRow label="Batch" value={viewStock.batch || "—"} />
              <InfoRow label="Expiry" value={formatExpiry(viewStock.expiry)} />
              <InfoRow label="Qty on hand" value={(viewStock.quantityOnHand ?? 0).toLocaleString("en-IN")} />
              <InfoRow label="Status" value={viewStock.status || "—"} />
              {viewStock.clinicId ? (
                <InfoRow label="Branch" value={resolveBranchName(viewStock) || "—"} />
              ) : null}
              <InfoRow label="Last edited" value={formatLastEdited(viewStock.lastUpdated)} />
            </>
          )}
        </div>
      </DetailDrawer>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteTarget(null)
        }}
        title="Delete record"
        description={`Delete "${deleteTarget?.label || "this record"}"? This cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
