"use client"

import { useState } from "react"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface MultiDatePickerProps {
  value: Date[]
  onChange: (dates: Date[]) => void
  className?: string
  placeholder?: string
  /** Hide selected-date chips below the trigger (keeps row height uniform). */
  compact?: boolean
}

export function MultiDatePicker({
  value,
  onChange,
  className,
  placeholder = "Select dates",
  compact = false,
}: MultiDatePickerProps) {
  const [open, setOpen] = useState(false)
  const sorted = [...value].sort((a, b) => a.getTime() - b.getTime())

  function removeDate(target: Date) {
    onChange(value.filter((d) => d.toDateString() !== target.toDateString()))
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !value.length && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {value.length
                ? `${value.length} date${value.length > 1 ? "s" : ""} selected`
                : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="multiple"
            selected={value}
            onSelect={(dates) => onChange(dates ?? [])}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {sorted.length > 0 && !compact ? (
        <div className="flex max-h-12 flex-wrap gap-1 overflow-y-auto">
          {sorted.map((d) => (
            <span
              key={d.toISOString()}
              className="inline-flex items-center gap-0.5 rounded bg-adminreg-header/60 px-1.5 py-0.5 text-[10px] text-adminreg-text"
            >
              {format(d, "dd MMM")}
              <button
                type="button"
                onClick={() => removeDate(d)}
                className="text-adminreg-muted hover:text-adminreg-red"
                aria-label={`Remove ${format(d, "dd MMM yyyy")}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
