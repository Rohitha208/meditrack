"use client"

import { cn } from "@/lib/utils"

export type AdminFieldType = "text" | "number" | "date" | "time" | "select" | "textarea" | "chips"

export interface AdminFieldOption {
  value: string
  label: string
}

export interface AdminFieldDescriptor {
  /** Descriptor identity. Pass `id` too when spreading, since React consumes `key`. */
  key?: string
  id?: string
  label: string
  type: AdminFieldType
  value: string
  onChange: (value: string) => void
  error?: string
  helper?: string
  options?: AdminFieldOption[]
  placeholder?: string
  required?: boolean
}

const FIELD_BASE =
  "w-full rounded-none border bg-adminreg-bg px-3 py-2 font-archivo text-sm text-adminreg-text placeholder:text-adminreg-muted focus:outline-none focus:ring-1 focus:ring-adminreg-olive"

/**
 * One field-descriptor object drives one shared field renderer — per the
 * Arogya HMS design spec, this is what every Administration Register
 * drawer's form is built from (text/select/date/textarea/chips), instead
 * of one-off markup per entity. 10px IBM Plex Mono uppercase labels; a
 * field's border goes red with a helper line below on validation error.
 */
export function AdminFormField(field: AdminFieldDescriptor) {
  const borderClass = field.error ? "border-adminreg-red" : "border-adminreg-border"
  const fieldId = field.id ?? field.key

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2">
        {field.label}
        {field.required && " *"}
      </label>

      {field.type === "select" ? (
        <select
          id={fieldId}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          className={cn(FIELD_BASE, borderClass)}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={fieldId}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(FIELD_BASE, borderClass)}
        />
      ) : field.type === "chips" ? (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const active = field.value === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => field.onChange(o.value)}
                className={cn(
                  "rounded-none border px-3 py-1.5 font-archivo text-sm font-medium transition-colors",
                  active ? "border-[1.5px] border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
                )}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      ) : (
        <input
          id={fieldId}
          type={field.type}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={cn(FIELD_BASE, borderClass)}
        />
      )}

      {field.error ? (
        <p className="text-xs text-adminreg-red">{field.error}</p>
      ) : field.helper ? (
        <p className="text-xs text-adminreg-muted">{field.helper}</p>
      ) : null}
    </div>
  )
}
