"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface MtButtonProps extends Omit<ButtonProps, "variant"> {
  /** MediTrack button styles. Defaults to the solid teal primary action look. */
  variant?: "solid" | "outline" | "ghost" | "destructive" | "secondary"
}

const VARIANT_CLASSES: Record<NonNullable<MtButtonProps["variant"]>, string> = {
  solid: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary: "bg-slate-600 text-white hover:bg-slate-700 focus-visible:ring-slate-500",
  outline:
    "border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-500/10",
  ghost: "text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10",
  destructive: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
}

/**
 * The MediTrack primary/secondary button. Wraps the shared shadcn `Button`
 * (whose default `--primary` token is a near-black shared across the whole
 * app) with the brand teal-green (#14B8A6) accent — plus a `secondary` blue
 * variant — used throughout MediTrack, so every "New Appointment" / "Save"
 * / "Admit Patient" button matches.
 */
const BASE_BUTTON_VARIANT: Record<NonNullable<MtButtonProps["variant"]>, ButtonProps["variant"]> = {
  solid: "default",
  secondary: "default",
  outline: "outline",
  ghost: "ghost",
  destructive: "destructive",
}

export const MtButton = React.forwardRef<HTMLButtonElement, MtButtonProps>(
  ({ variant = "solid", className, ...props }, ref) => (
    <Button
      ref={ref}
      variant={BASE_BUTTON_VARIANT[variant]}
      className={cn(VARIANT_CLASSES[variant], className)}
      {...props}
    />
  )
)
MtButton.displayName = "MtButton"
