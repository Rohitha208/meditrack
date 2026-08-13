import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  BedDouble,
  UserRound,
  HeartHandshake,
  FlaskConical,
  Radio,
  Pill,
  Receipt,
  ShieldCheck,
  Package,
  BarChart3,
  UsersRound,
  KeyRound,
  Database,
  Settings,
  ScrollText,
  ClipboardList,
  Building2,
  type LucideIcon,
} from "lucide-react"

export type MediTrackNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export type MediTrackNavGroup = {
  title: string
  items: MediTrackNavItem[]
}

/** Default nav — shown on pages that aren't inside the Admin Register
 * (e.g. /dashboard, /profile). OPD and IPD no longer have their own
 * directory-nav pages: OPD is now the visit-thread experience (its own
 * relay-spine sidebar, see components/meditrack/opd/thread), and IPD has
 * no module yet. */
export const meditrackNavGroups: MediTrackNavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Clinical",
    items: [
      { href: "/patients", label: "Patients", icon: Users },
      { href: "/appointments", label: "Appointments", icon: Calendar },
      { href: "/opd", label: "OPD", icon: Stethoscope },
      { href: "/ipd", label: "IPD", icon: BedDouble },
      { href: "/doctors", label: "Doctors", icon: UserRound },
      { href: "/nursing", label: "Nursing", icon: HeartHandshake },
      { href: "/lab", label: "Lab", icon: FlaskConical },
      { href: "/radiology", label: "Radiology", icon: Radio },
      { href: "/pharmacy", label: "Pharmacy", icon: Pill },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/insurance", label: "Insurance / TPA", icon: ShieldCheck },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: UsersRound },
      { href: "/admin/roles", label: "Roles", icon: KeyRound },
      { href: "/admin/masters", label: "Masters", icon: Database },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
]

/** Admin dashboard's own nav — full hospital operations + management, per spec. */
export const adminNavGroups: MediTrackNavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Clinical",
    items: [
      { href: "/patients", label: "Patients", icon: Users },
      { href: "/appointments", label: "Appointments", icon: Calendar },
      { href: "/opd", label: "OPD", icon: Stethoscope },
      { href: "/ipd", label: "IPD", icon: BedDouble },
      { href: "/doctors", label: "Doctors", icon: UserRound },
      { href: "/nursing", label: "Nursing", icon: HeartHandshake },
      { href: "/lab", label: "Lab", icon: FlaskConical },
      { href: "/radiology", label: "Radiology", icon: Radio },
      { href: "/pharmacy", label: "Pharmacy", icon: Pill },
    ],
  },
  {
    title: "Finance & Operations",
    items: [
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/insurance", label: "Insurance / TPA", icon: ShieldCheck },
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: UsersRound },
      { href: "/admin/roles", label: "Roles & Permissions", icon: KeyRound },
      { href: "/admin/departments", label: "Departments", icon: Building2 },
      { href: "/admin/services", label: "Services", icon: ClipboardList },
      { href: "/admin/masters", label: "Masters", icon: Database },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
]

export type MediTrackNavContext = "default" | "admin"

/** Which nav set the current route belongs to. */
export function getNavContext(pathname: string): MediTrackNavContext {
  if (pathname.startsWith("/admin")) return "admin"
  return "default"
}

export const NAV_GROUPS_BY_CONTEXT: Record<MediTrackNavContext, MediTrackNavGroup[]> = {
  default: meditrackNavGroups,
  admin: adminNavGroups,
}

/** Sidebar brand subtitle per context, so "MediTrack" reads as "MediTrack ·
 * Admin" while inside the admin dashboard. */
export const NAV_CONTEXT_LABEL: Record<MediTrackNavContext, string> = {
  default: "Hospital",
  admin: "Admin",
}

// Mirrors PawTrack's sidebar active-path matching: exact match or nested route.
export function isMediTrackPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href !== "/" && pathname.startsWith(`${href}/`)) return true
  return false
}
