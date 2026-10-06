"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import withAuth from "@/utils/privateRouter"
import { MediTrackSidebar } from "./sidebar/sidebar"
import { MediTrackHeader } from "./header"
import { UnifiedShell } from "@/components/meditrack/layout/register/UnifiedShell"
import { RoleProvider } from "@/components/meditrack/layout/register/RoleProvider"

function MediTrackLayoutBase({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isUnified = pathname.startsWith("/admin") || pathname.startsWith("/opd") || pathname.startsWith("/ipd") || pathname.startsWith("/ed")

  // RoleProvider wraps both branches so the "preview as role" selection
  // survives client-side navigation between Admin/OPD/IPD (it lives above
  // the branch, not inside any one shell).
  return (
    <RoleProvider>
      {isUnified ? (
        <UnifiedShell>{children}</UnifiedShell>
      ) : (
        <TooltipProvider delayDuration={100}>
          <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
              <MediTrackSidebar />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <MediTrackHeader />
                <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
              </div>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      )}
    </RoleProvider>
  )
}

/** The MediTrack shell — fixed sidebar + top header + scrollable main
 * content — wrapped around every screen for a human/hospital tenant, with
 * the same `withAuth` guard PawTrack's own MainLayout uses. Mounted
 * conditionally in app/(pages)/layout.tsx, next to PawTrack's own
 * MainLayout, so it never touches PawTrack's rendered output. Admin, OPD and
 * IPD share one unified shell (module switcher + role-aware nav); every
 * other MediTrack route keeps the original light shell. */
export const MediTrackLayout = withAuth(MediTrackLayoutBase)
