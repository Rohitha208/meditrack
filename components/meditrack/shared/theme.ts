/**
 * MediTrack design tokens.
 *
 * Single source of truth for the brand olive-green (#5B6B3F, see `brand` in
 * tailwind.config.ts) — the one consistent accent shared by OPD, IPD, and
 * Admin (the Administration Register's dark/olive/cream look). Prefer
 * importing these instead of hand-writing color classes in page code.
 */

/** Semantic "state" a badge/indicator can represent, mapped to accessible color pairs. */
export type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral"

export const toneClasses: Record<Tone, { soft: string; text: string; dot: string; solid: string }> = {
  primary: {
    soft: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
    text: "text-brand-600 dark:text-brand-400",
    dot: "bg-brand-500",
    solid: "bg-brand-600 text-white hover:bg-brand-700",
  },
  secondary: {
    soft: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-500",
    solid: "bg-slate-600 text-white hover:bg-slate-700",
  },
  success: {
    soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    solid: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  warning: {
    soft: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    solid: "bg-amber-600 text-white hover:bg-amber-700",
  },
  danger: {
    soft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    solid: "bg-rose-600 text-white hover:bg-rose-700",
  },
  info: {
    soft: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    text: "text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
    solid: "bg-indigo-600 text-white hover:bg-indigo-700",
  },
  neutral: {
    soft: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
    text: "text-stone-500 dark:text-stone-400",
    dot: "bg-stone-400",
    solid: "bg-stone-600 text-white hover:bg-stone-700",
  },
}

/** Rotating stat-card icon-chip tints (olive primary, then supporting colors). */
export const statTints = [
  "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
] as const

/** Hex equivalents of the palette above, for chart libraries that need raw color values. */
export const chartColors = {
  primary: "#5B6B3F", // brand-600 (olive)
  secondary: "#64748B", // slate-500
  tertiary: "#6366F1", // indigo-500
  warning: "#F59E0B", // amber-500
  danger: "#B0402F", // adminreg.red
  success: "#10B981", // emerald-500
  neutral: "#D6D3D1", // stone-300
}

/** Maps common status strings (across modules) to a Tone, so pages don't redefine this per-page. */
const STATUS_TONE_MAP: Record<string, Tone> = {
  active: "success",
  admitted: "secondary",
  approved: "success",
  available: "success",
  blocked: "danger",
  cancelled: "danger",
  "checked-in": "secondary",
  cleaning: "warning",
  completed: "success",
  confirmed: "secondary",
  consulting: "info",
  critical: "danger",
  delivered: "success",
  discharged: "neutral",
  expired: "danger",
  expiring: "warning",
  "in progress": "info",
  "in-progress": "info",
  low: "warning",
  "low stock": "warning",
  maintenance: "neutral",
  "no-show": "danger",
  occupied: "info",
  ordered: "secondary",
  overdue: "danger",
  paid: "success",
  pending: "warning",
  processing: "info",
  read: "neutral",
  rejected: "danger",
  rescheduled: "warning",
  reserved: "warning",
  resolved: "success",
  "sample collected": "info",
  scheduled: "secondary",
  stable: "success",
  submitted: "secondary",
  unpaid: "danger",
  unread: "primary",
  upcoming: "primary",
  urgent: "danger",
  waiting: "warning",
}

export function statusTone(status: string): Tone {
  return STATUS_TONE_MAP[status.trim().toLowerCase()] ?? "neutral"
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date, pattern: "short" | "long" = "short"): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: pattern === "long" ? "long" : undefined,
  })
}
