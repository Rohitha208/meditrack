"use client"

import { useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import {
  useCreateMediTrackClinic,
  useDeleteMediTrackClinic,
  useGetMediTrackClinicById,
  useGetMediTrackClinics,
  useUpdateMediTrackClinic,
  type MediTrackClinic,
} from "@/queries/meditrack/clinics"
import {
  makeLicenseNumber,
  useCreateClinicLicense,
  useGetClinicLicenses,
} from "@/queries/meditrack/clinic-licenses"
import {
  ConfirmDialog,
  DetailDrawer,
  FormDialog,
  InfoRow,
  MtButton,
  MtDataTable,
  RowActions,
  TableSkeleton,
  type MtColumn,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

const EMPTY_FORM = {
  name: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  licenseNumber: "",
  subscriptionStatus: "Active",
}

type PendingLicense = {
  key: string
  name: string
  file: File | null
}

function formatAddress(row: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
}) {
  return [row.addressLine1, row.addressLine2, row.city, row.state, row.postalCode].filter(Boolean).join(", ") || "—"
}

function formatDateLabel(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function clinicToForm(clinic: MediTrackClinic) {
  return {
    name: clinic.name || "",
    addressLine1: clinic.addressLine1 || "",
    city: clinic.city || "",
    state: clinic.state || "",
    postalCode: clinic.postalCode || "",
    country: clinic.country || "India",
    licenseNumber: clinic.licenseNumber || "",
    subscriptionStatus: clinic.subscriptionStatus || "Active",
  }
}

function newPendingLicense(): PendingLicense {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: "", file: null }
}

export function AdminHospitalProfilePage() {
  const { toast } = useToast()
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""

  const { data: clinicsData, isLoading, isError, error } = useGetMediTrackClinics(
    { pageSize: 100, companyId: companyId || undefined },
    !!companyId
  )
  const createClinic = useCreateMediTrackClinic()
  const updateClinic = useUpdateMediTrackClinic()
  const deleteClinic = useDeleteMediTrackClinic()
  const createLicense = useCreateClinicLicense()
  const clinics = clinicsData?.items ?? []

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editing, setEditing] = useState<MediTrackClinic | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pendingLicenses, setPendingLicenses] = useState<PendingLicense[]>([])

  const { data: viewedClinic, isLoading: isLoadingView } = useGetMediTrackClinicById(viewId || "", !!viewId)
  const { data: viewedLicenses = [], isLoading: isLoadingViewLicenses } = useGetClinicLicenses(
    viewId || undefined,
    !!viewId
  )
  const { data: editLicenses = [], isLoading: isLoadingEditLicenses } = useGetClinicLicenses(
    editing?.id,
    !!editing && editOpen
  )

  const isSaving = createClinic.isPending || updateClinic.isPending || createLicense.isPending
  const isDeleting = deleteClinic.isPending

  function openAdd() {
    setForm(EMPTY_FORM)
    setPendingLicenses([])
    setAddOpen(true)
  }

  function openEdit(row: MediTrackClinic) {
    setEditing(row)
    setForm(clinicToForm(row))
    setPendingLicenses([])
    setEditOpen(true)
  }

  function openDelete(row: MediTrackClinic) {
    setDeleteTarget({ id: row.id, name: row.name })
  }

  function addPendingLicense() {
    setPendingLicenses((list) => [...list, newPendingLicense()])
  }

  function updatePendingLicense(key: string, patch: Partial<PendingLicense>) {
    setPendingLicenses((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function removePendingLicense(key: string) {
    setPendingLicenses((list) => list.filter((item) => item.key !== key))
  }

  async function savePendingLicenses(clinicId: string) {
    const ready = pendingLicenses.filter((l) => l.name.trim())
    for (const license of ready) {
      await createLicense.mutateAsync({
        clinicId,
        licenseNumber: makeLicenseNumber(license.name),
        licenseName: license.name.trim(),
        file: license.file,
      })
    }
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }
    const incomplete = pendingLicenses.find((l) => !l.name.trim() && l.file)
    if (incomplete) {
      toast({
        title: "License name required",
        description: "Enter a name for each license before uploading a certificate.",
        variant: "destructive",
      })
      return
    }
    try {
      const created = await createClinic.mutateAsync({
        companyId,
        name: form.name.trim(),
        addressLine1: form.addressLine1.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postalCode: form.postalCode.trim() || null,
        country: form.country.trim() || null,
        licenseNumber: form.licenseNumber.trim() || null,
        subscriptionStatus: form.subscriptionStatus || "Active",
      })
      await savePendingLicenses(created.id)
      setAddOpen(false)
      setForm(EMPTY_FORM)
      setPendingLicenses([])
      toast({ title: "Branch added", description: `${created.name} was added.` })
    } catch (err) {
      toast({
        title: "Could not add branch",
        description: getToastErrorMessage(err, "Failed to create clinic"),
        variant: "destructive",
      })
    }
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const editCompanyId = editing.companyId || companyId
    if (!editCompanyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }
    const incomplete = pendingLicenses.find((l) => !l.name.trim() && l.file)
    if (incomplete) {
      toast({
        title: "License name required",
        description: "Enter a name for each license before uploading a certificate.",
        variant: "destructive",
      })
      return
    }
    try {
      const updated = await updateClinic.mutateAsync({
        id: editing.id,
        companyId: editCompanyId,
        name: form.name.trim(),
        addressLine1: form.addressLine1.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postalCode: form.postalCode.trim() || null,
        country: form.country.trim() || null,
        licenseNumber: form.licenseNumber.trim() || null,
        subscriptionStatus: form.subscriptionStatus || "Active",
      })
      await savePendingLicenses(editing.id)
      setEditOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      setPendingLicenses([])
      toast({ title: "Branch updated", description: `${updated.name} was saved.` })
    } catch (err) {
      toast({
        title: "Could not update branch",
        description: getToastErrorMessage(err, "Failed to update clinic"),
        variant: "destructive",
      })
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteClinic.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      toast({ title: "Branch deleted", description: `${deleteTarget.name} was removed.` })
    } catch (err) {
      toast({
        title: "Could not delete branch",
        description: getToastErrorMessage(err, "Failed to delete clinic"),
        variant: "destructive",
      })
    }
  }

  const licenseFields = (
    <div className="space-y-3 border-t border-adminreg-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Licenses</Label>
          <p className="mt-0.5 text-[11px] text-adminreg-muted">PDF / JPG / JPEG · 2–50 KB</p>
        </div>
        <MtButton type="button" variant="outline" size="sm" className="gap-1.5" onClick={addPendingLicense}>
          <Plus className="h-3.5 w-3.5" />
          Add license
        </MtButton>
      </div>

      {editOpen && (
        <div className="space-y-2">
          {isLoadingEditLicenses ? (
            <p className="text-sm text-adminreg-muted">Loading existing licenses…</p>
          ) : editLicenses.length === 0 ? (
            <p className="text-sm text-adminreg-muted">No licenses saved for this branch yet.</p>
          ) : (
            editLicenses.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-2 border border-adminreg-border bg-adminreg-header/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-adminreg-text">{l.licenseName || l.licenseNumber}</p>
                  <p className="text-[11px] text-adminreg-muted">
                    {l.fileName || "No file"} · Exp {formatDateLabel(l.expiryDate)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {pendingLicenses.map((license) => (
        <div key={license.key} className="border border-adminreg-border bg-adminreg-card p-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">
                License name
              </Label>
              <Input
                value={license.name}
                onChange={(e) => updatePendingLicense(license.key, { name: e.target.value })}
                placeholder="e.g. NABH Full Accreditation"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">
                Certificate upload
              </Label>
              <label className="flex h-10 cursor-pointer items-center gap-2 border border-dashed border-adminreg-border bg-background px-3 text-sm text-adminreg-muted hover:bg-adminreg-header/40">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {license.file ? license.file.name : "Choose PDF or image…"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                  className="hidden"
                  onChange={(e) =>
                    updatePendingLicense(license.key, { file: e.target.files?.[0] || null })
                  }
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => removePendingLicense(license.key)}
              className="mb-1.5 shrink-0 text-adminreg-muted hover:text-adminreg-red"
              aria-label="Remove license"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  const branchFormFields = (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Branch name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Sri Ramachandra — Main Campus"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
        <Input
          value={form.licenseNumber}
          onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
          placeholder="e.g. BR-01"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Address line 1</Label>
        <Input
          value={form.addressLine1}
          onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
          placeholder="e.g. Bannerghatta Road"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">City</Label>
          <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Bengaluru" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">State</Label>
          <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="e.g. Karnataka" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Postal code</Label>
          <Input value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="e.g. 560076" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Country</Label>
          <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="India" />
        </div>
      </div>
      {editOpen && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Status</Label>
          <Select value={form.subscriptionStatus} onValueChange={(v) => setForm((f) => ({ ...f, subscriptionStatus: v }))}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {licenseFields}
    </>
  )

  const columns: MtColumn<(typeof clinics)[number]>[] = [
    {
      key: "code",
      header: "Code",
      render: (r) => <span className="font-mono text-xs text-adminreg-muted">{r.licenseNumber || "—"}</span>,
    },
    {
      key: "name",
      header: "Branch name",
      alwaysVisible: true,
      render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span>,
      sortValue: (r) => r.name,
    },
    {
      key: "address",
      header: "Address",
      render: (r) => <span className="text-adminreg-muted">{formatAddress(r)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className="text-xs font-semibold text-adminreg-olive-700">
          {r.subscriptionStatus || "Active"}
        </span>
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
            { icon: Pencil, label: "Edit", onClick: () => openEdit(r) },
            { icon: Trash2, label: "Delete", destructive: true, onClick: () => openDelete(r) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Hospital Profile" subtitle="Manage hospital branches." />

      <AdminCard
        title="Branches"
        noPadding
        action={
          <MtButton className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add branch
          </MtButton>
        }
      >
        {isLoading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : isError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load branches")}</p>
        ) : (
          <MtDataTable
            columns={columns}
            rows={clinics}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => setViewId(r.id)}
            emptyTitle="No branches yet"
            emptyDescription="Add a branch to start the hospital profile."
          />
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setPendingLicenses([])
        }}
        title="Add branch"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add branch
            </MtButton>
          </>
        }
      >
        {branchFormFields}
      </FormDialog>

      <FormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditing(null)
            setPendingLicenses([])
          }
        }}
        title="Edit branch"
        onSubmit={handleEdit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {branchFormFields}
      </FormDialog>

      <DetailDrawer
        open={!!viewId}
        onOpenChange={(open) => {
          if (!open) setViewId(null)
        }}
        title={viewedClinic?.name || "Branch"}
      >
        {isLoadingView ? (
          <p className="text-sm text-adminreg-muted">Loading branch…</p>
        ) : viewedClinic ? (
          <div className="space-y-4">
            <div className="divide-y divide-adminreg-border">
              <InfoRow label="Branch name" value={viewedClinic.name} />
              <InfoRow label="Code" value={viewedClinic.licenseNumber || "—"} />
              <InfoRow label="Address" value={formatAddress(viewedClinic)} />
              <InfoRow label="City" value={viewedClinic.city || "—"} />
              <InfoRow label="State" value={viewedClinic.state || "—"} />
              <InfoRow label="Postal code" value={viewedClinic.postalCode || "—"} />
              <InfoRow label="Country" value={viewedClinic.country || "—"} />
              <InfoRow label="Status" value={viewedClinic.subscriptionStatus || "Active"} />
              {viewedClinic.phone ? <InfoRow label="Phone" value={viewedClinic.phone} /> : null}
              {viewedClinic.email ? <InfoRow label="Email" value={viewedClinic.email} /> : null}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Licenses</p>
              {isLoadingViewLicenses ? (
                <p className="text-sm text-adminreg-muted">Loading licenses…</p>
              ) : viewedLicenses.length === 0 ? (
                <p className="text-sm text-adminreg-muted">No licenses for this branch.</p>
              ) : (
                <ul className="space-y-2">
                  {viewedLicenses.map((l) => (
                    <li key={l.id} className="border border-adminreg-border bg-adminreg-header/40 px-3 py-2 text-sm">
                      <p className="font-medium text-adminreg-text">{l.licenseName || l.licenseNumber}</p>
                      <p className="text-[11px] text-adminreg-muted">
                        {l.fileName || "No certificate"} · Exp {formatDateLabel(l.expiryDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-adminreg-muted">Branch not found.</p>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete branch"
        description={`Delete "${deleteTarget?.name || "this branch"}"? This cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
