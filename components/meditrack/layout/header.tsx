"use client"

import { Bell, PanelLeft, Search } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/components/ui/sidebar"
import { useRootContext } from "@/context/RootContext"
import { getInitials, formatDate } from "@/components/meditrack/shared"

// Hospital identity shown in the header — MediTrack has no multi-branch
// backend yet, so this is fixed mock data rather than a live lookup.
const HOSPITAL_NAME = "Apollo Multi-Speciality Hospital"
const BRANCH_NAME = "Andheri Branch"

/** Top bar shared by every MediTrack screen — sidebar collapse toggle,
 * hospital/branch + today's date, a global search field, notification bell,
 * and the signed-in user's avatar. */
export function MediTrackHeader() {
  const { toggleSidebar } = useSidebar()
  const { user } = useRootContext()
  const displayName = user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Hospital Admin"

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:flex"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="hidden min-w-0 flex-shrink-0 items-center gap-3 border-r border-slate-200 pr-4 dark:border-slate-800 lg:flex">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{HOSPITAL_NAME}</p>
            <p className="truncate text-xs text-slate-400">
              {BRANCH_NAME} · {formatDate(new Date())}
            </p>
          </div>
        </div>
        <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search patients, doctors, UHID..." className="h-9 pl-9 focus-visible:ring-brand-500" />
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-brand-600 text-xs font-semibold text-white">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="hidden leading-tight sm:block">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-400">Hospital Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
