"use client"

import { useState } from "react"
import { Plus, Upload } from "lucide-react"

import { cn } from "@/lib/utils"
import { MtButton } from "@/components/meditrack/shared"
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

const PAYERS = [
  { name: "Ayushman Bharat PMJAY", type: "Government scheme", empanelment: "Empanelled", tone: "valid" as const, lastEdited: "01 Apr 2026 · R. Desai" },
  { name: "Star Health Insurance", type: "TPA", empanelment: "Empanelled", tone: "valid" as const, lastEdited: "01 Apr 2026 · R. Desai" },
  { name: "ICICI Lombard", type: "TPA", empanelment: "Empanelled", tone: "valid" as const, lastEdited: "01 Apr 2026 · R. Desai" },
  { name: "ESI Corporation", type: "Government scheme", empanelment: "Renewal pending", tone: "warning" as const, lastEdited: "20 Jul 2026 · R. Desai" },
]

const STOCK = [
  { drug: "Aspirin 75mg", batch: "ASP-2601", expiry: "03/2027", qty: 4200, status: "In stock", tone: "valid" as const },
  { drug: "Alprazolam 0.5mg", batch: "ALP-2512", expiry: "11/2026", qty: 180, status: "Low stock", tone: "warning" as const },
  { drug: "Amoxicillin 500mg", batch: "AMX-2604", expiry: "08/2027", qty: 2600, status: "In stock", tone: "valid" as const },
  { drug: "Clopidogrel 75mg", batch: "CLP-2602", expiry: "09/2026", qty: 0, status: "Critical stock", tone: "critical" as const },
]

const TONE_CLASS: Record<"valid" | "warning" | "critical", string> = {
  valid: "text-adminreg-olive-700",
  warning: "text-adminreg-amber-text",
  critical: "text-adminreg-red-text",
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

export function AdminMasterDataPage() {
  const [tab, setTab] = useState<MasterTab>("drugs")
  const active = TABS.find((t) => t.key === tab)!

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
            <MtButton className="gap-2">
              <Plus className="h-4 w-4" />
              {active.addLabel}
            </MtButton>
          </div>
        }
      >
        {tab === "drugs" && (
          <TableShell headers={["Drug", "Schedule", "Unit", "Last edited"]}>
            {DRUGS.map((d) => (
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
            {TESTS.map((t) => (
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
            {DIAGNOSIS_CODES.map((d) => (
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
            {PAYERS.map((p) => (
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
            {STOCK.map((s) => (
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
    </div>
  )
}
