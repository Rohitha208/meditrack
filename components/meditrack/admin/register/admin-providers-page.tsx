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
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import {
  MtDataTable,
  RowActions,
  FormDialog,
  ConfirmDialog,
  MtButton,
  StatusBadge,
  TableSkeleton,
  TimeInputField,
  MultiDatePicker,
  InfoRow,
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
import { useGetRooms } from "@/queries/meditrack/rooms"
import {
  datesToApi,
  formatSessionDate,
  formatTimeForUi,
  normalizeTimeInput,
  sessionTypeToApi,
  sessionTypeToUi,
  timeToApi,
  timeToMinutes,
  useCreateProviderAvailability,
  useDeleteProviderAvailability,
  useGetProviderAvailability,
} from "@/queries/meditrack/provider-availability"
import {
  formatLeaveDate,
  toApiDate,
  useCreateDoctorLeave,
  useDeleteDoctorLeave,
  useGetDoctorLeaves,
  type DoctorLeave,
} from "@/queries/meditrack/doctor-leave"

const NO_DEPARTMENT = "none"
type SessionType = "OPD" | "Ward Round"

const SLOT_DURATION_OPTIONS = ["5", "10", "15", "20", "30", "45", "60"]

const EMPTY_SESSION_FORM = {
  dates: [] as Date[],
  start: "",
  end: "",
  type: "OPD" as SessionType,
  location: "",
  slotDuration: "15",
}

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
  const { data: rooms = [], isLoading: isLoadingRooms } = useGetRooms(
    { clinicId, pageSize: 100 },
    hasBranch && !!clinicId
  )
  const sessionRooms = useMemo(
    () => rooms.filter((room) => room.isActive !== false && room.name.trim()),
    [rooms]
  )
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>()
    departments.forEach((d) => map.set(d.departmentId, d.name))
    return map
  }, [departments])

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>()
    branches.forEach((b) => map.set(b.id, b.name))
    return map
  }, [branches])

  const createUser = useCreateMediTrackUser()
  const updateUser = useUpdateMediTrackUser()
  const createAvailability = useCreateProviderAvailability()
  const deleteAvailability = useDeleteProviderAvailability()
  const createLeave = useCreateDoctorLeave()
  const deleteLeave = useDeleteDoctorLeave()
  const doctors = usersData?.items ?? []

  const [selected, setSelected] = useState<MediTrackUser | null>(null)
  /** Row click → all; Availability action → availability only; Leave action → leave only */
  const [detailView, setDetailView] = useState<"all" | "availability" | "leave">("all")
  const [form, setForm] = useState(EMPTY_SESSION_FORM)

  const showProfile = detailView === "all"
  const showAvailability = detailView === "all" || detailView === "availability"
  const showLeave = detailView === "all" || detailView === "leave"

  const {
    data: availabilitySessions = [],
    isLoading: isLoadingAvailability,
    isError: isAvailabilityError,
    error: availabilityError,
  } = useGetProviderAvailability(selected?.id, !!selected && showAvailability)

  const {
    data: doctorLeaves = [],
    isLoading: isLoadingLeaves,
    isError: isLeavesError,
    error: leavesError,
  } = useGetDoctorLeaves(
    { userId: selected?.id, clinicId: clinicId || undefined },
    !!selected && showLeave
  )

  const [addOpen, setAddOpen] = useState(false)
  const [doctorForm, setDoctorForm] = useState(EMPTY_FORM)

  const [leaveTarget, setLeaveTarget] = useState<MediTrackUser | null>(null)
  const [leaveForm, setLeaveForm] = useState({ from: "", to: "", reason: "" })
  const [deleteLeaveTarget, setDeleteLeaveTarget] = useState<DoctorLeave | null>(null)

  const [deactivateTarget, setDeactivateTarget] = useState<MediTrackUser | null>(null)

  function deptLabel(doctor: MediTrackUser) {
    if (!doctor.departmentId) return "—"
    return departmentNameById.get(doctor.departmentId) || "—"
  }

  async function handleAddLeave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!leaveTarget) return
    const from = leaveForm.from
    const to = leaveForm.to || leaveForm.from
    if (!from) {
      toast({ title: "From date required", description: "Select a leave start date.", variant: "destructive" })
      return
    }
    try {
      const created = await createLeave.mutateAsync({
        userId: leaveTarget.id,
        roleId: leaveTarget.roleId || doctorRoleId || null,
        clinicId: clinicId || null,
        fromDate: toApiDate(from),
        toDate: toApiDate(to),
        reason: leaveForm.reason.trim() || null,
      })
      toast({
        title: "Leave added",
        description: `${displayName(leaveTarget.firstName, leaveTarget.lastName, leaveTarget.email)} marked on leave ${formatLeaveDate(created.fromDate)}${created.toDate !== created.fromDate ? ` – ${formatLeaveDate(created.toDate)}` : ""}.`,
      })
      setLeaveForm({ from: "", to: "", reason: "" })
      setLeaveTarget(null)
    } catch (err) {
      toast({
        title: "Could not add leave",
        description: getToastErrorMessage(err, "Failed to create leave"),
        variant: "destructive",
      })
    }
  }

  async function confirmDeleteLeave() {
    if (!deleteLeaveTarget) return
    try {
      await deleteLeave.mutateAsync(deleteLeaveTarget.id)
      toast({
        title: "Leave removed",
        description: `Leave ${formatLeaveDate(deleteLeaveTarget.fromDate)}${deleteLeaveTarget.toDate !== deleteLeaveTarget.fromDate ? ` – ${formatLeaveDate(deleteLeaveTarget.toDate)}` : ""} was deleted.`,
      })
      setDeleteLeaveTarget(null)
    } catch (err) {
      toast({
        title: "Could not delete leave",
        description: getToastErrorMessage(err, "Failed to delete leave"),
        variant: "destructive",
      })
    }
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
        date: formatSessionDate(s.specificDate, s.dayOfWeek),
        start: formatTimeForUi(s.startTime),
        end: formatTimeForUi(s.endTime),
        type: sessionTypeToUi(s.sessionType),
        location: s.location || "—",
        slotDuration: s.slotDurationMinutes > 0 ? `${s.slotDurationMinutes} min` : "—",
      })),
    [availabilitySessions]
  )

  function openDoctorDetails(doctor: MediTrackUser) {
    setSelected(doctor)
    setDetailView("all")
    setForm(EMPTY_SESSION_FORM)
  }

  function openAvailability(doctor: MediTrackUser) {
    setSelected(doctor)
    setDetailView("availability")
    setForm(EMPTY_SESSION_FORM)
  }

  function openLeave(doctor: MediTrackUser) {
    setSelected(doctor)
    setDetailView("leave")
  }

  function closeDoctorDetail() {
    setSelected(null)
    setDetailView("all")
    setForm(EMPTY_SESSION_FORM)
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

    const start = normalizeTimeInput(form.start)
    const end = normalizeTimeInput(form.end)
    if (!start || !end) {
      toast({
        title: "Invalid time",
        description: "Enter start and end as HH:MM (e.g. 09:00) or use the clock picker.",
        variant: "destructive",
      })
      return
    }

    const startMinutes = timeToMinutes(start)
    const endMinutes = timeToMinutes(end)
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      toast({
        title: "End time must be after start",
        description: "Check that the session end is later than the start time.",
        variant: "destructive",
      })
      return
    }

    if (!form.dates.length) {
      toast({ title: "Dates required", description: "Select at least one date for this session.", variant: "destructive" })
      return
    }

    if (!form.location.trim()) {
      toast({ title: "Room required", description: "Select a room for this session.", variant: "destructive" })
      return
    }
    const selectedRoom = sessionRooms.find((room) => room.id === form.location)
    if (!selectedRoom) {
      toast({ title: "Room required", description: "Select a room for this session.", variant: "destructive" })
      return
    }

    const slotDuration = Number(form.slotDuration)
    if (!slotDuration || slotDuration <= 0) {
      toast({ title: "Slot duration required", description: "Pick how long each appointment slot runs.", variant: "destructive" })
      return
    }

    if (slotDuration > endMinutes - startMinutes) {
      toast({
        title: "Slot longer than the session",
        description: `A ${slotDuration} min slot does not fit in a ${endMinutes - startMinutes} min session.`,
        variant: "destructive",
      })
      return
    }

    try {
      await createAvailability.mutateAsync({
        providerId: selected.id,
        clinicId: clinicId || null,
        dates: datesToApi(form.dates),
        startTime: timeToApi(start),
        endTime: timeToApi(end),
        sessionType: sessionTypeToApi(form.type),
        location: selectedRoom.name,
        slotDurationMinutes: slotDuration,
      })
      const dateCount = form.dates.length
      setForm(EMPTY_SESSION_FORM)
      toast({
        title: "Session added",
        description: `${dateCount} session${dateCount > 1 ? "s" : ""} (${start}–${end}) saved for ${displayName(selected.firstName, selected.lastName, selected.email)}.`,
      })
    } catch (err) {
      toast({
        title: "Could not add session",
        description: getToastErrorMessage(err, "Failed to create availability session"),
        variant: "destructive",
      })
    }
  }

  const sessionDurationLabel = useMemo(() => {
    const start = normalizeTimeInput(form.start)
    const end = normalizeTimeInput(form.end)
    if (!start || !end) return null
    const startMinutes = timeToMinutes(start)
    const endMinutes = timeToMinutes(end)
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null
    const total = endMinutes - startMinutes
    const hours = Math.floor(total / 60)
    const mins = total % 60
    const length = hours && mins ? `${hours}h ${mins}m session` : hours ? `${hours}h session` : `${mins}m session`

    const slot = Number(form.slotDuration)
    if (!slot || slot <= 0 || slot > total) return length
    const slotCount = Math.floor(total / slot)
    return `${length} · ${slotCount} bookable slot${slotCount > 1 ? "s" : ""} of ${slot} min`
  }, [form.start, form.end, form.slotDuration])

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
            { icon: CalendarOff, label: "Leave", tooltip: "Leave", onClick: () => openLeave(r) },
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
          <AdminPageHeader
            title="Doctors"
            subtitle={
              detailView === "availability"
                ? `Availability for ${selectedName}`
                : detailView === "leave"
                  ? `Leave for ${selectedName}`
                  : "Doctor registry, weekly availability and leave exceptions."
            }
          />

          <button type="button" onClick={closeDoctorDetail} className="mb-4 inline-flex items-center gap-1.5 text-sm text-adminreg-muted hover:text-adminreg-text">
            <ChevronLeft className="h-4 w-4" />
            Back to directory
          </button>

          {showProfile ? (
            <AdminCard title="Doctor profile" className="mb-5">
              <div className="divide-y divide-adminreg-border">
                <InfoRow label="Name" value={selectedName} />
                <InfoRow label="Email" value={selected.email || "—"} />
                <InfoRow label="Department" value={deptLabel(selected)} />
                <InfoRow label="Role" value={selected.roleName || selected.role || "Doctor"} />
                <InfoRow label="Branch" value={branchNameById.get(branchId) || "—"} />
                <InfoRow label="Status" value={selected.isActive ? "Active" : "Inactive"} />
                <InfoRow label="Sessions / week" value={isLoadingAvailability ? "Loading…" : String(sessions.length)} />
                <InfoRow label="Leave records" value={isLoadingLeaves ? "Loading…" : String(doctorLeaves.length)} />
                <InfoRow label="Last login" value={formatLastLogin(selected.lastLogin)} />
              </div>
            </AdminCard>
          ) : null}

          {showAvailability ? (
            <>
              <h2 className="text-xl font-bold text-adminreg-text">Availability</h2>
              <p className="mt-1 text-sm text-adminreg-muted">OPD and ward-round sessions by date. Overlaps are blocked at save.</p>

              <AdminCard noPadding className="mt-5" contentClassName="overflow-hidden">
                {isLoadingAvailability ? (
                  <TableSkeleton rows={10} columns={7} />
                ) : isAvailabilityError ? (
                  <p className="px-5 py-8 text-sm text-adminreg-red">
                    {getToastErrorMessage(availabilityError, "Failed to load availability")}
                  </p>
                ) : (
                  <div className="adminreg-scroll max-h-[484px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-adminreg-border bg-adminreg-header text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Start</th>
                          <th className="px-5 py-3">End</th>
                          <th className="px-5 py-3">Type</th>
                          <th className="px-5 py-3">Slot</th>
                          <th className="px-5 py-3">Location</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-8 text-sm text-adminreg-muted">
                              No sessions yet. Add a session below.
                            </td>
                          </tr>
                        ) : (
                          sessions.map((s) => (
                            <tr key={s.id} className="border-b border-adminreg-border/70 last:border-0">
                              <td className="px-5 py-3 font-semibold text-adminreg-text">{s.date}</td>
                              <td className="px-5 py-3">{s.start}</td>
                              <td className="px-5 py-3">{s.end}</td>
                              <td className="px-5 py-3">{s.type}</td>
                              <td className="px-5 py-3">{s.slotDuration}</td>
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
                  </div>
                )}
              </AdminCard>

              <AdminCard
                title="Add Session"
                className="mt-5"
                action={
                  <MtButton
                    type="submit"
                    form="add-session-form"
                    className="gap-2"
                    disabled={createAvailability.isPending}
                  >
                    {createAvailability.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add session
                  </MtButton>
                }
              >
                <form id="add-session-form" onSubmit={handleAddSession} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">Dates</Label>
                      <MultiDatePicker
                        compact
                        value={form.dates}
                        onChange={(dates) => setForm((f) => ({ ...f, dates }))}
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">Start</Label>
                      <TimeInputField
                        value={form.start}
                        onChange={(start) => setForm((f) => ({ ...f, start }))}
                        placeholder="09:00"
                        aria-label="Session start time"
                        required
                        className="[&_input]:h-9 [&_input]:text-sm"
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">End</Label>
                      <TimeInputField
                        value={form.end}
                        onChange={(end) => setForm((f) => ({ ...f, end }))}
                        placeholder="11:00"
                        aria-label="Session end time"
                        required
                        className="[&_input]:h-9 [&_input]:text-sm"
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">Type</Label>
                      <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as SessionType }))}>
                        <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPD">OPD</SelectItem>
                          <SelectItem value="Ward Round">Ward Round</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">Slot duration</Label>
                      <Select value={form.slotDuration} onValueChange={(v) => setForm((f) => ({ ...f, slotDuration: v }))}>
                        <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SLOT_DURATION_OPTIONS.map((minutes) => (
                            <SelectItem key={minutes} value={minutes}>{minutes} min</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-adminreg-muted">Location</Label>
                      <Select
                        value={form.location || undefined}
                        onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}
                        disabled={isLoadingRooms || sessionRooms.length === 0}
                      >
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue
                            placeholder={
                              isLoadingRooms
                                ? "Loading rooms…"
                                : sessionRooms.length === 0
                                  ? "No rooms yet"
                                  : "Select room"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sessionRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.floor ? `${room.name} · Floor ${room.floor}` : room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {sessionDurationLabel ? (
                    <p className="text-[11px] text-adminreg-muted">{sessionDurationLabel}</p>
                  ) : null}
                </form>
              </AdminCard>
            </>
          ) : null}

          {showLeave ? (
            <AdminCard
              title="Leave Exceptions"
              className={showAvailability || showProfile ? "mt-5" : undefined}
              action={<MtButton className="gap-2" onClick={() => setLeaveTarget(selected)}><Plus className="h-4 w-4" />Add leave</MtButton>}
            >
              {isLoadingLeaves ? (
                <TableSkeleton rows={3} columns={2} />
              ) : isLeavesError ? (
                <p className="text-sm text-adminreg-red">{getToastErrorMessage(leavesError, "Failed to load leave")}</p>
              ) : doctorLeaves.length === 0 ? (
                <p className="text-sm text-adminreg-muted">No leave recorded for {selectedName}.</p>
              ) : (
                <ul className="space-y-2">
                  {doctorLeaves.map((l) => {
                    const from = formatLeaveDate(l.fromDate)
                    const to = formatLeaveDate(l.toDate)
                    return (
                      <li
                        key={l.id}
                        className="flex flex-col gap-2 border border-adminreg-border bg-adminreg-header/40 px-3.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-adminreg-text">
                            {from}
                            {to !== from ? ` – ${to}` : ""}
                          </span>
                          <span className="mt-0.5 block text-adminreg-muted sm:mt-0 sm:ml-3 sm:inline">
                            {l.reason || "Not specified"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteLeaveTarget(l)}
                          disabled={deleteLeave.isPending}
                          className="shrink-0 text-sm font-medium text-adminreg-red hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </AdminCard>
          ) : null}
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
                onRowClick={openDoctorDetails}
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
            <MtButton type="submit" disabled={createLeave.isPending}>
              {createLeave.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add leave
            </MtButton>
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
        open={!!deleteLeaveTarget}
        onOpenChange={(open) => !open && setDeleteLeaveTarget(null)}
        title="Remove leave?"
        description={
          deleteLeaveTarget
            ? `Remove leave ${formatLeaveDate(deleteLeaveTarget.fromDate)}${formatLeaveDate(deleteLeaveTarget.toDate) !== formatLeaveDate(deleteLeaveTarget.fromDate) ? ` – ${formatLeaveDate(deleteLeaveTarget.toDate)}` : ""}? This cannot be undone.`
            : ""
        }
        confirmLabel={deleteLeave.isPending ? "Removing…" : "Remove"}
        destructive
        onConfirm={confirmDeleteLeave}
      />

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
