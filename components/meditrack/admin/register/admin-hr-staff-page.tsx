"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { MtDataTable, StatusBadge, TableSkeleton, type MtColumn } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetMediTrackUsers } from "@/queries/meditrack/users"
import {
  addDaysIso,
  getWeekStartIso,
  isShiftType,
  nextShift,
  useGetDutyRoster,
  useUpsertDutyRoster,
  type ShiftType,
} from "@/queries/meditrack/duty-roster"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const
type Day = (typeof DAYS)[number]

const SHIFT_CLASS: Record<ShiftType, string> = {
  M: "text-adminreg-text",
  E: "text-adminreg-amber font-semibold",
  N: "text-adminreg-red font-semibold",
  OFF: "text-adminreg-muted",
}

function displayName(firstName?: string, lastName?: string, email?: string) {
  const name = `${firstName || ""} ${lastName || ""}`.trim()
  return name || email || "Unknown user"
}

function dateForDay(weekStart: string, day: Day): string {
  return addDaysIso(weekStart, DAYS.indexOf(day))
}

export function AdminHrStaffPage() {
  const { toast } = useToast()
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const clinicId = clinic?.id || ""

  const [tab, setTab] = useState<"personnel" | "roster">("roster")
  const weekStart = useMemo(() => getWeekStartIso(), [])

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
      clinicIds: clinicId ? [clinicId] : undefined,
    },
    !!companyId
  )

  const users = usersData?.items ?? []

  const {
    data: rosterEntries = [],
    isLoading: isLoadingRoster,
    isError: isRosterError,
    error: rosterError,
  } = useGetDutyRoster(
    clinicId ? { clinicId, weekStart, companyId: companyId || undefined } : null,
    tab === "roster" && !!clinicId
  )

  const upsertShift = useUpsertDutyRoster()
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const shiftByUserAndDate = useMemo(() => {
    const map = new Map<string, ShiftType>()
    rosterEntries.forEach((entry) => {
      const date = String(entry.shiftDate).slice(0, 10)
      const type = isShiftType(entry.shiftType) ? entry.shiftType : "OFF"
      map.set(`${entry.userId}:${date}`, type)
    })
    return map
  }, [rosterEntries])

  async function cycleShift(userId: string, day: Day) {
    if (!clinicId) {
      toast({ title: "Clinic required", description: "Select a clinic to edit the duty roster.", variant: "destructive" })
      return
    }
    const shiftDate = dateForDay(weekStart, day)
    const key = `${userId}:${shiftDate}`
    const current = shiftByUserAndDate.get(key) || "OFF"
    const next = nextShift(current)
    setPendingKey(key)
    try {
      await upsertShift.mutateAsync({
        userId,
        clinicId,
        shiftDate,
        shiftType: next,
      })
    } catch (err) {
      toast({
        title: "Could not update shift",
        description: getToastErrorMessage(err, "Failed to save shift"),
        variant: "destructive",
      })
    } finally {
      setPendingKey(null)
    }
  }

  const personnelColumns: MtColumn<(typeof users)[number]>[] = [
    {
      key: "name",
      header: "Staff",
      alwaysVisible: true,
      render: (r) => (
        <span className="font-medium text-adminreg-text">
          {displayName(r.firstName, r.lastName, r.email)}
        </span>
      ),
      sortValue: (r) => displayName(r.firstName, r.lastName, r.email),
    },
    { key: "role", header: "Role", render: (r) => r.roleName || r.role || "—", sortValue: (r) => r.roleName || r.role || "" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge status={r.isActive ? "Active" : "Inactive"} tone={r.isActive ? "success" : "warning"} />
      ),
    },
  ]

  return (
    <div>
      <AdminPageHeader title="HR & Staff" subtitle="Staff directory, leave and the weekly duty roster." />

      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("personnel")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "personnel"
              ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700"
              : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Personnel
        </button>
        <button
          type="button"
          onClick={() => setTab("roster")}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            tab === "roster"
              ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700"
              : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
          )}
        >
          Duty roster
        </button>
      </div>

      {tab === "personnel" ? (
        <AdminCard title="Personnel" noPadding>
          {isLoadingUsers ? (
            <TableSkeleton rows={6} columns={3} />
          ) : isUsersError ? (
            <p className="px-5 py-8 text-sm text-adminreg-red">
              {getToastErrorMessage(usersError, "Failed to load staff")}
            </p>
          ) : (
            <MtDataTable
              columns={personnelColumns}
              rows={users}
              keyExtractor={(r) => r.id}
              emptyTitle="No staff found"
              emptyDescription="Users for this hospital will appear here."
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard title="Weekly Duty Roster">
          <p className="mb-4 text-xs text-adminreg-muted">
            Click a cell to assign or change a shift directly on the grid. Week of {weekStart}.
          </p>
          {!clinicId ? (
            <p className="text-sm text-adminreg-red">Select a clinic to load the duty roster.</p>
          ) : isLoadingUsers || isLoadingRoster ? (
            <TableSkeleton rows={6} columns={6} />
          ) : isRosterError ? (
            <p className="text-sm text-adminreg-red">
              {getToastErrorMessage(rosterError, "Failed to load duty roster")}
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm text-adminreg-muted">No staff found for this clinic.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-adminreg-border text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
                    <th className="py-2.5 pr-4">Staff</th>
                    {DAYS.map((d) => (
                      <th key={d} className="px-4 py-2.5 text-center">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((staff) => {
                    const name = displayName(staff.firstName, staff.lastName, staff.email)
                    return (
                      <tr key={staff.id} className="border-b border-adminreg-border/70 last:border-0">
                        <td className="py-3 pr-4 font-semibold text-adminreg-text">{name}</td>
                        {DAYS.map((day) => {
                          const shiftDate = dateForDay(weekStart, day)
                          const key = `${staff.id}:${shiftDate}`
                          const shift = shiftByUserAndDate.get(key) || "OFF"
                          const busy = pendingKey === key && upsertShift.isPending
                          return (
                            <td key={day} className="px-4 py-3 text-center">
                              <button
                                type="button"
                                disabled={upsertShift.isPending}
                                onClick={() => cycleShift(staff.id, day)}
                                className={cn(
                                  "w-full rounded-md py-1 text-sm transition-colors hover:bg-adminreg-border/30 disabled:opacity-60",
                                  SHIFT_CLASS[shift]
                                )}
                              >
                                {busy ? "…" : shift}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}
    </div>
  )
}
