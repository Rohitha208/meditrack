"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { useGetMediTrackUsers } from "@/queries/meditrack/users"
import { BranchFormField, BranchSelect, useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"
import {
  useCreateWard,
  useDeleteWard,
  useGetWards,
  useUpdateWard,
  type MediTrackWard,
} from "@/queries/meditrack/wards"
import {
  useCreateBedCategory,
  useDeleteBedCategory,
  useGetBedCategories,
  useUpdateBedCategory,
  type BedCategory,
} from "@/queries/meditrack/bed-categories"
import {
  useCreateBed,
  useDeleteBed,
  useGetBedsByWard,
  useUpdateBed,
  toApiBedStatus,
  toUiBedStatus,
  type Bed,
} from "@/queries/meditrack/beds"
import {
  ConfirmDialog,
  FormDialog,
  MtButton,
  MtDataTable,
  RowActions,
  TableSkeleton,
  type MtColumn,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"
import { BED_STATUS_CLASS, type BedStatus } from "@/components/meditrack/admin/register/theme"

const LEGEND: BedStatus[] = ["Occupied", "Vacant", "Cleaning", "Out of service"]
const NO_CATEGORY = "none"
const WARD_EMPTY_FORM = { code: "", name: "", sanctioned: "0", headUserId: "unassigned", isActive: true }
const CATEGORY_EMPTY_FORM = { name: "", code: "", isActive: true }
const BED_EMPTY_FORM = { bedNumber: "", status: "Vacant" as BedStatus, categoryId: NO_CATEGORY }

export function AdminWardsBedsPage() {
  const { toast } = useToast()
  const {
    companyId,
    branchId,
    setBranchId,
    clinicId,
    hasBranch,
    branches,
    isLoadingBranches,
    noBranchMessage,
  } = useBranchScope()

  const { data: wards = [], isLoading: isLoadingWards, isError: isWardsError, error: wardsError } = useGetWards(
    clinicId,
    hasBranch
  )
  const [activeWardId, setActiveWardId] = useState<string>("")
  const [formBranchId, setFormBranchId] = useState("")
  const selectedWardId = activeWardId || wards[0]?.id || ""
  const selectedWard = wards.find((w) => w.id === selectedWardId)

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
    error: categoriesError,
  } = useGetBedCategories(
    { companyId: companyId || undefined, clinicId: clinicId || undefined },
    hasBranch
  )
  const activeCategories = useMemo(() => categories.filter((c) => c.isActive !== false), [categories])

  const { data: beds = [], isLoading: isLoadingBeds, isError, error } = useGetBedsByWard(selectedWardId, !!selectedWardId)
  const createBed = useCreateBed()
  const updateBed = useUpdateBed()
  const deleteBed = useDeleteBed()

  const createWard = useCreateWard()
  const updateWard = useUpdateWard()
  const deleteWard = useDeleteWard()
  const [addWardOpen, setAddWardOpen] = useState(false)
  const [editingWard, setEditingWard] = useState<MediTrackWard | null>(null)
  const [deleteWardTarget, setDeleteWardTarget] = useState<{ id: string; name: string } | null>(null)
  const [wardForm, setWardForm] = useState(WARD_EMPTY_FORM)
  const isSavingWard = createWard.isPending || updateWard.isPending

  const createCategory = useCreateBedCategory()
  const updateCategory = useUpdateBedCategory()
  const deleteCategory = useDeleteBedCategory()
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BedCategory | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{ id: string; name: string } | null>(null)
  const [categoryForm, setCategoryForm] = useState(CATEGORY_EMPTY_FORM)
  const [categoryBranchId, setCategoryBranchId] = useState("")
  const isSavingCategory = createCategory.isPending || updateCategory.isPending

  const [addOpen, setAddOpen] = useState(false)
  const [editingBed, setEditingBed] = useState<Bed | null>(null)
  const [deleteBedTarget, setDeleteBedTarget] = useState<{ id: string; bedNumber: string } | null>(null)
  const [form, setForm] = useState(BED_EMPTY_FORM)
  const isSavingBed = createBed.isPending || updateBed.isPending

  const headBranchId = formBranchId || branchId
  const wardFormOpen = addWardOpen || !!editingWard

  const { data: headUsersData, isLoading: isLoadingHeadUsers } = useGetMediTrackUsers(
    {
      pageNumber: 1,
      pageSize: 100,
      companyId: companyId || undefined,
      clinicIds: headBranchId ? [headBranchId] : undefined,
    },
    !!companyId && !!headBranchId && wardFormOpen
  )
  const headOptions = useMemo(
    () => (headUsersData?.items ?? []).filter((u) => u.isActive !== false),
    [headUsersData]
  )

  const hasWards = wards.length > 0
  const hasCategories = activeCategories.length > 0
  const canAddBeds = !!selectedWardId && hasCategories

  function handleFormBranchChange(nextBranchId: string) {
    setFormBranchId(nextBranchId)
    setWardForm((f) => ({ ...f, headUserId: "unassigned" }))
  }

  function openEditWard(ward: MediTrackWard) {
    setEditingWard(ward)
    setFormBranchId(ward.clinicId || branchId)
    setWardForm({
      code: ward.code || "",
      name: ward.name || "",
      sanctioned: String(ward.sanctioned ?? 0),
      headUserId: ward.headUserId || "unassigned",
      isActive: ward.isActive !== false,
    })
  }

  async function handleAddWard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) {
      toast({ title: "Cannot save", description: "Company is missing. Please log in again.", variant: "destructive" })
      return
    }
    if (!formBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this ward.", variant: "destructive" })
      return
    }
    try {
      const created = await createWard.mutateAsync({
        name: wardForm.name.trim(),
        code: wardForm.code.trim() || null,
        sanctioned: Number(wardForm.sanctioned) || 0,
        isActive: true,
        companyId,
        clinicId: formBranchId,
        headUserId: wardForm.headUserId === "unassigned" ? null : wardForm.headUserId,
      })
      setAddWardOpen(false)
      setWardForm(WARD_EMPTY_FORM)
      toast({ title: "Ward added", description: `${created.name} was added to the ward master.` })
    } catch (err) {
      toast({ title: "Could not add ward", description: getToastErrorMessage(err, "Failed to create ward"), variant: "destructive" })
    }
  }

  async function handleEditWard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingWard) return
    if (!formBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this ward.", variant: "destructive" })
      return
    }
    try {
      const updated = await updateWard.mutateAsync({
        id: editingWard.id,
        name: wardForm.name.trim(),
        code: wardForm.code.trim() || null,
        sanctioned: Number(wardForm.sanctioned) || 0,
        isActive: wardForm.isActive,
        companyId: editingWard.companyId || companyId || null,
        clinicId: formBranchId,
        headUserId: wardForm.headUserId === "unassigned" ? null : wardForm.headUserId,
      })
      setEditingWard(null)
      setWardForm(WARD_EMPTY_FORM)
      toast({ title: "Ward updated", description: `${updated.name} was saved.` })
    } catch (err) {
      toast({ title: "Could not update ward", description: getToastErrorMessage(err, "Failed to update ward"), variant: "destructive" })
    }
  }

  async function handleDeleteWard() {
    if (!deleteWardTarget) return
    try {
      await deleteWard.mutateAsync(deleteWardTarget.id)
      if (activeWardId === deleteWardTarget.id) setActiveWardId("")
      setDeleteWardTarget(null)
      toast({ title: "Ward deleted", description: `${deleteWardTarget.name} was removed.` })
    } catch (err) {
      toast({ title: "Could not delete ward", description: getToastErrorMessage(err, "Failed to delete ward"), variant: "destructive" })
    }
  }

  function openEditCategory(category: BedCategory) {
    setEditingCategory(category)
    setCategoryBranchId(category.clinicId || branchId)
    setCategoryForm({
      name: category.name || "",
      code: category.code || "",
      isActive: category.isActive !== false,
    })
  }

  async function handleAddCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!categoryBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this category.", variant: "destructive" })
      return
    }
    try {
      const created = await createCategory.mutateAsync({
        clinicId: categoryBranchId,
        name: categoryForm.name.trim(),
        code: categoryForm.code.trim() || null,
        tariffId: null,
        isActive: true,
      })
      setAddCategoryOpen(false)
      setCategoryForm(CATEGORY_EMPTY_FORM)
      toast({ title: "Category added", description: `${created.name} was added to bed categories.` })
    } catch (err) {
      toast({ title: "Could not add category", description: getToastErrorMessage(err, "Failed to create bed category"), variant: "destructive" })
    }
  }

  async function handleEditCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingCategory) return
    if (!categoryBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this category.", variant: "destructive" })
      return
    }
    try {
      const updated = await updateCategory.mutateAsync({
        id: editingCategory.id,
        clinicId: categoryBranchId,
        name: categoryForm.name.trim(),
        code: categoryForm.code.trim() || null,
        tariffId: editingCategory.tariffId || null,
        isActive: categoryForm.isActive,
      })
      setEditingCategory(null)
      setCategoryForm(CATEGORY_EMPTY_FORM)
      toast({ title: "Category updated", description: `${updated.name} was saved.` })
    } catch (err) {
      toast({ title: "Could not update category", description: getToastErrorMessage(err, "Failed to update bed category"), variant: "destructive" })
    }
  }

  async function handleDeleteCategory() {
    if (!deleteCategoryTarget) return
    try {
      await deleteCategory.mutateAsync(deleteCategoryTarget.id)
      setDeleteCategoryTarget(null)
      toast({ title: "Category deleted", description: `${deleteCategoryTarget.name} was removed.` })
    } catch (err) {
      toast({ title: "Could not delete category", description: getToastErrorMessage(err, "Failed to delete bed category"), variant: "destructive" })
    }
  }

  function openEditBed(bed: Bed) {
    setEditingBed(bed)
    setForm({
      bedNumber: bed.bedNumber || "",
      status: toUiBedStatus(bed.status),
      categoryId: bed.categoryId || NO_CATEGORY,
    })
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedWardId) {
      toast({ title: "Select a ward", description: "Create a ward first, then add beds.", variant: "destructive" })
      return
    }
    if (!hasCategories) {
      toast({ title: "Category required", description: "Add a bed category before creating beds.", variant: "destructive" })
      return
    }
    if (form.categoryId === NO_CATEGORY) {
      toast({ title: "Category required", description: "Select a bed category for this bed.", variant: "destructive" })
      return
    }
    try {
      const created = await createBed.mutateAsync({
        wardId: selectedWardId,
        categoryId: form.categoryId,
        bedNumber: form.bedNumber.trim(),
        status: toApiBedStatus(form.status),
        isActive: true,
      })
      setAddOpen(false)
      setForm(BED_EMPTY_FORM)
      toast({ title: "Bed added", description: `${created.bedNumber} was added to ${selectedWard?.name || "the ward"}.` })
    } catch (err) {
      toast({ title: "Could not add bed", description: getToastErrorMessage(err, "Failed to create bed"), variant: "destructive" })
    }
  }

  async function handleEditBed(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingBed) return
    if (form.categoryId === NO_CATEGORY) {
      toast({ title: "Category required", description: "Select a bed category for this bed.", variant: "destructive" })
      return
    }
    try {
      const updated = await updateBed.mutateAsync({
        id: editingBed.id,
        wardId: editingBed.wardId,
        categoryId: form.categoryId,
        bedNumber: form.bedNumber.trim(),
        status: toApiBedStatus(form.status),
        patientId: editingBed.patientId ?? null,
        isActive: editingBed.isActive,
      })
      setEditingBed(null)
      setForm(BED_EMPTY_FORM)
      toast({ title: "Bed updated", description: `${updated.bedNumber} was saved.` })
    } catch (err) {
      toast({ title: "Could not update bed", description: getToastErrorMessage(err, "Failed to update bed"), variant: "destructive" })
    }
  }

  async function handleDeleteBed() {
    if (!deleteBedTarget) return
    try {
      await deleteBed.mutateAsync(deleteBedTarget.id)
      setDeleteBedTarget(null)
      toast({ title: "Bed deleted", description: `${deleteBedTarget.bedNumber} was removed.` })
    } catch (err) {
      toast({ title: "Could not delete bed", description: getToastErrorMessage(err, "Failed to delete bed"), variant: "destructive" })
    }
  }

  const [visibleStatuses, setVisibleStatuses] = useState<Set<BedStatus>>(new Set(LEGEND))

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

  async function cycleBedStatus(bed: Bed) {
    const current = toUiBedStatus(bed.status)
    const next = LEGEND[(LEGEND.indexOf(current) + 1) % LEGEND.length]
    try {
      await updateBed.mutateAsync({
        id: bed.id,
        wardId: bed.wardId,
        categoryId: bed.categoryId ?? null,
        bedNumber: bed.bedNumber,
        status: toApiBedStatus(next),
        patientId: bed.patientId ?? null,
        isActive: bed.isActive,
      })
      toast({ title: "Bed status updated", description: `${bed.bedNumber} is now ${next}.` })
    } catch (err) {
      toast({
        title: "Could not update bed",
        description: getToastErrorMessage(err, "Failed to update bed"),
        variant: "destructive",
      })
    }
  }

  const wardColumns: MtColumn<MediTrackWard>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs text-adminreg-muted">{r.code || "—"}</span> },
    { key: "name", header: "Name", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span> },
    { key: "sanctioned", header: "Sanctioned", render: (r) => r.sanctioned ?? 0, sortValue: (r) => r.sanctioned ?? 0 },
    { key: "head", header: "Head", render: (r) => r.headUserName || "Unassigned" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className={cn("text-xs font-semibold", r.isActive ? "text-adminreg-olive-700" : "text-adminreg-muted")}>
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions
          actions={[
            { icon: Pencil, label: "Edit", onClick: () => openEditWard(r) },
            {
              icon: Trash2,
              label: "Delete",
              destructive: true,
              onClick: () => setDeleteWardTarget({ id: r.id, name: r.name }),
            },
          ]}
        />
      ),
    },
  ]

  const categoryColumns: MtColumn<BedCategory>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs text-adminreg-muted">{r.code || "—"}</span> },
    { key: "name", header: "Category", alwaysVisible: true, render: (r) => <span className="font-medium text-adminreg-text">{r.name}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className={cn("text-xs font-semibold", r.isActive ? "text-adminreg-olive-700" : "text-adminreg-muted")}>
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      alwaysVisible: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions
          actions={[
            { icon: Pencil, label: "Edit", onClick: () => openEditCategory(r) },
            {
              icon: Trash2,
              label: "Delete",
              destructive: true,
              onClick: () => setDeleteCategoryTarget({ id: r.id, name: r.name }),
            },
          ]}
        />
      ),
    },
  ]

  const wardFormFields = (
    <>
      <BranchFormField
        value={formBranchId}
        onValueChange={handleFormBranchChange}
        branches={branches}
        isLoading={isLoadingBranches}
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Ward Name</Label>
        <Input value={wardForm.name} onChange={(e) => setWardForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. General Medicine" required />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
        <Input value={wardForm.code} onChange={(e) => setWardForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. GM" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Sanctioned beds</Label>
        <Input
          type="number"
          min={0}
          value={wardForm.sanctioned}
          onChange={(e) => setWardForm((f) => ({ ...f, sanctioned: e.target.value }))}
          placeholder="0"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Head of Ward</Label>
        <Select value={wardForm.headUserId} onValueChange={(v) => setWardForm((f) => ({ ...f, headUserId: v }))}>
          <SelectTrigger><SelectValue placeholder={isLoadingHeadUsers ? "Loading staff…" : "Select head"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {headOptions.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!!editingWard && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Status</Label>
          <Select
            value={wardForm.isActive ? "Active" : "Inactive"}
            onValueChange={(v) => setWardForm((f) => ({ ...f, isActive: v === "Active" }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )

  const categoryFormFields = (
    <>
      <BranchFormField
        value={categoryBranchId}
        onValueChange={setCategoryBranchId}
        branches={branches}
        isLoading={isLoadingBranches}
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Category name</Label>
        <Input
          value={categoryForm.name}
          onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. General, ICU, Private"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Code</Label>
        <Input
          value={categoryForm.code}
          onChange={(e) => setCategoryForm((f) => ({ ...f, code: e.target.value }))}
          placeholder="e.g. GEN"
        />
      </div>
      {!!editingCategory && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Status</Label>
          <Select
            value={categoryForm.isActive ? "Active" : "Inactive"}
            onValueChange={(v) => setCategoryForm((f) => ({ ...f, isActive: v === "Active" }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )

  const bedFormFields = (
    <>
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
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Category</Label>
        <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY}>Select category</SelectItem>
            {activeCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
    </>
  )

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Wards & Beds"
        subtitle="Add wards first, then bed categories, then beds — scoped by branch."
        actions={
          <BranchSelect
            value={branchId}
            onValueChange={(id) => {
              setBranchId(id)
              setActiveWardId("")
            }}
            branches={branches}
            isLoading={isLoadingBranches}
          />
        }
      />

      {!hasBranch ? (
        <p className="text-sm text-adminreg-red">{noBranchMessage}</p>
      ) : (
        <p className="text-sm text-adminreg-muted">
          Setup order: <span className="font-medium text-adminreg-text">1. Wards</span>
          {" → "}
          <span className="font-medium text-adminreg-text">2. Bed categories</span>
          {" → "}
          <span className="font-medium text-adminreg-text">3. Beds</span>
        </p>
      )}

      {/* 1. Ward Master */}
      <AdminCard
        title="1. Ward Master"
        noPadding
        action={
          <MtButton
            className="gap-2"
            onClick={() => {
              setWardForm(WARD_EMPTY_FORM)
              setFormBranchId(branchId)
              setAddWardOpen(true)
            }}
            disabled={!hasBranch}
          >
            <Plus className="h-4 w-4" />
            Add ward
          </MtButton>
        }
      >
        {!hasBranch ? (
          <p className="p-5 text-sm text-adminreg-red">{noBranchMessage}</p>
        ) : isLoadingWards ? (
          <TableSkeleton rows={4} columns={6} />
        ) : isWardsError ? (
          <p className="p-5 text-sm text-adminreg-red">{getToastErrorMessage(wardsError, "Failed to load wards")}</p>
        ) : (
          <MtDataTable
            columns={wardColumns}
            rows={wards}
            keyExtractor={(r) => r.id}
            emptyTitle="No wards yet"
            emptyDescription="Add a ward first, then create bed categories and beds."
          />
        )}
      </AdminCard>

      {/* 2. Bed Category Master */}
      <AdminCard
        title="2. Bed Category Master"
        noPadding
        action={
          <MtButton
            className="gap-2"
            onClick={() => {
              setCategoryForm(CATEGORY_EMPTY_FORM)
              setCategoryBranchId(branchId)
              setAddCategoryOpen(true)
            }}
            disabled={!hasBranch || !hasWards}
          >
            <Plus className="h-4 w-4" />
            Add category
          </MtButton>
        }
      >
        {!hasBranch ? (
          <p className="p-5 text-sm text-adminreg-red">{noBranchMessage}</p>
        ) : !hasWards ? (
          <p className="p-5 text-sm text-adminreg-muted">Add a ward first, then create bed categories.</p>
        ) : isLoadingCategories ? (
          <TableSkeleton rows={4} columns={6} />
        ) : isCategoriesError ? (
          <p className="p-5 text-sm text-adminreg-red">{getToastErrorMessage(categoriesError, "Failed to load bed categories")}</p>
        ) : (
          <MtDataTable
            columns={categoryColumns}
            rows={categories}
            keyExtractor={(r) => r.id}
            emptyTitle="No bed categories yet"
            emptyDescription="Add categories like General, ICU or Private before creating beds."
          />
        )}
      </AdminCard>

      {/* 3. Beds */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-adminreg-muted">3. Beds</h3>
          <MtButton
            className="gap-2"
            onClick={() => {
              setForm({
                ...BED_EMPTY_FORM,
                categoryId: activeCategories[0]?.id || NO_CATEGORY,
              })
              setAddOpen(true)
            }}
            disabled={!canAddBeds}
          >
            <Plus className="h-4 w-4" />
            Add bed
          </MtButton>
        </div>

        {!hasWards ? (
          <p className="text-sm text-adminreg-muted">No wards yet. Add a ward first, then a category, then beds.</p>
        ) : !hasCategories ? (
          <p className="text-sm text-adminreg-muted">Add a bed category before creating beds.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {wards.map((ward) => (
                <button
                  key={ward.id}
                  type="button"
                  onClick={() => setActiveWardId(ward.id)}
                  className={cn(
                    "border px-4 py-2 text-sm font-semibold transition-colors",
                    ward.id === selectedWardId
                      ? "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-700"
                      : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text"
                  )}
                >
                  {ward.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
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

            <AdminCard title={`${selectedWard?.name || "Ward"} — ${beds.length} beds`}>
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
                      <div
                        key={bed.id}
                        role="button"
                        tabIndex={0}
                        title="Double-click to change status"
                        onDoubleClick={() => void cycleBedStatus(bed)}
                        className={cn(
                          "cursor-pointer select-none border p-3 text-left text-sm",
                          cls.border,
                          cls.bg,
                          updateBed.isPending && "opacity-70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-adminreg-text">
                              {bed.bedNumber}
                              {bed.categoryName ? ` (${bed.categoryName})` : ""}
                            </p>
                            <p className={cn("mt-0.5 text-xs font-medium", cls.text)}>{uiStatus}</p>
                            {bed.patientName && <p className="mt-1 font-mono text-[10px] text-adminreg-muted">{bed.patientName}</p>}
                          </div>
                          <div onDoubleClick={(e) => e.stopPropagation()}>
                            <RowActions
                              actions={[
                                { icon: Pencil, label: "Edit", onClick: () => openEditBed(bed) },
                                {
                                  icon: Trash2,
                                  label: "Delete",
                                  destructive: true,
                                  onClick: () => setDeleteBedTarget({ id: bed.id, bedNumber: bed.bedNumber }),
                                },
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </AdminCard>
          </>
        )}
      </div>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add bed"
        description={selectedWard ? `New bed in ${selectedWard.name}` : undefined}
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingBed}>
              {createBed.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add bed
            </MtButton>
          </>
        }
      >
        {bedFormFields}
      </FormDialog>

      <FormDialog
        open={!!editingBed}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBed(null)
            setForm(BED_EMPTY_FORM)
          }
        }}
        title="Edit bed"
        description={editingBed?.wardName ? `Ward ${editingBed.wardName}` : selectedWard ? `Ward ${selectedWard.name}` : undefined}
        onSubmit={handleEditBed}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditingBed(null)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingBed}>
              {updateBed.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {bedFormFields}
      </FormDialog>

      <FormDialog
        open={addWardOpen}
        onOpenChange={setAddWardOpen}
        title="Add ward"
        onSubmit={handleAddWard}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddWardOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingWard}>
              {createWard.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add ward
            </MtButton>
          </>
        }
      >
        {wardFormFields}
      </FormDialog>

      <FormDialog
        open={!!editingWard}
        onOpenChange={(open) => !open && setEditingWard(null)}
        title="Edit ward"
        description={editingWard?.code ? `Code ${editingWard.code}` : undefined}
        onSubmit={handleEditWard}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditingWard(null)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingWard}>
              {updateWard.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {wardFormFields}
      </FormDialog>

      <FormDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        title="Add bed category"
        onSubmit={handleAddCategory}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddCategoryOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingCategory}>
              {createCategory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add category
            </MtButton>
          </>
        }
      >
        {categoryFormFields}
      </FormDialog>

      <FormDialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        title="Edit bed category"
        description={editingCategory?.code ? `Code ${editingCategory.code}` : undefined}
        onSubmit={handleEditCategory}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditingCategory(null)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSavingCategory}>
              {updateCategory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {categoryFormFields}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteWardTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteWardTarget(null)
        }}
        title="Delete ward"
        description={`Delete "${deleteWardTarget?.name || "this ward"}"? Beds in this ward may also be affected. This cannot be undone.`}
        confirmLabel={deleteWard.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDeleteWard}
      />

      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryTarget(null)
        }}
        title="Delete bed category"
        description={`Delete "${deleteCategoryTarget?.name || "this category"}"? This cannot be undone.`}
        confirmLabel={deleteCategory.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDeleteCategory}
      />

      <ConfirmDialog
        open={!!deleteBedTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteBedTarget(null)
        }}
        title="Delete bed"
        description={`Delete bed "${deleteBedTarget?.bedNumber || ""}"? This cannot be undone.`}
        confirmLabel={deleteBed.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDeleteBed}
      />
    </div>
  )
}
