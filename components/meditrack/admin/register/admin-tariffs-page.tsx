"use client"

import { useMemo, useState, type FormEvent } from "react"
import { History, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetDepartments } from "@/queries/departments"
import {
  useCreateTariff,
  useDeleteTariff,
  useGetTariffRates,
  useGetTariffs,
  useUpdateTariff,
  type MediTrackPackage,
  type MediTrackTariff,
} from "@/queries/meditrack/tariffs"
import { useCreatePackage, useDeletePackage, useGetPackages, useUpdatePackage } from "@/queries/meditrack/packages"
import { MtDataTable, RowActions, FormDialog, MtButton, TableSkeleton, formatCurrency, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { AdminModal } from "./AdminModal"

const GST_OPTIONS = ["Exempt", "5%", "12%", "18%"]
const UNASSIGNED_DEPARTMENT = "unassigned"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function parseAmount(value?: string | null) {
  if (!value) return 0
  const n = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isNaN(n) ? 0 : n
}

const TARIFF_EMPTY_FORM = {
  service: "",
  code: "",
  departmentId: UNASSIGNED_DEPARTMENT,
  rate: "",
  gst: GST_OPTIONS[0],
  effectiveDate: todayIso(),
}

const PMJAY_EMPTY_FORM = { code: "", name: "", rate: "", includedServices: "" }

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
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const clinicId = clinic?.id || undefined

  const { data: departments = [] } = useGetDepartments(companyId || undefined, clinicId)
  const { data: tariffsData, isLoading: isLoadingTariffs, isError: isTariffsError, error: tariffsError } = useGetTariffs({ pageSize: 100 })
  const { data: packagesData, isLoading: isLoadingPackages, isError: isPackagesError, error: packagesError } = useGetPackages({ pageSize: 100 })
  const createTariff = useCreateTariff()
  const updateTariff = useUpdateTariff()
  const deleteTariff = useDeleteTariff()
  const createPackage = useCreatePackage()
  const updatePackage = useUpdatePackage()
  const deletePackage = useDeletePackage()

  const tariffs = tariffsData?.items ?? []
  const packages = packagesData?.items ?? []

  const [tariffDrawerOpen, setTariffDrawerOpen] = useState(false)
  const [editingTariff, setEditingTariff] = useState<MediTrackTariff | null>(null)
  const [tariffForm, setTariffForm] = useState(TARIFF_EMPTY_FORM)
  const [historyTarget, setHistoryTarget] = useState<MediTrackTariff | null>(null)
  const [pmjayDrawerOpen, setPmjayDrawerOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<MediTrackPackage | null>(null)
  const [pmjayForm, setPmjayForm] = useState(PMJAY_EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "tariff" | "package"; id: string; name: string } | null>(null)

  const { data: rateHistory = [], isLoading: isLoadingHistory } = useGetTariffRates(historyTarget?.id, !!historyTarget)

  const departmentOptions = useMemo(
    () => departments.filter((d) => d.isActive !== false),
    [departments]
  )

  const isSavingTariff = createTariff.isPending || updateTariff.isPending
  const isSavingPackage = createPackage.isPending || updatePackage.isPending

  function openAddTariff() {
    setEditingTariff(null)
    setTariffForm({ ...TARIFF_EMPTY_FORM, effectiveDate: todayIso() })
    setTariffDrawerOpen(true)
  }

  function openEditTariff(row: MediTrackTariff) {
    setEditingTariff(row)
    setTariffForm({
      service: row.service || "",
      code: row.code || "",
      departmentId: row.departmentId || UNASSIGNED_DEPARTMENT,
      rate: row.rate || "",
      gst: row.gst || GST_OPTIONS[0],
      effectiveDate: todayIso(),
    })
    setTariffDrawerOpen(true)
  }

  function openAddPackage() {
    setEditingPackage(null)
    setPmjayForm(PMJAY_EMPTY_FORM)
    setPmjayDrawerOpen(true)
  }

  function openEditPackage(row: MediTrackPackage) {
    setEditingPackage(row)
    setPmjayForm({
      code: row.code || "",
      name: row.name || "",
      rate: row.fixedRate || "",
      includedServices: row.includedServices || "",
    })
    setPmjayDrawerOpen(true)
  }

  async function handleTariffSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!tariffForm.effectiveDate) {
      toast({ title: "Effective date required", description: "Every rate change needs an effective-from date.", variant: "destructive" })
      return
    }

    const payload = {
      service: tariffForm.service.trim(),
      code: tariffForm.code.trim() || null,
      departmentId: tariffForm.departmentId === UNASSIGNED_DEPARTMENT ? null : tariffForm.departmentId,
      rate: tariffForm.rate.trim() || null,
      gst: tariffForm.gst,
      effectiveDate: tariffForm.effectiveDate,
    }

    try {
      if (editingTariff) {
        const updated = await updateTariff.mutateAsync({
          id: editingTariff.id,
          ...payload,
          isActive: editingTariff.isActive,
        })
        toast({ title: "Rate updated", description: `${updated.service} was saved.` })
      } else {
        const created = await createTariff.mutateAsync(payload)
        toast({
          title: "Rate added",
          description: `${created.service} added to the tariff master, effective ${formatDateLabel(created.effectiveDate)}.`,
        })
      }
      setTariffDrawerOpen(false)
      setEditingTariff(null)
      setTariffForm({ ...TARIFF_EMPTY_FORM, effectiveDate: todayIso() })
    } catch (err) {
      toast({
        title: editingTariff ? "Could not update rate" : "Could not add rate",
        description: getToastErrorMessage(err, "Failed to save tariff"),
        variant: "destructive",
      })
    }
  }

  async function handlePmjaySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const payload = {
      code: pmjayForm.code.trim(),
      name: pmjayForm.name.trim(),
      fixedRate: pmjayForm.rate.trim() || null,
      includedServices: pmjayForm.includedServices.trim() || null,
      effectiveDate: editingPackage?.effectiveDate?.slice(0, 10) || todayIso(),
    }
    try {
      if (editingPackage) {
        const updated = await updatePackage.mutateAsync({
          id: editingPackage.id,
          ...payload,
          isActive: editingPackage.isActive,
        })
        toast({ title: "Package updated", description: `${updated.name} was saved.` })
      } else {
        const created = await createPackage.mutateAsync(payload)
        toast({ title: "Package added", description: `${created.name} added to PMJAY Packages.` })
      }
      setPmjayDrawerOpen(false)
      setEditingPackage(null)
      setPmjayForm(PMJAY_EMPTY_FORM)
    } catch (err) {
      toast({
        title: editingPackage ? "Could not update package" : "Could not add package",
        description: getToastErrorMessage(err, "Failed to save package"),
        variant: "destructive",
      })
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === "tariff") {
        await deleteTariff.mutateAsync(deleteTarget.id)
        toast({ title: "Rate deleted", description: `${deleteTarget.name} was removed from the tariff master.` })
      } else {
        await deletePackage.mutateAsync(deleteTarget.id)
        toast({ title: "Package deleted", description: `${deleteTarget.name} was removed from PMJAY Packages.` })
      }
      setDeleteTarget(null)
    } catch (err) {
      toast({
        title: deleteTarget.type === "tariff" ? "Could not delete rate" : "Could not delete package",
        description: getToastErrorMessage(err, "Failed to delete"),
        variant: "destructive",
      })
    }
  }

  const tariffColumns: MtColumn<MediTrackTariff>[] = [
    { key: "service", header: "Service", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.service}</span>, sortValue: (r) => r.service },
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code || "—"}</span>, sortValue: (r) => r.code || "" },
    { key: "department", header: "Department", render: (r) => r.departmentName || "—", sortValue: (r) => r.departmentName || "" },
    { key: "rate", header: "Rate (₹)", render: (r) => parseAmount(r.rate).toLocaleString("en-IN"), sortValue: (r) => parseAmount(r.rate) },
    { key: "gst", header: "GST", render: (r) => r.gst || "—" },
    {
      key: "lastEdited",
      header: "Last edited",
      render: (r) => (
        <div>
          <p>{formatDateLabel(r.updatedAt || r.effectiveDate)}</p>
          {r.hasScheduledChange && r.upcomingRate && (
            <p className="text-xs text-adminreg-amber">
              ↻ Changes to {formatCurrency(parseAmount(r.upcomingRate))} on {formatDateLabel(r.upcomingRateDate)}
            </p>
          )}
        </div>
      ),
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
            { icon: Trash2, label: "Delete", destructive: true, onClick: () => setDeleteTarget({ type: "tariff", id: r.id, name: r.service }) },
          ]}
        />
      ),
    },
  ]

  const pmjayColumns: MtColumn<(typeof packages)[number]>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "name", header: "Name", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span> },
    { key: "rate", header: "Fixed rate (₹)", render: (r) => formatCurrency(parseAmount(r.fixedRate)), sortValue: (r) => parseAmount(r.fixedRate) },
    { key: "includedServices", header: "Included services", render: (r) => <span className="text-adminreg-muted">{r.includedServices || "—"}</span> },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions
          actions={[
            { icon: Pencil, label: "Edit", onClick: () => openEditPackage(r) },
            {
              icon: Trash2,
              label: "Delete",
              destructive: true,
              onClick: () => setDeleteTarget({ type: "package", id: r.id, name: r.name }),
            },
          ]}
        />
      ),
    },
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
        {isLoadingTariffs ? (
          <TableSkeleton rows={6} columns={6} />
        ) : isTariffsError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(tariffsError, "Failed to load tariffs")}</p>
        ) : (
          <MtDataTable
            columns={tariffColumns}
            rows={tariffs}
            keyExtractor={(r) => r.id}
            emptyTitle="No tariffs yet"
            emptyDescription="Add a rate to start the tariff master."
          />
        )}
      </AdminCard>

      <AdminCard
        title="PMJAY Packages"
        noPadding
        action={
          <MtButton className="gap-2" onClick={openAddPackage}>
            <Plus className="h-4 w-4" />
            Add package
          </MtButton>
        }
      >
        {isLoadingPackages ? (
          <TableSkeleton rows={4} columns={4} />
        ) : isPackagesError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(packagesError, "Failed to load packages")}</p>
        ) : (
          <MtDataTable
            columns={pmjayColumns}
            rows={packages}
            keyExtractor={(r) => r.id}
            emptyTitle="No packages yet"
            emptyDescription="Add a PMJAY package to start the register."
          />
        )}
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
        description={editingTariff ? `${editingTariff.code || "No code"} · currently ${formatCurrency(parseAmount(editingTariff.rate))}` : undefined}
        onSubmit={handleTariffSubmit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setTariffDrawerOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingTariff}>
              {isSavingTariff ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingTariff ? "Save changes" : "Add rate"}
            </MtButton>
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
          <Select value={tariffForm.departmentId} onValueChange={(v) => setTariffForm((f) => ({ ...f, departmentId: v }))}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_DEPARTMENT}>Unassigned</SelectItem>
              {departmentOptions.map((d) => (
                <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
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
        open={pmjayDrawerOpen}
        onOpenChange={(open) => {
          setPmjayDrawerOpen(open)
          if (!open) setEditingPackage(null)
        }}
        title={editingPackage ? "Edit PMJAY package" : "Add PMJAY package"}
        onSubmit={handlePmjaySubmit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setPmjayDrawerOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingPackage}>
              {isSavingPackage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingPackage ? "Save changes" : "Add package"}
            </MtButton>
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
        lines={historyTarget ? [`${historyTarget.code || "No code"} · every entry below is permanent — invoices keep the rate active on their billing date.`] : []}
        confirmLabel="Close"
        onConfirm={() => setHistoryTarget(null)}
      >
        {historyTarget && (
          <div className="mt-3 space-y-2">
            {isLoadingHistory ? (
              <p className="text-sm text-adminreg-muted">Loading rate history…</p>
            ) : rateHistory.length === 0 ? (
              <p className="text-sm text-adminreg-muted">No rate history yet.</p>
            ) : (
              rateHistory.map((h) => {
                const isFuture = new Date(h.effectiveDate).getTime() > Date.now()
                const tag = isFuture ? "UPCOMING" : h.isCurrent ? "CURRENT" : "PAST"
                const tagClass = isFuture ? "text-adminreg-amber-text" : h.isCurrent ? "text-adminreg-olive-700" : "text-adminreg-muted"
                return (
                  <div key={h.id} className="flex items-center justify-between border border-adminreg-border bg-adminreg-header/40 px-3.5 py-2.5 text-sm">
                    <div>
                      <p className="font-semibold text-adminreg-text">{formatCurrency(parseAmount(h.rate))}</p>
                      <p className="text-xs text-adminreg-muted">Effective {formatDateLabel(h.effectiveDate)}</p>
                    </div>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.04em] ${tagClass}`}>{tag}</span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === "package" ? "Delete package" : "Delete rate"}
        lines={
          deleteTarget
            ? [
                `"${deleteTarget.name}" will be removed from the register.`,
                "This cannot be undone from this screen.",
              ]
            : []
        }
        confirmLabel={deleteTariff.isPending || deletePackage.isPending ? "Deleting…" : "Delete"}
        danger
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
