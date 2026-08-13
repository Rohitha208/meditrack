"use client"

import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { MtDataTable, FormDialog, MtButton, formatCurrency, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

// Frontend/UI only — tariff master data lives in local React state.

const DEPARTMENTS = ["General Medicine", "Cardiology", "Diagnostics", "Radiology", "Orthopedics"]
const GST_OPTIONS = ["Exempt", "5%", "12%", "18%"]

interface TariffRow {
  id: string
  service: string
  code: string
  department: string
  rate: number
  gst: string
  lastEdited: string
  editedBy: string
  scheduledChange?: { rate: number; date: string }
}

const INITIAL_TARIFFS: TariffRow[] = [
  { id: "1", service: "General consultation", code: "CON-001", department: "General Medicine", rate: 500, gst: "Exempt", lastEdited: "01 Apr 2026", editedBy: "R. Desai" },
  { id: "2", service: "Specialist consultation", code: "CON-002", department: "Cardiology", rate: 700, gst: "Exempt", lastEdited: "01 Apr 2026", editedBy: "R. Desai" },
  { id: "3", service: "ECG", code: "DIA-014", department: "Diagnostics", rate: 350, gst: "5%", lastEdited: "12 Jan 2026", editedBy: "S. Verma" },
  { id: "4", service: "Chest X-ray", code: "RAD-006", department: "Radiology", rate: 600, gst: "5%", lastEdited: "12 Jan 2026", editedBy: "S. Verma" },
  { id: "5", service: "General ward bed / day", code: "BED-GEN", department: "General Medicine", rate: 1200, gst: "Exempt", lastEdited: "01 Apr 2026", editedBy: "R. Desai" },
  {
    id: "6",
    service: "ICU bed / day",
    code: "BED-ICU",
    department: "Cardiology",
    rate: 6500,
    gst: "Exempt",
    lastEdited: "20 Jul 2026",
    editedBy: "R. Desai",
    scheduledChange: { rate: 7200, date: "01 Sep 2026" },
  },
]

export function AdminTariffsPage() {
  const { toast } = useToast()
  const [tariffs, setTariffs] = useState<TariffRow[]>(INITIAL_TARIFFS)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ service: "", code: "", department: DEPARTMENTS[0], rate: "", gst: GST_OPTIONS[0] })

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const row: TariffRow = {
      id: String(Date.now()),
      service: form.service || "Untitled service",
      code: form.code || "NEW-000",
      department: form.department,
      rate: Number(form.rate) || 0,
      gst: form.gst,
      lastEdited: "12 Aug 2026",
      editedBy: "R. Desai",
    }
    setTariffs((prev) => [...prev, row])
    setAddOpen(false)
    setForm({ service: "", code: "", department: DEPARTMENTS[0], rate: "", gst: GST_OPTIONS[0] })
    toast({ title: "Rate added", description: `${row.service} added to the tariff master.` })
  }

  const columns: MtColumn<TariffRow>[] = [
    { key: "service", header: "Service", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.service}</span> },
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "department", header: "Department", render: (r) => r.department },
    { key: "rate", header: "Rate (₹)", render: (r) => r.rate.toLocaleString("en-IN"), sortValue: (r) => r.rate },
    { key: "gst", header: "GST", render: (r) => r.gst },
    {
      key: "lastEdited",
      header: "Last edited",
      render: (r) => (
        <div>
          <p>
            {r.lastEdited} · {r.editedBy}
          </p>
          {r.scheduledChange && (
            <p className="text-xs text-adminreg-amber">
              ↻ Changes to {formatCurrency(r.scheduledChange.rate)} on {r.scheduledChange.date}
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <AdminPageHeader title="Tariffs & Packages" subtitle="Service tariffs, PMJAY packages and TPA negotiated rate cards." />

      <AdminCard
        title="Tariff Master"
        noPadding
        action={
          <MtButton className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add rate
          </MtButton>
        }
      >
        <MtDataTable columns={columns} rows={tariffs} keyExtractor={(r) => r.id} />
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add rate"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit">Add rate</MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Service</Label>
          <Input value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g. MRI Brain" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
          <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. RAD-012" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Department</Label>
          <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Rate (₹)</Label>
            <Input type="number" min={0} value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">GST</Label>
            <Select value={form.gst} onValueChange={(v) => setForm((f) => ({ ...f, gst: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GST_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
