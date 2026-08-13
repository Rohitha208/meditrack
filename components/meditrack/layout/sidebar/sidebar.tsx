"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, LogOut, Menu, Stethoscope, UserRound, Users2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { useRootContext } from "@/context/RootContext"
import { useToast } from "@/hooks/use-toast"
import {
  NAV_GROUPS_BY_CONTEXT,
  NAV_CONTEXT_LABEL,
  getNavContext,
  isMediTrackPathActive,
  type MediTrackNavGroup,
  type MediTrackNavItem,
} from "./constant"

function MediTrackNavLink({ item, isActive, collapsed }: { item: MediTrackNavItem; isActive: boolean; collapsed: boolean }) {
  const content = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-brand-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        collapsed && "justify-center px-2"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (!collapsed) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function MediTrackNavGroups({
  pathname,
  collapsed,
  groups,
}: {
  pathname: string
  collapsed: boolean
  groups: MediTrackNavGroup[]
}) {
  return (
    <nav className="space-y-5 px-3">
      {groups.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              {group.title}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => (
              <MediTrackNavLink
                key={item.href}
                item={item}
                isActive={isMediTrackPathActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function BrandHeader({ collapsed, contextLabel }: { collapsed: boolean; contextLabel: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-6 py-4", collapsed && "justify-center px-2")}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <Stethoscope className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-lg font-bold text-slate-900 dark:text-white">MediTrack</p>
          <p className="truncate text-sm font-medium text-brand-600 dark:text-brand-400">{contextLabel}</p>
        </div>
      )}
    </div>
  )
}

function CurrentModeCard({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const { handleLogout } = useRootContext()

  function onLogout() {
    handleLogout()
    toast({ title: "Logged out", description: "You have been logged out successfully." })
  }

  return (
    <div className="flex-shrink-0 px-3 py-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-brand-100 bg-gradient-to-r from-brand-50 to-brand-50/40 p-3 text-left shadow-sm transition-colors hover:border-brand-200 hover:from-brand-100 dark:border-brand-900/40 dark:from-brand-500/10 dark:to-brand-500/5 dark:hover:border-brand-800",
              collapsed && "justify-center"
            )}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-900/50">
              <Users2 className="h-4 w-4" />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs text-brand-600/80 dark:text-brand-400/80">Current Mode</p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Hospital</p>
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-brand-500/70 dark:text-brand-400/70" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuItem className="gap-2" onSelect={() => router.push("/profile")}>
            <UserRound className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
            onSelect={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function MediTrackSidebar() {
  const pathname = usePathname()
  const { state, openMobile, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed"

  // Which of the three role dashboards (OPD/IPD/Admin) — or the default
  // shell nav — the current route belongs to. Swaps the whole nav set, not
  // just which item is highlighted, so each dashboard gets its own sidebar.
  const context = getNavContext(pathname)
  const navGroups = NAV_GROUPS_BY_CONTEXT[context]
  const contextLabel = NAV_CONTEXT_LABEL[context]

  return (
    <>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="absolute z-50 left-3 top-3 shrink-0 md:hidden bg-brand-600 text-white"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 sm:max-w-none bg-white p-0 text-slate-900 dark:bg-slate-900 dark:text-white">
          <BrandHeader collapsed={false} contextLabel={contextLabel} />
          <div className="border-b border-slate-100 dark:border-slate-800" />
          <div className="h-[calc(100vh-9.5rem)] overflow-y-auto py-2 scrollbar-hide">
            <MediTrackNavGroups pathname={pathname} collapsed={false} groups={navGroups} />
          </div>
          <CurrentModeCard collapsed={false} />
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "hidden md:flex flex-col h-screen flex-shrink-0 bg-white text-slate-900 shadow-xl transition-all duration-200 dark:bg-slate-900 dark:text-white",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <BrandHeader collapsed={collapsed} contextLabel={contextLabel} />
          <div className="border-b border-slate-100 flex-shrink-0 dark:border-slate-800" />

          <div className="flex-grow overflow-hidden">
            <div className="h-full overflow-y-auto py-2 scrollbar-hide">
              <MediTrackNavGroups pathname={pathname} collapsed={collapsed} groups={navGroups} />
            </div>
          </div>

          <CurrentModeCard collapsed={collapsed} />
        </div>
      </aside>
    </>
  )
}
