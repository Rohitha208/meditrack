"use client"

import { useState, type FormEvent } from "react"
import { Plus, Upload } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { FormDialog, MtButton } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

// Frontend/UI only — master data lives in local constants, no backend.

type MasterTab = "drugs" | "tests" | "diagnosis" | "insurance" | "pharmacy"

const TABS: { key: MasterTab; label: string; cardTitle: string; addLabel: string }[] = [
  { key: "drugs", label: "Drugs", cardTitle: "Drug Master", addLabel: "Add drug" },
  { key: "tests", label: "Tests", cardTitle: "Test Master", addLabel: "Add test" },
  { key: "diagnosis", label: "Diagnosis Codes", cardTitle: "ICD Master", addLabel: "Add code" },
  { key: "insurance", label: "Insurance / TPA", cardTitle: "Payer Master", addLabel: "Add payer" },
  { key: "pharmacy", label: "Pharmacy Stock", cardTitle: "Stock Master", addLabel: "Add stock entry" },
]

const SCHEDULE_CLASS = "border border-adminreg-red bg-adminreg-red-soft px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-adminreg-red-text"

const DRUGS = [
  { name: "Aspirin 75mg", schedule: "—", unit: "Tablet", lastEdited: "02 Jun 2026 · S. Verma" },
  { name: "Alprazolam 0.5mg", schedule: "Sch. X", unit: "Tablet", lastEdited: "18 May 2026 · S. Verma" },
  { name: "Amoxicillin 500mg", schedule: "—", unit: "Capsule", lastEdited: "10 Jul 2026 · S. Verma" },
  { name: "Insulin Glargine", schedule: "Sch. H1", unit: "Vial", lastEdited: "22 Jun 2026 · S. Verma" },
  { name: "Metformin 500mg", schedule: "—", unit: "Tablet", lastEdited: "02 Jun 2026 · S. Verma" },
]

const TESTS = [
  { name: "Complete Blood Count", code: "LAB-CBC-01", sample: "Whole blood (EDTA)", tat: "4 hrs", lastEdited: "02 Jun 2026 · S. Verma" },
  { name: "Liver Function Test", code: "LAB-LFT-01", sample: "Serum", tat: "6 hrs", lastEdited: "02 Jun 2026 · S. Verma" },
  { name: "Chest X-ray PA View", code: "RAD-CXR-01", sample: "—", tat: "30 min", lastEdited: "12 Jan 2026 · S. Verma" },
  { name: "HbA1c", code: "LAB-HBA1C-01", sample: "Whole blood (EDTA)", tat: "24 hrs", lastEdited: "22 Jun 2026 · S. Verma" },
]

const DIAGNOSIS_CODES = [
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified", version: "ICD-10", lastEdited: "02 Jun 2026 · R. Desai" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications", version: "ICD-10", lastEdited: "02 Jun 2026 · R. Desai" },
  { code: "I10", description: "Essential (primary) hypertension", version: "ICD-10", lastEdited: "02 Jun 2026 · R. Desai" },
  { code: "K29.70", description: "Gastritis, unspecified, without bleeding", version: "ICD-10", lastEdited: "10 Jul 2026 · R. Desai" },
]

type Tone = "valid" | "warning" | "critical"

interface PayerRow {
  name: string
  type: string
  empanelment: string
  tone: Tone
  lastEdited: string
}

interface StockRow {
  drug: string
  batch: string
  expiry: string
  qty: number
  status: string
  tone: Tone
}

const PAYERS: PayerRow[] = [
  { name: "Ayushman Bharat PMJAY", type: "Government scheme", empanelment: "Empanelled", tone: "valid", lastEdited: "01 Apr 2026 · R. Desai" },
  { name: "Star Health Insurance", type: "TPA", empanelment: "Empanelled", tone: "valid", lastEdited: "01 Apr 2026 · R. Desai" },
  { name: "ICICI Lombard", type: "TPA", empanelment: "Empanelled", tone: "valid", lastEdited: "01 Apr 2026 · R. Desai" },
  { name: "ESI Corporation", type: "Government scheme", empanelment: "Renewal pending", tone: "warning", lastEdited: "20 Jul 2026 · R. Desai" },
]

const STOCK: StockRow[] = [
  { drug: "Aspirin 75mg", batch: "ASP-2601", expiry: "03/2027", qty: 4200, status: "In stock", tone: "valid" },
  { drug: "Alprazolam 0.5mg", batch: "ALP-2512", expiry: "11/2026", qty: 180, status: "Low stock", tone: "warning" },
  { drug: "Amoxicillin 500mg", batch: "AMX-2604", expiry: "08/2027", qty: 2600, status: "In stock", tone: "valid" },
  { drug: "Clopidogrel 75mg", batch: "CLP-2602", expiry: "09/2026", qty: 0, status: "Critical stock", tone: "critical" },
]

const TONE_CLASS: Record<"valid" | "warning" | "critical", string> = {
  valid: "text-adminreg-olive-700",
  warning: "text-adminreg-amber-text",
  critical: "text-adminreg-red-text",
}

const SCHEDULE_OPTIONS = ["—", "Sch. X", "Sch. H", "Sch. H1"]
const UNIT_OPTIONS = ["Tablet", "Capsule", "Vial", "Syrup", "Injection"]
const ICD_VERSIONS = ["ICD-10", "ICD-11"]
const PAYER_TYPES = ["TPA", "Government scheme"]
const EMPANELMENT_OPTIONS = ["Empanelled", "Renewal pending", "Not empanelled"]
const STOCK_STATUS_OPTIONS = ["In stock", "Low stock", "Critical stock"]

function empanelmentTone(v: string): "valid" | "warning" | "critical" {
  if (v === "Empanelled") return "valid"
  if (v === "Renewal pending") return "warning"
  return "critical"
}

function stockTone(v: string): "valid" | "warning" | "critical" {
  if (v === "In stock") return "valid"
  if (v === "Low stock") return "warning"
  return "critical"
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-adminreg-border bg-adminreg-header text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
          {headers.map((h) => (
            <th key={h} className="px-5 py-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-adminreg-divider last:border-0">{children}</tr>
}

const TODAY_LABEL = "20 Aug 2026 · R. Desai"

export function AdminMasterDataPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<MasterTab>("drugs")
  const active = TABS.find((t) => t.key === tab)!

  const [drugs, setDrugs] = useState(DRUGS)
  const [tests, setTests] = useState(TESTS)
  const [diagnosisCodes, setDiagnosisCodes] = useState(DIAGNOSIS_CODES)
  const [payers, setPayers] = useState(PAYERS)
  const [stock, setStock] = useState(STOCK)

  const [addOpen, setAddOpen] = useState(false)
  const [drugForm, setDrugForm] = useState({ name: "", schedule: SCHEDULE_OPTIONS[0], unit: UNIT_OPTIONS[0] })
  const [testForm, setTestForm] = useState({ name: "", code: "", sample: "", tat: "" })
  const [diagnosisForm, setDiagnosisForm] = useState({ code: "", description: "", version: ICD_VERSIONS[0] })
  const [payerForm, setPayerForm] = useState({ name: "", type: PAYER_TYPES[0], empanelment: EMPANELMENT_OPTIONS[0] })
  const [stockForm, setStockForm] = useState({ drug: "", batch: "", expiry: "", qty: "", status: STOCK_STATUS_OPTIONS[0] })

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    switch (tab) {
      case "drugs": {
        const row = { name: drugForm.name || "Untitled drug", schedule: drugForm.schedule, unit: drugForm.unit, lastEdited: TODAY_LABEL }
        setDrugs((prev) => [...prev, row])
        toast({ title: "Drug added", description: `${row.name} added to the drug master.` })
        setDrugForm({ name: "", schedule: SCHEDULE_OPTIONS[0], unit: UNIT_OPTIONS[0] })
        break
      }
      case "tests": {
        const row = { name: testForm.name || "Untitled test", code: testForm.code || "NEW-000", sample: testForm.sample || "—", tat: testForm.tat || "—", lastEdited: TODAY_LABEL }
        setTests((prev) => [...prev, row])
        toast({ title: "Test added", description: `${row.name} added to the test master.` })
        setTestForm({ name: "", code: "", sample: "", tat: "" })
        break
      }
      case "diagnosis": {
        const row = { code: diagnosisForm.code || "NEW-000", description: diagnosisForm.description || "Untitled diagnosis", version: diagnosisForm.version, lastEdited: TODAY_LABEL }
        setDiagnosisCodes((prev) => [...prev, row])
        toast({ title: "Code added", description: `${row.code} added to the ICD master.` })
        setDiagnosisForm({ code: "", description: "", version: ICD_VERSIONS[0] })
        break
      }
      case "insurance": {
        const row = { name: payerForm.name || "Untitled payer", type: payerForm.type, empanelment: payerForm.empanelment, tone: empanelmentTone(payerForm.empanelment), lastEdited: TODAY_LABEL }
        setPayers((prev) => [...prev, row])
        toast({ title: "Payer added", description: `${row.name} added to the payer master.` })
        setPayerForm({ name: "", type: PAYER_TYPES[0], empanelment: EMPANELMENT_OPTIONS[0] })
        break
      }
      case "pharmacy": {
        const row = { drug: stockForm.drug || "Untitled drug", batch: stockForm.batch || "NEW-000", expiry: stockForm.expiry || "—", qty: Number(stockForm.qty) || 0, status: stockForm.status, tone: stockTone(stockForm.status) }
        setStock((prev) => [...prev, row])
        toast({ title: "Stock entry added", description: `${row.drug} added to the stock master.` })
        setStockForm({ drug: "", batch: "", expiry: "", qty: "", status: STOCK_STATUS_OPTIONS[0] })
        break
      }
    }
    setAddOpen(false)
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Master Data" subtitle="Drugs, tests, diagnosis codes, payers and pharmacy stock — shared across OPD and IPD." />

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
            <MtButton variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Bulk import
            </MtButton>
            <MtButton className="gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              {active.addLabel}
            </MtButton>
          </div>
        }
      >
        {tab === "drugs" && (
          <TableShell headers={["Drug", "Schedule", "Unit", "Last edited"]}>
            {drugs.map((d) => (
              <Row key={d.name}>
                <td className="px-5 py-3 font-medium text-adminreg-text">{d.name}</td>
                <td className="px-5 py-3">{d.schedule === "—" ? <span className="text-adminreg-muted">—</span> : <span className={SCHEDULE_CLASS}>{d.schedule}</span>}</td>
                <td className="px-5 py-3">{d.unit}</td>
                <td className="px-5 py-3 text-adminreg-muted">{d.lastEdited}</td>
              </Row>
            ))}
          </TableShell>
        )}

        {tab === "tests" && (
          <TableShell headers={["Test", "Code", "Sample type", "TAT", "Last edited"]}>
            {tests.map((t) => (
              <Row key={t.code}>
                <td className="px-5 py-3 font-medium text-adminreg-text">{t.name}</td>
                <td className="px-5 py-3 font-mono text-xs">{t.code}</td>
                <td className="px-5 py-3 text-adminreg-muted">{t.sample}</td>
                <td className="px-5 py-3">{t.tat}</td>
                <td className="px-5 py-3 text-adminreg-muted">{t.lastEdited}</td>
              </Row>
            ))}
          </TableShell>
        )}

        {tab === "diagnosis" && (
          <TableShell headers={["Code", "Description", "ICD version", "Last edited"]}>
            {diagnosisCodes.map((d) => (
              <Row key={d.code}>
                <td className="px-5 py-3 font-mono text-xs">{d.code}</td>
                <td className="px-5 py-3 font-medium text-adminreg-text">{d.description}</td>
                <td className="px-5 py-3 text-adminreg-muted">{d.version}</td>
                <td className="px-5 py-3 text-adminreg-muted">{d.lastEdited}</td>
              </Row>
            ))}
          </TableShell>
        )}

        {tab === "insurance" && (
          <TableShell headers={["Payer", "Type", "Empanelment", "Last edited"]}>
            {payers.map((p) => (
              <Row key={p.name}>
                <td className="px-5 py-3 font-medium text-adminreg-text">{p.name}</td>
                <td className="px-5 py-3 text-adminreg-muted">{p.type}</td>
                <td className="px-5 py-3"><span className={cn("text-xs font-semibold", TONE_CLASS[p.tone])}>{p.empanelment}</span></td>
                <td className="px-5 py-3 text-adminreg-muted">{p.lastEdited}</td>
              </Row>
            ))}
          </TableShell>
        )}

        {tab === "pharmacy" && (
          <TableShell headers={["Drug", "Batch", "Expiry", "Qty on hand", "Status"]}>
            {stock.map((s) => (
              <Row key={s.batch}>
                <td className="px-5 py-3 font-medium text-adminreg-text">{s.drug}</td>
                <td className="px-5 py-3 font-mono text-xs">{s.batch}</td>
                <td className="px-5 py-3 font-mono text-xs">{s.expiry}</td>
                <td className="px-5 py-3">{s.qty.toLocaleString("en-IN")}</td>
                <td className="px-5 py-3"><span className={cn("text-xs font-semibold", TONE_CLASS[s.tone])}>{s.status}</span></td>
              </Row>
            ))}
          </TableShell>
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title={active.addLabel}
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit">{active.addLabel}</MtButton>
          </>
        }
      >
        {tab === "drugs" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Drug name</Label>
              <Input value={drugForm.name} onChange={(e) => setDrugForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Paracetamol 500mg" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Schedule</Label>
              <Select value={drugForm.schedule} onValueChange={(v) => setDrugForm((f) => ({ ...f, schedule: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s === "—" ? "None" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Unit</Label>
              <Select value={drugForm.unit} onValueChange={(v) => setDrugForm((f) => ({ ...f, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
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
              <Input value={testForm.name} onChange={(e) => setTestForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Lipid Profile" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
              <Input value={testForm.code} onChange={(e) => setTestForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. LAB-LIP-01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Sample type</Label>
              <Input value={testForm.sample} onChange={(e) => setTestForm((f) => ({ ...f, sample: e.target.value }))} placeholder="e.g. Serum" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">TAT</Label>
              <Input value={testForm.tat} onChange={(e) => setTestForm((f) => ({ ...f, tat: e.target.value }))} placeholder="e.g. 6 hrs" />
            </div>
          </>
        )}

        {tab === "diagnosis" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
              <Input value={diagnosisForm.code} onChange={(e) => setDiagnosisForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. J45.909" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Description</Label>
              <Input value={diagnosisForm.description} onChange={(e) => setDiagnosisForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Unspecified asthma, uncomplicated" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">ICD version</Label>
              <Select value={diagnosisForm.version} onValueChange={(v) => setDiagnosisForm((f) => ({ ...f, version: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICD_VERSIONS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
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
              <Input value={payerForm.name} onChange={(e) => setPayerForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. HDFC Ergo Health" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Type</Label>
              <Select value={payerForm.type} onValueChange={(v) => setPayerForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Empanelment</Label>
              <Select value={payerForm.empanelment} onValueChange={(v) => setPayerForm((f) => ({ ...f, empanelment: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPANELMENT_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
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
              <Input value={stockForm.drug} onChange={(e) => setStockForm((f) => ({ ...f, drug: e.target.value }))} placeholder="e.g. Metformin 500mg" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Batch</Label>
              <Input value={stockForm.batch} onChange={(e) => setStockForm((f) => ({ ...f, batch: e.target.value }))} placeholder="e.g. MET-2605" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Expiry</Label>
                <Input value={stockForm.expiry} onChange={(e) => setStockForm((f) => ({ ...f, expiry: e.target.value }))} placeholder="e.g. 06/2027" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Qty on hand</Label>
                <Input type="number" min={0} value={stockForm.qty} onChange={(e) => setStockForm((f) => ({ ...f, qty: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Status</Label>
              <Select value={stockForm.status} onValueChange={(v) => setStockForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STOCK_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </FormDialog>
    </div>
  )
}
