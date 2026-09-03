"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useCreatePackage, useDeletePackage, useGetPackages, useUpdatePackage } from "@/queries/meditrack/packages"
import { useGetTariffs, type MediTrackPackage } from "@/queries/meditrack/tariffs"
import { MtDataTable, RowActions, FormDialog, MtButton, TableSkeleton, formatCurrency, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { AdminModal } from "./AdminModal"
import { BranchSelect, useBranchScope } from "./use-branch-scope"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function parseAmount(value?: string | null) {
  if (!value) return 0
  const n = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isNaN(n) ? 0 : n
}

function formatIncludedServices(services?: MediTrackPackage["includedServices"]) {
  if (!services?.length) return "—"
  return services.map((s) => s.service || s.code || "Service").join(", ")
}

const PMJAY_EMPTY_FORM = { includedServiceIds: [] as string[], code: "", name: "", rate: "" }

/** PMJAY Packages — one of three screens reachable from the "Tariffs &
 * Packages" sidebar entry's submenu (alongside Tariff Master and TPA Rate
 * Cards), at /admin/tariffs/pmjay-packages. */
export function AdminPmjayPackagesPage() {
  const { toast } = useToast()
  const { branchId, setBranchId, hasBranch, branches, isLoadingBranches, noBranchMessage } = useBranchScope()

  const { data: packagesData, isLoading: isLoadingPackages, isError: isPackagesError, error: packagesError } = useGetPackages(
    { pageSize: 100 },
    hasBranch
  )
  const { data: tariffsData, isLoading: isLoadingTariffs } = useGetTariffs({ pageSize: 100 }, hasBranch)
  const createPackage = useCreatePackage()
  const updatePackage = useUpdatePackage()
  const deletePackage = useDeletePackage()

  const packages = packagesData?.items ?? []
  const serviceOptions = useMemo(
    () => (tariffsData?.items ?? []).filter((t) => t.isActive !== false),
    [tariffsData?.items]
  )

  const [pmjayDrawerOpen, setPmjayDrawerOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<MediTrackPackage | null>(null)
  const [pmjayForm, setPmjayForm] = useState(PMJAY_EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const isSavingPackage = createPackage.isPending || updatePackage.isPending

  function openAddPackage() {
    setEditingPackage(null)
    setPmjayForm(PMJAY_EMPTY_FORM)
    setPmjayDrawerOpen(true)
  }

  function openEditPackage(row: MediTrackPackage) {
    setEditingPackage(row)
    setPmjayForm({
      includedServiceIds: row.includedServices?.map((s) => s.id) ?? [],
      code: row.code || "",
      name: row.name || "",
      rate: row.fixedRate || "",
    })
    setPmjayDrawerOpen(true)
  }

  function toggleService(serviceId: string, checked: boolean) {
    setPmjayForm((f) => ({
      ...f,
      includedServiceIds: checked
        ? [...f.includedServiceIds, serviceId]
        : f.includedServiceIds.filter((id) => id !== serviceId),
    }))
  }

  async function handlePmjaySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pmjayForm.includedServiceIds.length) {
      toast({ title: "Services required", description: "Select at least one included service.", variant: "destructive" })
      return
    }
    const payload = {
      code: pmjayForm.code.trim(),
      name: pmjayForm.name.trim(),
      fixedRate: pmjayForm.rate.trim() || null,
      includedServiceIds: pmjayForm.includedServiceIds,
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
      await deletePackage.mutateAsync(deleteTarget.id)
      toast({ title: "Package deleted", description: `${deleteTarget.name} was removed from PMJAY Packages.` })
      setDeleteTarget(null)
    } catch (err) {
      toast({ title: "Could not delete package", description: getToastErrorMessage(err, "Failed to delete"), variant: "destructive" })
    }
  }

  const pmjayColumns: MtColumn<(typeof packages)[number]>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "name", header: "Name", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span> },
    { key: "rate", header: "Fixed rate (₹)", render: (r) => formatCurrency(parseAmount(r.fixedRate)), sortValue: (r) => parseAmount(r.fixedRate) },
    { key: "includedServices", header: "Included services", render: (r) => <span className="text-adminreg-muted">{formatIncludedServices(r.includedServices)}</span> },
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
            { icon: Trash2, label: "Delete", destructive: true, onClick: () => setDeleteTarget({ id: r.id, name: r.name }) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Packages"
        subtitle="Fixed-rate PMJAY packages and the services each one covers."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BranchSelect value={branchId} onValueChange={setBranchId} branches={branches} isLoading={isLoadingBranches} />
            <MtButton className="gap-2" onClick={openAddPackage} disabled={!hasBranch}>
              <Plus className="h-4 w-4" />
              Add package
            </MtButton>
          </div>
        }
      />

      <AdminCard title="PMJAY Packages" noPadding>
        {!hasBranch ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{noBranchMessage}</p>
        ) : isLoadingPackages ? (
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
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Included services</Label>
          {isLoadingTariffs ? (
            <p className="text-sm text-adminreg-muted">Loading services…</p>
          ) : serviceOptions.length === 0 ? (
            <p className="text-sm text-adminreg-muted">No services found. Add tariffs in Tariff Master first.</p>
          ) : (
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-adminreg-border bg-background p-3">
              {serviceOptions.map((service) => {
                const checked = pmjayForm.includedServiceIds.includes(service.id)
                return (
                  <label key={service.id} className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleService(service.id, value === true)}
                    />
                    <span>
                      <span className="font-medium text-adminreg-text">{service.service}</span>
                      {service.code ? <span className="ml-1 font-mono text-xs text-adminreg-muted">({service.code})</span> : null}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
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
      </FormDialog>

      <AdminModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete package"
        lines={deleteTarget ? [`"${deleteTarget.name}" will be removed from the register.`, "This cannot be undone from this screen."] : []}
        confirmLabel={deletePackage.isPending ? "Deleting…" : "Delete"}
        danger
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
