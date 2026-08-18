"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Eye, Loader2, Pencil, Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetUsers } from "@/queries/users/get-users"
import {
  useCreateDepartment,
  useGetDepartmentById,
  useGetDepartments,
  useUpdateDepartment,
  type Department,
} from "@/queries/departments"
import { useGetBeds } from "@/queries/meditrack/beds"
import { BedPickerModal } from "@/components/meditrack/wards-beds"
import {
  MtDataTable,
  RowActions,
  FormDialog,
  MtButton,
  DetailDrawer,
  InfoRow,
  TableSkeleton,
  type MtColumn,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"

const EMPTY_FORM = { name: "", headUserId: "unassigned", bedIds: [] as string[] }

function displayHead(dept: Department) {
  const name = dept.headUserName?.trim()
  return name ? name : "Unassigned"
}

export function AdminDepartmentsPage() {
  const { toast } = useToast()
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const clinicId = clinic?.id || undefined

  const { data: departments = [], isLoading, isError, error } = useGetDepartments(companyId || undefined, clinicId)
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()

  const { data: usersResponse } = useGetUsers(1, 100, "", !!companyId, companyId)
  const { data: allBeds = [], isLoading: isLoadingBeds } = useGetBeds(undefined, true)
  const headOptions = useMemo(() => {
    return (usersResponse?.items ?? []).filter((u) => u.isActive !== false)
  }, [usersResponse])

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [bedPickerOpen, setBedPickerOpen] = useState(false)

  const { data: viewedDepartment, isLoading: isLoadingView } = useGetDepartmentById(viewId || "", !!viewId)

  const isSaving = createDepartment.isPending || updateDepartment.isPending

  function openAdd() {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setForm({
      name: dept.name || "",
      headUserId: dept.headUserId || "unassigned",
      bedIds: dept.bedIds ?? [],
    })
    setEditOpen(true)
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }

    try {
      const created = await createDepartment.mutateAsync({
        name: form.name.trim(),
        isActive: true,
        companyId,
        clinicId: clinicId || null,
        headUserId: form.headUserId === "unassigned" ? null : form.headUserId,
        bedIds: form.bedIds,
      })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      toast({ title: "Department added", description: `${created.name} was added to the master list.` })
    } catch (err) {
      toast({ title: "Could not add department", description: getToastErrorMessage(err, "Failed to create department"), variant: "destructive" })
    }
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return

    try {
      const updated = await updateDepartment.mutateAsync({
        id: editing.departmentId,
        name: form.name.trim(),
        isActive: editing.isActive,
        companyId: editing.companyId || companyId || null,
        clinicId: editing.clinicId || clinicId || null,
        headUserId: form.headUserId === "unassigned" ? null : form.headUserId,
        tariffGroupId: editing.tariffGroupId || null,
        bedIds: form.bedIds,
      })
      setEditOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      toast({ title: "Department updated", description: `${updated.name} was saved.` })
    } catch (err) {
      toast({ title: "Could not update department", description: getToastErrorMessage(err, "Failed to update department"), variant: "destructive" })
    }
  }

  const columns: MtColumn<Department>[] = [
    { key: "name", header: "Department", alwaysVisible: true, render: (r) => <span className="font-semibold text-adminreg-text">{r.name}</span>, sortValue: (r) => r.name },
    {
      key: "head",
      header: "Head",
      render: (r) =>
        displayHead(r) === "Unassigned" ? (
          <div>
            <span className="text-adminreg-muted">Unassigned</span>
            {(!r.providerCount || r.providerCount === 0) && (
              <p className="text-xs text-adminreg-red">No providers assigned yet</p>
            )}
          </div>
        ) : (
          displayHead(r)
        ),
      sortValue: (r) => displayHead(r),
    },
    { key: "beds", header: "Beds", render: (r) => r.bedIds?.length ?? 0, sortValue: (r) => r.bedIds?.length ?? 0 },
    { key: "tariffGroup", header: "Tariff Group", render: (r) => "—" },
    { key: "providers", header: "Providers", render: (r) => r.providerCount ?? 0, sortValue: (r) => r.providerCount ?? 0 },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions
          actions={[
            { icon: Eye, label: "View", onClick: () => setViewId(r.departmentId) },
            { icon: Pencil, label: "Edit", onClick: () => openEdit(r) },
          ]}
        />
      ),
    },
  ]

  const departmentFormFields = (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Department Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Dermatology"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Head of Department</Label>
        <Select value={form.headUserId} onValueChange={(v) => setForm((f) => ({ ...f, headUserId: v }))}>
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
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Beds</Label>
        <MtButton
          type="button"
          variant="outline"
          onClick={() => setBedPickerOpen(true)}
          className="w-full justify-between px-3 text-left"
        >
          {form.bedIds.length > 0 ? `${form.bedIds.length} bed${form.bedIds.length === 1 ? "" : "s"} selected` : "Select beds"}
        </MtButton>
        <p className="text-xs text-adminreg-muted">Open the picker to choose vacant, occupied, cleaning, or out-of-service beds.</p>
      </div>
    </>
  )

  return (
    <div>
      <AdminPageHeader
        title="Departments"
        subtitle="Department master data — heads, beds and tariff mapping."
        actions={
          <MtButton className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add department
          </MtButton>
        }
      />

      <AdminCard title="Department Master" noPadding>
        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : isError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load departments")}</p>
        ) : (
          <MtDataTable
            columns={columns}
            rows={departments}
            keyExtractor={(r) => r.departmentId}
            emptyTitle="No departments yet"
            emptyDescription="Add a department to start mapping heads, beds and providers."
          />
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add department"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {createDepartment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add department
            </MtButton>
          </>
        }
      >
        {departmentFormFields}
      </FormDialog>

      <FormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditing(null)
        }}
        title="Edit department"
        onSubmit={handleEdit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {updateDepartment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {departmentFormFields}
      </FormDialog>

      <DetailDrawer
        open={!!viewId}
        onOpenChange={(open) => {
          if (!open) setViewId(null)
        }}
        title={viewedDepartment?.name || "Department"}
      >
        {isLoadingView ? (
          <p className="text-sm text-adminreg-muted">Loading department…</p>
        ) : viewedDepartment ? (
          <div className="divide-y divide-adminreg-border">
            <InfoRow label="Department" value={viewedDepartment.name} />
            <InfoRow label="Head" value={displayHead(viewedDepartment)} />
            <InfoRow label="Beds" value={viewedDepartment.bedIds?.length ?? 0} />
            <InfoRow label="Providers" value={viewedDepartment.providerCount ?? 0} />
            {viewedDepartment.providers && viewedDepartment.providers.length > 0 && (
              <div className="pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Assigned providers</p>
                <ul className="space-y-1.5">
                  {viewedDepartment.providers.map((p) => (
                    <li key={p.id} className="text-sm text-adminreg-text">
                      {p.name}{p.role ? <span className="text-adminreg-muted"> · {p.role}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-adminreg-muted">Department not found.</p>
        )}
      </DetailDrawer>

      <BedPickerModal
        open={bedPickerOpen}
        onOpenChange={setBedPickerOpen}
        beds={allBeds}
        selectedIds={form.bedIds}
        isLoading={isLoadingBeds}
        onConfirm={(ids) => setForm((f) => ({ ...f, bedIds: ids }))}
      />
    </div>
  )
}
