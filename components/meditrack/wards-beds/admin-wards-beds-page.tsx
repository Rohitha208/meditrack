"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Plus, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import { useGetDepartments } from "@/queries/departments"
import { useCreateBed, useGetBedsByDepartment, toApiBedStatus, toUiBedStatus } from "@/queries/meditrack/beds"
import { FormDialog, MtButton, TableSkeleton } from "@/components/meditrack/shared"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"
import { BED_STATUS_CLASS, type BedStatus } from "@/components/meditrack/admin/register/theme"

const LEGEND: BedStatus[] = ["Occupied", "Vacant", "Cleaning", "Out of service"]

export function AdminWardsBedsPage() {
  const { toast } = useToast()
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || getCompanyId() || ""
  const clinicId = clinic?.id || undefined

  const { data: departments = [], isLoading: isLoadingDepartments } = useGetDepartments(companyId || undefined, clinicId)
  const [activeDepartmentId, setActiveDepartmentId] = useState<string>("")
  const selectedDepartmentId = activeDepartmentId || departments[0]?.departmentId || ""
  const selectedDepartment = departments.find((d) => d.departmentId === selectedDepartmentId)

  const { data: beds = [], isLoading: isLoadingBeds, isError, error } = useGetBedsByDepartment(selectedDepartmentId, !!selectedDepartmentId)
  const createBed = useCreateBed()

  const [visibleStatuses, setVisibleStatuses] = useState<Set<BedStatus>>(new Set(LEGEND))
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ bedNumber: "", status: "Vacant" as BedStatus })

  const filteredBeds = useMemo(
    () => beds.filter((bed) => visibleStatuses.has(toUiBedStatus(bed.status))),
    [beds, visibleStatuses]
  )

  function toggleStatus(status: BedStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedDepartmentId) {
      toast({ title: "Select a ward", description: "Create a department first, then add beds.", variant: "destructive" })
      return
    }
    try {
      const created = await createBed.mutateAsync({
        departmentId: selectedDepartmentId,
        bedNumber: form.bedNumber.trim(),
        status: toApiBedStatus(form.status),
        isActive: true,
      })
      setAddOpen(false)
      setForm({ bedNumber: "", status: "Vacant" })
      toast({ title: "Bed added", description: `${created.bedNumber} was added to ${selectedDepartment?.name || "the ward"}.` })
    } catch (err) {
      toast({ title: "Could not add bed", description: getToastErrorMessage(err, "Failed to create bed"), variant: "destructive" })
    }
  }

  return (
    <div>
      <AdminPageHeader title="Wards & Beds" subtitle="Live bed status by ward, and ward master configuration." />

      {isLoadingDepartments ? (
        <TableSkeleton rows={2} columns={4} />
      ) : departments.length === 0 ? (
        <p className="mb-5 text-sm text-adminreg-muted">No departments yet. Add a department first, then create beds for it.</p>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {departments.map((dept) => (
            <button
              key={dept.departmentId}
              type="button"
              onClick={() => setActiveDepartmentId(dept.departmentId)}
              className={cn(
                "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                dept.departmentId === selectedDepartmentId
                  ? "border-adminreg-olive bg-adminreg-olive text-white"
                  : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
              )}
            >
              {dept.name}
            </button>
          ))}
        </div>
      )}

      <MtButton className="mb-5 gap-2" onClick={() => setAddOpen(true)} disabled={!selectedDepartmentId}>
        <Plus className="h-4 w-4" />
        Add bed
      </MtButton>

      <div className="mb-5 flex flex-wrap items-center gap-4 text-sm">
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

      <AdminCard title={`${selectedDepartment?.name || "Ward"} — ${beds.length} beds`}>
        {isLoadingBeds ? (
          <TableSkeleton rows={4} columns={5} />
        ) : isError ? (
          <p className="text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load beds")}</p>
        ) : filteredBeds.length === 0 ? (
          <p className="text-sm text-adminreg-muted">No beds in this ward yet. Use Add bed to create one.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredBeds.map((bed) => {
              const uiStatus = toUiBedStatus(bed.status)
              const cls = BED_STATUS_CLASS[uiStatus]
              return (
                <div key={bed.id} className={cn("rounded-lg border p-3 text-sm", cls.border, cls.bg)}>
                  <p className="font-semibold text-adminreg-text">{bed.bedNumber}</p>
                  <p className={cn("mt-0.5 text-xs font-medium", cls.text)}>{uiStatus}</p>
                  {bed.patientName && <p className="mt-1 font-mono text-[10px] text-adminreg-muted">{bed.patientName}</p>}
                </div>
              )
            })}
          </div>
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add bed"
        description={selectedDepartment ? `New bed in ${selectedDepartment.name}` : undefined}
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={createBed.isPending}>
              {createBed.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add bed
            </MtButton>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Bed number</Label>
          <Input
            value={form.bedNumber}
            onChange={(e) => setForm((f) => ({ ...f, bedNumber: e.target.value }))}
            placeholder="e.g. GM-001"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as BedStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEGEND.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>
    </div>
  )
}
