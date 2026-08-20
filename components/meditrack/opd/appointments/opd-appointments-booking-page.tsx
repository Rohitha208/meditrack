"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { AdminButton } from "@/components/meditrack/admin/register"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { ROLE_LABEL, appointmentBookingEditable } from "@/components/meditrack/layout/register/rbac"
import { FieldLabel, FieldValue, Panel, SectionLabel, InlineInfo, InlineSuccess, ViewOnlyBanner } from "@/components/meditrack/opd/shared/ui"
import { APPOINTMENT_TABS } from "./theme"

// ---------------------------------------------------------------------------
// Frontend/UI only — staff-facing Appointment Booking (front desk / call
// center), the new Stage 0 that precedes the OPD visit thread. Visually a
// separate entry point from the numbered relay per the spec: its own tab
// strip, no connecting dot/line to Stage 1. All state is local React state.
// ---------------------------------------------------------------------------

type DayStatus = "available" | "full" | "leave" | "holiday"

const DAY_STATUS_CLASS: Record<DayStatus, string> = {
  available: "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark",
  full: "border-adminreg-border bg-adminreg-header text-adminreg-muted",
  leave: "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text",
  holiday: "border-adminreg-red bg-adminreg-red-soft text-adminreg-red-text",
}

const DAYS = [
  { date: 12, status: "available" as DayStatus, note: "6 slots" },
  { date: 13, status: "available" as DayStatus, note: "6 slots" },
  { date: 14, status: "full" as DayStatus, note: "Full" },
  { date: 15, status: "leave" as DayStatus, note: "On leave" },
  { date: 16, status: "available" as DayStatus, note: "6 slots" },
  { date: 17, status: "holiday" as DayStatus, note: "Holiday" },
  { date: 18, status: "available" as DayStatus, note: "6 slots" },
  { date: 19, status: "available" as DayStatus, note: "6 slots" },
  { date: 20, status: "available" as DayStatus, note: "5 slots" },
  { date: 21, status: "available" as DayStatus, note: "6 slots" },
]

const SLOTS = ["09:00 AM", "09:20 AM", "09:40 AM", "10:00 AM", "10:20 AM", "10:40 AM", "11:00 AM", "11:20 AM"]
const BOOKED_SLOTS = ["09:20 AM", "10:40 AM"]

const DOCTORS = [
  { name: "Dr. Anjali Nair", department: "Cardiology" },
  { name: "Dr. Rohan Mehta", department: "General Medicine" },
  { name: "Dr. Kavya Iyer", department: "Pediatrics" },
]

const DEPARTMENTS = ["Cardiology", "General Medicine", "Pediatrics", "Orthopedics"]

const RESCHEDULE_SLOTS = [
  { date: "20 Aug, 09:00 AM" },
  { date: "20 Aug, 11:20 AM" },
  { date: "21 Aug, 10:00 AM" },
  { date: "22 Aug, 09:40 AM" },
]

export function OpdAppointmentsBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role } = useStaffRole()
  const editable = appointmentBookingEditable(role)

  const tab = Number(searchParams.get("tab") ?? 0)
  const goToTab = (n: number) => router.push(`/opd/appointments?tab=${n}`)

  const [selectedDoctor, setSelectedDoctor] = useState(DOCTORS[0])
  const [selectedDay, setSelectedDay] = useState(12)
  const [selectedSlot, setSelectedSlot] = useState("10:20 AM")
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [checkinResult, setCheckinResult] = useState<"idle" | "found" | "notfound">("found")

  return (
    <div className="min-h-full">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-adminreg-border bg-adminreg-header px-4 sm:px-6 md:px-8 py-4 font-archivo">
        <div>
          <div className="mb-1 font-plexmono text-[10px] tracking-[0.05em] text-adminreg-muted">OPD — APPOINTMENT BOOKING · STAGE 0</div>
          <h1 className="text-[21px] font-extrabold tracking-[-0.01em] text-adminreg-text">{APPOINTMENT_TABS[tab]}</h1>
        </div>
      </div>

      {!editable && <ViewOnlyBanner role={ROLE_LABEL[role]} />}

      <div className="border-b border-adminreg-border bg-adminreg-card px-4 sm:px-6 md:px-8 py-3 font-archivo">
        <div className="flex flex-wrap gap-2">
          {APPOINTMENT_TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => goToTab(i)}
              className={cn(
                "border px-3.5 py-2 text-[13px] font-semibold transition-colors",
                tab === i ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted hover:text-adminreg-text"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-8 pb-16 pt-6 font-archivo">
        <div className="mx-auto max-w-[1240px]">
          {tab === 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
              <Panel>
                <SectionLabel>Department</SectionLabel>
                <select
                  disabled={!editable}
                  defaultValue={selectedDoctor.department}
                  className="mb-4 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <SectionLabel>Doctor</SectionLabel>
                <div className="space-y-2">
                  {DOCTORS.map((d) => {
                    const active = d.name === selectedDoctor.name
                    return (
                      <button
                        key={d.name}
                        type="button"
                        disabled={!editable}
                        onClick={() => setSelectedDoctor(d)}
                        className={cn(
                          "block w-full border px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          active ? "border-adminreg-indigo bg-adminreg-indigo-soft" : "border-adminreg-border bg-adminreg-bg hover:bg-adminreg-header"
                        )}
                      >
                        <p className={cn("text-sm", active ? "font-bold text-adminreg-indigo-dark" : "font-semibold text-adminreg-text")}>{d.name}</p>
                        <p className="text-xs text-adminreg-muted">{d.department}</p>
                      </button>
                    )
                  })}
                </div>
              </Panel>

              <Panel>
                <SectionLabel>August 2026 — {selectedDoctor.name}, {selectedDoctor.department}</SectionLabel>
                <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-adminreg-muted">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 border border-adminreg-olive bg-adminreg-olive-soft" /> Available</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 border border-adminreg-border bg-adminreg-header" /> Full</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 border border-adminreg-amber bg-adminreg-amber-soft" /> On leave</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 border border-adminreg-red bg-adminreg-red-soft" /> Holiday</span>
                </div>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {DAYS.map((d) => {
                    const disabled = d.status === "full" || d.status === "leave" || d.status === "holiday"
                    return (
                      <button
                        key={d.date}
                        type="button"
                        disabled={!editable || disabled}
                        onClick={() => setSelectedDay(d.date)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 border px-1 py-2 text-center transition-colors disabled:cursor-not-allowed",
                          DAY_STATUS_CLASS[d.status],
                          selectedDay === d.date && d.status === "available" && "ring-2 ring-adminreg-indigo"
                        )}
                      >
                        <span className="text-sm font-bold">{d.date}</span>
                        <span className="text-[9px]">{d.note}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-5">
                  <SectionLabel>Available slots — {selectedDay} Aug 2026</SectionLabel>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {SLOTS.map((slot) => {
                      const booked = BOOKED_SLOTS.includes(slot)
                      const active = selectedSlot === slot
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!editable || booked}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                            booked ? "border-adminreg-border bg-adminreg-header text-adminreg-muted line-through" : active ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card" : "border-adminreg-border bg-adminreg-bg text-adminreg-text hover:bg-adminreg-header"
                          )}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {editable && (
                  <AdminButton type="button" accent="indigo" className="mt-5" onClick={() => goToTab(1)}>
                    Continue to booking confirmation →
                  </AdminButton>
                )}
              </Panel>
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel>
                <SectionLabel>Patient</SectionLabel>
                <input disabled={!editable} placeholder="Search UHID, phone number..." className="mb-3 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60" />
                <p className="mb-4 text-[11px] text-adminreg-muted">No match? Capture just enough to hold the slot — full registration still happens at check-in.</p>
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Full Name</FieldLabel>
                    <input disabled={!editable} placeholder="e.g. Ramesh Iyer" className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60" />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <input disabled={!editable} placeholder="+91" className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60" />
                  </div>
                </div>
              </Panel>
              <Panel>
                <SectionLabel>Appointment Summary</SectionLabel>
                <div className="space-y-2.5">
                  <div><FieldLabel>Doctor</FieldLabel><FieldValue>{selectedDoctor.name} — {selectedDoctor.department}</FieldValue></div>
                  <div><FieldLabel>Date &amp; time</FieldLabel><FieldValue>{selectedDay} Aug 2026, {selectedSlot}</FieldValue></div>
                  <div><FieldLabel>Appointment reference</FieldLabel><FieldValue>APT-20260819-0142</FieldValue></div>
                </div>
                <p className="mt-3 text-[11px] text-adminreg-muted">Not a visit ID — no visit exists until check-in.</p>

                <div className="mt-5 border-t border-adminreg-divider pt-4">
                  <FieldLabel>Confirmation</FieldLabel>
                  <p className="mt-1 text-[11px] text-adminreg-muted">Reuses the notification template configured in Admin → System Config. One-way notice — not an interactive reply channel.</p>
                  {editable && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminButton type="button" variant="secondary" onClick={() => setConfirmationSent(true)}>Send SMS/WhatsApp confirmation</AdminButton>
                      <AdminButton type="button" accent="indigo" onClick={() => goToTab(4)}>Confirm booking</AdminButton>
                    </div>
                  )}
                  {confirmationSent && <div className="mt-3"><InlineSuccess>Confirmation sent to +91 98457 20142.</InlineSuccess></div>}
                </div>
              </Panel>
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel>
                <SectionLabel>Find appointment</SectionLabel>
                <input disabled={!editable} placeholder="Phone number, UHID, or appointment reference" className="mb-4 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60" />
                <FieldLabel>Current booking</FieldLabel>
                <div className="mt-1 border border-adminreg-border bg-adminreg-bg p-3">
                  <p className="text-sm font-semibold text-adminreg-text">Dr. Anjali Nair — Cardiology</p>
                  <p className="mt-1 font-plexmono text-xs text-adminreg-muted">APT-20260812-0087 · 19 Aug 2026, 11:20 AM</p>
                </div>
              </Panel>
              <Panel>
                <SectionLabel>Move to new slot</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {RESCHEDULE_SLOTS.map((s) => (
                    <button key={s.date} type="button" disabled={!editable} className="border border-adminreg-border bg-adminreg-bg px-3 py-2.5 text-xs font-medium text-adminreg-text transition-colors hover:bg-adminreg-header disabled:cursor-not-allowed disabled:opacity-60">
                      {s.date}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-adminreg-muted">No token exists and no queue to disturb yet — this is a plain live-edit change, no reason required.</p>
              </Panel>
            </div>
          )}

          {tab === 3 && (
            <Panel className="max-w-[560px]">
              <SectionLabel>Cancel appointment</SectionLabel>
              <p className="text-sm font-semibold text-adminreg-text">Dr. Anjali Nair — Cardiology · APT-20260812-0087 · 19 Aug 2026, 11:20 AM</p>
              <div className="mt-4">
                <FieldLabel>Reason</FieldLabel>
                <textarea disabled={!editable} rows={3} placeholder="e.g. Patient no longer needs this visit" className="mt-1 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60" />
              </div>
              <p className="mt-3 text-[11px] text-adminreg-muted">No fee has been collected at this stage — cancelling here has no refund step, unlike a same-day fee or token void. The slot returns to the bookable pool immediately.</p>
              {editable && <AdminButton type="button" variant="danger" className="mt-4">Cancel appointment</AdminButton>}
            </Panel>
          )}

          {tab === 4 && (
            <div className="max-w-[640px]">
              <Panel>
                <SectionLabel>Look up appointment</SectionLabel>
                <input disabled={!editable} placeholder="Appointment reference or phone number" className="mb-2 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60" />
                {editable && (
                  <button type="button" onClick={() => setCheckinResult((v) => (v === "found" ? "notfound" : "found"))} className="text-[11px] text-adminreg-indigo underline">
                    Simulate: toggle found / not found
                  </button>
                )}
              </Panel>

              {checkinResult === "found" && (
                <Panel className="mt-5 border-adminreg-olive bg-adminreg-olive-soft">
                  <p className="mb-3 text-sm font-bold text-adminreg-olive-dark">✓ Found your appointment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><FieldLabel>Doctor</FieldLabel><FieldValue>Dr. Anjali Nair — Cardiology</FieldValue></div>
                    <div><FieldLabel>Scheduled</FieldLabel><FieldValue>12 Aug 2026, 09:00 AM</FieldValue></div>
                    <div><FieldLabel>Reference</FieldLabel><FieldValue>APT-20260805-0033</FieldValue></div>
                    <div><FieldLabel>Patient</FieldLabel><FieldValue>Meera Kulkarni</FieldValue></div>
                  </div>
                  {editable && <AdminButton type="button" accent="indigo" className="mt-4" onClick={() => router.push("/opd/visit-thread?stage=0")}>Check in → Registration</AdminButton>}
                </Panel>
              )}

              {checkinResult === "notfound" && (
                <div className="mt-5">
                  <InlineInfo>No appointment found for this reference/phone. Falling back to walk-in registration — full details are captured there instead.</InlineInfo>
                  {editable && <AdminButton type="button" accent="indigo" className="mt-4" onClick={() => router.push("/opd/visit-thread?stage=0")}>Start walk-in registration →</AdminButton>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
