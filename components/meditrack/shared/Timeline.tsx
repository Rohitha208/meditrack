"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toneClasses, type Tone } from "./theme"

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  timestamp: string
  icon?: LucideIcon
  tone?: Tone
}

/** Vertical event timeline — used for Patient history, IPD treatment log, and Insurance claim status trails. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-6 border-l border-adminreg-border pl-6">
      {events.map((event) => {
        const tone = toneClasses[event.tone ?? "neutral"]
        const Icon = event.icon

        return (
          <li key={event.id} className="relative">
            <span
              className={cn(
                "absolute -left-[1.95rem] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-adminreg-card",
                tone.soft
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className={cn("h-2 w-2 rounded-full", tone.dot)} />}
            </span>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-sm font-semibold text-adminreg-text">{event.title}</p>
              <p className="text-xs text-adminreg-muted">{event.timestamp}</p>
            </div>
            {event.description && <p className="mt-0.5 text-xs text-adminreg-muted">{event.description}</p>}
          </li>
        )
      })}
    </ol>
  )
}
