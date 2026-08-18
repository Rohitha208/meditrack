"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Eye, Pencil, Plus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  MtDataTable,
  RowActions,
  FormDialog,
  DetailDrawer,
  InfoRow,
  MtButton,
  type MtColumn,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"
import { DOCTORS } from "@/components/meditrack/shared/directory"

// Frontend/UI only — department master data lives in local React state.

const TARIFF_GROUPS = ["TG-STD", "TG-PREMIUM", "TG-PMJAY"]

interface Department {
  id: string
  name: string
  head: string
  bedGroup: string
  tariffGroup: string
  providers: number
}

const INITIAL_DEPARTMENTS: Department[] = [
  { id: "1", name: "General Medicine", head: "Dr. Lata Menon", bedGroup: "GM-01", tariffGroup: "TG-STD", providers: 4 },
  { id: "2", name: "Cardiology", head: "Dr. Anjali Rao", bedGroup: "CI-01", tariffGroup: "TG-PREMIUM", providers: 2 },
  { id: "3", name: "Orthopedics", head: "Dr. Vikram Singh", bedGroup: "OR-01", tariffGroup: "TG-STD", providers: 3 },
  { id: "4", name: "Maternity", head: "Dr. Priya Iyer", bedGroup: "MT-01", tariffGroup: "TG-PMJAY", providers: 2 },
  { id: "5", name: "Pediatrics", head: "Dr. Rohan Gupta", bedGroup: "PD-01", tariffGroup: "TG-STD", providers: 2 },
  { id: "6", name: "Dermatology", head: "Unassigned", bedGroup: "—", tariffGroup: "TG-STD", providers: 0 },
]

const emptyForm = { name: "", head: "unassigned", bedGroup: "", tariffGroup: TARIFF_GROUPS[0] }

export function AdminDepartmentsPage() {
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [viewing, setViewing] = useState<Department | null>(null)
  const [form, setForm] = useState(emptyForm)

  const headOptions = useMemo(() => ["unassigned", ...DOCTORS.map((d) => d.name)], [])

  function openAdd() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const dept: Department = {
      id: String(Date.now()),
      name: form.name || "Untitled Department",
      head: form.head === "unassigned" ? "Unassigned" : form.head,
      bedGroup: form.bedGroup || "—",
      tariffGroup: form.tariffGroup,
      providers: 0,
    }
    setDepartments((prev) => [...prev, dept])
    setAddOpen(false)
    setForm(emptyForm)
    toast({ title: "Department added", description: `${dept.name} was added to the master list.` })
  }

  function openEdit(dept: Department) {
    setForm({ name: dept.name, head: dept.head === "Unassigned" ? "unassigned" : dept.head, bedGroup: dept.bedGroup === "—" ? "" : dept.bedGroup, tariffGroup: dept.tariffGroup })
    setEditing(dept)
  }

  function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === editing.id
          ? { ...d, name: form.name || d.name, head: form.head === "unassigned" ? "Unassigned" : form.head, bedGroup: form.bedGroup || "—", tariffGroup: form.tariffGroup }
          : d
      )
    )
    toast({ title: "Department updated", description: `${form.name || editing.name} was saved.` })
    setEditing(null)
  }

  const columns: MtColumn<Department>[] = [
    { key: "name", header: "Department", alwaysVisible: true, render: (r) => <span className="font-semibold text-adminreg-text">{r.name}</span> },
    {
      key: "head",
      header: "Head",
      render: (r) =>
        r.head === "Unassigned" ? (
          <div>
            <span className="text-adminreg-muted">{r.head}</span>
            {r.providers === 0 && <p className="text-xs text-adminreg-red">No providers assigned yet</p>}
          </div>
        ) : (
          r.head
        ),
    },
    { key: "bedGroup", header: "Bed Group", render: (r) => r.bedGroup },
    { key: "tariffGroup", header: "Tariff Group", render: (r) => r.tariffGroup },
    { key: "providers", header: "Providers", render: (r) => r.providers, sortValue: (r) => r.providers },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => <RowActions actions={[{ icon: Eye, label: "View", onClick: () => setViewing(r) }, { icon: Pencil, label: "Edit", onClick: () => openEdit(r) }]} />,
    },
  ]

  return (
    <div>
      <AdminPageHeader
        title="Departments"
        subtitle="Department master data — heads, beds and tariff mapping."
        actions={
          <MtButton className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add department
          </MtButton>
        }
      />

      <AdminCard title="Department Master" noPadding>
        <MtDataTable columns={columns} rows={departments} keyExtractor={(r) => r.id} />
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add department"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit">Add department</MtButton>
          </>
        }
      >
        <DepartmentFormFields form={form} setForm={setForm} headOptions={headOptions} />
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit department"
        description={editing?.name}
        onSubmit={handleEdit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</MtButton>
            <MtButton type="submit">Save changes</MtButton>
          </>
        }
      >
        <DepartmentFormFields form={form} setForm={setForm} headOptions={headOptions} />
      </FormDialog>

      <DetailDrawer open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} title="Department Details">
        {viewing && (
          <div className="divide-y divide-adminreg-border">
            <InfoRow label="Department" value={viewing.name} />
            <InfoRow label="Head" value={viewing.head} />
            <InfoRow label="Bed Group" value={viewing.bedGroup} />
            <InfoRow label="Tariff Group" value={viewing.tariffGroup} />
            <InfoRow label="Providers" value={viewing.providers} />
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}

function DepartmentFormFields({
  form,
  setForm,
  headOptions,
}: {
  form: typeof emptyForm
  setForm: (updater: (f: typeof emptyForm) => typeof emptyForm) => void
  headOptions: string[]
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Department Name</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Dermatology" required />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Head of Department</Label>
        <Select value={form.head} onValueChange={(v) => setForm((f) => ({ ...f, head: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {headOptions.map((h) => (
              <SelectItem key={h} value={h}>{h === "unassigned" ? "Unassigned" : h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Bed Group Mapping</Label>
        <Input value={form.bedGroup} onChange={(e) => setForm((f) => ({ ...f, bedGroup: e.target.value }))} placeholder="e.g. DER-01" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Tariff Group</Label>
        <Select value={form.tariffGroup} onValueChange={(v) => setForm((f) => ({ ...f, tariffGroup: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TARIFF_GROUPS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
