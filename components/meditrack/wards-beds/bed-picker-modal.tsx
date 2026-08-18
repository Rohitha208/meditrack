"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MtButton } from "@/components/meditrack/shared"
import { BED_STATUS_CLASS, type BedStatus } from "@/components/meditrack/admin/register/theme"
import { toUiBedStatus, type Bed } from "@/queries/meditrack/beds"

const LEGEND: BedStatus[] = ["Occupied", "Vacant", "Cleaning", "Out of service"]

interface BedPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  beds: Bed[]
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
  isLoading?: boolean
}

export function BedPickerModal({ open, onOpenChange, beds, selectedIds, onConfirm, isLoading }: BedPickerModalProps) {
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds)
  const [visibleStatuses, setVisibleStatuses] = useState<Set<BedStatus>>(new Set(LEGEND))

  function handleOpenChange(next: boolean) {
    if (next) setDraftIds(selectedIds)
    onOpenChange(next)
  }

  function toggleBed(id: string) {
    setDraftIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleStatus(status: BedStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const filteredBeds = useMemo(
    () => beds.filter((bed) => visibleStatuses.has(toUiBedStatus(bed.status))),
    [beds, visibleStatuses]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[80] max-h-[85vh] max-w-3xl overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-adminreg-border p-5 pr-10">
          <DialogTitle>Select beds</DialogTitle>
          <DialogDescription>
            Choose beds to map to this department. Each card shows current status (vacant, occupied, cleaning, or out of service).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-4 px-5 pt-4 text-sm">
          {LEGEND.map((status) => (
            <label key={status} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={visibleStatuses.has(status)}
                onChange={() => toggleStatus(status)}
                className="h-3.5 w-3.5 accent-adminreg-olive"
              />
              <span className={cn("h-2.5 w-2.5 rounded-sm", BED_STATUS_CLASS[status].dot)} />
              <span className="text-adminreg-text">{status}</span>
            </label>
          ))}
        </div>

        <div className="max-h-[48vh] overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-adminreg-muted">Loading beds…</p>
          ) : filteredBeds.length === 0 ? (
            <p className="text-sm text-adminreg-muted">No beds match the selected statuses. Add beds from Wards & Beds first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredBeds.map((bed) => {
                const uiStatus = toUiBedStatus(bed.status)
                const cls = BED_STATUS_CLASS[uiStatus]
                const selected = draftIds.includes(bed.id)
                return (
                  <button
                    key={bed.id}
                    type="button"
                    onClick={() => toggleBed(bed.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left text-sm transition-shadow",
                      cls.border,
                      cls.bg,
                      selected && "ring-2 ring-adminreg-olive"
                    )}
                  >
                    <p className="font-semibold text-adminreg-text">{bed.bedNumber}</p>
                    <p className={cn("mt-0.5 text-xs font-medium", cls.text)}>{uiStatus}</p>
                    {bed.departmentName && (
                      <p className="mt-1 text-[10px] text-adminreg-muted">{bed.departmentName}</p>
                    )}
                    {bed.patientName && (
                      <p className="mt-1 font-mono text-[10px] text-adminreg-muted">{bed.patientName}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-adminreg-border p-4">
          <p className="mr-auto text-xs text-adminreg-muted">{draftIds.length} selected</p>
          <MtButton type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</MtButton>
          <MtButton
            type="button"
            onClick={() => {
              onConfirm(draftIds)
              onOpenChange(false)
            }}
          >
            Apply selection
          </MtButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
