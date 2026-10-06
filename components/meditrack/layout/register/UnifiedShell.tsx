"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu } from "lucide-react"
import { UnifiedSidebar } from "./UnifiedSidebar"
import { formatDate } from "@/components/meditrack/shared"
import { BranchSelect, useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"
import { SUPER_ADMIN_PATHS } from "@/components/meditrack/admin/register/theme"
import { useRootContext } from "@/context/RootContext"
import { useToast } from "@/hooks/use-toast"
import { useStaffRole } from "./RoleProvider"
import { canAccessAdmin, roleHomePath } from "./rbac"

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
  const { userType, handleLogout } = useRootContext()
  const branch = useBranchScope(!userType?.isSuperAdmin)
  const { role } = useStaffRole()
  const { toast } = useToast()
  const isAdmin = pathname.startsWith("/admin")
  const isSuperAdmin = !!userType?.isSuperAdmin

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // Belt-and-braces: also close on route change (covers back/forward nav,
  // deep links, and anything that navigates without the sidebar's own
  // click-to-close handler seeing it).
  useEffect(() => setMobileNavOpen(false), [pathname])

  function onLogout() {
    handleLogout()
    toast({ title: "Logged out", description: "You have been logged out successfully." })
  }

  useEffect(() => {
    if (isSuperAdmin) {
      if (pathname.startsWith("/opd") || pathname.startsWith("/ed") || pathname.startsWith("/ipd")) {
        router.replace("/admin/companies")
        return
      }
      if (!pathname.startsWith("/admin")) return
      const allowed = SUPER_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
      if (!allowed) router.replace("/admin/companies")
      return
    }
    if (pathname.startsWith("/admin") && !canAccessAdmin(role)) {
      router.replace(roleHomePath(role))
    }
  }, [isSuperAdmin, pathname, role, router])

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
            {!isSuperAdmin && (
              <BranchSelect
                value={branch.branchId}
                onValueChange={branch.setBranchId}
                branches={branch.branches}
                isLoading={branch.isLoadingBranches}
              />
            )}
          </div>
          <span className="hidden whitespace-nowrap font-plexmono text-xs uppercase text-adminreg-muted sm:block">{formatDate(new Date())}</span>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-adminreg-border text-adminreg-muted transition-colors hover:border-adminreg-red hover:bg-adminreg-red-soft hover:text-adminreg-red-text"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {branch.needsBranchChoice && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-choice-title"
          >
            <div className="w-full max-w-md border border-adminreg-border bg-adminreg-card p-6">
              <p className="font-plexmono text-[10px] uppercase tracking-[0.06em] text-adminreg-muted">Signed in</p>
              <h2 id="branch-choice-title" className="mt-1 text-lg font-extrabold text-adminreg-text">Which branch are you working in?</h2>
              <p className="mt-1.5 text-sm text-adminreg-muted">This stays selected on every screen. You can change it from the branch control at the top.</p>
              <div className="mt-4 space-y-2">
                {branch.branches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => branch.setBranchId(item.id)}
                    className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2.5 text-left text-sm font-semibold text-adminreg-text hover:border-adminreg-olive hover:bg-adminreg-header"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <main className="adminreg-scroll min-h-0 flex-1 overflow-y-auto">
          {branch.needsBranchChoice ? null : isAdmin ? <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">{children}</div> : children}
        </main>
      </div>
    </div>
  )
}
