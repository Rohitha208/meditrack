"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { UnifiedSidebar } from "./UnifiedSidebar"
import { GlobalSearch } from "./GlobalSearch"
import { formatDate } from "@/components/meditrack/shared"
import { SUPER_ADMIN_PATHS } from "@/components/meditrack/admin/register/theme"
import { useRootContext } from "@/context/RootContext"

/** Full-bleed unified shell for /admin/* and /opd/* — one sidebar (module
 * switcher + role-aware nav + role switcher), a top bar with global search
 * + date, then the routed page content. Replaces the earlier separate
 * Admin-only RegisterShell and OPD's own self-contained shell.
 *
 * Admin screens have no padding of their own (they expect the shell to
 * provide it, same as the old RegisterShell did); OPD screens deliberately
 * manage their own padding — their header band is meant to run full-bleed
 * edge to edge — so the shell must not add a second layer of padding there. */
export function UnifiedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { userType } = useRootContext()
  const isAdmin = pathname.startsWith("/admin")
  const isSuperAdmin = !!userType?.isSuperAdmin

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // Belt-and-braces: also close on route change (covers back/forward nav,
  // deep links, and anything that navigates without the sidebar's own
  // click-to-close handler seeing it).
  useEffect(() => setMobileNavOpen(false), [pathname])

  useEffect(() => {
    if (!isSuperAdmin) return
    if (pathname.startsWith("/opd")) {
      router.replace("/admin/companies")
      return
    }
    if (!pathname.startsWith("/admin")) return
    const allowed = SUPER_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    if (!allowed) router.replace("/admin/companies")
  }, [isSuperAdmin, pathname, router])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-adminreg-bg font-archivo text-adminreg-text">
      <UnifiedSidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-adminreg-border bg-adminreg-card px-3 py-3 sm:gap-4 sm:px-4 md:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-adminreg-border text-adminreg-text hover:bg-adminreg-header md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <span className="hidden whitespace-nowrap font-plexmono text-xs uppercase text-adminreg-muted sm:block">{formatDate(new Date())}</span>
        </div>
        <main className="adminreg-scroll min-h-0 flex-1 overflow-y-auto">
          {isAdmin ? <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">{children}</div> : children}
        </main>
      </div>
    </div>
  )
}
