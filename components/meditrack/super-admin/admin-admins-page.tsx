"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useGetCompanies } from "@/queries/companies/get-company"
import { useCreateUser } from "@/queries/users/create-user"
import { useGetUsers, type User } from "@/queries/users/get-users"
import { useGetRole } from "@/queries/roles/get-role"
import {
  FormDialog,
  MtButton,
  MtDataTable,
  StatusBadge,
  TableSkeleton,
  getInitials,
  type MtColumn,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  companyId: "",
}

function displayName(user: User) {
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim()
  return name || user.email || "Unknown user"
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

export function AdminAdminsPage() {
  const { toast } = useToast()
  const { data: rolesData, isLoading: isLoadingRoles } = useGetRole(1, 100, "", true)
  const administratorRole = useMemo(
    () => rolesData?.data?.find((role) => role.name === "Administrator"),
    [rolesData?.data]
  )
  const administratorRoleId = administratorRole?.id || ""

  const { data: usersData, isLoading: isLoadingUsers, isError, error } = useGetUsers(
    1,
    100,
    "",
    !!administratorRoleId,
    "",
    [],
    [administratorRoleId]
  )

  const { data: companiesData, isLoading: isLoadingCompanies } = useGetCompanies(true, 1, 100)
  const companies = companiesData?.items ?? []
  const companyNameById = useMemo(() => {
    const map = new Map<string, string>()
    companies.forEach((c) => map.set(c.id, c.name))
    return map
  }, [companies])

  const createUser = useCreateUser({
    onSuccess: () => {
      setAddOpen(false)
      setForm(EMPTY_FORM)
      toast({ title: "Admin created", description: "Hospital administrator account was added." })
    },
    onError: (err) => {
      toast({
        title: "Could not create admin",
        description: getToastErrorMessage(err, "Failed to create admin"),
        variant: "destructive",
      })
    },
  })

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const admins = usersData?.items ?? []
  const isSaving = createUser.isPending

  function openAdd() {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!administratorRoleId) {
      toast({ title: "Cannot save", description: "Administrator role is unavailable.", variant: "destructive" })
      return
    }
    if (!form.companyId) {
      toast({ title: "Company required", description: "Select a company for this admin.", variant: "destructive" })
      return
    }

    try {
      await createUser.mutateAsync({
        email: form.email.trim(),
        passwordHash: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        roleId: administratorRoleId,
        companyId: form.companyId,
        clinicIds: [],
        slots: [],
      })
    } catch {
      // onError handles toast
    }
  }

  const columns: MtColumn<User>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Admin",
        alwaysVisible: true,
        render: (r) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-adminreg-border">
              <AvatarFallback className="bg-adminreg-olive-soft text-xs font-semibold text-adminreg-olive-700">
                {getInitials(displayName(r))}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-adminreg-text">{displayName(r)}</div>
              <div className="text-xs text-adminreg-muted">{r.email}</div>
            </div>
          </div>
        ),
        sortValue: (r) => displayName(r),
      },
      {
        key: "company",
        header: "Company",
        render: (r) => (r.companyId ? companyNameById.get(r.companyId) || "—" : "—"),
        sortValue: (r) => (r.companyId ? companyNameById.get(r.companyId) || "" : ""),
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
    ],
    [companyNameById]
  )

  const adminFormFields = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">First Name</Label>
          <Input
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Last Name</Label>
          <Input
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Password</Label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          minLength={6}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Company</Label>
        <Select value={form.companyId} onValueChange={(v) => setForm((f) => ({ ...f, companyId: v }))}>
          <SelectTrigger>
            <SelectValue placeholder={isLoadingCompanies ? "Loading companies…" : "Select company"} />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
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
        title="Admins"
        subtitle="Hospital administrator accounts — one admin per company tenant."
        actions={
          <MtButton className="gap-2" onClick={openAdd} disabled={!administratorRoleId || companies.length === 0}>
            <Plus className="h-4 w-4" />
            Add admin
          </MtButton>
        }
      />

      <AdminCard title="Administrator Accounts" noPadding>
        {isLoadingUsers || isLoadingRoles ? (
          <TableSkeleton rows={6} columns={4} />
        ) : isError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load admins")}</p>
        ) : (
          <MtDataTable
            columns={columns}
            rows={admins}
            keyExtractor={(r) => r.id}
            emptyTitle="No admins yet"
            emptyDescription="Add a hospital administrator and assign them to a company."
          />
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add admin"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {createUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add admin
            </MtButton>
          </>
        }
      >
        {adminFormFields}
      </FormDialog>
    </div>
  )
}
