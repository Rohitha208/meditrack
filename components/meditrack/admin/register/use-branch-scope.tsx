"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetMediTrackClinics, type MediTrackClinic } from "@/queries/meditrack/clinics"
import { cn } from "@/lib/utils"

export function useBranchScope(enabled = true) {
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const [branchId, setBranchId] = useState(clinic?.id || "")

  const { data: clinicsData, isLoading: isLoadingBranches } = useGetMediTrackClinics(
    { pageNumber: 1, pageSize: 100, companyId: companyId || undefined },
    !!companyId && enabled
  )
  const branches = clinicsData?.items ?? []

  useEffect(() => {
    if (branchId) {
      const stillExists = branches.length === 0 || branches.some((b) => b.id === branchId)
      if (stillExists) return
    }
    if (clinic?.id && (branches.length === 0 || branches.some((b) => b.id === clinic.id))) {
      setBranchId(clinic.id)
      return
    }
    if (branches.length > 0) {
      setBranchId(branches[0].id)
    }
  }, [branchId, clinic?.id, branches])

  const noBranchMessage =
    branches.length === 0 && !isLoadingBranches
      ? "No branches found. Add a branch under Hospital Profile first."
      : "Select a branch to load data for this screen."

  return {
    companyId,
    branchId,
    setBranchId,
    clinicId: branchId || undefined,
    hasBranch: !!branchId,
    branches,
    isLoadingBranches,
    noBranchMessage,
  }
}

interface BranchSelectProps {
  value: string
  onValueChange: (value: string) => void
  branches: MediTrackClinic[]
  isLoading?: boolean
  className?: string
  triggerClassName?: string
  showLabel?: boolean
}

/** Compact branch picker for page headers / card actions. */
export function BranchSelect({
  value,
  onValueChange,
  branches,
  isLoading,
  className,
  triggerClassName,
  showLabel = true,
}: BranchSelectProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted sm:inline">
          Branch
        </span>
      )}
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={isLoading || branches.length === 0}
      >
        <SelectTrigger
          className={cn(
            "h-10 w-[220px] border-adminreg-border bg-adminreg-border/30 text-sm font-medium text-adminreg-text shadow-none",
            "hover:bg-adminreg-border/40 focus:ring-adminreg-olive",
            triggerClassName
          )}
        >
          <SelectValue placeholder={isLoading ? "Loading…" : "Select branch"} />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface BranchFormFieldProps {
  value: string
  onValueChange: (value: string) => void
  branches: MediTrackClinic[]
  isLoading?: boolean
  required?: boolean
}

/** First form field — labelled Branch select for create/edit dialogs. */
export function BranchFormField({
  value,
  onValueChange,
  branches,
  isLoading,
  required = true,
}: BranchFormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">
        Branch{required ? "" : " (optional)"}
      </Label>
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={isLoading || branches.length === 0}
        required={required}
      >
        <SelectTrigger className="border-adminreg-border bg-adminreg-border/30 font-medium text-adminreg-text shadow-none hover:bg-adminreg-border/40 focus:ring-adminreg-olive">
          <SelectValue placeholder={isLoading ? "Loading…" : "Select branch"} />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
