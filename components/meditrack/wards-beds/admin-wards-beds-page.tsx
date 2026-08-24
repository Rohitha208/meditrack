"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Plus, Loader2, Pencil } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetUsers } from "@/queries/users/get-users"
import {
  useCreateWard,
  useGetWards,
  useUpdateWard,
  type MediTrackWard,
} from "@/queries/meditrack/wards"
import {
  useCreateBed,
  useGetBedsByWard,
  useUpdateBed,
  toApiBedStatus,
  toUiBedStatus,
  type Bed,
} from "@/queries/meditrack/beds"
import { MtDataTable, RowActions, FormDialog, MtButton, TableSkeleton, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"
import { AdminModal } from "@/components/meditrack/admin/register/AdminModal"
import { BED_STATUS_CLASS, type BedStatus } from "@/components/meditrack/admin/register/theme"

const LEGEND: BedStatus[] = ["Occupied", "Vacant", "Cleaning", "Out of service"]
const WARD_EMPTY_FORM = { code: "", name: "", sanctioned: "0", headUserId: "unassigned" }

export function AdminWardsBedsPage() {
  const { toast } = useToast()
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const clinicId = clinic?.id || undefined

  const { data: wards = [], isLoading: isLoadingWards, isError: isWardsError, error: wardsError } = useGetWards(clinicId)
  const [activeWardId, setActiveWardId] = useState<string>("")
  const selectedWardId = activeWardId || wards[0]?.id || ""
  const selectedWard = wards.find((w) => w.id === selectedWardId)

  const { data: beds = [], isLoading: isLoadingBeds, isError, error } = useGetBedsByWard(selectedWardId, !!selectedWardId)
  const createBed = useCreateBed()
  const updateBed = useUpdateBed()

  const { data: usersResponse } = useGetUsers(1, 100, "", !!companyId, companyId)
  const headOptions = useMemo(() => (usersResponse?.items ?? []).filter((u) => u.isActive !== false), [usersResponse])
  const createWard = useCreateWard()
  const updateWard = useUpdateWard()
  const [addWardOpen, setAddWardOpen] = useState(false)
  const [editingWard, setEditingWard] = useState<MediTrackWard | null>(null)
  const [wardForm, setWardForm] = useState(WARD_EMPTY_FORM)
  const isSavingWard = createWard.isPending || updateWard.isPending

  function openEditWard(ward: MediTrackWard) {
    setEditingWard(ward)
    setWardForm({
      code: ward.code || "",
      name: ward.name || "",
      sanctioned: String(ward.sanctioned ?? 0),
      headUserId: ward.headUserId || "unassigned",
    })
  }

  async function handleAddWard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }
    try {
      const created = await createWard.mutateAsync({
        name: wardForm.name.trim(),
        code: wardForm.code.trim() || null,
        sanctioned: Number(wardForm.sanctioned) || 0,
        isActive: true,
        companyId,
        clinicId: clinicId || null,
        headUserId: wardForm.headUserId === "unassigned" ? null : wardForm.headUserId,
      })
      setAddWardOpen(false)
      setWardForm(WARD_EMPTY_FORM)
      toast({ title: "Ward added", description: `${created.name} was added to the ward master.` })
    } catch (err) {
      toast({ title: "Could not add ward", description: getToastErrorMessage(err, "Failed to create ward"), variant: "destructive" })
    }
  }

  async function handleEditWard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingWard) return
    try {
      const updated = await updateWard.mutateAsync({
        id: editingWard.id,
        name: wardForm.name.trim(),
        code: wardForm.code.trim() || null,
        sanctioned: Number(wardForm.sanctioned) || 0,
        isActive: editingWard.isActive,
        companyId: editingWard.companyId || companyId || null,
        clinicId: editingWard.clinicId || clinicId || null,
        headUserId: wardForm.headUserId === "unassigned" ? null : wardForm.headUserId,
      })
      setEditingWard(null)
      setWardForm(WARD_EMPTY_FORM)
      toast({ title: "Ward updated", description: `${updated.name} was saved.` })
    } catch (err) {
      toast({ title: "Could not update ward", description: getToastErrorMessage(err, "Failed to update ward"), variant: "destructive" })
    }
  }

  const wardColumns: MtColumn<MediTrackWard>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs text-adminreg-muted">{r.code || "—"}</span> },
    { key: "name", header: "Name", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span> },
    { key: "sanctioned", header: "Sanctioned", render: (r) => r.sanctioned ?? 0, sortValue: (r) => r.sanctioned ?? 0 },
    { key: "head", header: "Head", render: (r) => r.headUserName || "Unassigned" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className={cn("text-xs font-semibold", r.isActive ? "text-adminreg-olive-700" : "text-adminreg-muted")}>
          {r.isActive ? "Active" : "Inactive"}
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
            {
              icon: Pencil,
              label: "Edit",
              onClick: () => openEditWard(r),
            },
          ]}
        />
      ),
    },
  ]

  const [visibleStatuses, setVisibleStatuses] = useState<Set<BedStatus>>(new Set(LEGEND))
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ bedNumber: "", status: "Vacant" as BedStatus })

  const filteredBeds = useMemo(
    () => beds.filter((bed) => visibleStatuses.has(toUiBedStatus(bed.status))),
    [beds, visibleStatuses]
  )

  function toggleStatus(status: BedStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedWardId) {
      toast({ title: "Select a ward", description: "Create a ward first, then add beds.", variant: "destructive" })
      return
    }
    try {
      const created = await createBed.mutateAsync({
        wardId: selectedWardId,
        bedNumber: form.bedNumber.trim(),
        status: toApiBedStatus(form.status),
        isActive: true,
      })
      setAddOpen(false)
      setForm({ bedNumber: "", status: "Vacant" })
      toast({ title: "Bed added", description: `${created.bedNumber} was added to ${selectedWard?.name || "the ward"}.` })
    } catch (err) {
      toast({ title: "Could not add bed", description: getToastErrorMessage(err, "Failed to create bed"), variant: "destructive" })
    }
  }

  const [bedModalTarget, setBedModalTarget] = useState<Bed | null>(null)
  const bedModalStatus = bedModalTarget ? toUiBedStatus(bedModalTarget.status) : null

  async function toggleOutOfService() {
    if (!bedModalTarget) return
    const nextStatus = bedModalStatus === "Out of service" ? "Vacant" : "Out of service"
    try {
      await updateBed.mutateAsync({
        id: bedModalTarget.id,
        wardId: bedModalTarget.wardId,
        bedNumber: bedModalTarget.bedNumber,
        status: toApiBedStatus(nextStatus),
        patientId: bedModalTarget.patientId ?? null,
        isActive: bedModalTarget.isActive,
      })
      toast({
        title: nextStatus === "Out of service" ? "Bed marked out of service" : "Bed marked vacant",
        description: `${bedModalTarget.bedNumber} is now ${nextStatus.toLowerCase()}.`,
      })
      setBedModalTarget(null)
    } catch (err) {
      toast({ title: "Could not update bed", description: getToastErrorMessage(err, "Failed to update bed"), variant: "destructive" })
    }
  }

  const wardFormFields = (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Ward Name</Label>
        <Input value={wardForm.name} onChange={(e) => setWardForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. General Medicine" required />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
        <Input value={wardForm.code} onChange={(e) => setWardForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. GM" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Sanctioned beds</Label>
        <Input
          type="number"
          min={0}
          value={wardForm.sanctioned}
          onChange={(e) => setWardForm((f) => ({ ...f, sanctioned: e.target.value }))}
          placeholder="0"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Head of Ward</Label>
        <Select value={wardForm.headUserId} onValueChange={(v) => setWardForm((f) => ({ ...f, headUserId: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {headOptions.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Wards & Beds" subtitle="Live bed status by ward, and ward master configuration." />

      {isLoadingWards ? (
        <TableSkeleton rows={2} columns={4} />
      ) : isWardsError ? (
        <p className="text-sm text-adminreg-red">{getToastErrorMessage(wardsError, "Failed to load wards")}</p>
      ) : wards.length === 0 ? (
        <p className="text-sm text-adminreg-muted">No wards yet. Add a ward first, then create beds for it.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {wards.map((ward) => (
            <button
              key={ward.id}
              type="button"
              onClick={() => setActiveWardId(ward.id)}
              className={cn(
                "border px-4 py-2 text-sm font-semibold transition-colors",
                ward.id === selectedWardId
                  ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700"
                  : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
              )}
            >
              {ward.name}
            </button>
          ))}
        </div>
      )}

      <MtButton className="gap-2" onClick={() => setAddOpen(true)} disabled={!selectedWardId}>
        <Plus className="h-4 w-4" />
        Add bed
      </MtButton>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {LEGEND.map((status) => (
          <label key={status} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={visibleStatuses.has(status)}
              onChange={() => toggleStatus(status)}
              className="h-3.5 w-3.5 accent-adminreg-olive"
            />
            <span className={cn("h-2.5 w-2.5 rounded-sm", BED_STATUS_CLASS[status].dot)} />
            <span className="text-adminreg-text">{status}</span>
          </label>
        ))}
      </div>

      <AdminCard title={`${selectedWard?.name || "Ward"} — ${beds.length} beds`}>
        {isLoadingBeds ? (
          <TableSkeleton rows={4} columns={5} />
        ) : isError ? (
          <p className="text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load beds")}</p>
        ) : filteredBeds.length === 0 ? (
          <p className="text-sm text-adminreg-muted">No beds in this ward yet. Use Add bed to create one.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredBeds.map((bed) => {
              const uiStatus = toUiBedStatus(bed.status)
              const cls = BED_STATUS_CLASS[uiStatus]
              return (
                <button
                  key={bed.id}
                  type="button"
                  onClick={() => setBedModalTarget(bed)}
                  className={cn("border p-3 text-left text-sm transition-shadow hover:shadow-sm", cls.border, cls.bg)}
                >
                  <p className="font-semibold text-adminreg-text">{bed.bedNumber}</p>
                  <p className={cn("mt-0.5 text-xs font-medium", cls.text)}>{uiStatus}</p>
                  {bed.patientName && <p className="mt-1 font-mono text-[10px] text-adminreg-muted">{bed.patientName}</p>}
                </button>
              )
            })}
          </div>
        )}
      </AdminCard>

      <AdminCard
        title="Ward Master"
        noPadding
        action={
          <MtButton
            className="gap-2"
            onClick={() => {
              setWardForm(WARD_EMPTY_FORM)
              setAddWardOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Add ward
          </MtButton>
        }
      >
        {isLoadingWards ? (
          <TableSkeleton rows={4} columns={6} />
        ) : isWardsError ? (
          <p className="p-5 text-sm text-adminreg-red">{getToastErrorMessage(wardsError, "Failed to load wards")}</p>
        ) : (
          <MtDataTable
            columns={wardColumns}
            rows={wards}
            keyExtractor={(r) => r.id}
            emptyTitle="No wards yet"
            emptyDescription="Add a ward to start the ward master."
          />
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add bed"
        description={selectedWard ? `New bed in ${selectedWard.name}` : undefined}
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={createBed.isPending}>
              {createBed.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add bed
            </MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Bed number</Label>
          <Input
            value={form.bedNumber}
            onChange={(e) => setForm((f) => ({ ...f, bedNumber: e.target.value }))}
            placeholder="e.g. GM-001"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as BedStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEGEND.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>

      <FormDialog
        open={addWardOpen}
        onOpenChange={setAddWardOpen}
        title="Add ward"
        onSubmit={handleAddWard}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddWardOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingWard}>
              {isSavingWard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add ward
            </MtButton>
          </>
        }
      >
        {wardFormFields}
      </FormDialog>

      <FormDialog
        open={!!editingWard}
        onOpenChange={(open) => !open && setEditingWard(null)}
        title="Edit ward"
        description={editingWard?.code ? `Code ${editingWard.code}` : undefined}
        onSubmit={handleEditWard}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditingWard(null)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingWard}>
              {isSavingWard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {wardFormFields}
      </FormDialog>

      <AdminModal
        open={!!bedModalTarget}
        onOpenChange={(open) => !open && setBedModalTarget(null)}
        title={bedModalTarget ? `Bed ${bedModalTarget.bedNumber}` : ""}
        lines={
          bedModalTarget
            ? bedModalStatus === "Occupied"
              ? [`Currently occupied${bedModalTarget.patientName ? ` — ${bedModalTarget.patientName}` : ""}.`, "Discharge the patient before marking this bed out of service."]
              : bedModalStatus === "Out of service"
                ? ["Currently set aside for maintenance/repair.", "Marking it vacant makes it available for allotment again."]
                : [`Currently ${(bedModalStatus || "").toLowerCase()}.`, "Marking it out of service sets it aside for maintenance/repair — distinct from occupied or vacant."]
            : []
        }
        confirmLabel={bedModalStatus === "Occupied" ? "Close" : bedModalStatus === "Out of service" ? "Mark vacant" : "Mark out of service"}
        danger={bedModalStatus !== "Occupied" && bedModalStatus !== "Out of service"}
        onConfirm={bedModalStatus === "Occupied" ? () => setBedModalTarget(null) : toggleOutOfService}
      />
    </div>
  )
}
