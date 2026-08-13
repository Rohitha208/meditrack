"use client"

import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder rows shown while a table's data is loading. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className={c === 0 ? "h-9 w-9 rounded-full" : "h-4 flex-1"} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Placeholder for a grid of stat cards while dashboard data is loading. */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-adminreg-border bg-adminreg-card p-4">
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Placeholder card body used while a detail panel or profile section is loading. */
export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-adminreg-border bg-adminreg-card p-5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}
