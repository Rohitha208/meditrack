"use client"

import { useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useCreateTpa, useDeleteTpa, useGetTpas, useUpdateTpa, type MediTrackTpa } from "@/queries/meditrack/tpas"
import { MtDataTable, RowActions, FormDialog, MtButton, TableSkeleton, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { AdminModal } from "./AdminModal"
import { BranchSelect, useBranchScope } from "./use-branch-scope"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const TPA_EMPTY_FORM = { tpaName: "", discountPercent: "", overrideRates: "", effectiveDate: todayIso() }

/** TPA Rate Cards — one of three screens reachable from the "Tariffs &
 * Packages" sidebar entry's submenu (alongside Tariff Master and PMJAY
 * Packages), at /admin/tariffs/tpa-rate-cards. A table view rather than a
 * card grid, matching the register's other list screens. */
export function AdminTpaRateCardsPage() {
  const { toast } = useToast()
  const { branchId, setBranchId, hasBranch, branches, isLoadingBranches, noBranchMessage } = useBranchScope()
  const { data: tpasData, isLoading: isLoadingTpas, isError: isTpasError, error: tpasError } = useGetTpas({ pageSize: 100 }, hasBranch)
  const createTpa = useCreateTpa()
  const updateTpa = useUpdateTpa()
  const deleteTpa = useDeleteTpa()

  const tpas = tpasData?.items ?? []

  const [tpaDrawerOpen, setTpaDrawerOpen] = useState(false)
  const [editingTpa, setEditingTpa] = useState<MediTrackTpa | null>(null)
  const [tpaForm, setTpaForm] = useState(TPA_EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const isSavingTpa = createTpa.isPending || updateTpa.isPending

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

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteTpa.mutateAsync(deleteTarget.id)
      toast({ title: "TPA deleted", description: `${deleteTarget.name} was removed from TPA rate cards.` })
      setDeleteTarget(null)
    } catch (err) {
      toast({ title: "Could not delete TPA", description: getToastErrorMessage(err, "Failed to delete"), variant: "destructive" })
    }
  }

  const tpaColumns: MtColumn<MediTrackTpa>[] = [
    { key: "tpaName", header: "TPA name", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.tpaName}</span>, sortValue: (r) => r.tpaName },
    {
      key: "negotiatedRate",
      header: "Negotiated rate",
      render: (r) =>
        r.discountPercent ? (
          <span className="font-semibold text-adminreg-olive-700">{r.discountPercent}% off base tariff</span>
        ) : r.overrideRates ? (
          <span className="text-adminreg-text">Override: {r.overrideRates}</span>
        ) : (
          <span className="font-medium text-adminreg-amber-text">No negotiated rates yet — base tariff applies</span>
        ),
    },
    { key: "effectiveDate", header: "Effective date", render: (r) => formatDateLabel(r.effectiveDate), sortValue: (r) => r.effectiveDate || "" },
    { key: "updatedAt", header: "Last updated", render: (r) => formatDateLabel(r.updatedAt), sortValue: (r) => r.updatedAt || "" },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions
          actions={[
            { icon: Pencil, label: "Edit", onClick: () => openEditTpa(r) },
            { icon: Trash2, label: "Delete", destructive: true, onClick: () => setDeleteTarget({ id: r.id, name: r.tpaName }) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="TPA Rate Cards"
        subtitle="Insurer-specific negotiated discounts and override rates."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BranchSelect value={branchId} onValueChange={setBranchId} branches={branches} isLoading={isLoadingBranches} />
            <MtButton className="gap-2" onClick={openAddTpa} disabled={!hasBranch}>
              <Plus className="h-4 w-4" />
              Add TPA
            </MtButton>
          </div>
        }
      />

      <AdminCard title="TPA Rate Cards" noPadding>
        {!hasBranch ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{noBranchMessage}</p>
        ) : isLoadingTpas ? (
          <TableSkeleton rows={4} columns={5} />
        ) : isTpasError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(tpasError, "Failed to load TPA rate cards")}</p>
        ) : (
          <MtDataTable
            columns={tpaColumns}
            rows={tpas}
            keyExtractor={(r) => r.id}
            emptyTitle="No TPA rate cards yet"
            emptyDescription="Add a negotiated rate card to start this register."
          />
        )}
      </AdminCard>

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
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete TPA"
        lines={deleteTarget ? [`"${deleteTarget.name}" will be removed from the register.`, "This cannot be undone from this screen."] : []}
        confirmLabel={deleteTpa.isPending ? "Deleting…" : "Delete"}
        danger
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
