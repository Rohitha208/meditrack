"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Eye, Loader2, Pencil, Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useGetMediTrackUsers } from "@/queries/meditrack/users"
import {
  useCreateDepartment,
  useGetDepartmentById,
  useGetDepartments,
  useUpdateDepartment,
  type Department,
} from "@/queries/departments"
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
import { BranchFormField, BranchSelect, useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"

const EMPTY_FORM = { name: "", headUserId: "unassigned" }

function displayHead(dept: Department) {
  const name = dept.headUserName?.trim()
  return name ? name : "Unassigned"
}

export function AdminDepartmentsPage() {
  const { toast } = useToast()
  const {
    companyId,
    branchId,
    setBranchId,
    clinicId,
    hasBranch,
    branches,
    isLoadingBranches,
    noBranchMessage,
  } = useBranchScope()

  const { data: departments = [], isLoading, isError, error } = useGetDepartments(
    companyId || undefined,
    clinicId,
    !!companyId && hasBranch
  )
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formBranchId, setFormBranchId] = useState("")

  const headBranchId = formBranchId || branchId
  const deptFormOpen = addOpen || editOpen

  const { data: headUsersData, isLoading: isLoadingHeadUsers } = useGetMediTrackUsers(
    {
      pageNumber: 1,
      pageSize: 100,
      companyId: companyId || undefined,
      clinicIds: headBranchId ? [headBranchId] : undefined,
    },
    !!companyId && !!headBranchId && deptFormOpen
  )
  const headOptions = useMemo(
    () => (headUsersData?.items ?? []).filter((u) => u.isActive !== false),
    [headUsersData]
  )

  function handleFormBranchChange(nextBranchId: string) {
    setFormBranchId(nextBranchId)
    setForm((f) => ({ ...f, headUserId: "unassigned" }))
  }

  const { data: viewedDepartment, isLoading: isLoadingView } = useGetDepartmentById(viewId || "", !!viewId)

  const isSaving = createDepartment.isPending || updateDepartment.isPending

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormBranchId(branchId)
    setAddOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setForm({
      name: dept.name || "",
      headUserId: dept.headUserId || "unassigned",
    })
    setFormBranchId(dept.clinicId || branchId)
    setEditOpen(true)
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }
    if (!formBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this department.", variant: "destructive" })
      return
    }

    try {
      const created = await createDepartment.mutateAsync({
        name: form.name.trim(),
        isActive: true,
        companyId,
        clinicId: formBranchId,
        headUserId: form.headUserId === "unassigned" ? null : form.headUserId,
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
    if (!formBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this department.", variant: "destructive" })
      return
    }

    try {
      const updated = await updateDepartment.mutateAsync({
        id: editing.departmentId,
        name: form.name.trim(),
        isActive: editing.isActive,
        companyId: editing.companyId || companyId || null,
        clinicId: formBranchId,
        headUserId: form.headUserId === "unassigned" ? null : form.headUserId,
        tariffGroupId: editing.tariffGroupId || null,
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
              <p className="text-xs text-adminreg-red">No doctors assigned yet</p>
            )}
          </div>
        ) : (
          displayHead(r)
        ),
      sortValue: (r) => displayHead(r),
    },
    { key: "tariffGroup", header: "Tariff Group", render: () => "—" },
    { key: "providers", header: "Doctors", render: (r) => r.providerCount ?? 0, sortValue: (r) => r.providerCount ?? 0 },
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
      <BranchFormField
        value={formBranchId}
        onValueChange={handleFormBranchChange}
        branches={branches}
        isLoading={isLoadingBranches}
      />
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
          <SelectTrigger><SelectValue placeholder={isLoadingHeadUsers ? "Loading staff…" : "Select head"} /></SelectTrigger>
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
    <div>
      <AdminPageHeader
        title="Departments"
        subtitle="Department master data — scoped by branch."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelect
              value={branchId}
              onValueChange={setBranchId}
              branches={branches}
              isLoading={isLoadingBranches}
            />
            <MtButton className="gap-2" onClick={openAdd} disabled={!hasBranch}>
              <Plus className="h-4 w-4" />
              Add department
            </MtButton>
          </div>
        }
      />

      <AdminCard title="Department Master" noPadding>
        {!hasBranch ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{noBranchMessage}</p>
        ) : isLoading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : isError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load departments")}</p>
        ) : (
          <MtDataTable
            columns={columns}
            rows={departments}
            keyExtractor={(r) => r.departmentId}
            emptyTitle="No departments yet"
            emptyDescription="Add a department to start mapping heads and doctors."
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
            <InfoRow label="Doctors" value={viewedDepartment.providerCount ?? 0} />
            {viewedDepartment.providers && viewedDepartment.providers.length > 0 && (
              <div className="pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Assigned doctors</p>
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
    </div>
  )
}
