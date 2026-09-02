"use client"

import { useMemo, useState, type FormEvent } from "react"
import { History, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useGetDepartments } from "@/queries/departments"
import { BranchSelect, useBranchScope } from "./use-branch-scope"
import {
  useCreateTariff,
  useDeleteTariff,
  useGetTariffRates,
  useGetTariffs,
  useUpdateTariff,
  type MediTrackTariff,
} from "@/queries/meditrack/tariffs"
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

/** Tariff Master — one of three screens reachable from the "Tariffs &
 * Packages" sidebar entry's submenu (alongside PMJAY Packages and TPA Rate
 * Cards, at /admin/tariffs/pmjay-packages and /admin/tariffs/tpa-rate-cards).
 * This one owns the parent's own href (/admin/tariffs). */
export function AdminTariffMasterPage() {
  const { toast } = useToast()
  const { companyId, branchId, setBranchId, clinicId, hasBranch, branches, isLoadingBranches } = useBranchScope()

  const { data: departments = [] } = useGetDepartments(companyId || undefined, clinicId, !!companyId && hasBranch)
  const { data: tariffsData, isLoading: isLoadingTariffs, isError: isTariffsError, error: tariffsError } = useGetTariffs({ pageSize: 100 })
  const createTariff = useCreateTariff()
  const updateTariff = useUpdateTariff()
  const deleteTariff = useDeleteTariff()

  const tariffs = tariffsData?.items ?? []

  const [tariffDrawerOpen, setTariffDrawerOpen] = useState(false)
  const [editingTariff, setEditingTariff] = useState<MediTrackTariff | null>(null)
  const [tariffForm, setTariffForm] = useState(TARIFF_EMPTY_FORM)
  const [historyTarget, setHistoryTarget] = useState<MediTrackTariff | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: rateHistory = [], isLoading: isLoadingHistory } = useGetTariffRates(historyTarget?.id, !!historyTarget)

  const departmentOptions = useMemo(() => departments.filter((d) => d.isActive !== false), [departments])
  const isSavingTariff = createTariff.isPending || updateTariff.isPending

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

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteTariff.mutateAsync(deleteTarget.id)
      toast({ title: "Rate deleted", description: `${deleteTarget.name} was removed from the tariff master.` })
      setDeleteTarget(null)
    } catch (err) {
      toast({ title: "Could not delete rate", description: getToastErrorMessage(err, "Failed to delete"), variant: "destructive" })
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
            { icon: Trash2, label: "Delete", destructive: true, onClick: () => setDeleteTarget({ id: r.id, name: r.service }) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Services"
        subtitle="Service tariffs — departments scoped by branch."
        actions={
          <div className="flex items-center gap-2">
            <BranchSelect value={branchId} onValueChange={setBranchId} branches={branches} isLoading={isLoadingBranches} />
            <MtButton className="gap-2" onClick={openAddTariff}>
              <Plus className="h-4 w-4" />
              Add rate
            </MtButton>
          </div>
        }
      />

      <AdminCard title="Tariff Master" noPadding>
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
        title="Delete rate"
        lines={deleteTarget ? [`"${deleteTarget.name}" will be removed from the register.`, "This cannot be undone from this screen."] : []}
        confirmLabel={deleteTariff.isPending ? "Deleting…" : "Delete"}
        danger
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
