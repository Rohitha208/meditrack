"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FormDialog,
  MtButton,
  MtDataTable,
  StatusBadge,
  TableSkeleton,
  getInitials,
  type MtColumn,
} from "@/components/meditrack/shared"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"
import { useRootContext } from "@/context/RootContext"
import { getCompanyId } from "@/utils/clientCookie"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useToast } from "@/hooks/use-toast"
import { useCreateMediTrackUser, useGetMediTrackUsers } from "@/queries/meditrack/users"
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
}

export function AdminUsersRolesPage() {
  const { toast } = useToast()
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const clinicId = clinic?.id || undefined

  const [tab, setTab] = useState<"users" | "permissions">("users")
  const [roleFilter, setRoleFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_USER_FORM)

  const { data: roles = [], isLoading: isLoadingRoles } = useGetMediTrackRoles(true)
  const hospitalRoles = useMemo(
    () => roles.filter((role) => role.value !== "super_admin"),
    [roles]
  )

  const { data: departments = [] } = useGetDepartments(companyId || undefined, clinicId, !!companyId && addOpen)
  const createUser = useCreateMediTrackUser()

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
    },
    !!companyId && tab === "users"
  )

  const { data: screens = [], isLoading: isLoadingScreens } = useGetMediTrackScreens(tab === "permissions")
  const {
    data: screenAccess = [],
    isLoading: isLoadingAccess,
    isError: isAccessError,
    error: accessError,
  } = useGetMediTrackScreenAccess(clinicId, undefined, tab === "permissions")

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
    })
    setAddOpen(true)
  }

  async function handleAddUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
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
      const created = await createUser.mutateAsync({
        firstName,
        lastName: lastName || null,
        email: form.email.trim(),
        passwordHash: form.password,
        roleId: form.roleId,
        companyId,
        departmentId: form.departmentId === ALL_DEPARTMENTS ? null : form.departmentId,
        clinicIds: clinicId ? [clinicId] : null,
      })
      setAddOpen(false)
      setForm(EMPTY_USER_FORM)
      toast({
        title: "User added",
        description: `${displayName(created.firstName, created.lastName, created.email)} was added.`,
      })
    } catch (err) {
      toast({
        title: "Could not add user",
        description: getToastErrorMessage(err, "Failed to create user"),
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
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (r) => formatLastLogin(r.lastLogin),
    },
  ]

  return (
    <div>
      <AdminPageHeader
        title="Users & Roles"
        subtitle="User accounts, access status and role permission matrix."
        actions={
          tab === "users" ? (
            <MtButton className="gap-2" onClick={openAddUser}>
              <Plus className="h-4 w-4" />
              Add user
            </MtButton>
          ) : undefined
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
          <div className="border-b border-adminreg-border px-5 py-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {hospitalRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoadingUsers || isLoadingRoles ? (
            <TableSkeleton rows={6} columns={4} />
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
              emptyDescription="Users for this hospital will appear here."
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard title="Role Permission Matrix">
          {isLoadingRoles || isLoadingScreens || isLoadingAccess ? (
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
        onSubmit={handleAddUser}
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
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. anjali@hospital.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min. 6 characters"
            minLength={6}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Role</Label>
          <Select value={form.roleId || defaultRoleId} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
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
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>
    </div>
  )
}
