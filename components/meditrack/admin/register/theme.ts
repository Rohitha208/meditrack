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

export interface AdminRegisterNavChild {
  label: string
  href: string
}

export interface AdminRegisterNavItem {
  code: string
  label: string
  href: string
  icon: LucideIcon
  group: string
  /** Indented sub-links rendered under this item — used for a register that
   * splits into a few distinct screens (e.g. Tariffs & Packages → Tariff
   * Master / PMJAY Packages / TPA Rate Cards) without earning each one its
   * own top-level sidebar entry. Always rendered (no collapse/expand
   * state) since only one nav item currently has any. */
  children?: AdminRegisterNavChild[]
}

export const ADMIN_NAV_GROUPS = ["Insights", "Clinical Configuration", "Operations", "People & Access", "System"] as const

export const SUPER_ADMIN_NAV_GROUP = "Platform" as const

/** Sidebar entries when logged in as Super Admin — companies + hospital admins only. */
export const SUPER_ADMIN_REGISTER_NAV: AdminRegisterNavItem[] = [
  { code: "SA01", label: "Companies", href: "/admin/companies", icon: Building2, group: SUPER_ADMIN_NAV_GROUP },
  { code: "SA02", label: "Admins", href: "/admin/admins", icon: UsersRound, group: SUPER_ADMIN_NAV_GROUP },
]

export const SUPER_ADMIN_PATHS = SUPER_ADMIN_REGISTER_NAV.map((item) => item.href)

export const ADMIN_REGISTER_NAV: AdminRegisterNavItem[] = [
  { code: "00", label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, group: "Insights" },
  { code: "10", label: "Audit Log", href: "/admin/audit-logs", icon: ScrollText, group: "Insights" },
  { code: "01", label: "Hospital Profile", href: "/admin/hospital-profile", icon: Building2, group: "Clinical Configuration" },
  { code: "02", label: "Departments", href: "/admin/departments", icon: Boxes, group: "Clinical Configuration" },
  { code: "03", label: "Doctors", href: "/admin/providers", icon: UserRound, group: "Clinical Configuration" },
  { code: "04", label: "Master Data", href: "/admin/masters", icon: Database, group: "Clinical Configuration" },
  { code: "05", label: "Wards & Beds", href: "/admin/wards-beds", icon: BedDouble, group: "Operations" },
  {
    code: "06",
    label: "Tariffs & Packages",
    href: "/admin/tariffs",
    icon: Receipt,
    group: "Operations",
    children: [
      { label: "Services", href: "/admin/tariffs" },
      { label: "Packages", href: "/admin/tariffs/pmjay-packages" },
      { label: "TPA Rate Cards", href: "/admin/tariffs/tpa-rate-cards" },
    ],
  },
  { code: "07", label: "Users & Roles", href: "/admin/users", icon: UsersRound, group: "People & Access" },
  { code: "08", label: "HR & Staff", href: "/admin/hr-staff", icon: IdCard, group: "People & Access" },
  { code: "09", label: "System Config", href: "/admin/settings", icon: Settings, group: "System" },
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
