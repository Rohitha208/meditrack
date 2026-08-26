"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ConfirmDialog,
  DetailDrawer,
  FormDialog,
  InfoRow,
  MtButton,
  MtDataTable,
  RowActions,
  StatusBadge,
  TableSkeleton,
  getInitials,
  type MtColumn,
} from "@/components/meditrack/shared"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"
import { BranchFormField, BranchSelect, useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useToast } from "@/hooks/use-toast"
import {
  useCreateMediTrackUser,
  useDeleteMediTrackUser,
  useGetMediTrackUsers,
  useUpdateMediTrackUser,
  type MediTrackUser,
} from "@/queries/meditrack/users"
import { useGetMediTrackRoles } from "@/queries/meditrack/roles"
import { useGetMediTrackScreens, useGetMediTrackScreenAccess, useUpdateScreenAccess } from "@/queries/meditrack/screens"
import { useGetDepartments } from "@/queries/departments"

function displayName(firstName?: string, lastName?: string, email?: string) {
  const name = `${firstName || ""} ${lastName || ""}`.trim()
  return name || email || "Unknown user"
}

function PermissionToggle({ allowed, onClick }: { allowed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={allowed}
      onClick={onClick}
      className={cn(
        "relative mx-auto flex h-5 w-9 flex-shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-adminreg-olive focus-visible:ring-offset-1",
        allowed ? "border-adminreg-olive-dark bg-adminreg-olive" : "border-adminreg-border bg-adminreg-border/50"
      )}
    >
      <span
        className={cn(
          "h-3.5 w-3.5 rounded-full shadow-sm transition-transform",
          allowed ? "translate-x-[18px] bg-white" : "translate-x-0.5 bg-adminreg-muted"
        )}
      />
    </button>
  )
}

function formatLastLogin(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

const ALL_DEPARTMENTS = "all"
const EMPTY_USER_FORM = {
  fullName: "",
  email: "",
  password: "",
  roleId: "",
  departmentId: ALL_DEPARTMENTS,
  branchId: "",
}

export function AdminUsersRolesPage() {
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

  const [tab, setTab] = useState<"users" | "permissions">("users")
  const [roleFilter, setRoleFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<MediTrackUser | null>(null)
  const [viewUser, setViewUser] = useState<MediTrackUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MediTrackUser | null>(null)
  const [form, setForm] = useState(EMPTY_USER_FORM)

  const { data: roles = [], isLoading: isLoadingRoles } = useGetMediTrackRoles(true)
  const hospitalRoles = useMemo(
    () => roles.filter((role) => role.value !== "super_admin"),
    [roles]
  )
  const roleFilterOptions = useMemo(
    () => [
      { value: "all", label: "All roles" },
      ...hospitalRoles.map((role) => ({ value: role.id, label: role.name })),
    ],
    [hospitalRoles]
  )

  const { data: departments = [] } = useGetDepartments(
    companyId || undefined,
    clinicId,
    !!companyId && hasBranch && (tab === "users" || addOpen || editOpen)
  )
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>()
    departments.forEach((d) => map.set(d.departmentId, d.name))
    return map
  }, [departments])
  const createUser = useCreateMediTrackUser()
  const updateUser = useUpdateMediTrackUser()
  const deleteUser = useDeleteMediTrackUser()

  function departmentLabel(departmentId?: string | null) {
    if (!departmentId) return "—"
    return departmentNameById.get(departmentId) || "—"
  }

  const selectedRoleIds = roleFilter === "all" ? [] : [roleFilter]
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = useGetMediTrackUsers(
    {
      pageNumber: 1,
      pageSize: 100,
      companyId: companyId || undefined,
      roleIds: selectedRoleIds,
      clinicIds: clinicId ? [clinicId] : undefined,
    },
    !!companyId && hasBranch && tab === "users"
  )

  const { data: screens = [], isLoading: isLoadingScreens } = useGetMediTrackScreens(tab === "permissions")
  const {
    data: screenAccess = [],
    isLoading: isLoadingAccess,
    isError: isAccessError,
    error: accessError,
  } = useGetMediTrackScreenAccess(clinicId, undefined, tab === "permissions" && hasBranch)

  const updateAccess = useUpdateScreenAccess()
  const users = usersData?.items ?? []

  const [optimistic, setOptimistic] = useState<Map<string, boolean>>(new Map())

  const accessByRoleAndScreen = useMemo(() => {
    const map = new Map<string, boolean>()
    screenAccess.forEach((row) => {
      map.set(`${row.roleId}:${row.screenId}`, row.isAccessEnable)
    })
    optimistic.forEach((val, key) => {
      map.set(key, val)
    })
    return map
  }, [screenAccess, optimistic])

  const defaultRoleId = hospitalRoles[0]?.id || ""

  function openAddUser() {
    setForm({
      ...EMPTY_USER_FORM,
      roleId: defaultRoleId,
      branchId,
    })
    setAddOpen(true)
  }

  function openEditUser(user: MediTrackUser) {
    setEditingUser(user)
    setForm({
      fullName: displayName(user.firstName, user.lastName, ""),
      email: user.email || "",
      password: "",
      roleId: user.roleId || defaultRoleId,
      departmentId: user.departmentId || ALL_DEPARTMENTS,
      branchId: branchId,
    })
    setEditOpen(true)
  }

  function openViewUser(user: MediTrackUser) {
    setViewUser(user)
    setViewOpen(true)
  }

  function openDeleteUser(user: MediTrackUser) {
    setDeleteTarget(user)
    setDeleteOpen(true)
  }

  async function handleSaveUser(e: FormEvent<HTMLFormElement>, mode: "add" | "edit") {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }
    if (!form.branchId) {
      toast({ title: "Branch required", description: "Select a branch for this user.", variant: "destructive" })
      return
    }
    if (!form.roleId) {
      toast({ title: "Role required", description: "Select a role for this user.", variant: "destructive" })
      return
    }

    const { firstName, lastName } = splitFullName(form.fullName)
    if (!firstName) {
      toast({ title: "Full name required", description: "Enter the user's full name.", variant: "destructive" })
      return
    }

    try {
      if (mode === "add") {
        const created = await createUser.mutateAsync({
          firstName,
          lastName: lastName || null,
          email: form.email.trim(),
          passwordHash: form.password,
          roleId: form.roleId,
          companyId,
          departmentId: form.departmentId === ALL_DEPARTMENTS ? null : form.departmentId,
          clinicIds: [form.branchId],
        })
        setAddOpen(false)
        setForm(EMPTY_USER_FORM)
        toast({
          title: "User added",
          description: `${displayName(created.firstName, created.lastName, created.email)} was added.`,
        })
      } else if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          firstName,
          lastName: lastName || null,
          email: form.email.trim(),
          roleId: form.roleId,
          companyId: editingUser.companyId || companyId,
          departmentId: form.departmentId === ALL_DEPARTMENTS ? null : form.departmentId,
          specialtyId: editingUser.specialtyId || null,
          clinicIds: [form.branchId],
          isActive: editingUser.isActive,
          ...(form.password.trim() ? { passwordHash: form.password.trim() } : {}),
        })
        setEditOpen(false)
        setEditingUser(null)
        setForm(EMPTY_USER_FORM)
        toast({
          title: "User updated",
          description: `${displayName(firstName, lastName, form.email)} was saved.`,
        })
      }
    } catch (err) {
      toast({
        title: mode === "add" ? "Could not add user" : "Could not update user",
        description: getToastErrorMessage(err, mode === "add" ? "Failed to create user" : "Failed to update user"),
        variant: "destructive",
      })
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    try {
      await deleteUser.mutateAsync(deleteTarget.id)
      toast({
        title: "User deleted",
        description: `${displayName(deleteTarget.firstName, deleteTarget.lastName, deleteTarget.email)} was removed.`,
      })
      setDeleteOpen(false)
      setDeleteTarget(null)
    } catch (err) {
      toast({
        title: "Could not delete user",
        description: getToastErrorMessage(err, "Failed to delete user"),
        variant: "destructive",
      })
    }
  }

  const userColumns: MtColumn<(typeof users)[number]>[] = [
    {
      key: "name",
      header: "User",
      alwaysVisible: true,
      sortValue: (r) => displayName(r.firstName, r.lastName, r.email),
      render: (r) => {
        const name = displayName(r.firstName, r.lastName, r.email)
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-brand-50 text-xs font-semibold text-brand-700">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-adminreg-text">{name}</span>
          </div>
        )
      },
    },
    {
      key: "role",
      header: "Role",
      render: (r) => r.roleName || r.role || "—",
      sortValue: (r) => r.roleName || r.role || "",
    },
    {
      key: "department",
      header: "Department",
      render: (r) => departmentLabel(r.departmentId),
      sortValue: (r) => departmentLabel(r.departmentId),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (r) => formatLastLogin(r.lastLogin),
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
            { icon: Eye, label: "View", onClick: () => openViewUser(r) },
            { icon: Pencil, label: "Edit", onClick: () => openEditUser(r) },
            { icon: Trash2, label: "Delete", destructive: true, onClick: () => openDeleteUser(r) },
          ]}
        />
      ),
    },
  ]

  const userFormFields = (
    <>
      <BranchFormField
        value={form.branchId}
        onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
        branches={branches}
        isLoading={isLoadingBranches}
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Full name</Label>
        <Input
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          placeholder="e.g. Anjali Nair"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Email</Label>
        <Input
          type="email"
          name="user-email"
          autoComplete="off"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="e.g. anjali@hospital.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">
          {editOpen ? "Password (optional)" : "Password"}
        </Label>
        <Input
          type="password"
          name="user-password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={editOpen ? "Leave blank to keep current" : "Min. 6 characters"}
          minLength={editOpen ? undefined : 6}
          required={!editOpen}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Role</Label>
        <Select value={form.roleId || defaultRoleId} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent className="max-h-56">
            {hospitalRoles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Department scope</Label>
        <Select value={form.departmentId} onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-56">
            <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )

  return (
    <div>
      <AdminPageHeader
        title="Users & Roles"
        subtitle="User accounts and role permissions — scoped by branch."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelect
              value={branchId}
              onValueChange={setBranchId}
              branches={branches}
              isLoading={isLoadingBranches}
            />
            {tab === "users" ? (
              <MtButton className="gap-2" onClick={openAddUser} disabled={!hasBranch}>
                <Plus className="h-4 w-4" />
                Add user
              </MtButton>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "users"
              ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700"
              : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab("permissions")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "permissions"
              ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700"
              : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Role permissions
        </button>
      </div>

      {tab === "users" ? (
        <AdminCard title="User Accounts" noPadding>
          {!hasBranch ? (
            <p className="px-5 py-8 text-sm text-adminreg-red">{noBranchMessage}</p>
          ) : (
            <>
          <div className="border-b border-adminreg-border px-5 py-4">
            <Combobox
              options={roleFilterOptions}
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v || "all")}
              placeholder="All roles"
              searchPlaceholder="Search roles..."
              emptyText="No role found."
              className="h-10 w-full max-w-[220px] border-adminreg-border bg-adminreg-card text-sm font-medium text-adminreg-text shadow-none hover:bg-adminreg-header"
              contentClassName="w-[220px]"
            />
          </div>
          {isLoadingUsers || isLoadingRoles ? (
            <TableSkeleton rows={6} columns={5} />
          ) : isUsersError ? (
            <p className="px-5 py-8 text-sm text-adminreg-red">
              {getToastErrorMessage(usersError, "Failed to load users")}
            </p>
          ) : (
            <MtDataTable
              columns={userColumns}
              rows={users}
              keyExtractor={(r) => r.id}
              emptyTitle="No users found"
              emptyDescription="Users for this branch will appear here."
            />
          )}
            </>
          )}
        </AdminCard>
      ) : (
        <AdminCard title="Role Permission Matrix">
          {!hasBranch ? (
            <p className="text-sm text-adminreg-red">{noBranchMessage}</p>
          ) : isLoadingRoles || isLoadingScreens || isLoadingAccess ? (
            <TableSkeleton rows={6} columns={5} />
          ) : isAccessError ? (
            <p className="text-sm text-adminreg-red">
              {getToastErrorMessage(accessError, "Failed to load role permissions")}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-adminreg-border text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
                      <th className="py-2.5 pr-4">Role</th>
                      {screens.map((screen) => (
                        <th key={screen.id} className="px-4 py-2.5 text-center">
                          {screen.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hospitalRoles.map((role) => (
                      <tr key={role.id} className="border-b border-adminreg-border/70 last:border-0">
                        <td className="py-3 pr-4 font-semibold text-adminreg-text">{role.name}</td>
                        {screens.map((screen) => {
                          const key = `${role.id}:${screen.id}`
                          const allowed = accessByRoleAndScreen.get(key) === true
                          return (
                            <td key={screen.id} className="px-4 py-3 text-center">
                              <PermissionToggle
                                allowed={allowed}
                                onClick={() => {
                                  setOptimistic((prev) => new Map(prev).set(key, !allowed))
                                  updateAccess.mutate(
                                    {
                                      roleId: role.id,
                                      clinicId: clinicId || null,
                                      screenIds: [screen.id],
                                      isAccessEnable: !allowed,
                                    },
                                    {
                                      onSuccess: () =>
                                        setOptimistic((prev) => {
                                          const next = new Map(prev)
                                          next.delete(key)
                                          return next
                                        }),
                                      onError: () =>
                                        setOptimistic((prev) => {
                                          const next = new Map(prev)
                                          next.delete(key)
                                          return next
                                        }),
                                    }
                                  )
                                }}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 flex items-start gap-1.5 text-xs text-adminreg-muted">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-adminreg-muted" />
                Role default access from screen permissions. Users are loaded by company; the Users tab can also filter by role.
              </p>
            </>
          )}
        </AdminCard>
      )}

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add user"
        onSubmit={(e) => handleSaveUser(e, "add")}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add user
            </MtButton>
          </>
        }
      >
        {userFormFields}
      </FormDialog>

      <FormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditingUser(null)
            setForm(EMPTY_USER_FORM)
          }
        }}
        title="Edit user"
        onSubmit={(e) => handleSaveUser(e, "edit")}
        footer={
          <>
            <MtButton
              type="button"
              variant="ghost"
              onClick={() => {
                setEditOpen(false)
                setEditingUser(null)
                setForm(EMPTY_USER_FORM)
              }}
            >
              Cancel
            </MtButton>
            <MtButton type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {userFormFields}
      </FormDialog>

      <DetailDrawer
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open)
          if (!open) setViewUser(null)
        }}
        title={viewUser ? displayName(viewUser.firstName, viewUser.lastName, viewUser.email) : "User details"}
      >
        {viewUser ? (
          <div className="divide-y divide-adminreg-border">
            <InfoRow label="Name" value={displayName(viewUser.firstName, viewUser.lastName, viewUser.email)} />
            <InfoRow label="Email" value={viewUser.email || "—"} />
            <InfoRow label="Role" value={viewUser.roleName || viewUser.role || "—"} />
            <InfoRow label="Department" value={departmentLabel(viewUser.departmentId)} />
            <InfoRow label="Status" value={viewUser.isActive ? "Active" : "Inactive"} />
            <InfoRow label="Last login" value={formatLastLogin(viewUser.lastLogin)} />
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteTarget(null)
        }}
        title="Delete user"
        description={`Delete "${deleteTarget ? displayName(deleteTarget.firstName, deleteTarget.lastName, deleteTarget.email) : "this user"}"? This cannot be undone.`}
        confirmLabel={deleteUser.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDeleteUser}
      />
    </div>
  )
}
