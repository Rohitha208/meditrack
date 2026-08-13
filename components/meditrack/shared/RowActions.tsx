"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MtButton } from "./MtButton"

export interface RowAction {
  icon: LucideIcon
  label: string
  onClick: () => void
  /** Destructive actions (Delete/Cancel/...) get rose styling, taking priority over the label-based color below. */
  destructive?: boolean
  /** Overrides the hover tooltip text. Defaults to a label-based lookup (see TOOLTIP_TEXT below). */
  tooltip?: string
}

interface RowActionsProps {
  actions: RowAction[]
}

/** Per-action-type icon colors, keyed by the action's (lowercased) label, so
 * View/Edit/Reschedule/... read as visually distinct at a glance instead of
 * all sharing one flat brand color. Destructive actions always win over this map. */
const LABEL_TONE_CLASSES: Record<string, string> = {
  view: "text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10",
  edit: "text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10",
  reschedule:
    "text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/10",
  print: "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10",
}

/** Default hover-tooltip copy per (lowercased) action label. Unmapped labels
 * just fall back to showing the label itself, so nothing is ever left blank. */
const TOOLTIP_TEXT: Record<string, string> = {
  view: "View Details",
  edit: "Edit Record",
  delete: "Delete Record",
  remove: "Remove Record",
  reschedule: "Reschedule Appointment",
  discharge: "Discharge Patient",
  cancel: "Cancel Record",
  print: "Print",
}

/**
 * Row of small ghost icon buttons for a table's "Action" column (View / Edit
 * / Delete / ...), shared so every MediTrack table's row actions look and
 * behave identically. Each button stops click propagation so tapping an
 * action never also fires the row's own `onRowClick`. Hover shows a custom
 * tooltip (no native browser `title` tooltip).
 */
export function RowActions({ actions }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {actions.map((action) => {
        const tooltipText = action.tooltip ?? TOOLTIP_TEXT[action.label.toLowerCase()] ?? action.label

        return (
          <Tooltip key={action.label}>
            <TooltipTrigger asChild>
              <MtButton
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  action.destructive
                    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    : LABEL_TONE_CLASSES[action.label.toLowerCase()]
                )}
                aria-label={tooltipText}
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick()
                }}
              >
                <action.icon className="h-4 w-4" />
              </MtButton>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="rounded-md border-0 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700"
            >
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
