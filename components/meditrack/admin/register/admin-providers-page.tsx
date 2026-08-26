"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, CalendarClock, CalendarOff, ChevronLeft, Loader2, Plus, Power, UserCheck } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import {
  MtDataTable,
  RowActions,
  FormDialog,
  ConfirmDialog,
  MtButton,
  StatusBadge,
  TableSkeleton,
  getInitials,
  type MtColumn,
} from "@/components/meditrack/shared"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { BranchFormField, BranchSelect, useBranchScope } from "./use-branch-scope"
import {
  useCreateMediTrackUser,
  useGetMediTrackUsers,
  useUpdateMediTrackUser,
  type MediTrackUser,
} from "@/queries/meditrack/users"
import { useGetMediTrackRoles } from "@/queries/meditrack/roles"
import { useGetDepartments } from "@/queries/departments"
import {
  DAY_FULL_TO_SHORT,
  DAY_SHORT_TO_FULL,
  formatTimeForUi,
  sessionTypeToApi,
  sessionTypeToUi,
  timeToApi,
  useCreateProviderAvailability,
  useDeleteProviderAvailability,
  useGetProviderAvailability,
} from "@/queries/meditrack/provider-availability"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
type Day = (typeof DAYS)[number]
type SessionType = "OPD" | "Ward Round"
const NO_DEPARTMENT = "none"

function displayName(firstName?: string, lastName?: string, email?: string) {
  const name = `${firstName || ""} ${lastName || ""}`.trim()
  return name || email || "Unknown doctor"
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  password: "",
  departmentId: NO_DEPARTMENT,
  branchId: "",
}

export function AdminProvidersPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { role } = useStaffRole()
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

  const { data: roles = [], isLoading: isLoadingRoles } = useGetMediTrackRoles(true)
  const doctorRole = useMemo(
    () =>
      roles.find((r) => r.value?.toLowerCase() === "doctor") ||
      roles.find((r) => r.name?.toLowerCase() === "doctor"),
    [roles]
  )
  const doctorRoleId = doctorRole?.id || ""

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
      roleIds: doctorRoleId ? [doctorRoleId] : [],
      clinicIds: clinicId ? [clinicId] : undefined,
    },
    !!companyId && !!doctorRoleId && hasBranch
  )

  const { data: departments = [] } = useGetDepartments(
    companyId || undefined,
    clinicId,
    !!companyId && hasBranch
  )
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>()
    departments.forEach((d) => map.set(d.departmentId, d.name))
    return map
  }, [departments])

  const createUser = useCreateMediTrackUser()
  const updateUser = useUpdateMediTrackUser()
  const createAvailability = useCreateProviderAvailability()
  const deleteAvailability = useDeleteProviderAvailability()
  const doctors = usersData?.items ?? []

  const [selected, setSelected] = useState<MediTrackUser | null>(null)
  const [form, setForm] = useState({ day: "Mon" as Day, start: "", end: "", type: "OPD" as SessionType, location: "" })

  const {
    data: availabilitySessions = [],
    isLoading: isLoadingAvailability,
    isError: isAvailabilityError,
    error: availabilityError,
  } = useGetProviderAvailability(selected?.id, !!selected)

  const [addOpen, setAddOpen] = useState(false)
  const [doctorForm, setDoctorForm] = useState(EMPTY_FORM)

  const [leaveTarget, setLeaveTarget] = useState<MediTrackUser | null>(null)
  const [leaveForm, setLeaveForm] = useState({ from: "", to: "", reason: "" })
  const [leavesByDoctor, setLeavesByDoctor] = useState<Record<string, { from: string; to: string; reason: string }[]>>({})

  const [deactivateTarget, setDeactivateTarget] = useState<MediTrackUser | null>(null)

  function deptLabel(doctor: MediTrackUser) {
    if (!doctor.departmentId) return "—"
    return departmentNameById.get(doctor.departmentId) || "—"
  }

  function handleAddLeave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!leaveTarget) return
    const entry = { from: leaveForm.from || "—", to: leaveForm.to || leaveForm.from || "—", reason: leaveForm.reason || "Not specified" }
    setLeavesByDoctor((prev) => ({ ...prev, [leaveTarget.id]: [...(prev[leaveTarget.id] ?? []), entry] }))
    toast({
      title: "Leave added",
      description: `${displayName(leaveTarget.firstName, leaveTarget.lastName, leaveTarget.email)} marked on leave ${entry.from}${entry.to !== entry.from ? ` – ${entry.to}` : ""}.`,
    })
    setLeaveForm({ from: "", to: "", reason: "" })
    setLeaveTarget(null)
  }

  async function confirmDeactivate() {
    if (!deactivateTarget || !doctorRoleId) return
    const nextActive = !deactivateTarget.isActive
    try {
      await updateUser.mutateAsync({
        id: deactivateTarget.id,
        email: deactivateTarget.email,
        firstName: deactivateTarget.firstName,
        lastName: deactivateTarget.lastName || null,
        roleId: deactivateTarget.roleId || doctorRoleId,
        companyId: deactivateTarget.companyId || companyId || null,
        departmentId: deactivateTarget.departmentId || null,
        specialtyId: deactivateTarget.specialtyId || null,
        clinicIds: clinicId ? [clinicId] : null,
        isActive: nextActive,
      })
      toast({
        title: nextActive ? "Doctor reactivated" : "Doctor deactivated",
        description: `${displayName(deactivateTarget.firstName, deactivateTarget.lastName, deactivateTarget.email)} is now ${nextActive ? "active" : "inactive"}.`,
      })
      setDeactivateTarget(null)
    } catch (err) {
      toast({
        title: "Could not update doctor",
        description: getToastErrorMessage(err, "Failed to update doctor"),
        variant: "destructive",
      })
    }
  }

  function openAdd() {
    setDoctorForm({ ...EMPTY_FORM, branchId })
    setAddOpen(true)
  }

  async function handleAddDoctor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }
    if (!doctorForm.branchId) {
      toast({ title: "Branch required", description: "Select a branch for this doctor.", variant: "destructive" })
      return
    }
    if (!doctorRoleId) {
      toast({ title: "Doctor role missing", description: "Could not find the Doctor role in this hospital.", variant: "destructive" })
      return
    }

    const { firstName, lastName } = splitFullName(doctorForm.fullName)
    if (!firstName) {
      toast({ title: "Full name required", description: "Enter the doctor's full name.", variant: "destructive" })
      return
    }

    try {
      const created = await createUser.mutateAsync({
        firstName,
        lastName: lastName || null,
        email: doctorForm.email.trim(),
        passwordHash: doctorForm.password,
        roleId: doctorRoleId,
        companyId,
        departmentId: doctorForm.departmentId === NO_DEPARTMENT ? null : doctorForm.departmentId,
        clinicIds: [doctorForm.branchId],
      })
      setAddOpen(false)
      setDoctorForm(EMPTY_FORM)
      toast({
        title: "Doctor added",
        description: `${displayName(created.firstName, created.lastName, created.email)} was added to the registry.`,
      })
    } catch (err) {
      toast({
        title: "Could not add doctor",
        description: getToastErrorMessage(err, "Failed to create doctor"),
        variant: "destructive",
      })
    }
  }

  const sessions = useMemo(
    () =>
      availabilitySessions.map((s) => ({
        id: s.id,
        day: (DAY_FULL_TO_SHORT[s.dayOfWeek] || s.dayOfWeek.slice(0, 3)) as Day | string,
        start: formatTimeForUi(s.startTime),
        end: formatTimeForUi(s.endTime),
        type: sessionTypeToUi(s.sessionType),
        location: s.location || "—",
      })),
    [availabilitySessions]
  )

  function openAvailability(doctor: MediTrackUser) {
    setSelected(doctor)
    setForm({ day: "Mon", start: "", end: "", type: "OPD", location: "" })
  }

  async function removeSession(id: string) {
    if (!selected) return
    try {
      await deleteAvailability.mutateAsync({ providerId: selected.id, id })
      toast({ title: "Session removed", description: "Weekly availability session was deleted." })
    } catch (err) {
      toast({
        title: "Could not remove session",
        description: getToastErrorMessage(err, "Failed to delete availability session"),
        variant: "destructive",
      })
    }
  }

  async function handleAddSession(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!form.start || !form.end) {
      toast({ title: "Time required", description: "Select start and end time.", variant: "destructive" })
      return
    }
    if (!form.location.trim()) {
      toast({ title: "Location required", description: "Enter a location for this session.", variant: "destructive" })
      return
    }

    try {
      await createAvailability.mutateAsync({
        providerId: selected.id,
        clinicId: clinicId || null,
        dayOfWeek: DAY_SHORT_TO_FULL[form.day] || form.day,
        startTime: timeToApi(form.start),
        endTime: timeToApi(form.end),
        sessionType: sessionTypeToApi(form.type),
        location: form.location.trim(),
        slotDurationMinutes: 15,
      })
      setForm({ day: "Mon", start: "", end: "", type: "OPD", location: "" })
      toast({
        title: "Session added",
        description: `${form.day} ${form.start}–${form.end} saved for ${displayName(selected.firstName, selected.lastName, selected.email)}.`,
      })
    } catch (err) {
      toast({
        title: "Could not add session",
        description: getToastErrorMessage(err, "Failed to create availability session"),
        variant: "destructive",
      })
    }
  }

  const directoryColumns: MtColumn<MediTrackUser>[] = [
    {
      key: "name",
      header: "Doctor",
      alwaysVisible: true,
      sortValue: (r) => displayName(r.firstName, r.lastName, r.email),
      render: (r) => {
        const name = displayName(r.firstName, r.lastName, r.email)
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-brand-50 text-xs font-semibold text-brand-700">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-adminreg-text">{name}</span>
          </div>
        )
      },
    },
    {
      key: "email",
      header: "Email",
      render: (r) => r.email || "—",
      sortValue: (r) => r.email || "",
    },
    {
      key: "department",
      header: "Department",
      render: (r) => deptLabel(r),
      sortValue: (r) => deptLabel(r),
    },
    {
      key: "sessions",
      header: "Sessions / week",
      render: () => "—",
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />,
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
            { icon: CalendarClock, label: "Availability", tooltip: "Availability", onClick: () => openAvailability(r) },
            { icon: CalendarOff, label: "Add leave", tooltip: "Add leave", onClick: () => setLeaveTarget(r) },
            ...(role === "admin"
              ? [{ icon: ArrowUpRight, label: "Live queue", tooltip: "Live queue →", onClick: () => router.push(`/opd/visit-thread?stage=2&from=providers`) }]
              : []),
            {
              icon: r.isActive ? Power : UserCheck,
              label: r.isActive ? "Deactivate" : "Activate",
              tooltip: r.isActive ? "Deactivate" : "Reactivate",
              destructive: r.isActive,
              onClick: () => setDeactivateTarget(r),
            },
          ]}
        />
      ),
    },
  ]

  const isLoadingDirectory = isLoadingRoles || (!!doctorRoleId && isLoadingUsers)
  const selectedName = selected ? displayName(selected.firstName, selected.lastName, selected.email) : ""

  return (
    <div>
      {selected ? (
        <>
          <AdminPageHeader title="Doctors" subtitle="Doctor registry, weekly availability and leave exceptions." />

          <button type="button" onClick={() => setSelected(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-adminreg-muted hover:text-adminreg-text">
            <ChevronLeft className="h-4 w-4" />
            Back to directory
          </button>

          <h2 className="text-xl font-bold text-adminreg-text">{selectedName} — weekly availability</h2>
          <p className="mt-1 text-sm text-adminreg-muted">Recurring OPD and ward-round sessions. Overlaps are blocked at save.</p>

          <AdminCard noPadding className="mt-5">
            {isLoadingAvailability ? (
              <TableSkeleton rows={4} columns={5} />
            ) : isAvailabilityError ? (
              <p className="px-5 py-8 text-sm text-adminreg-red">
                {getToastErrorMessage(availabilityError, "Failed to load availability")}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-adminreg-border bg-adminreg-border/30 text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
                    <th className="px-5 py-3">Day</th>
                    <th className="px-5 py-3">Start</th>
                    <th className="px-5 py-3">End</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-sm text-adminreg-muted">
                        No weekly sessions yet. Add a session below.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="border-b border-adminreg-border/70 last:border-0">
                        <td className="px-5 py-3 font-semibold text-adminreg-text">{s.day}</td>
                        <td className="px-5 py-3">{s.start}</td>
                        <td className="px-5 py-3">{s.end}</td>
                        <td className="px-5 py-3">{s.type}</td>
                        <td className="px-5 py-3">{s.location}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeSession(s.id)}
                            disabled={deleteAvailability.isPending}
                            className="text-sm font-medium text-adminreg-red hover:underline disabled:opacity-50"
                          >
                            {deleteAvailability.isPending ? "Removing…" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </AdminCard>

          <AdminCard title="Add Session" className="mt-5">
            <form onSubmit={handleAddSession} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Day</Label>
                  <Select value={form.day} onValueChange={(v) => setForm((f) => ({ ...f, day: v as Day }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Start Time</Label>
                  <Input type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">End Time</Label>
                  <Input type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Session Type</Label>
                  <div className="flex gap-2">
                    {(["OPD", "Ward Round"] as SessionType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className={cn(
                          "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                          form.type === t ? "border-adminreg-olive bg-adminreg-olive text-white" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Location</Label>
                  <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. OPD Room 4" required />
                </div>
              </div>
              <MtButton type="submit" disabled={createAvailability.isPending}>
                {createAvailability.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add session
              </MtButton>
            </form>
          </AdminCard>

          <AdminCard
            title="Leave Exceptions"
            className="mt-5"
            action={<MtButton className="gap-2" onClick={() => setLeaveTarget(selected)}><Plus className="h-4 w-4" />Add leave</MtButton>}
          >
            {(leavesByDoctor[selected.id] ?? []).length === 0 ? (
              <p className="text-sm text-adminreg-muted">No leave recorded for {selectedName}.</p>
            ) : (
              <ul className="space-y-2">
                {(leavesByDoctor[selected.id] ?? []).map((l, i) => (
                  <li key={i} className="flex flex-col gap-0.5 border border-adminreg-border bg-adminreg-header/40 px-3.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium text-adminreg-text">
                      {l.from}
                      {l.to !== l.from ? ` – ${l.to}` : ""}
                    </span>
                    <span className="text-adminreg-muted">{l.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </>
      ) : (
        <>
          <AdminPageHeader
            title="Doctors"
            subtitle="Doctor registry — Doctor role, scoped by branch."
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <BranchSelect
                  value={branchId}
                  onValueChange={setBranchId}
                  branches={branches}
                  isLoading={isLoadingBranches}
                />
                <MtButton className="gap-2" onClick={openAdd} disabled={!doctorRoleId || !hasBranch}>
                  <Plus className="h-4 w-4" />
                  Add doctor
                </MtButton>
              </div>
            }
          />
          <AdminCard title="Doctor Directory" noPadding>
            {!hasBranch ? (
              <p className="px-5 py-8 text-sm text-adminreg-red">{noBranchMessage}</p>
            ) : isLoadingDirectory ? (
              <TableSkeleton rows={6} columns={5} />
            ) : !doctorRoleId && !isLoadingRoles ? (
              <p className="px-5 py-8 text-sm text-adminreg-red">Doctor role was not found. Create a Doctor role first under Users &amp; Roles.</p>
            ) : isUsersError ? (
              <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(usersError, "Failed to load doctors")}</p>
            ) : (
              <MtDataTable
                columns={directoryColumns}
                rows={doctors}
                keyExtractor={(r) => r.id}
                emptyTitle="No doctors yet"
                emptyDescription="Add a doctor to create a user with the Doctor role for this branch."
              />
            )}
          </AdminCard>
        </>
      )}

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add doctor"
        onSubmit={handleAddDoctor}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add doctor
            </MtButton>
          </>
        }
      >
        <BranchFormField
          value={doctorForm.branchId}
          onValueChange={(v) => setDoctorForm((f) => ({ ...f, branchId: v }))}
          branches={branches}
          isLoading={isLoadingBranches}
        />
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Full Name</Label>
          <Input
            value={doctorForm.fullName}
            onChange={(e) => setDoctorForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="e.g. Dr. Kabir Sethi"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Email</Label>
          <Input
            type="email"
            name="doctor-email"
            autoComplete="off"
            value={doctorForm.email}
            onChange={(e) => setDoctorForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. kabir@hospital.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Password</Label>
          <Input
            type="password"
            name="doctor-password"
            autoComplete="new-password"
            value={doctorForm.password}
            onChange={(e) => setDoctorForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min. 6 characters"
            minLength={6}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Department</Label>
          <Select value={doctorForm.departmentId} onValueChange={(v) => setDoctorForm((f) => ({ ...f, departmentId: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DEPARTMENT}>Unassigned</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>

      <FormDialog
        open={!!leaveTarget}
        onOpenChange={(open) => !open && setLeaveTarget(null)}
        title="Add leave"
        description={leaveTarget ? `Mark ${displayName(leaveTarget.firstName, leaveTarget.lastName, leaveTarget.email)} on leave for a date range.` : undefined}
        onSubmit={handleAddLeave}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setLeaveTarget(null)}>Cancel</MtButton>
            <MtButton type="submit">Add leave</MtButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">From</Label>
            <Input type="date" value={leaveForm.from} onChange={(e) => setLeaveForm((f) => ({ ...f, from: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">To</Label>
            <Input type="date" value={leaveForm.to} onChange={(e) => setLeaveForm((f) => ({ ...f, to: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Reason</Label>
          <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Conference — out of station" rows={3} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={deactivateTarget?.isActive ? "Deactivate doctor?" : "Reactivate doctor?"}
        description={
          deactivateTarget
            ? deactivateTarget.isActive
              ? `${displayName(deactivateTarget.firstName, deactivateTarget.lastName, deactivateTarget.email)} will no longer appear for new bookings or the live queue. Existing sessions are kept.`
              : `${displayName(deactivateTarget.firstName, deactivateTarget.lastName, deactivateTarget.email)} will become bookable again across OPD and Appointment Booking.`
            : ""
        }
        confirmLabel={deactivateTarget?.isActive ? "Deactivate" : "Reactivate"}
        destructive={!!deactivateTarget?.isActive}
        onConfirm={confirmDeactivate}
      />
    </div>
  )
}
