"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import withAuth from "@/utils/privateRouter"
import { MediTrackSidebar } from "./sidebar/sidebar"
import { MediTrackHeader } from "./header"
import { RegisterShell } from "@/components/meditrack/layout/register/RegisterShell"

function MediTrackLayoutBase({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // The OPD "visit thread" renders its own complete shell (its sidebar is a
  // sequential relay spine, not the Admin Register's directory nav).
  if (pathname.startsWith("/opd/visit-thread")) {
    return <>{children}</>
  }

  // Admin uses the dark/olive "Register" shell instead of MediTrack's older
  // light sidebar + top header. IPD has no module yet; any other MediTrack
  // route keeps the original light shell below.
  if (pathname.startsWith("/admin")) {
    return <RegisterShell>{children}</RegisterShell>
  }

  return (
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
  )
}

/** The MediTrack shell — fixed sidebar + top header + scrollable main
 * content — wrapped around every screen for a human/hospital tenant, with
 * the same `withAuth` guard PawTrack's own MainLayout uses. Mounted
 * conditionally in app/(pages)/layout.tsx, next to PawTrack's own
 * MainLayout, so it never touches PawTrack's rendered output. */
export const MediTrackLayout = withAuth(MediTrackLayoutBase)
