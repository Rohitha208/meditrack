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
import { BranchSelect, useBranchScope } from "./use-branch-scope"
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
import { useCreateTpa, useDeleteTpa, useGetTpas, useUpdateTpa, type MediTrackTpa } from "@/queries/meditrack/tpas"
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

function parseDate(value: string): Date | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
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
const TPA_EMPTY_FORM = { tpaName: "", discountPercent: "", overrideRates: "", effectiveDate: todayIso() }

export function AdminTariffsPage() {
  const { toast } = useToast()
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const {
    branchId,
    setBranchId,
    clinicId,
    hasBranch,
    branches,
    isLoadingBranches,
  } = useBranchScope()

  const { data: departments = [] } = useGetDepartments(companyId || undefined, clinicId, !!companyId && hasBranch)
  const { data: tariffsData, isLoading: isLoadingTariffs, isError: isTariffsError, error: tariffsError } = useGetTariffs({ pageSize: 100 })
  const { data: packagesData, isLoading: isLoadingPackages, isError: isPackagesError, error: packagesError } = useGetPackages({ pageSize: 100 })
  const { data: tpasData, isLoading: isLoadingTpas, isError: isTpasError, error: tpasError } = useGetTpas({ pageSize: 100 })
  const createTariff = useCreateTariff()
  const updateTariff = useUpdateTariff()
  const deleteTariff = useDeleteTariff()
  const createPackage = useCreatePackage()
  const updatePackage = useUpdatePackage()
  const deletePackage = useDeletePackage()
  const createTpa = useCreateTpa()
  const updateTpa = useUpdateTpa()
  const deleteTpa = useDeleteTpa()

  const tariffs = tariffsData?.items ?? []
  const packages = packagesData?.items ?? []
  const tpas = tpasData?.items ?? []

  const [tariffDrawerOpen, setTariffDrawerOpen] = useState(false)
  const [editingTariff, setEditingTariff] = useState<MediTrackTariff | null>(null)
  const [tariffForm, setTariffForm] = useState(TARIFF_EMPTY_FORM)
  const [historyTarget, setHistoryTarget] = useState<MediTrackTariff | null>(null)
  const [pmjayDrawerOpen, setPmjayDrawerOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<MediTrackPackage | null>(null)
  const [pmjayForm, setPmjayForm] = useState(PMJAY_EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "tariff" | "package" | "tpa"; id: string; name: string } | null>(null)

  const { data: rateHistory = [], isLoading: isLoadingHistory } = useGetTariffRates(historyTarget?.id, !!historyTarget)

  const departmentOptions = useMemo(
    () => departments.filter((d) => d.isActive !== false),
    [departments]
  )

  const isSavingTariff = createTariff.isPending || updateTariff.isPending
  const isSavingPackage = createPackage.isPending || updatePackage.isPending
  const isSavingTpa = createTpa.isPending || updateTpa.isPending

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

  const [tpaDrawerOpen, setTpaDrawerOpen] = useState(false)
  const [editingTpa, setEditingTpa] = useState<MediTrackTpa | null>(null)
  const [tpaForm, setTpaForm] = useState(TPA_EMPTY_FORM)

  function openAddTpa() {
    setEditingTpa(null)
    setTpaForm({ ...TPA_EMPTY_FORM, effectiveDate: todayIso() })
    setTpaDrawerOpen(true)
  }

  function openEditTpa(row: MediTrackTpa) {
    setEditingTpa(row)
    setTpaForm({
      tpaName: row.tpaName || "",
      discountPercent: row.discountPercent || "",
      overrideRates: row.overrideRates || "",
      effectiveDate: row.effectiveDate?.slice(0, 10) || todayIso(),
    })
    setTpaDrawerOpen(true)
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
      } else if (deleteTarget.type === "package") {
        await deletePackage.mutateAsync(deleteTarget.id)
        toast({ title: "Package deleted", description: `${deleteTarget.name} was removed from PMJAY Packages.` })
      } else {
        await deleteTpa.mutateAsync(deleteTarget.id)
        toast({ title: "TPA deleted", description: `${deleteTarget.name} was removed from TPA rate cards.` })
      }
      setDeleteTarget(null)
    } catch (err) {
      toast({
        title:
          deleteTarget.type === "tariff"
            ? "Could not delete rate"
            : deleteTarget.type === "package"
              ? "Could not delete package"
              : "Could not delete TPA",
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
  async function handleTpaSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const tpaName = tpaForm.tpaName.trim()
    if (!tpaName) {
      toast({ title: "TPA name required", description: "Enter the insurer/TPA's name.", variant: "destructive" })
      return
    }
    if (!tpaForm.effectiveDate) {
      toast({ title: "Effective date required", description: "Every negotiated-rate change needs an effective-from date.", variant: "destructive" })
      return
    }
    const payload = {
      tpaName,
      discountPercent: tpaForm.discountPercent.trim() || null,
      overrideRates: tpaForm.overrideRates.trim() || null,
      effectiveDate: tpaForm.effectiveDate,
    }

    try {
      if (editingTpa) {
        const updated = await updateTpa.mutateAsync({
          id: editingTpa.id,
          ...payload,
          isActive: editingTpa.isActive,
        })
        toast({ title: "TPA updated", description: `${updated.tpaName} was saved.` })
      } else {
        const created = await createTpa.mutateAsync(payload)
        toast({ title: "TPA added", description: `${created.tpaName} was added to TPA rate cards.` })
      }
      setTpaDrawerOpen(false)
      setEditingTpa(null)
      setTpaForm({ ...TPA_EMPTY_FORM, effectiveDate: todayIso() })
    } catch (err) {
      toast({
        title: editingTpa ? "Could not update TPA" : "Could not add TPA",
        description: getToastErrorMessage(err, "Failed to save TPA rate card"),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Tariffs & Packages"
        subtitle="Service tariffs, PMJAY packages and TPA negotiated rate cards — departments scoped by branch."
        actions={
          <BranchSelect
            value={branchId}
            onValueChange={setBranchId}
            branches={branches}
            isLoading={isLoadingBranches}
          />
        }
      />

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
          <MtButton className="gap-2" onClick={openAddTpa}>
            <Plus className="h-4 w-4" />
            Add TPA
          </MtButton>
        }
      >
        {isLoadingTpas ? (
          <TableSkeleton rows={4} columns={2} />
        ) : isTpasError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(tpasError, "Failed to load TPA rate cards")}</p>
        ) : tpas.length === 0 ? (
          <p className="px-5 py-8 text-sm text-adminreg-muted">No TPA rate cards yet. Add a negotiated rate card to start this register.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tpas.map((card) => (
              <div key={card.id} className="border border-adminreg-border bg-adminreg-header/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-adminreg-text">{card.tpaName}</p>
                  <RowActions
                    actions={[
                      { icon: Pencil, label: "Edit", onClick: () => openEditTpa(card) },
                      {
                        icon: Trash2,
                        label: "Delete",
                        destructive: true,
                        onClick: () => setDeleteTarget({ type: "tpa", id: card.id, name: card.tpaName }),
                      },
                    ]}
                  />
                </div>
                {card.discountPercent && (
                  <p className="mt-1.5 text-sm text-adminreg-olive-700">{card.discountPercent}% off base tariff</p>
                )}
                {card.overrideRates && (
                  <p className="mt-1 text-xs text-adminreg-muted">Override rates: {card.overrideRates}</p>
                )}
                {!card.discountPercent && !card.overrideRates && (
                  <p className="mt-1.5 text-xs font-medium text-adminreg-amber-text">
                    No negotiated rates entered yet — showing base tariff for all services.
                  </p>
                )}
                <p className="mt-1 text-xs text-adminreg-muted">
                  Effective {formatDateLabel(card.effectiveDate)} · Updated {formatDateLabel(card.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
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
        open={tpaDrawerOpen}
        onOpenChange={(open) => {
          setTpaDrawerOpen(open)
          if (!open) setEditingTpa(null)
        }}
        title={editingTpa ? "Edit TPA rate card" : "Add TPA rate card"}
        onSubmit={handleTpaSubmit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setTpaDrawerOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingTpa}>
              {isSavingTpa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingTpa ? "Save changes" : "Add rate card"}
            </MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">TPA name</Label>
          <Input value={tpaForm.tpaName} onChange={(e) => setTpaForm((f) => ({ ...f, tpaName: e.target.value }))} placeholder="e.g. Star Health Insurance" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Negotiated discount (% off base tariff)</Label>
          <Input type="number" min={0} max={100} value={tpaForm.discountPercent} onChange={(e) => setTpaForm((f) => ({ ...f, discountPercent: e.target.value }))} placeholder="e.g. 10" />
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
        title={deleteTarget?.type === "package" ? "Delete package" : deleteTarget?.type === "tpa" ? "Delete TPA" : "Delete rate"}
        lines={
          deleteTarget
            ? [
                `"${deleteTarget.name}" will be removed from the register.`,
                "This cannot be undone from this screen.",
              ]
            : []
        }
        confirmLabel={deleteTariff.isPending || deletePackage.isPending || deleteTpa.isPending ? "Deleting…" : "Delete"}
        danger
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
