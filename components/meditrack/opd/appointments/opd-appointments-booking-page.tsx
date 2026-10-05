"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { AdminButton } from "@/components/meditrack/admin/register"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { ROLE_LABEL, appointmentBookingEditable } from "@/components/meditrack/layout/register/rbac"
import {
  FieldLabel,
  FieldValue,
  Panel,
  SectionLabel,
  InlineInfo,
  InlineSuccess,
  ViewOnlyBanner,
} from "@/components/meditrack/opd/shared/ui"
import { useGetDepartments } from "@/queries/departments"
import { useGetDoctorLeaves } from "@/queries/meditrack/doctor-leave"
import { useGetProviderAvailability } from "@/queries/meditrack/provider-availability"
import { useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"
import {
  buildCalendarDays,
  formatAppointmentDate,
  formatSlotLabel,
  isPastSlot,
  timeToMinutes,
  toApiDateOnly,
  useBookOpdAppointment,
  useCancelOpdAppointment,
  useFindOpdAppointments,
  useFindOpdPatients,
  useGetBookableSlots,
  useGetDepartmentDoctors,
  useRescheduleOpdAppointment,
  type OpdAppointment,
  type OpdPatientLookup,
  type OpdProviderSummary,
} from "@/queries/meditrack/opd-booking"
import { APPOINTMENT_TABS } from "./theme"

type DayStatus = "available" | "full" | "leave" | "none"

const DAY_STATUS_CLASS: Record<DayStatus, string> = {
  available: "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark",
  full: "border-adminreg-border bg-adminreg-header text-adminreg-muted",
  leave: "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text",
  none: "border-adminreg-border bg-adminreg-bg text-adminreg-muted",
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

function doctorDisplayName(d: OpdProviderSummary) {
  return d.providerName?.trim() || "Doctor"
}

function classifyLookupQuery(raw: string): { reference?: string; phone?: string; uhid?: string } {
  const q = raw.trim()
  if (!q) return {}
  if (/^APT-/i.test(q)) return { reference: q }
  const digits = q.replace(/\D/g, "")
  if (digits.length >= 8 && /^[\d\s+\-()]+$/.test(q)) return { phone: digits }
  // Prefer UHID/registration-style tokens; otherwise treat as appointment reference.
  if (/^[A-Z0-9][A-Z0-9\-/]{4,}$/i.test(q) && !/^APT-/i.test(q)) return { uhid: q }
  return { reference: q }
}

export function OpdAppointmentsBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { role } = useStaffRole()
  const editable = appointmentBookingEditable(role)

  const {
    companyId,
    branchId,
    clinicId,
    hasBranch,
    isLoadingBranches,
    noBranchMessage,
  } = useBranchScope()

  const tab = Number(searchParams.get("tab") ?? 0)
  const goToTab = (n: number) => router.push(`/opd/appointments?tab=${n}`)

  const calendarDays = useMemo(() => buildCalendarDays(10), [])
  const rangeFrom = toApiDateOnly(calendarDays[0])
  const rangeTo = toApiDateOnly(calendarDays[calendarDays.length - 1])

  // --- Slot search state ---
  const [departmentId, setDepartmentId] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<OpdProviderSummary | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => toApiDateOnly(calendarDays[0]))
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null)

  // --- Booking confirmation state ---
  const [patientQuery, setPatientQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<OpdPatientLookup | null>(null)
  const [walkInName, setWalkInName] = useState("")
  const [walkInPhone, setWalkInPhone] = useState("")
  const [bookedAppointment, setBookedAppointment] = useState<OpdAppointment | null>(null)

  // --- Reschedule / cancel / check-in lookup ---
  const [lookupQuery, setLookupQuery] = useState("")
  const [lookupSubmitted, setLookupSubmitted] = useState("")
  const [selectedFound, setSelectedFound] = useState<OpdAppointment | null>(null)
  const [rescheduleSlot, setRescheduleSlot] = useState<{ startTime: string; endTime: string; date: string } | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelReasonTouched, setCancelReasonTouched] = useState(false)
  const [checkinQuery, setCheckinQuery] = useState("")
  const [checkinSubmitted, setCheckinSubmitted] = useState("")

  const { data: departments = [], isLoading: isLoadingDepartments } = useGetDepartments(
    companyId || undefined,
    clinicId,
    !!companyId && hasBranch
  )

  const effectiveDepartmentId =
    (departmentId && departments.some((d) => d.departmentId === departmentId)
      ? departmentId
      : departments[0]?.departmentId) || ""

  const { data: doctors = [], isLoading: isLoadingDoctors } = useGetDepartmentDoctors(
    effectiveDepartmentId || undefined,
    clinicId,
    !!effectiveDepartmentId && hasBranch
  )

  const { data: availability = [] } = useGetProviderAvailability(
    selectedDoctor?.providerId,
    !!selectedDoctor?.providerId
  )

  const { data: leaves = [] } = useGetDoctorLeaves(
    {
      userId: selectedDoctor?.providerId,
      clinicId: clinicId || undefined,
      fromDate: rangeFrom,
      toDate: rangeTo,
    },
    !!selectedDoctor?.providerId && hasBranch
  )

  const {
    data: rawSlots = [],
    isLoading: isLoadingSlots,
    isError: isSlotsError,
    error: slotsError,
  } = useGetBookableSlots(
    selectedDoctor?.providerId,
    selectedDate,
    clinicId,
    !!selectedDoctor?.providerId && !!selectedDate && hasBranch
  )

  const discreteSlots = useMemo(() => {
    return [...rawSlots]
      .filter((slot) => !slot.sessionType || /^OPD$/i.test(slot.sessionType))
      .filter((slot) => !isPastSlot(selectedDate, slot.startTime))
      .sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0))
  }, [rawSlots, selectedDate])

  const dayMeta = useMemo(() => {
    return calendarDays.map((day) => {
      const iso = toApiDateOnly(day)
      const onLeave = leaves.some((l) => {
        const from = (l.fromDate || "").slice(0, 10)
        const to = (l.toDate || l.fromDate || "").slice(0, 10)
        return from && to && iso >= from && iso <= to
      })
      if (onLeave) {
        return { date: day, iso, status: "leave" as DayStatus, note: "On leave" }
      }

      const dayName = FULL_WEEKDAYS[day.getDay()]
      const hasSession = availability.some((s) => {
        if (!s.isActive || !/^OPD$/i.test(s.sessionType || "")) return false
        if (s.specificDate) return s.specificDate.slice(0, 10) === iso
        return s.dayOfWeek === dayName
      })

      if (!hasSession) {
        return { date: day, iso, status: "none" as DayStatus, note: "—" }
      }
      return { date: day, iso, status: "available" as DayStatus, note: "Open" }
    })
  }, [calendarDays, leaves, availability])

  const patientSearch = useFindOpdPatients(patientQuery, tab === 1)
  const lookupParams = useMemo(() => classifyLookupQuery(lookupSubmitted), [lookupSubmitted])
  const findResults = useFindOpdAppointments(lookupParams, tab === 2 || tab === 3)
  const checkinParams = useMemo(() => classifyLookupQuery(checkinSubmitted), [checkinSubmitted])
  const checkinResults = useFindOpdAppointments(checkinParams, tab === 4)

  const bookMutation = useBookOpdAppointment()
  const rescheduleMutation = useRescheduleOpdAppointment()
  const cancelMutation = useCancelOpdAppointment()

  const rescheduleSlots = useGetBookableSlots(
    selectedFound?.providerId || undefined,
    rescheduleSlot?.date || selectedFound?.date?.slice(0, 10) || selectedDate,
    clinicId,
    tab === 2 && !!selectedFound?.providerId && hasBranch
  )

  const rescheduleDiscrete = useMemo(() => {
    const date = rescheduleSlot?.date || selectedFound?.date?.slice(0, 10) || selectedDate
    const raw = rescheduleSlots.data ?? []
    return [...raw]
      .filter((slot) => !slot.sessionType || /^OPD$/i.test(slot.sessionType))
      .filter((slot) => !isPastSlot(date, slot.startTime))
      .sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0))
      .map((slot) => ({ ...slot, date }))
  }, [
    rescheduleSlots.data,
    rescheduleSlot?.date,
    selectedFound?.date,
    selectedDate,
  ])

  useEffect(() => {
    // Only reset when the branch actually changes (not on first empty→set).
    setSelectedDoctor(null)
    setSelectedSlot(null)
    setDepartmentId("")
  }, [branchId])

  useEffect(() => {
    if (departments.length === 0) {
      if (departmentId) setDepartmentId("")
      return
    }
    const stillValid = departments.some((d) => d.departmentId === departmentId)
    if (!stillValid) {
      setDepartmentId(departments[0].departmentId)
    }
  }, [departments, departmentId])

  useEffect(() => {
    if (!doctors.length) {
      setSelectedDoctor(null)
      return
    }
    setSelectedDoctor((prev) => {
      if (prev && doctors.some((d) => d.providerId === prev.providerId)) return prev
      return doctors[0]
    })
    setSelectedSlot(null)
  }, [doctors])

  useEffect(() => {
    setSelectedSlot(null)
  }, [selectedDate, selectedDoctor?.providerId])

  useEffect(() => {
    if (!selectedSlot) return
    if (isPastSlot(selectedDate, selectedSlot.startTime)) {
      setSelectedSlot(null)
    }
  }, [selectedDate, selectedSlot])

  useEffect(() => {
    if (findResults.data?.length) {
      setSelectedFound(findResults.data[0])
    } else if (lookupSubmitted) {
      setSelectedFound(null)
    }
  }, [findResults.data, lookupSubmitted])

  const monthLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`)
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  }, [selectedDate])

  async function handleConfirmBooking() {
    if (!selectedDoctor || !selectedSlot || !clinicId) {
      toast({
        title: "Missing details",
        description: !clinicId
          ? "Select a clinic/branch in the app context before booking."
          : "Pick a doctor and slot first.",
        variant: "destructive",
      })
      return
    }
    if (!selectedPatient && !walkInName.trim()) {
      toast({
        title: "Patient required",
        description: "Search and select a patient, or enter a walk-in name.",
        variant: "destructive",
      })
      return
    }

    try {
      const created = await bookMutation.mutateAsync({
        providerId: selectedDoctor.providerId,
        clinicId,
        date: selectedDate,
        timeFrom: selectedSlot.startTime,
        timeTo: selectedSlot.endTime,
        patientId: selectedPatient?.id || null,
        bookedPatientName: selectedPatient ? null : walkInName.trim(),
        bookedPatientPhone: selectedPatient ? null : walkInPhone.trim() || null,
      })
      setBookedAppointment({ ...created, clinicId: created.clinicId || clinicId })
      // Carry the reference into lookup + check-in so those tabs re-read this
      // appointment from the booking API instead of needing a manual search.
      const carryQuery =
        created.appointmentReference || created.patientPhone || walkInPhone.trim() || ""
      if (carryQuery) {
        setLookupQuery(carryQuery)
        setLookupSubmitted(carryQuery)
        setCheckinQuery(carryQuery)
        setCheckinSubmitted(carryQuery)
      }
      toast({
        title: "Appointment booked",
        description: created.appointmentReference
          ? `Reference ${created.appointmentReference}`
          : "Booking saved.",
      })
    } catch (err) {
      toast({
        title: "Could not book",
        description: getToastErrorMessage(err, "Failed to book appointment"),
        variant: "destructive",
      })
    }
  }

  async function handleReschedule() {
    if (!selectedFound || !rescheduleSlot) {
      toast({ title: "Pick a new slot", description: "Select a target date and time.", variant: "destructive" })
      return
    }
    try {
      const updated = await rescheduleMutation.mutateAsync({
        id: selectedFound.id,
        date: rescheduleSlot.date,
        timeFrom: rescheduleSlot.startTime,
        timeTo: rescheduleSlot.endTime,
      })
      setSelectedFound(updated)
      setRescheduleSlot(null)
      toast({ title: "Appointment moved", description: updated.appointmentReference || "Reschedule saved." })
    } catch (err) {
      toast({
        title: "Could not reschedule",
        description: getToastErrorMessage(err, "Failed to reschedule"),
        variant: "destructive",
      })
    }
  }

  async function handleCancelAppointment() {
    setCancelReasonTouched(true)
    if (!cancelReason.trim() || !selectedFound) return
    try {
      const cancelled = await cancelMutation.mutateAsync({
        id: selectedFound.id,
        reason: cancelReason.trim(),
      })
      setSelectedFound(cancelled)
      toast({ title: "Appointment cancelled", description: "Slot returned to the bookable pool." })
    } catch (err) {
      toast({
        title: "Could not cancel",
        description: getToastErrorMessage(err, "Failed to cancel"),
        variant: "destructive",
      })
    }
  }

  const checkinFound = checkinResults.data?.[0] || null
  const checkinIdle = !checkinSubmitted
  const checkinNotFound = !!checkinSubmitted && !checkinResults.isLoading && !checkinFound

  return (
    <div className="min-h-full">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-adminreg-border bg-adminreg-header px-4 py-4 font-archivo sm:px-6 md:px-8">
        <div>
          <div className="mb-1 font-plexmono text-[10px] tracking-[0.05em] text-adminreg-muted">
            OPD — APPOINTMENT BOOKING · STAGE 0
          </div>
          <h1 className="text-[21px] font-extrabold tracking-[-0.01em] text-adminreg-text">
            {APPOINTMENT_TABS[tab]}
          </h1>
        </div>
      </div>

      {!editable && <ViewOnlyBanner role={ROLE_LABEL[role]} />}

      <div className="border-b border-adminreg-border bg-adminreg-card px-4 py-3 font-archivo sm:px-6 md:px-8">
        <div className="flex flex-wrap gap-2">
          {APPOINTMENT_TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => goToTab(i)}
              className={cn(
                "min-w-[150px] flex-1 border px-3.5 py-2.5 text-center text-[13px] font-semibold leading-snug transition-colors sm:flex-none",
                tab === i
                  ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark"
                  : "border-adminreg-border bg-adminreg-bg text-adminreg-muted hover:text-adminreg-text"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-16 pt-6 font-archivo sm:px-6 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          {isLoadingBranches ? (
            <Panel>
              <p className="text-sm text-adminreg-muted">Loading branches…</p>
            </Panel>
          ) : !hasBranch ? (
            <Panel>
              <p className="text-sm text-adminreg-red">{noBranchMessage}</p>
            </Panel>
          ) : null}

          {hasBranch && tab === 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
              <Panel>
                <SectionLabel>Department</SectionLabel>
                {isLoadingDepartments ? (
                  <p className="mb-4 text-sm text-adminreg-muted">Loading departments…</p>
                ) : departments.length === 0 ? (
                  <p className="mb-4 text-sm text-adminreg-muted">
                    No departments for this branch. Add them under Admin → Departments.
                  </p>
                ) : (
                  <select
                    value={effectiveDepartmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="mb-4 w-full border border-adminreg-border bg-background px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo"
                  >
                    {departments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}

                <SectionLabel>Doctor</SectionLabel>
                {isLoadingDoctors ? (
                  <p className="text-sm text-adminreg-muted">Loading doctors…</p>
                ) : doctors.length === 0 ? (
                  <p className="text-sm text-adminreg-muted">No doctors in this department.</p>
                ) : (
                  <div className="space-y-2">
                    {doctors.map((d) => {
                      const active = d.providerId === selectedDoctor?.providerId
                      return (
                        <button
                          key={d.providerId}
                          type="button"
                          onClick={() => setSelectedDoctor(d)}
                          className={cn(
                            "block w-full border px-3.5 py-2.5 text-left transition-colors",
                            active
                              ? "border-adminreg-indigo bg-adminreg-indigo-soft"
                              : "border-adminreg-border bg-adminreg-bg hover:bg-adminreg-header"
                          )}
                        >
                          <p
                            className={cn(
                              "text-sm",
                              active ? "font-bold text-adminreg-indigo-dark" : "font-semibold text-adminreg-text"
                            )}
                          >
                            {doctorDisplayName(d)}
                          </p>
                          <p className="text-xs text-adminreg-muted">{d.departmentName || "—"}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Panel>

              <Panel>
                <SectionLabel>
                  {monthLabel}
                  {selectedDoctor
                    ? ` — ${doctorDisplayName(selectedDoctor)}${selectedDoctor.departmentName ? `, ${selectedDoctor.departmentName}` : ""}`
                    : ""}
                </SectionLabel>
                <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-adminreg-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 border border-adminreg-olive bg-adminreg-olive-soft" /> Available
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 border border-adminreg-amber bg-adminreg-amber-soft" /> On leave
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 border border-adminreg-border bg-adminreg-bg" /> No OPD
                  </span>
                </div>

                {!selectedDoctor ? (
                  <p className="text-sm text-adminreg-muted">Select a doctor to see availability.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                      {dayMeta.map((d) => {
                        const disabled = d.status === "leave" || d.status === "none"
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedDate(d.iso)}
                            className={cn(
                              "flex flex-col items-center gap-0.5 border px-1 py-2 text-center transition-colors disabled:cursor-not-allowed",
                              DAY_STATUS_CLASS[d.status],
                              selectedDate === d.iso && d.status === "available" && "ring-2 ring-adminreg-indigo"
                            )}
                          >
                            <span className="text-[9px] uppercase">{WEEKDAYS[d.date.getDay()]}</span>
                            <span className="text-sm font-bold">{d.date.getDate()}</span>
                            <span className="text-[9px]">{d.note}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-5">
                      <SectionLabel>
                        Available slots — {formatAppointmentDate(selectedDate)}
                      </SectionLabel>
                      {isLoadingSlots ? (
                        <p className="text-sm text-adminreg-muted">Loading slots…</p>
                      ) : isSlotsError ? (
                        <p className="text-sm text-adminreg-red">
                          {getToastErrorMessage(slotsError, "Failed to load slots")}
                        </p>
                      ) : discreteSlots.length === 0 ? (
                        <p className="text-sm text-adminreg-muted">No bookable OPD slots on this date.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {discreteSlots.map((slot) => {
                            const booked = /^booked$/i.test(slot.status)
                            const active =
                              selectedSlot?.startTime === slot.startTime &&
                              selectedSlot?.endTime === slot.endTime
                            return (
                              <button
                                key={`${slot.startTime}-${slot.endTime}`}
                                type="button"
                                disabled={booked}
                                onClick={() =>
                                  setSelectedSlot({ startTime: slot.startTime, endTime: slot.endTime })
                                }
                                className={cn(
                                  "border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                                  booked
                                    ? "border-adminreg-border bg-adminreg-header text-adminreg-muted line-through"
                                    : active
                                      ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card"
                                      : "border-adminreg-border bg-adminreg-bg text-adminreg-text hover:bg-adminreg-header"
                                )}
                              >
                                {formatSlotLabel(slot.startTime)}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {editable && (
                      <AdminButton
                        type="button"
                        accent="indigo"
                        className="mt-5"
                        disabled={!selectedSlot}
                        onClick={() => goToTab(1)}
                      >
                        Continue to booking confirmation →
                      </AdminButton>
                    )}
                  </>
                )}
              </Panel>
            </div>
          )}

          {hasBranch && tab === 1 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel>
                <SectionLabel>Patient</SectionLabel>
                {!selectedDoctor || !selectedSlot ? (
                  <InlineInfo>
                    Pick a doctor and slot in Slot Search first.{" "}
                    <button type="button" className="underline" onClick={() => goToTab(0)}>
                      Go back
                    </button>
                  </InlineInfo>
                ) : (
                  <>
                    <input
                      disabled={!editable}
                      value={patientQuery}
                      onChange={(e) => {
                        setPatientQuery(e.target.value)
                        setSelectedPatient(null)
                      }}
                      placeholder="Search UHID, phone number, or name (min 3 chars)"
                      className="mb-3 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                    />
                    {patientSearch.isFetching && (
                      <p className="mb-2 text-[11px] text-adminreg-muted">Searching…</p>
                    )}
                    {patientSearch.data && patientSearch.data.length > 0 && (
                      <div className="mb-4 max-h-40 space-y-1 overflow-y-auto border border-adminreg-border bg-adminreg-bg p-2">
                        {patientSearch.data.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={!editable}
                            onClick={() => {
                              setSelectedPatient(p)
                              setWalkInName("")
                              setWalkInPhone("")
                            }}
                            className={cn(
                              "block w-full px-2 py-1.5 text-left text-sm",
                              selectedPatient?.id === p.id
                                ? "bg-adminreg-indigo-soft font-semibold text-adminreg-indigo-dark"
                                : "hover:bg-adminreg-header"
                            )}
                          >
                            {p.name || "Unnamed"}
                            <span className="text-adminreg-muted">
                              {" "}
                              · {p.uhid || "no UHID"} · {p.phone || "no phone"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mb-4 text-[11px] text-adminreg-muted">
                      No match? Capture just enough to hold the slot — full registration still happens at
                      check-in.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <FieldLabel>Full Name</FieldLabel>
                        <input
                          disabled={!editable || !!selectedPatient}
                          value={selectedPatient?.name || walkInName}
                          onChange={(e) => setWalkInName(e.target.value)}
                          placeholder="e.g. Ramesh Iyer"
                          className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <FieldLabel>Phone</FieldLabel>
                        <input
                          disabled={!editable || !!selectedPatient}
                          value={selectedPatient?.phone || walkInPhone}
                          onChange={(e) => setWalkInPhone(e.target.value)}
                          placeholder="+91"
                          className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </>
                )}
              </Panel>
              <Panel>
                <SectionLabel>Appointment Summary</SectionLabel>
                <div className="space-y-2.5">
                  <div>
                    <FieldLabel>Doctor</FieldLabel>
                    <FieldValue>
                      {selectedDoctor
                        ? `${doctorDisplayName(selectedDoctor)}${selectedDoctor.departmentName ? ` — ${selectedDoctor.departmentName}` : ""}`
                        : "—"}
                    </FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Date &amp; time</FieldLabel>
                    <FieldValue>
                      {selectedSlot
                        ? `${formatAppointmentDate(selectedDate)}, ${formatSlotLabel(selectedSlot.startTime)}`
                        : "—"}
                    </FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Appointment reference</FieldLabel>
                    <FieldValue>
                      {bookedAppointment?.appointmentReference || "Assigned on confirm"}
                    </FieldValue>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-adminreg-muted">
                  Not a visit ID — no visit exists until check-in.
                </p>

                {bookedAppointment ? (
                  <div className="mt-5">
                    <InlineSuccess>
                      Booked {bookedAppointment.appointmentReference}. Slot held for{" "}
                      {bookedAppointment.patientName || walkInName || "patient"}.
                    </InlineSuccess>
                    {editable && (
                      <AdminButton
                        type="button"
                        accent="indigo"
                        className="mt-4"
                        onClick={() => goToTab(4)}
                      >
                        Go to day-of check-in →
                      </AdminButton>
                    )}
                  </div>
                ) : (
                  editable && (
                    <div className="mt-5 border-t border-adminreg-divider pt-4">
                      <AdminButton
                        type="button"
                        accent="indigo"
                        disabled={bookMutation.isPending || !selectedSlot || !selectedDoctor}
                        onClick={handleConfirmBooking}
                      >
                        {bookMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Confirm booking
                      </AdminButton>
                    </div>
                  )
                )}
              </Panel>
            </div>
          )}

          {hasBranch && tab === 2 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel>
                <SectionLabel>Find appointment</SectionLabel>
                <div className="mb-4 flex gap-2">
                  <input
                    disabled={!editable}
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="Phone number, UHID, or appointment reference"
                    className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                  />
                  {editable && (
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={() => setLookupSubmitted(lookupQuery.trim())}
                    >
                      Find
                    </AdminButton>
                  )}
                </div>
                {findResults.isFetching && <p className="text-sm text-adminreg-muted">Searching…</p>}
                {lookupSubmitted && !findResults.isFetching && !selectedFound && (
                  <InlineInfo>No upcoming appointment found for that lookup.</InlineInfo>
                )}
                {selectedFound && (
                  <>
                    <FieldLabel>Current booking</FieldLabel>
                    <div className="mt-1 border border-adminreg-border bg-adminreg-bg p-3">
                      <p className="text-sm font-semibold text-adminreg-text">
                        {selectedFound.providerName || "Doctor"}
                        {selectedFound.departmentName ? ` — ${selectedFound.departmentName}` : ""}
                      </p>
                      <p className="mt-1 font-plexmono text-xs text-adminreg-muted">
                        {selectedFound.appointmentReference || selectedFound.id} ·{" "}
                        {formatAppointmentDate(selectedFound.date)},{" "}
                        {formatSlotLabel(selectedFound.timeFrom)}
                      </p>
                    </div>
                  </>
                )}
              </Panel>
              <Panel>
                <SectionLabel>Move to new slot</SectionLabel>
                {!selectedFound ? (
                  <p className="text-sm text-adminreg-muted">Find an appointment first.</p>
                ) : (
                  <>
                    <input
                      type="date"
                      disabled={!editable}
                      value={rescheduleSlot?.date || selectedFound.date?.slice(0, 10) || selectedDate}
                      onChange={(e) =>
                        setRescheduleSlot((s) => ({
                          date: e.target.value,
                          startTime: s?.startTime || "",
                          endTime: s?.endTime || "",
                        }))
                      }
                      className="mb-3 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm"
                    />
                    {rescheduleSlots.isLoading ? (
                      <p className="text-sm text-adminreg-muted">Loading slots…</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {rescheduleDiscrete.map((s) => {
                          const active =
                            rescheduleSlot?.startTime === s.startTime &&
                            rescheduleSlot?.date === s.date
                          return (
                            <button
                              key={`${s.date}-${s.startTime}`}
                              type="button"
                              disabled={!editable || /^booked$/i.test(s.status)}
                              onClick={() =>
                                setRescheduleSlot({
                                  date: s.date,
                                  startTime: s.startTime,
                                  endTime: s.endTime,
                                })
                              }
                              className={cn(
                                "border px-3 py-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                active
                                  ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card"
                                  : "border-adminreg-border bg-adminreg-bg text-adminreg-text hover:bg-adminreg-header"
                              )}
                            >
                              {formatAppointmentDate(s.date)}, {formatSlotLabel(s.startTime)}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <p className="mt-4 text-[11px] text-adminreg-muted">
                      No token exists and no queue to disturb yet — this is a plain live-edit change.
                    </p>
                    {editable && (
                      <AdminButton
                        type="button"
                        accent="indigo"
                        className="mt-4"
                        disabled={
                          rescheduleMutation.isPending ||
                          !rescheduleSlot?.startTime ||
                          !rescheduleSlot?.endTime
                        }
                        onClick={handleReschedule}
                      >
                        {rescheduleMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save new slot
                      </AdminButton>
                    )}
                  </>
                )}
              </Panel>
            </div>
          )}

          {hasBranch && tab === 3 && (
            <Panel className="max-w-[560px]">
              <SectionLabel>Cancel appointment</SectionLabel>
              <div className="mb-4 flex gap-2">
                <input
                  disabled={!editable}
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Phone, UHID, or appointment reference"
                  className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm"
                />
                {editable && (
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => setLookupSubmitted(lookupQuery.trim())}
                  >
                    Find
                  </AdminButton>
                )}
              </div>

              {selectedFound?.isCancelled ||
              selectedFound?.status?.toLowerCase() === "cancelled" ? (
                <InlineSuccess>
                  Appointment cancelled
                  {selectedFound.cancellationReason
                    ? ` — ${selectedFound.cancellationReason}`
                    : "."}{" "}
                  The slot has returned to the bookable pool.
                </InlineSuccess>
              ) : selectedFound ? (
                <>
                  <p className="text-sm font-semibold text-adminreg-text">
                    {selectedFound.providerName || "Doctor"}
                    {selectedFound.departmentName ? ` — ${selectedFound.departmentName}` : ""} ·{" "}
                    {selectedFound.appointmentReference || selectedFound.id} ·{" "}
                    {formatAppointmentDate(selectedFound.date)},{" "}
                    {formatSlotLabel(selectedFound.timeFrom)}
                  </p>
                  <div className="mt-4">
                    <FieldLabel>Reason</FieldLabel>
                    <textarea
                      disabled={!editable}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      placeholder="e.g. Patient no longer needs this visit"
                      className={cn(
                        "mt-1 w-full border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60",
                        cancelReasonTouched && !cancelReason.trim()
                          ? "border-adminreg-red"
                          : "border-adminreg-border"
                      )}
                    />
                    {cancelReasonTouched && !cancelReason.trim() && (
                      <p className="mt-1 text-[11px] text-adminreg-red-text">
                        A reason is required before cancelling.
                      </p>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] text-adminreg-muted">
                    No fee has been collected at this stage — cancelling here has no refund step. The
                    slot returns to the bookable pool immediately.
                  </p>
                  {editable && (
                    <AdminButton
                      type="button"
                      variant="danger"
                      className="mt-4"
                      disabled={cancelMutation.isPending}
                      onClick={handleCancelAppointment}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Cancel appointment
                    </AdminButton>
                  )}
                </>
              ) : lookupSubmitted ? (
                <InlineInfo>No appointment found to cancel.</InlineInfo>
              ) : (
                <p className="text-sm text-adminreg-muted">Look up an appointment to cancel.</p>
              )}
            </Panel>
          )}

          {hasBranch && tab === 4 && (
            <div className="max-w-[640px]">
              <Panel>
                <SectionLabel>Look up appointment</SectionLabel>
                <div className="mb-2 flex gap-2">
                  <input
                    disabled={!editable}
                    value={checkinQuery}
                    onChange={(e) => setCheckinQuery(e.target.value)}
                    placeholder="Appointment reference or phone number"
                    className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                  />
                  {editable && (
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={() => setCheckinSubmitted(checkinQuery.trim())}
                    >
                      Look up
                    </AdminButton>
                  )}
                </div>
                <p className="text-[11px] text-adminreg-muted">
                  {bookedAppointment
                    ? "Prefilled from the appointment you just booked — re-read from the booking API."
                    : "Check-in action itself is not in the booking API yet — lookup works; continue opens registration."}
                </p>
              </Panel>

              {checkinResults.isFetching && (
                <p className="mt-4 text-sm text-adminreg-muted">Searching…</p>
              )}

              {!checkinIdle && checkinFound && (
                <Panel className="mt-5 border-adminreg-olive bg-adminreg-olive-soft">
                  <p className="mb-3 text-sm font-bold text-adminreg-olive-dark">✓ Found your appointment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Doctor</FieldLabel>
                      <FieldValue>
                        {checkinFound.providerName || "—"}
                        {checkinFound.departmentName ? ` — ${checkinFound.departmentName}` : ""}
                      </FieldValue>
                    </div>
                    <div>
                      <FieldLabel>Scheduled</FieldLabel>
                      <FieldValue>
                        {formatAppointmentDate(checkinFound.date)},{" "}
                        {formatSlotLabel(checkinFound.timeFrom)}
                      </FieldValue>
                    </div>
                    <div>
                      <FieldLabel>Reference</FieldLabel>
                      <FieldValue>{checkinFound.appointmentReference || checkinFound.id}</FieldValue>
                    </div>
                    <div>
                      <FieldLabel>Patient</FieldLabel>
                      <FieldValue>{checkinFound.patientName || "—"}</FieldValue>
                    </div>
                  </div>
                  {editable && (
                    <AdminButton
                      type="button"
                      accent="indigo"
                      className="mt-4"
                      onClick={() => {
                        const params = new URLSearchParams({
                          stage: "0",
                          appointmentId: checkinFound.id,
                        })
                        if (checkinFound.appointmentReference) {
                          params.set("ref", checkinFound.appointmentReference)
                        }
                        if (checkinFound.patientPhone) params.set("phone", checkinFound.patientPhone)
                        if (checkinFound.patientName) params.set("name", checkinFound.patientName)
                        if (checkinFound.providerId) params.set("userId", checkinFound.providerId)
                        if (checkinFound.departmentId) params.set("departmentId", checkinFound.departmentId)
                        const checkinClinicId = checkinFound.clinicId || bookedAppointment?.clinicId || clinicId
                        if (checkinClinicId) params.set("clinicId", checkinClinicId)
                        router.push(`/opd/visit-thread?${params}`)
                      }}
                    >
                      Check in → Registration
                    </AdminButton>
                  )}
                </Panel>
              )}

              {checkinNotFound && (
                <div className="mt-5">
                  <InlineInfo>
                    No appointment found for this reference/phone. Falling back to walk-in
                    registration — full details are captured there instead.
                  </InlineInfo>
                  {editable && (
                    <AdminButton
                      type="button"
                      accent="indigo"
                      className="mt-4"
                      onClick={() => router.push("/opd/visit-thread?stage=0")}
                    >
                      Start walk-in registration →
                    </AdminButton>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
