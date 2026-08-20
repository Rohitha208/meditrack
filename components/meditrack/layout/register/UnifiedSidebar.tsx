"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ModuleSwitcher } from "./ModuleSwitcher"
import { RoleSwitcher } from "./RoleSwitcher"
import { useStaffRole } from "./RoleProvider"
import { canAccessAppointmentBooking, isStageEditable, isStageVisible } from "./rbac"
import { ADMIN_NAV_GROUPS, ADMIN_REGISTER_NAV, isAdminRegisterPathActive } from "@/components/meditrack/admin/register/theme"
import { STAGE_DEFS } from "@/components/meditrack/opd/thread/theme"
import { APPOINTMENT_TABS } from "@/components/meditrack/opd/appointments/theme"

const PATIENT = { name: "Meera Kulkarni", ageSex: "34 / Female", uhid: "UHID-0004821", visitId: "OPD-20260812-0091" }
const HANDOFFS = ["A. Bhatt · 09:14", "A. Bhatt · 09:16", "A. Bhatt · 09:18", "K. Rao · 09:31", "Dr. Nair · 09:52", "M. Pillai · 10:20", "Dr. Nair · 10:24", "S. Verma · 10:41"]

function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="adminreg-scroll-dark flex-1 overflow-y-auto px-3 py-3">
      {ADMIN_NAV_GROUPS.map((group) => {
        const items = ADMIN_REGISTER_NAV.filter((i) => i.group === group)
        return (
          <div key={group} className="mb-4">
            <p className="mb-1.5 px-2.5 font-plexmono text-[9px] uppercase tracking-[0.1em] text-adminreg-sidebar-text-muted">{group}</p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = isAdminRegisterPathActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2 text-[13px] font-medium transition-colors",
                      active ? "bg-adminreg-olive font-bold text-adminreg-card" : "text-adminreg-sidebar-text-secondary hover:bg-white/5 hover:text-adminreg-sidebar-text"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-adminreg-card" : "text-adminreg-sidebar-text-muted")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function OpdNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { role } = useStaffRole()

  const currentStage = pathname.startsWith("/opd/visit-thread") ? Number(searchParams.get("stage") ?? 0) : -1
  const currentTab = pathname.startsWith("/opd/appointments") ? Number(searchParams.get("tab") ?? 0) : -1
  const showBooking = canAccessAppointmentBooking(role)
  const isAdminRole = role === "admin"

  return (
    <nav className="adminreg-scroll-dark flex-1 overflow-y-auto px-3 py-3">
      {showBooking && (
        <div className="mb-4 border-b border-adminreg-sidebar-border pb-3">
          <p className="mb-0.5 px-2.5 font-plexmono text-[9px] uppercase tracking-[0.1em] text-adminreg-sidebar-text-muted">Appointment Booking</p>
          <p className="mb-1.5 px-2.5 text-[10px] italic text-adminreg-sidebar-text-muted">Staff-initiated · no visit yet</p>
          <div className="space-y-0.5">
            {APPOINTMENT_TABS.map((tab, i) => {
              const active = pathname.startsWith("/opd/appointments") && currentTab === i
              return (
                <Link
                  key={tab}
                  href={`/opd/appointments?tab=${i}`}
                  className={cn(
                    "block px-2.5 py-1.5 text-[12.5px] transition-colors",
                    active ? "bg-adminreg-indigo font-bold text-adminreg-card" : "text-adminreg-sidebar-text-secondary hover:bg-white/5 hover:text-adminreg-sidebar-text"
                  )}
                >
                  {tab}
                </Link>
              )
            })}
          </div>
          <p className="mt-2 px-2.5 text-[10px] text-adminreg-sidebar-text-muted">↓ Check-in hands off into Stage 1</p>
        </div>
      )}

      <div className={cn("mb-3 border-b border-l-[3px] border-adminreg-sidebar-border border-l-adminreg-indigo bg-white/[0.03] px-3.5 py-3", isAdminRole && "border-l-adminreg-amber")}>
        <div className="text-sm font-bold text-adminreg-sidebar-text">{PATIENT.name}</div>
        <div className="mt-0.5 text-[11px] text-adminreg-sidebar-text-secondary">{PATIENT.ageSex}</div>
        <div className="mt-1.5 font-plexmono text-[10px] text-adminreg-sidebar-text-muted">UHID {PATIENT.uhid}</div>
        <div className="mt-0.5 font-plexmono text-[10px] text-adminreg-sidebar-text-muted">Visit {PATIENT.visitId}</div>
        {isAdminRole && <p className="mt-1.5 font-plexmono text-[9px] uppercase tracking-wide text-adminreg-amber">Oversight view — read only</p>}
      </div>

      {STAGE_DEFS.map((def, i) => {
        if (!isStageVisible(role, i)) return null
        const active = currentStage === i
        const editable = isStageEditable(role, i)
        return (
          <Link key={def.name} href={`/opd/visit-thread?stage=${i}`} className="flex gap-2.5 px-2 py-2">
            <div className="flex w-4 flex-shrink-0 flex-col items-center">
              <span className={cn("mt-[3px] h-2.5 w-2.5 rounded-full border-[1.5px]", active ? "border-adminreg-indigo bg-adminreg-indigo shadow-[0_0_0_3px_rgba(51,69,110,0.25)]" : "border-adminreg-sidebar-text-muted bg-transparent")} />
              {i < 8 && <div className="mt-0.5 min-h-[20px] w-[1.5px] flex-1 bg-adminreg-sidebar-border" />}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="font-plexmono text-[9px] tracking-[0.04em] text-adminreg-sidebar-text-muted">{def.role}</div>
              <div className={cn("mt-px text-[13px]", active ? "font-extrabold text-adminreg-sidebar-text" : "font-semibold text-adminreg-sidebar-text-secondary")}>{def.name}</div>
              {!editable && <div className="mt-0.5 text-[10px] italic text-adminreg-amber">View only</div>}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent() {
  const pathname = usePathname()
  const isOpd = pathname.startsWith("/opd")

  return (
    <>
      <div className="flex-shrink-0 px-5 py-4">
        <p className="text-[15px] font-extrabold tracking-[0.01em] text-adminreg-sidebar-text">MediTrack</p>
        <p className="mt-0.5 font-plexmono text-[9px] uppercase tracking-[0.08em] text-adminreg-sidebar-text-muted">Unified Application Shell</p>
      </div>

      <ModuleSwitcher />
      {isOpd ? <OpdNav /> : <AdminNav />}
      <RoleSwitcher />
    </>
  )
}

interface UnifiedSidebarProps {
  /** Mobile slide-over open state, lifted to UnifiedShell so its top-bar
   * hamburger button can control it. Desktop `<aside>` below ignores it. */
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

/**
 * The unified left sidebar shared by Admin and OPD — one nav component
 * rendering in one of two modes depending on the active module (grouped
 * directory for Admin, sequential relay-spine + appointment tabs for OPD),
 * per the unified-shell spec. Module switcher pinned top, role switcher
 * pinned bottom.
 *
 * Below `md` the `<aside>` is hidden entirely and this same content renders
 * inside a slide-over `Sheet` instead, opened via UnifiedShell's hamburger
 * button — otherwise every sidebar option (and the module/role switchers)
 * would simply be inaccessible on a phone-width screen.
 */
export function UnifiedSidebar({ mobileOpen, onMobileOpenChange }: UnifiedSidebarProps) {
  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="inset-y-0 left-0 flex h-full w-[272px] max-w-[85vw] flex-col gap-0 rounded-none border-none bg-adminreg-sidebar p-0 font-archivo text-adminreg-sidebar-text sm:max-w-none md:hidden"
          // Every nav item is a real <a>; clicking one should close the
          // slide-over the same way it would collapse on desktop navigation.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) onMobileOpenChange(false)
          }}
        >
          <SheetTitle className="sr-only">MediTrack navigation</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <aside className="hidden h-screen w-[272px] flex-shrink-0 flex-col bg-adminreg-sidebar font-archivo md:flex">
        <SidebarContent />
      </aside>
    </>
  )
}
