"use client"

import type { ReactNode, FormEvent } from "react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  className?: string
}

/**
 * Right-side drawer used for every "New X" / "Edit X" form across MediTrack.
 * Header and footer stay fixed; only the middle field area scrolls, so the
 * Save/Cancel buttons are always reachable regardless of form length.
 */
export function FormDialog({ open, onOpenChange, title, description, children, footer, onSubmit, className }: FormDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 p-0 sm:w-[36rem] sm:max-w-[36rem]",
          className
        )}
      >
        <div className="flex-shrink-0 border-b border-adminreg-border p-5 pr-10">
          <SheetTitle className="text-base font-semibold text-adminreg-text">{title}</SheetTitle>
          {description && (
            <SheetDescription className="mt-1 text-sm text-adminreg-muted">{description}</SheetDescription>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
          <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-adminreg-border p-4">
            {footer}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
