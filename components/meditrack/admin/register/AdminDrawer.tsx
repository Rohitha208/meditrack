"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type DrawerBadgeTone = "neutral" | "amend" | "void"

const BADGE_TONE_CLASSES: Record<DrawerBadgeTone, string> = {
  neutral: "bg-adminreg-header text-adminreg-muted border-adminreg-border",
  amend: "bg-adminreg-indigo-soft text-adminreg-indigo-dark border-adminreg-indigo",
  void: "bg-adminreg-amber-soft text-adminreg-amber-text border-adminreg-amber",
}

interface AdminDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Small mode label above the title — LIVE EDIT / AMENDMENT / VOID / etc,
   * per the spec's "mode badge" convention that tells the user which
   * interaction pattern they're in before they read anything else. */
  badge?: { label: string; tone: DrawerBadgeTone }
  /** Blue informational note shown above the fields — e.g. "This will also
   * update 3 past visit records linked to this UHID." */
  consequenceNote?: string
  /** 720px instead of 460px, for content-heavy drawers like duplicate merge review. */
  wide?: boolean
  children: React.ReactNode
  footer: React.ReactNode
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}

/**
 * The register family's side drawer (Admin + OPD) — per the Arogya HMS
 * design spec: 460px (max 94vw, or 720px when `wide`) desktop slide-over
 * from the right with a dimmed backdrop; below 768px it becomes a
 * full-screen takeover with no backdrop, closed via a top-left "‹ Back"
 * affordance instead. Square corners, the spec's exact elevation shadow.
 * This is the ONE generic drawer used for every add/edit form — entity-
 * specific fields are passed as children (built from AdminFormField).
 */
export function AdminDrawer({ open, onOpenChange, title, description, badge, consequenceNote, wide, children, footer, onSubmit }: AdminDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 max-md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ backgroundColor: "rgba(30,30,20,0.45)" }}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-adminreg-border bg-adminreg-card font-archivo",
            wide ? "md:w-[720px] md:max-w-[96vw]" : "md:w-[460px] md:max-w-[94vw]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-200 data-[state=open]:duration-200"
          )}
          style={{ boxShadow: "-6px 0 28px rgba(0,0,0,0.18)" }}
        >
          <div className="flex flex-shrink-0 items-start gap-2 border-b border-adminreg-border bg-adminreg-header px-5 py-4">
            <DialogPrimitive.Close className="-ml-1 mt-0.5 flex items-center gap-1 text-adminreg-muted hover:text-adminreg-text md:hidden">
              <ChevronLeft className="h-4 w-4" />
              Back
            </DialogPrimitive.Close>
            <div className="min-w-0 flex-1">
              {badge && (
                <span className={cn("mb-2 inline-block border px-2.5 py-0.5 font-plexmono text-[10px] font-bold uppercase tracking-[0.04em]", BADGE_TONE_CLASSES[badge.tone])}>
                  {badge.label}
                </span>
              )}
              <DialogPrimitive.Title className="text-base font-bold text-adminreg-text">{title}</DialogPrimitive.Title>
              {description && <DialogPrimitive.Description className="mt-0.5 text-sm text-adminreg-muted">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="hidden text-adminreg-muted hover:text-adminreg-text md:block">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="adminreg-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              {consequenceNote && (
                <div className="border border-adminreg-indigo bg-adminreg-indigo-soft px-3.5 py-3 text-xs text-adminreg-indigo-dark">{consequenceNote}</div>
              )}
              {children}
            </div>
            <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-adminreg-border p-4">{footer}</div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
