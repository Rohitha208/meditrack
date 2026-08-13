"use client"

import type { ReactNode } from "react"
import { RegisterSidebar } from "./RegisterSidebar"

/** Full-bleed shell for /admin/* — dark sidebar + warm cream content area.
 * Bypasses MediTrack's older light sidebar + top header (see
 * meditrack-layout.tsx) entirely. Content max-width/padding follow the
 * Arogya HMS spec (1400px / 32px). OPD's visit-thread renders its own
 * shell instead (see components/meditrack/opd/thread); IPD has no module yet. */
export function RegisterShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-adminreg-bg text-adminreg-text">
      <RegisterSidebar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
