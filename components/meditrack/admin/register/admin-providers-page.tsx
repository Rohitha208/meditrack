"use client"

import { useMemo, useState, type FormEvent } from "react"
import { ChevronLeft, Eye, Plus } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { MtDataTable, RowActions, FormDialog, MtButton, getInitials, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { DOCTORS, DEPARTMENTS, type DoctorDirectoryEntry } from "@/components/meditrack/shared/directory"

// Frontend/UI only — provider directory + weekly availability sessions live
// in local React state.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
type Day = (typeof DAYS)[number]
type SessionType = "OPD" | "Ward Round"

interface Session {
  id: string
  day: Day
  start: string
  end: string
  type: SessionType
  location: string
}

const INITIAL_SESSIONS: Record<string, Session[]> = {
  "Dr. Anjali Nair": [
    { id: "1", day: "Mon", start: "09:00", end: "12:00", type: "OPD", location: "OPD Room 4" },
    { id: "2", day: "Wed", start: "15:00", end: "17:00", type: "Ward Round", location: "Cardiology ICU" },
    { id: "3", day: "Fri", start: "09:00", end: "12:00", type: "OPD", location: "OPD Room 4" },
  ],
}

function defaultSessionsFor(doctor: DoctorDirectoryEntry): Session[] {
  return [
    { id: "d1", day: "Mon", start: "09:00", end: "12:00", type: "OPD", location: `${doctor.department} OPD` },
    { id: "d2", day: "Thu", start: "09:00", end: "12:00", type: "OPD", location: `${doctor.department} OPD` },
  ]
}

export function AdminProvidersPage() {
  const { toast } = useToast()
  const [providers, setProviders] = useState<DoctorDirectoryEntry[]>(DOCTORS)
  const [sessionsByDoctor, setSessionsByDoctor] = useState<Record<string, Session[]>>(INITIAL_SESSIONS)
  const [selected, setSelected] = useState<DoctorDirectoryEntry | null>(null)
  const [form, setForm] = useState({ day: "Mon" as Day, start: "", end: "", type: "OPD" as SessionType, location: "" })

  const [addOpen, setAddOpen] = useState(false)
  const [providerForm, setProviderForm] = useState({ name: "", degree: "", department: DEPARTMENTS[0] })

  function handleAddProvider(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const provider: DoctorDirectoryEntry = {
      name: providerForm.name || "Untitled Provider",
      degree: providerForm.degree || "—",
      department: providerForm.department,
    }
    setProviders((prev) => [...prev, provider])
    setAddOpen(false)
    setProviderForm({ name: "", degree: "", department: DEPARTMENTS[0] })
    toast({ title: "Provider added", description: `${provider.name} was added to the registry.` })
  }

  const sessions = useMemo(() => {
    if (!selected) return []
    return sessionsByDoctor[selected.name] ?? defaultSessionsFor(selected)
  }, [selected, sessionsByDoctor])

  function openProvider(doctor: DoctorDirectoryEntry) {
    setSelected(doctor)
    setSessionsByDoctor((prev) => (prev[doctor.name] ? prev : { ...prev, [doctor.name]: defaultSessionsFor(doctor) }))
  }

  function removeSession(id: string) {
    if (!selected) return
    setSessionsByDoctor((prev) => ({ ...prev, [selected.name]: (prev[selected.name] ?? []).filter((s) => s.id !== id) }))
  }

  function handleAddSession(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    const entry: Session = { id: String(Date.now()), day: form.day, start: form.start || "09:00", end: form.end || "12:00", type: form.type, location: form.location || "—" }
    setSessionsByDoctor((prev) => ({ ...prev, [selected.name]: [...(prev[selected.name] ?? []), entry] }))
    setForm({ day: "Mon", start: "", end: "", type: "OPD", location: "" })
    toast({ title: "Session added", description: `${entry.day} ${entry.start}–${entry.end} added for ${selected.name}.` })
  }

  const directoryColumns: MtColumn<DoctorDirectoryEntry>[] = [
    {
      key: "name",
      header: "Provider",
      alwaysVisible: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-brand-50 text-xs font-semibold text-brand-700">{getInitials(r.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-adminreg-text">{r.name}</span>
        </div>
      ),
    },
    { key: "degree", header: "Degree", render: (r) => r.degree },
    { key: "department", header: "Department", render: (r) => r.department },
    {
      key: "sessions",
      header: "Sessions / week",
      render: (r) => (sessionsByDoctor[r.name] ?? defaultSessionsFor(r)).length,
      sortValue: (r) => (sessionsByDoctor[r.name] ?? defaultSessionsFor(r)).length,
    },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => <RowActions actions={[{ icon: Eye, label: "View", onClick: () => openProvider(r) }]} />,
    },
  ]

  if (selected) {
    return (
      <div>
        <AdminPageHeader title="Providers" subtitle="Provider registry, weekly availability and leave exceptions." />

        <button type="button" onClick={() => setSelected(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-adminreg-muted hover:text-adminreg-text">
          <ChevronLeft className="h-4 w-4" />
          Back to directory
        </button>

        <h2 className="text-xl font-bold text-adminreg-text">{selected.name} — weekly availability</h2>
        <p className="mt-1 text-sm text-adminreg-muted">Recurring OPD and ward-round sessions. Overlaps are blocked at save.</p>

        <AdminCard noPadding className="mt-5">
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
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-adminreg-border/70 last:border-0">
                  <td className="px-5 py-3 font-semibold text-adminreg-text">{s.day}</td>
                  <td className="px-5 py-3">{s.start}</td>
                  <td className="px-5 py-3">{s.end}</td>
                  <td className="px-5 py-3">{s.type}</td>
                  <td className="px-5 py-3">{s.location}</td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => removeSession(s.id)} className="text-sm font-medium text-adminreg-red hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-adminreg-muted">No sessions scheduled.</td>
                </tr>
              )}
            </tbody>
          </table>
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
                <Input type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">End Time</Label>
                <Input type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
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
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. OPD Room 4" />
              </div>
            </div>
            <MtButton type="submit">Add session</MtButton>
          </form>
        </AdminCard>
      </div>
    )
  }

  return (
    <div>
      <AdminPageHeader
        title="Providers"
        subtitle="Provider registry, weekly availability and leave exceptions."
        actions={
          <MtButton className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add provider
          </MtButton>
        }
      />
      <AdminCard title="Provider Directory" noPadding>
        <MtDataTable columns={directoryColumns} rows={providers} keyExtractor={(r) => r.name} />
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add provider"
        onSubmit={handleAddProvider}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit">Add provider</MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Full Name</Label>
          <Input value={providerForm.name} onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Kabir Sethi" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Degree</Label>
          <Input value={providerForm.degree} onChange={(e) => setProviderForm((f) => ({ ...f, degree: e.target.value }))} placeholder="e.g. MBBS, MD" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Department</Label>
          <Select value={providerForm.department} onValueChange={(v) => setProviderForm((f) => ({ ...f, department: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>
    </div>
  )
}
