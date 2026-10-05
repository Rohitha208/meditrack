"use client"

import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getCompanyId, setClinicId, setClinicName } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetMediTrackClinics, type MediTrackClinic } from "@/queries/meditrack/clinics"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { cn } from "@/lib/utils"
import {
  getActiveBranchSnapshot,
  getActiveBranchUserId,
  readActiveBranch,
  subscribeActiveBranch,
  writeActiveBranch,
} from "./branch-session"

function assignedBranches(user: { clinicId?: string | null; clinicName?: string | null; clinics?: Array<{ clinicId?: string | null; clinicName?: string | null; id?: string | null; name?: string | null }> | null } | null | undefined): MediTrackClinic[] {
  const fromList = (user?.clinics ?? [])
    .map((clinic) => ({
      id: String(clinic.clinicId || clinic.id || ""),
      name: String(clinic.clinicName || clinic.name || "Branch"),
    }))
    .filter((clinic) => clinic.id)
  if (fromList.length > 0) return fromList as MediTrackClinic[]
  if (user?.clinicId) {
    return [{ id: user.clinicId, name: user.clinicName || "Branch" }]
  }
  return []
}

export function useBranchScope(enabled = true) {
  const { user, clinic, userType } = useRootContext()
  const setClinic = clinic?.setClinic
  const { role } = useStaffRole()
  const userId = user?.id || ""
  const isSuperAdmin = !!userType?.isSuperAdmin
  const isAdmin = role === "admin" && !isSuperAdmin
  const isDoctor = role === "doctor"
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""

  const branchId = useSyncExternalStore(subscribeActiveBranch, getActiveBranchSnapshot, () => "")

  const { data: clinicsData, isLoading: isLoadingCompanyBranches } = useGetMediTrackClinics(
    { pageNumber: 1, pageSize: 100, companyId: companyId || undefined },
    !!companyId && enabled && isAdmin
  )

  const assigned = useMemo(() => assignedBranches(user), [user])
  const branches = useMemo(() => {
    if (!enabled || isSuperAdmin) return []
    if (isAdmin) return clinicsData?.items ?? []
    return assigned
  }, [enabled, isSuperAdmin, isAdmin, clinicsData?.items, assigned])

  const doctorMustChoose = isDoctor && assigned.length > 1
  const canSwitch = isAdmin || doctorMustChoose
  const needsBranchChoice = doctorMustChoose && !assigned.some((branch) => branch.id === branchId)

  useLayoutEffect(() => {
    if (!enabled || !userId || isSuperAdmin) return
    const saved = readActiveBranch(userId)

    if (doctorMustChoose) {
      if (getActiveBranchUserId() !== userId) writeActiveBranch(userId, "")
      return
    }

    if (!user?.roleName && !user?.role) return
    if (branches.length === 0) return
    const savedOk = branches.some((branch) => branch.id === saved)
    const next = savedOk ? saved : branches[0].id
    if (getActiveBranchUserId() !== userId || getActiveBranchSnapshot() !== next) {
      writeActiveBranch(userId, next)
    }
  }, [enabled, userId, isSuperAdmin, doctorMustChoose, assigned, branches, user?.roleName, user?.role])

  useEffect(() => {
    if (!branchId) return
    const branch = branches.find((item) => item.id === branchId)
    if (!branch || clinic?.id === branchId) return
    setClinicId(branchId)
    setClinicName(branch.name)
    setClinic?.({ id: branchId, name: branch.name, companyId: companyId || null })
  }, [branchId, branches, clinic?.id, companyId, setClinic])

  function setBranchId(nextId: string) {
    if (!userId || !nextId) return
    if (!canSwitch && branches[0]?.id && nextId !== branches[0].id) return
    writeActiveBranch(userId, nextId)
  }

  const isLoadingBranches = isAdmin && isLoadingCompanyBranches
  const noBranchMessage =
    branches.length === 0 && !isLoadingBranches
      ? isAdmin
        ? "No branches found. Add a branch under Hospital Profile first."
        : "No branch is assigned to this account."
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
    canSwitch,
    needsBranchChoice,
  }
}

interface BranchSelectProps {
  value: string
  onValueChange: (value: string) => void
  branches: Array<{ id: string; name: string }>
  isLoading?: boolean
  className?: string
  triggerClassName?: string
  showLabel?: boolean
}

/** Compact branch picker. A single assigned branch is shown as a label. */
export function BranchSelect({
  value,
  onValueChange,
  branches,
  isLoading,
  className,
  triggerClassName,
  showLabel = true,
}: BranchSelectProps) {
  const locked = branches.length <= 1
  const name = branches.find((branch) => branch.id === value)?.name || branches[0]?.name

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted sm:inline">
          Branch
        </span>
      )}
      {locked ? (
        <span
          className={cn(
            "flex h-10 min-w-[180px] items-center border border-adminreg-border bg-adminreg-border/30 px-3 text-sm font-medium text-adminreg-text",
            triggerClassName
          )}
        >
          {isLoading ? "Loading…" : name || "No branch"}
        </span>
      ) : (
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
      )}
    </div>
  )
}

interface BranchFormFieldProps {
  value: string
  onValueChange: (value: string) => void
  branches: Array<{ id: string; name: string }>
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
