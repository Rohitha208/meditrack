"use client"

import type { ReactNode } from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cn } from "@/lib/utils"
import { AdminButton } from "./AdminButton"
import type { DrawerBadgeTone } from "./AdminDrawer"

const BADGE_TONE_CLASSES: Record<DrawerBadgeTone, string> = {
  neutral: "bg-adminreg-header text-adminreg-muted border-adminreg-border",
  amend: "bg-adminreg-indigo-soft text-adminreg-indigo-dark border-adminreg-indigo",
  void: "bg-adminreg-amber-soft text-adminreg-amber-text border-adminreg-amber",
}

interface AdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Plain-language explanation of the consequence — one string per line,
   * e.g. ["Existing records are preserved.", "No new assignments allowed."] */
  lines: string[]
  /** Small mode label above the title — VOID / AMENDMENT / SUPERVISOR
   * OVERRIDE REQUIRED / etc, same convention as AdminDrawer's badge. */
  badge?: { label: string; tone: DrawerBadgeTone }
  confirmLabel?: string
  danger?: boolean
  /** Module accent for a non-danger confirm button. */
  accent?: "olive" | "indigo"
  onConfirm: () => void
  /** Extra controls below the explanation lines — a reason field, an
   * acknowledgement checkbox, etc. */
  children?: ReactNode
}

/**
 * The register family's ONE generic confirmation modal (Admin + OPD) — per
 * the Arogya HMS design spec, reserved exclusively for confirmations and
 * single-decision prompts (never a general-purpose form container). Every
 * destructive action explains its consequence in plain language via
 * `lines`, rather than a generic "Are you sure?".
 */
export function AdminModal({ open, onOpenChange, title, lines, badge, confirmLabel = "Confirm", danger, accent = "olive", onConfirm, children }: AdminModalProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className="fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ backgroundColor: "rgba(30,30,20,0.45)" }}
        />
        <AlertDialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 border border-adminreg-border bg-adminreg-card p-5 font-archivo data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
        >
          {badge && (
            <span className={cn("mb-2.5 inline-block border px-2.5 py-0.5 font-plexmono text-[10px] font-bold uppercase tracking-[0.04em]", BADGE_TONE_CLASSES[badge.tone])}>
              {badge.label}
            </span>
          )}
          <AlertDialogPrimitive.Title className="text-base font-bold text-adminreg-text">{title}</AlertDialogPrimitive.Title>
          <div className="mt-3 space-y-1.5">
            {lines.map((line, i) => (
              <p key={i} className="text-sm text-adminreg-muted">{line}</p>
            ))}
          </div>
          {children}
          <div className="mt-5 flex items-center justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <AdminButton type="button" variant="secondary">Cancel</AdminButton>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <AdminButton type="button" variant={danger ? "danger" : "primary"} accent={accent} onClick={onConfirm}>{confirmLabel}</AdminButton>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
