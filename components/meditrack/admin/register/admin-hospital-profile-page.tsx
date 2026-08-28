"use client"

import { useState, type FormEvent } from "react"
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
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

type LicenseTone = "valid" | "warning" | "critical"

interface License {
  name: string
  cert: string
  issued: string
  expires: string
  statusLabel: string
  tone: LicenseTone
}

const LICENSES: License[] = [
  { name: "NABH Full Accreditation", cert: "NABH-2024-0871", issued: "14 Mar 2024", expires: "13 Mar 2027", statusLabel: "VALID", tone: "valid" },
  { name: "Fire & Safety NOC", cert: "KSFES-8821", issued: "02 Sep 2025", expires: "01 Sep 2026", statusLabel: "EXPIRES IN 20 DAYS", tone: "warning" },
  { name: "Biomedical Waste Authorization", cert: "BMW-2023-0456", issued: "10 Jun 2023", expires: "09 Jun 2026", statusLabel: "EXPIRED", tone: "critical" },
  { name: "Pollution Control Board Consent", cert: "PCB-2025-1187", issued: "01 Jan 2025", expires: "31 Dec 2027", statusLabel: "VALID", tone: "valid" },
]

const LICENSE_TONE_CLASS: Record<LicenseTone, { border: string; bg: string; text: string }> = {
  valid: { border: "border-adminreg-border", bg: "bg-adminreg-card", text: "text-adminreg-olive-700" },
  warning: { border: "border-adminreg-amber", bg: "bg-adminreg-amber-soft", text: "text-adminreg-amber-text" },
  critical: { border: "border-adminreg-red", bg: "bg-adminreg-red-soft", text: "text-adminreg-red-text" },
}

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

function formatAddress(row: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
}) {
  return [row.addressLine1, row.addressLine2, row.city, row.state, row.postalCode].filter(Boolean).join(", ") || "—"
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
  const clinics = clinicsData?.items ?? []

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editing, setEditing] = useState<MediTrackClinic | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: viewedClinic, isLoading: isLoadingView } = useGetMediTrackClinicById(viewId || "", !!viewId)

  const isSaving = createClinic.isPending || updateClinic.isPending
  const isDeleting = deleteClinic.isPending

  function openAdd() {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  function openEdit(row: MediTrackClinic) {
    setEditing(row)
    setForm(clinicToForm(row))
    setEditOpen(true)
  }

  function openDelete(row: MediTrackClinic) {
    setDeleteTarget({ id: row.id, name: row.name })
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
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
      setAddOpen(false)
      setForm(EMPTY_FORM)
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
      setEditOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
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
            { icon: Eye, label: "View", onClick: () => setViewId(r.id) },
            { icon: Pencil, label: "Edit", onClick: () => openEdit(r) },
            { icon: Trash2, label: "Delete", destructive: true, onClick: () => openDelete(r) },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Hospital Profile" subtitle="Branches, accreditation, licenses and compliance documents." />

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
            emptyTitle="No branches yet"
            emptyDescription="Add a branch to start the hospital profile."
          />
        )}
      </AdminCard>

      <AdminCard title="Accreditation & Licenses">
        <div className="space-y-3">
          {LICENSES.map((l) => {
            const cls = LICENSE_TONE_CLASS[l.tone]
            return (
              <div key={l.cert} className={cn("flex flex-col gap-2 border p-3.5 sm:flex-row sm:items-center sm:justify-between", cls.border, cls.bg)}>
                <div>
                  <p className="text-sm font-semibold text-adminreg-text">{l.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-adminreg-muted">Cert. {l.cert}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-adminreg-muted sm:text-sm">
                  <span>Issued {l.issued}</span>
                  <span>Expires {l.expires}</span>
                  <span className={cn("font-mono text-[11px] font-bold uppercase tracking-[0.04em]", cls.text)}>{l.statusLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add branch"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {createClinic.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
          if (!open) setEditing(null)
        }}
        title="Edit branch"
        onSubmit={handleEdit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {updateClinic.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
