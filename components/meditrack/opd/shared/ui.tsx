"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Small presentational building blocks shared by every OPD screen (the
 * visit thread AND Appointment Booking) — kept in one place so both stay
 * visually identical without duplicating the same handful of classes.
 */

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2.5 font-plexmono text-[14px] font-bold uppercase tracking-[0.04em] text-adminreg-muted2">{children}</div>
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1 font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">{children}</div>
}

export function FieldValue({ children }: { children: ReactNode }) {
  return <div className="mt-0.5 text-sm text-adminreg-text">{children}</div>
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-adminreg-border bg-adminreg-card p-[18px] font-archivo", className)}>{children}</div>
}

export function LinkAction({ tone, onClick, children }: { tone: "edit" | "amend" | "void"; onClick: () => void; children: ReactNode }) {
  const toneClass = tone === "edit" ? "text-adminreg-indigo" : tone === "amend" ? "font-bold text-adminreg-indigo-dark" : "text-adminreg-amber-text"
  return (
    <span onClick={onClick} className={cn("cursor-pointer whitespace-nowrap text-[11px] underline", toneClass)}>
      {children}
    </span>
  )
}

export function SupersededTag() {
  return (
    <span className="ml-2 whitespace-nowrap border border-adminreg-amber bg-adminreg-bg px-1.5 py-0.5 font-plexmono text-[9.5px] font-bold uppercase tracking-[0.04em] text-adminreg-amber-text">
      SUPERSEDED
    </span>
  )
}

export function AddendumNote({ header, children }: { header: string; children: ReactNode }) {
  return (
    <div className="border-l-[3px] border-adminreg-indigo bg-adminreg-bg px-3.5 py-2.5">
      <div className="mb-1 font-plexmono text-[10px] uppercase tracking-[0.03em] text-adminreg-muted">{header}</div>
      <div className="text-sm text-adminreg-text">{children}</div>
    </div>
  )
}

export function ResultTag({ tone, children }: { tone: "green" | "amber"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap border px-2.5 py-0.5 text-[11px] font-bold",
        tone === "green" ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark" : "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text"
      )}
    >
      {children}
    </span>
  )
}

export function CriticalBanner({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3.5 border-2 border-adminreg-red bg-adminreg-red-soft px-5 py-4">
      <span className="text-xl">⚠</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-adminreg-red-text">{title}</div>
        <div className="mt-0.5 text-xs text-adminreg-red-text">{description}</div>
      </div>
      {action}
    </div>
  )
}

export function InlineWarning({ children }: { children: ReactNode }) {
  return <div className="border border-adminreg-red bg-adminreg-red-soft px-3 py-2.5 text-xs font-medium text-adminreg-red-text">{children}</div>
}

export function InlineInfo({ children }: { children: ReactNode }) {
  return <div className="border border-adminreg-indigo bg-adminreg-indigo-soft px-3 py-2.5 text-xs text-adminreg-indigo-dark">{children}</div>
}

export function InlineSuccess({ children }: { children: ReactNode }) {
  return <div className="border border-adminreg-olive bg-adminreg-olive-soft px-3 py-2.5 text-xs text-adminreg-olive-dark">{children}</div>
}

export function ViewOnlyBanner({ role }: { role: string }) {
  return (
    <div className="border-b border-adminreg-indigo bg-adminreg-indigo-soft px-8 py-2.5 font-archivo text-xs font-semibold text-adminreg-indigo-dark">
      VIEW ONLY — {role} has read access to this screen. Editing is done by the owning role.
    </div>
  )
}
