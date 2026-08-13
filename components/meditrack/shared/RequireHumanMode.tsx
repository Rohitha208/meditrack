"use client"

import type { ReactNode } from "react"
import { useRootContext } from "@/context/RootContext"

/** Guards a MediTrack-only screen — renders nothing until the tenant is
 * confirmed to be in human/hospital mode, so a PawTrack (veterinary) tenant
 * can never flash MediTrack UI even for a frame during routing. */
export function RequireHumanMode({ children }: { children: ReactNode }) {
  const { isHumanMode } = useRootContext()
  if (!isHumanMode) return null
  return <>{children}</>
}
