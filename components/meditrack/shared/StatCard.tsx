"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { statTints } from "./theme"

export interface StatCardData {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean | null
  /** Index into the shared tint rotation. Defaults to cycling automatically via StatGrid. */
  tintIndex?: number
  /** Explicit icon-chip classes (background + text), overriding the tint rotation for this card. */
  tintClassName?: string
}

interface StatCardProps extends StatCardData {}

export function StatCard({ label, value, icon: Icon, trend, trendUp, tintIndex = 0, tintClassName }: StatCardProps) {
  const tint = tintClassName ?? statTints[tintIndex % statTints.length]

  return (
    <div className="flex gap-3 rounded-xl border border-adminreg-border bg-adminreg-card p-4 shadow-sm">
      <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full", tint)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-adminreg-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-adminreg-text">{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trendUp === true
                ? "text-emerald-600"
                : trendUp === false
                  ? "text-rose-600"
                  : "text-adminreg-muted"
            )}
          >
            {trendUp === true ? "↑ " : trendUp === false ? "↓ " : "— "}
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}

// Tailwind's scanner needs full literal class names in source — these must stay
// statically written (not interpolated) even though we pick one at runtime.
const GRID_COLS_BY_COUNT: Record<number, string> = {
  1: "sm:grid-cols-1 xl:grid-cols-1",
  2: "sm:grid-cols-2 xl:grid-cols-2",
  3: "sm:grid-cols-3 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-3 xl:grid-cols-6",
  7: "sm:grid-cols-4 xl:grid-cols-7",
  8: "sm:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8",
}

/** Responsive grid that lays out a set of StatCards with the shared tint rotation applied. */
export function StatGrid({ stats, className }: { stats: StatCardData[]; className?: string }) {
  const gridCols = GRID_COLS_BY_COUNT[Math.min(stats.length, 8)] ?? GRID_COLS_BY_COUNT[4]

  return (
    <div className={cn("grid grid-cols-2 gap-4", gridCols, className)}>
      {stats.map((stat, index) => (
        <StatCard key={stat.label} {...stat} tintIndex={stat.tintIndex ?? index} />
      ))}
    </div>
  )
}
