"use client"

import { useRef } from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { normalizeTimeInput } from "@/queries/meditrack/provider-availability/types"

interface TimeInputFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  required?: boolean
  className?: string
  "aria-label"?: string
}

export function TimeInputField({
  value,
  onChange,
  placeholder = "09:00",
  id,
  required,
  className,
  "aria-label": ariaLabel,
}: TimeInputFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const pickerValue = normalizeTimeInput(value) || ""

  function handleTextChange(raw: string) {
    onChange(raw.replace(/[^\d:.]/g, "").slice(0, 5))
  }

  function handleBlur() {
    if (!value.trim()) return
    const normalized = normalizeTimeInput(value)
    if (normalized) onChange(normalized)
  }

  function openPicker() {
    const el = pickerRef.current
    if (!el) return
    try {
      el.showPicker?.()
    } catch {
      el.focus()
      el.click()
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        required={required}
        aria-label={ariaLabel}
        className="pr-10 font-mono tabular-nums"
      />
      <input
        ref={pickerRef}
        type="time"
        value={pickerValue}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-adminreg-muted hover:bg-adminreg-header/60 hover:text-adminreg-text"
        aria-label="Open time picker"
      >
        <Clock className="h-4 w-4" />
      </button>
    </div>
  )
}
