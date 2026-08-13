import {
  BedDouble,
  Boxes,
  Building2,
  Database,
  IdCard,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

/**
 * Nav + design tokens for MediTrack's "Administration Register" — a
 * deliberately distinct dark/olive/cream sub-theme used only inside
 * /admin/* routes (see tailwind.config.ts `adminreg` colors). Everything
 * else in MediTrack (OPD, IPD, login, generic pages) keeps the teal `brand`
 * theme untouched.
 */

export interface AdminRegisterNavItem {
  code: string
  label: string
  href: string
  icon: LucideIcon
}

export const ADMIN_REGISTER_NAV: AdminRegisterNavItem[] = [
  { code: "00", label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { code: "01", label: "Hospital Profile", href: "/admin/hospital-profile", icon: Building2 },
  { code: "02", label: "Departments", href: "/admin/departments", icon: Boxes },
  { code: "03", label: "Providers", href: "/admin/providers", icon: UserRound },
  { code: "04", label: "Master Data", href: "/admin/masters", icon: Database },
  { code: "05", label: "Wards & Beds", href: "/admin/wards-beds", icon: BedDouble },
  { code: "06", label: "Tariffs & Packages", href: "/admin/tariffs", icon: Receipt },
  { code: "07", label: "Users & Roles", href: "/admin/users", icon: UsersRound },
  { code: "08", label: "HR & Staff", href: "/admin/hr-staff", icon: IdCard },
  { code: "09", label: "System Config", href: "/admin/settings", icon: Settings },
  { code: "10", label: "Audit Log", href: "/admin/audit-logs", icon: ScrollText },
]

export function isAdminRegisterPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href !== "/" && pathname.startsWith(`${href}/`)) return true
  return false
}

/** Row-value emphasis used across register tables/lists — "positive"
 * numbers stay plain, warnings go amber, and critical counts go red. */
export type RegisterValueTone = "default" | "amber" | "red"

export const REGISTER_VALUE_CLASS: Record<RegisterValueTone, string> = {
  default: "text-adminreg-text",
  amber: "text-adminreg-amber",
  red: "text-adminreg-red",
}

/** Ward/bed status → border + soft-fill classes for the bed grid. */
export type BedStatus = "Occupied" | "Vacant" | "Cleaning" | "Out of service"

export const BED_STATUS_CLASS: Record<BedStatus, { border: string; bg: string; text: string; dot: string }> = {
  Occupied: { border: "border-adminreg-border", bg: "bg-adminreg-card", text: "text-adminreg-text", dot: "border border-adminreg-muted" },
  Vacant: { border: "border-adminreg-olive", bg: "bg-adminreg-olive-soft/60", text: "text-adminreg-olive-700", dot: "bg-adminreg-olive" },
  Cleaning: { border: "border-adminreg-amber", bg: "bg-adminreg-amber/10", text: "text-adminreg-amber", dot: "bg-adminreg-amber" },
  "Out of service": { border: "border-adminreg-red", bg: "bg-adminreg-red/10", text: "text-adminreg-red", dot: "bg-adminreg-red" },
}
