"use client"

import { useState, type FormEvent } from "react"
import { History, Pencil, Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { MtDataTable, RowActions, FormDialog, MtButton, formatCurrency, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { AdminModal } from "./AdminModal"

// Frontend/UI only — Tariff Master, PMJAY Packages and TPA Rate Cards all
// live in local React state; no backend behind this page yet.
//
// FR-ADM-11 business rules implemented here:
//  - Every rate change requires an effective-from date and is appended as a
//    new dated history entry rather than overwritten in place, so a rate
//    that was active when an invoice was generated stays reconstructable.
//  - The rate list shows a visible indicator when a future-dated change is
//    scheduled (the amber "↻ Changes to ₹X on [date]" line).
//  - A PMJAY package record carries a fixed rate and the set of services it
//    includes (see the PMJAY Packages register below).

const DEPARTMENTS = ["General Medicine", "Cardiology", "Diagnostics", "Radiology", "Orthopedics"]
const GST_OPTIONS = ["Exempt", "5%", "12%", "18%"]

// Mock "today" so effective-date comparisons are deterministic — matches
// this register's other mock content (Audit Log, Hospital Profile, etc).
const TODAY = new Date("2026-08-19")
const TODAY_ISO = "2026-08-19"
const TODAY_LABEL = "19 Aug 2026"

function parseDate(value: string): Date | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDateLabel(value: string): string {
  const d = parseDate(value)
  if (!d) return value
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

/* ------------------------------- Tariff Master ------------------------------- */

/** One dated rate — rows never overwrite an entry in place, they append a
 * new one. This is what lets an invoice generated in the past keep showing
 * the rate that was actually active on its billing date. */
interface RateEntry {
  rate: number
  effectiveFrom: string // ISO yyyy-mm-dd
  editedOn: string
  editedBy: string
}

interface TariffRow {
  id: string
  service: string
  code: string
  department: string
  gst: string
  /** Ascending by effectiveFrom. */
  history: RateEntry[]
}

function sortHistory(history: RateEntry[]): RateEntry[] {
  return [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
}

/** The rate in effect today — the latest entry whose effective date has arrived. */
function currentEntry(row: TariffRow): RateEntry {
  const sorted = sortHistory(row.history)
  const eligible = sorted.filter((h) => (parseDate(h.effectiveFrom)?.getTime() ?? 0) <= TODAY.getTime())
  return eligible[eligible.length - 1] ?? sorted[0]
}

/** The next entry still waiting for its effective date, if any. */
function upcomingEntry(row: TariffRow): RateEntry | undefined {
  return sortHistory(row.history).find((h) => (parseDate(h.effectiveFrom)?.getTime() ?? 0) > TODAY.getTime())
}

const INITIAL_TARIFFS: TariffRow[] = [
  { id: "1", service: "General consultation", code: "CON-001", department: "General Medicine", gst: "Exempt", history: [{ rate: 500, effectiveFrom: "2026-04-01", editedOn: "01 Apr 2026", editedBy: "R. Desai" }] },
  { id: "2", service: "Specialist consultation", code: "CON-002", department: "Cardiology", gst: "Exempt", history: [{ rate: 700, effectiveFrom: "2026-04-01", editedOn: "01 Apr 2026", editedBy: "R. Desai" }] },
  { id: "3", service: "ECG", code: "DIA-014", department: "Diagnostics", gst: "5%", history: [{ rate: 350, effectiveFrom: "2026-01-12", editedOn: "12 Jan 2026", editedBy: "S. Verma" }] },
  { id: "4", service: "Chest X-ray", code: "RAD-006", department: "Radiology", gst: "5%", history: [{ rate: 600, effectiveFrom: "2026-01-12", editedOn: "12 Jan 2026", editedBy: "S. Verma" }] },
  { id: "5", service: "General ward bed / day", code: "BED-GEN", department: "General Medicine", gst: "Exempt", history: [{ rate: 1200, effectiveFrom: "2026-04-01", editedOn: "01 Apr 2026", editedBy: "R. Desai" }] },
  {
    id: "6",
    service: "ICU bed / day",
    code: "BED-ICU",
    department: "Cardiology",
    gst: "Exempt",
    history: [
      { rate: 6500, effectiveFrom: "2026-07-20", editedOn: "20 Jul 2026", editedBy: "R. Desai" },
      { rate: 7200, effectiveFrom: "2026-09-01", editedOn: "20 Jul 2026", editedBy: "R. Desai" },
    ],
  },
]

const TARIFF_EMPTY_FORM = { service: "", code: "", department: DEPARTMENTS[0], rate: "", gst: GST_OPTIONS[0], effectiveDate: TODAY_ISO }

/* ------------------------------- PMJAY Packages ------------------------------- */

interface PmjayPackageRow {
  id: string
  code: string
  name: string
  rate: number
  includedServices: string
  lastEdited: string
  editedBy: string
}

const INITIAL_PMJAY_PACKAGES: PmjayPackageRow[] = [
  { id: "1", code: "PMJAY-OBS-014", name: "Normal Delivery", rate: 9000, includedServices: "Normal delivery, 48-hr stay, routine post-natal care", lastEdited: "01 Apr 2026", editedBy: "R. Desai" },
  { id: "2", code: "PMJAY-OPH-021", name: "Cataract Surgery (Phaco)", rate: 10000, includedServices: "Phacoemulsification, IOL, 1 follow-up visit", lastEdited: "01 Apr 2026", editedBy: "R. Desai" },
  { id: "3", code: "PMJAY-CAR-009", name: "Angioplasty (PTCA, 1 stent)", rate: 65000, includedServices: "PTCA with 1 stent, 3-day ICU/ward stay", lastEdited: "12 Jan 2026", editedBy: "S. Verma" },
  { id: "4", code: "PMJAY-ORT-004", name: "Hip Replacement (Unilateral)", rate: 120000, includedServices: "Implant, surgery, 7-day stay, physiotherapy", lastEdited: "12 Jan 2026", editedBy: "S. Verma" },
]

const PMJAY_EMPTY_FORM = { code: "", name: "", rate: "", includedServices: "" }

/* ------------------------------- TPA Rate Cards ------------------------------- */

interface TpaCard {
  id: string
  insurer: string
  discount?: string
  overrideRates?: string
  lastNegotiated?: string
  editedBy?: string
  /** A future-dated change waiting on its effective date — same append-
   * rather-than-overwrite discipline as the Tariff Master above. */
  pending?: { discount?: string; overrideRates?: string; date: string }
}

const TPA_CARDS: TpaCard[] = [
  { id: "1", insurer: "Star Health Insurance", discount: "10% off base tariff — Cardiology, Orthopedics", lastNegotiated: "12 Jan 2026", editedBy: "S. Verma" },
  { id: "2", insurer: "ICICI Lombard", discount: "8% off base tariff — all departments", lastNegotiated: "01 Apr 2026", editedBy: "R. Desai" },
  { id: "3", insurer: "HDFC Ergo Health" },
  { id: "4", insurer: "Bajaj Allianz" },
]

const TPA_EMPTY_FORM = { insurer: TPA_CARDS[0].insurer, discountPct: "", overrideRates: "", effectiveDate: TODAY_ISO }

export function AdminTariffsPage() {
  const { toast } = useToast()

  /* ---- Tariff Master ---- */
  const [tariffs, setTariffs] = useState<TariffRow[]>(INITIAL_TARIFFS)
  const [tariffDrawerOpen, setTariffDrawerOpen] = useState(false)
  const [editingTariff, setEditingTariff] = useState<TariffRow | null>(null)
  const [tariffForm, setTariffForm] = useState(TARIFF_EMPTY_FORM)
  const [historyTarget, setHistoryTarget] = useState<TariffRow | null>(null)

  function openAddTariff() {
    setEditingTariff(null)
    setTariffForm(TARIFF_EMPTY_FORM)
    setTariffDrawerOpen(true)
  }

  function openEditTariff(row: TariffRow) {
    setEditingTariff(row)
    setTariffForm({ service: row.service, code: row.code, department: row.department, rate: String(currentEntry(row).rate), gst: row.gst, effectiveDate: TODAY_ISO })
    setTariffDrawerOpen(true)
  }

  function handleTariffSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tariffForm.effectiveDate) {
      toast({ title: "Effective date required", description: "Every rate change needs an effective-from date.", variant: "destructive" })
      return
    }
    const newRate = Number(tariffForm.rate) || 0
    const effective = parseDate(tariffForm.effectiveDate)
    const isFutureDated = !!effective && effective.getTime() > TODAY.getTime()
    const newEntry: RateEntry = { rate: newRate, effectiveFrom: tariffForm.effectiveDate, editedOn: TODAY_LABEL, editedBy: "R. Desai" }

    if (editingTariff) {
      setTariffs((prev) =>
        prev.map((r) =>
          r.id === editingTariff.id
            ? { ...r, service: tariffForm.service, code: tariffForm.code, department: tariffForm.department, gst: tariffForm.gst, history: sortHistory([...r.history, newEntry]) }
            : r
        )
      )
      toast({
        title: isFutureDated ? "Change scheduled" : "Rate updated",
        description: isFutureDated
          ? `${tariffForm.service} will change to ${formatCurrency(newRate)} on ${formatDateLabel(tariffForm.effectiveDate)}. The current rate stays live — and on record — until then.`
          : `${tariffForm.service} is now ${formatCurrency(newRate)}, effective ${formatDateLabel(tariffForm.effectiveDate)}.`,
      })
    } else {
      const row: TariffRow = {
        id: String(Date.now()),
        service: tariffForm.service || "Untitled service",
        code: tariffForm.code || "NEW-000",
        department: tariffForm.department,
        gst: tariffForm.gst,
        history: [newEntry],
      }
      setTariffs((prev) => [...prev, row])
      toast({ title: "Rate added", description: `${row.service} added to the tariff master, effective ${formatDateLabel(tariffForm.effectiveDate)}.` })
    }

    setTariffDrawerOpen(false)
    setEditingTariff(null)
    setTariffForm(TARIFF_EMPTY_FORM)
  }

  const tariffColumns: MtColumn<TariffRow>[] = [
    { key: "service", header: "Service", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.service}</span> },
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "department", header: "Department", render: (r) => r.department },
    { key: "rate", header: "Rate (₹)", render: (r) => currentEntry(r).rate.toLocaleString("en-IN"), sortValue: (r) => currentEntry(r).rate },
    { key: "gst", header: "GST", render: (r) => r.gst },
    {
      key: "lastEdited",
      header: "Last edited",
      render: (r) => {
        const current = currentEntry(r)
        const upcoming = upcomingEntry(r)
        return (
          <div>
            <p>
              {current.editedOn} · {current.editedBy}
            </p>
            {upcoming && (
              <p className="text-xs text-adminreg-amber">
                ↻ Changes to {formatCurrency(upcoming.rate)} on {formatDateLabel(upcoming.effectiveFrom)}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions
          actions={[
            { icon: History, label: "History", tooltip: "View rate history", onClick: () => setHistoryTarget(r) },
            { icon: Pencil, label: "Edit", onClick: () => openEditTariff(r) },
          ]}
        />
      ),
    },
  ]

  /* ---- PMJAY Packages ---- */
  const [pmjayPackages, setPmjayPackages] = useState<PmjayPackageRow[]>(INITIAL_PMJAY_PACKAGES)
  const [addPmjayOpen, setAddPmjayOpen] = useState(false)
  const [pmjayForm, setPmjayForm] = useState(PMJAY_EMPTY_FORM)

  function handleAddPmjay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const row: PmjayPackageRow = {
      id: String(Date.now()),
      code: pmjayForm.code || "PMJAY-NEW-000",
      name: pmjayForm.name || "Untitled package",
      rate: Number(pmjayForm.rate) || 0,
      includedServices: pmjayForm.includedServices || "—",
      lastEdited: TODAY_LABEL,
      editedBy: "R. Desai",
    }
    setPmjayPackages((prev) => [...prev, row])
    setAddPmjayOpen(false)
    setPmjayForm(PMJAY_EMPTY_FORM)
    toast({ title: "Package added", description: `${row.name} added to PMJAY Packages.` })
  }

  const pmjayColumns: MtColumn<PmjayPackageRow>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "name", header: "Name", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span> },
    { key: "rate", header: "Fixed rate (₹)", render: (r) => formatCurrency(r.rate), sortValue: (r) => r.rate },
    { key: "includedServices", header: "Included services", render: (r) => <span className="text-adminreg-muted">{r.includedServices}</span> },
  ]

  /* ---- TPA Rate Cards ---- */
  const [tpaCards, setTpaCards] = useState<TpaCard[]>(TPA_CARDS)
  const [addTpaOpen, setAddTpaOpen] = useState(false)
  const [tpaForm, setTpaForm] = useState(TPA_EMPTY_FORM)

  function handleAddTpa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const insurerName = tpaForm.insurer.trim()
    if (!insurerName) {
      toast({ title: "TPA name required", description: "Enter the insurer/TPA's name.", variant: "destructive" })
      return
    }
    if (!tpaForm.effectiveDate) {
      toast({ title: "Effective date required", description: "Every negotiated-rate change needs an effective-from date.", variant: "destructive" })
      return
    }
    const effective = parseDate(tpaForm.effectiveDate)
    const isFutureDated = !!effective && effective.getTime() > TODAY.getTime()
    const discountLabel = tpaForm.discountPct ? `${tpaForm.discountPct}% off base tariff` : undefined
    const overrideRates = tpaForm.overrideRates.trim() || undefined
    const dateLabel = formatDateLabel(tpaForm.effectiveDate)

    setTpaCards((prev) => {
      const existingIndex = prev.findIndex((c) => c.insurer.toLowerCase() === insurerName.toLowerCase())
      if (existingIndex === -1) {
        const newCard: TpaCard = isFutureDated
          ? { id: String(Date.now()), insurer: insurerName, pending: { discount: discountLabel, overrideRates, date: dateLabel } }
          : { id: String(Date.now()), insurer: insurerName, discount: discountLabel, overrideRates, lastNegotiated: dateLabel, editedBy: "R. Desai" }
        return [...prev, newCard]
      }
      return prev.map((c, i) =>
        i === existingIndex
          ? isFutureDated
            ? { ...c, pending: { discount: discountLabel, overrideRates, date: dateLabel } }
            : { ...c, discount: discountLabel ?? c.discount, overrideRates: overrideRates ?? c.overrideRates, lastNegotiated: dateLabel, editedBy: "R. Desai", pending: undefined }
          : c
      )
    })

    toast({
      title: isFutureDated ? "Rate card change scheduled" : "Rate card updated",
      description: isFutureDated
        ? `${insurerName}'s negotiated rate takes effect ${dateLabel}.`
        : `${insurerName}'s negotiated rate is now in effect.`,
    })

    setAddTpaOpen(false)
    setTpaForm(TPA_EMPTY_FORM)
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Tariffs & Packages" subtitle="Service tariffs, PMJAY packages and TPA negotiated rate cards." />

      <AdminCard
        title="Tariff Master"
        noPadding
        action={
          <MtButton className="gap-2" onClick={openAddTariff}>
            <Plus className="h-4 w-4" />
            Add rate
          </MtButton>
        }
      >
        <MtDataTable columns={tariffColumns} rows={tariffs} keyExtractor={(r) => r.id} />
      </AdminCard>

      <AdminCard
        title="PMJAY Packages"
        noPadding
        action={
          <MtButton className="gap-2" onClick={() => setAddPmjayOpen(true)}>
            <Plus className="h-4 w-4" />
            Add package
          </MtButton>
        }
      >
        <MtDataTable columns={pmjayColumns} rows={pmjayPackages} keyExtractor={(r) => r.id} />
      </AdminCard>

      <AdminCard
        title="TPA Rate Cards"
        action={
          <MtButton
            className="gap-2"
            onClick={() => {
              setTpaForm(TPA_EMPTY_FORM)
              setAddTpaOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Add TPA
          </MtButton>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tpaCards.map((card) => (
            <div key={card.id} className="border border-adminreg-border bg-adminreg-header/40 p-4">
              <p className="text-sm font-semibold text-adminreg-text">{card.insurer}</p>
              {card.discount || card.overrideRates ? (
                <>
                  {card.discount && <p className="mt-1.5 text-sm text-adminreg-olive-700">{card.discount}</p>}
                  {card.overrideRates && <p className="mt-1 text-xs text-adminreg-muted">Override rates: {card.overrideRates}</p>}
                  <p className="mt-1 text-xs text-adminreg-muted">
                    Last negotiated {card.lastNegotiated} · {card.editedBy}
                  </p>
                </>
              ) : (
                !card.pending && (
                  <p className="mt-1.5 text-xs font-medium text-adminreg-amber-text">
                    No negotiated rates entered yet — showing base tariff for all services.
                  </p>
                )
              )}
              {card.pending && (
                <p className="mt-1.5 text-xs font-medium text-adminreg-amber-text">
                  ↻ {card.pending.discount || card.pending.overrideRates || "New rate"} takes effect {card.pending.date}
                </p>
              )}
            </div>
          ))}
        </div>
      </AdminCard>

      <FormDialog
        open={tariffDrawerOpen}
        onOpenChange={(open) => {
          setTariffDrawerOpen(open)
          if (!open) setEditingTariff(null)
        }}
        title={editingTariff ? "Edit rate" : "Add rate"}
        description={editingTariff ? `${editingTariff.code} · currently ${formatCurrency(currentEntry(editingTariff).rate)}` : undefined}
        onSubmit={handleTariffSubmit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setTariffDrawerOpen(false)}>Cancel</MtButton>
            <MtButton type="submit">{editingTariff ? "Save changes" : "Add rate"}</MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Service</Label>
          <Input value={tariffForm.service} onChange={(e) => setTariffForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g. MRI Brain" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
          <Input value={tariffForm.code} onChange={(e) => setTariffForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. RAD-012" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Department</Label>
          <Select value={tariffForm.department} onValueChange={(v) => setTariffForm((f) => ({ ...f, department: v }))}>
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
            <Input type="number" min={0} value={tariffForm.rate} onChange={(e) => setTariffForm((f) => ({ ...f, rate: e.target.value }))} placeholder="0" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">GST</Label>
            <Select value={tariffForm.gst} onValueChange={(v) => setTariffForm((f) => ({ ...f, gst: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GST_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Effective date</Label>
          <Input type="date" value={tariffForm.effectiveDate} onChange={(e) => setTariffForm((f) => ({ ...f, effectiveDate: e.target.value }))} required />
          <p className="text-xs text-adminreg-muted">
            Required. This never overwrites the previous rate — it adds a new dated entry, so invoices already billed keep the rate that was active at the time. Today's date applies the change now; a future date schedules it instead.
          </p>
        </div>
      </FormDialog>

      <FormDialog
        open={addPmjayOpen}
        onOpenChange={setAddPmjayOpen}
        title="Add PMJAY package"
        onSubmit={handleAddPmjay}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddPmjayOpen(false)}>Cancel</MtButton>
            <MtButton type="submit">Add package</MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
          <Input value={pmjayForm.code} onChange={(e) => setPmjayForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. PMJAY-SUR-009" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Name</Label>
          <Input value={pmjayForm.name} onChange={(e) => setPmjayForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Hernia Repair" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Fixed rate (₹)</Label>
          <Input type="number" min={0} value={pmjayForm.rate} onChange={(e) => setPmjayForm((f) => ({ ...f, rate: e.target.value }))} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Included services</Label>
          <Textarea
            value={pmjayForm.includedServices}
            onChange={(e) => setPmjayForm((f) => ({ ...f, includedServices: e.target.value }))}
            placeholder="e.g. Open hernia repair, 2-day stay, 1 follow-up"
            rows={3}
          />
        </div>
      </FormDialog>

      <FormDialog
        open={addTpaOpen}
        onOpenChange={setAddTpaOpen}
        title="Add TPA rate card"
        onSubmit={handleAddTpa}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddTpaOpen(false)}>Cancel</MtButton>
            <MtButton type="submit">Add rate card</MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">TPA name</Label>
          <Input value={tpaForm.insurer} onChange={(e) => setTpaForm((f) => ({ ...f, insurer: e.target.value }))} placeholder="e.g. Star Health Insurance" required />
          <p className="text-xs text-adminreg-muted">Matches an existing card by name, or adds a new one if it doesn't match yet.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Negotiated discount (% off base tariff)</Label>
          <Input type="number" min={0} max={100} value={tpaForm.discountPct} onChange={(e) => setTpaForm((f) => ({ ...f, discountPct: e.target.value }))} placeholder="e.g. 10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Or specify override rates</Label>
          <Textarea
            value={tpaForm.overrideRates}
            onChange={(e) => setTpaForm((f) => ({ ...f, overrideRates: e.target.value }))}
            placeholder="e.g. ICU bed/day ₹6,000 flat, Angioplasty package ₹1,60,000"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Effective date</Label>
          <Input type="date" value={tpaForm.effectiveDate} onChange={(e) => setTpaForm((f) => ({ ...f, effectiveDate: e.target.value }))} required />
          <p className="text-xs text-adminreg-muted">
            Required. Today's date applies the negotiated rate now; a future date schedules it — the current rate card stays as-is until then.
          </p>
        </div>
      </FormDialog>

      <AdminModal
        open={!!historyTarget}
        onOpenChange={(open) => !open && setHistoryTarget(null)}
        title={historyTarget ? `Rate history — ${historyTarget.service}` : ""}
        lines={historyTarget ? [`${historyTarget.code} · every entry below is permanent — invoices keep the rate active on their billing date.`] : []}
        confirmLabel="Close"
        onConfirm={() => setHistoryTarget(null)}
      >
        {historyTarget && (
          <div className="mt-3 space-y-2">
            {sortHistory(historyTarget.history).map((h, i) => {
              const isFuture = (parseDate(h.effectiveFrom)?.getTime() ?? 0) > TODAY.getTime()
              const isCurrent = !isFuture && h === currentEntry(historyTarget)
              const tag = isFuture ? "UPCOMING" : isCurrent ? "CURRENT" : "PAST"
              const tagClass = isFuture ? "text-adminreg-amber-text" : isCurrent ? "text-adminreg-olive-700" : "text-adminreg-muted"
              return (
                <div key={i} className="flex items-center justify-between border border-adminreg-border bg-adminreg-header/40 px-3.5 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-adminreg-text">{formatCurrency(h.rate)}</p>
                    <p className="text-xs text-adminreg-muted">
                      Effective {formatDateLabel(h.effectiveFrom)} · edited {h.editedOn} by {h.editedBy}
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.04em] ${tagClass}`}>{tag}</span>
                </div>
              )
            })}
          </div>
        )}
      </AdminModal>
    </div>
  )
}
