"use client"

import type { ReactNode } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface DetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  headerExtra?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Right-side drawer used for every read-only "View" detail screen across
 * MediTrack (Patient, Appointment, Admission, ...). Same fixed-header /
 * scrollable-body / fixed-footer mechanics as FormDialog, so Add and View
 * always feel like the same product.
 */
export function DetailDrawer({ open, onOpenChange, title, headerExtra, children, footer, className }: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          // Same override as FormDialog — without these, the base Sheet
          // variant's inset-4/rounded "floating card" combined with a
          // mobile w-full pushes the panel off the left edge of the screen.
          "inset-y-0 right-0 flex h-full w-full flex-col gap-0 rounded-none p-0 sm:w-[34rem] sm:max-w-[34rem]",
          className
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-adminreg-border p-5 pr-10">
          <SheetTitle className="text-base font-semibold text-adminreg-text">{title}</SheetTitle>
          {headerExtra}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex-shrink-0 border-t border-adminreg-border p-4">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
