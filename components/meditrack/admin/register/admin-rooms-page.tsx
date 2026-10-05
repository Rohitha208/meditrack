"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import {
  useCreateRoom,
  useDeleteRoom,
  useGetRoomById,
  useGetRooms,
  useUpdateRoom,
  type MediTrackRoom,
} from "@/queries/meditrack/rooms"
import {
  ConfirmDialog,
  MtDataTable,
  RowActions,
  FormDialog,
  MtButton,
  DetailDrawer,
  InfoRow,
  TableSkeleton,
  StatusBadge,
  type MtColumn,
} from "@/components/meditrack/shared"
import { AdminPageHeader } from "@/components/meditrack/admin/register/AdminPageHeader"
import { AdminCard } from "@/components/meditrack/admin/register/AdminCard"
import { BranchFormField, useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"

const EMPTY_FORM = { name: "", roomType: "", floor: "" }

const ROOM_TYPES = ["Consultation", "Procedure", "OT", "Imaging", "Ward", "Isolation"] as const

function displayType(value?: string | null) {
  if (!value) return "—"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function AdminRoomsPage() {
  const { toast } = useToast()
  const {
    branchId,
    clinicId,
    hasBranch,
    branches,
    isLoadingBranches,
    noBranchMessage,
  } = useBranchScope()

  const { data: rooms = [], isLoading, isError, error } = useGetRooms(
    { clinicId, pageSize: 100 },
    hasBranch && !!clinicId
  )
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editing, setEditing] = useState<MediTrackRoom | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formBranchId, setFormBranchId] = useState("")

  const { data: viewedRoom, isLoading: isLoadingView } = useGetRoomById(viewId || "", !!viewId)
  const isSaving = createRoom.isPending || updateRoom.isPending

  const typeOptions = useMemo(() => {
    const extra = rooms
      .map((r) => r.roomType)
      .filter((type): type is string => !!type && !ROOM_TYPES.some((t) => t.toLowerCase() === type.toLowerCase()))
    return [...ROOM_TYPES, ...Array.from(new Set(extra))]
  }, [rooms])

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormBranchId(branchId)
    setAddOpen(true)
  }

  function openEdit(room: MediTrackRoom) {
    setEditing(room)
    setForm({
      name: room.name || "",
      roomType: room.roomType || "",
      floor: room.floor || "",
    })
    setFormBranchId(room.clinicId || branchId)
    setEditOpen(true)
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this room.", variant: "destructive" })
      return
    }
    if (!form.name.trim() || !form.roomType) {
      toast({ title: "Missing details", description: "Room name and type are required.", variant: "destructive" })
      return
    }

    try {
      const created = await createRoom.mutateAsync({
        clinicId: formBranchId,
        name: form.name.trim(),
        roomType: form.roomType,
        floor: form.floor.trim() || null,
        isActive: true,
      })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      toast({ title: "Room added", description: `${created.name} was added to this branch.` })
    } catch (err) {
      toast({ title: "Could not add room", description: getToastErrorMessage(err, "Failed to create room"), variant: "destructive" })
    }
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    if (!formBranchId) {
      toast({ title: "Branch required", description: "Select a branch for this room.", variant: "destructive" })
      return
    }
    if (!form.name.trim() || !form.roomType) {
      toast({ title: "Missing details", description: "Room name and type are required.", variant: "destructive" })
      return
    }

    try {
      const updated = await updateRoom.mutateAsync({
        id: editing.id,
        clinicId: formBranchId,
        name: form.name.trim(),
        roomType: form.roomType,
        floor: form.floor.trim() || null,
        isActive: editing.isActive,
      })
      setEditOpen(false)
      setEditing(null)
      toast({ title: "Room updated", description: `${updated.name || form.name.trim()} was saved.` })
    } catch (err) {
      toast({ title: "Could not save room", description: getToastErrorMessage(err, "Failed to update room"), variant: "destructive" })
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRoom.mutateAsync(deleteTarget.id)
      toast({ title: "Room deleted", description: `${deleteTarget.name} was removed.` })
      setDeleteTarget(null)
    } catch (err) {
      toast({ title: "Could not delete room", description: getToastErrorMessage(err, "Failed to delete room"), variant: "destructive" })
    }
  }

  const columns: MtColumn<MediTrackRoom>[] = [
    { key: "name", header: "Room", alwaysVisible: true, render: (r) => <span className="font-semibold text-adminreg-text">{r.name}</span>, sortValue: (r) => r.name },
    { key: "roomType", header: "Type", render: (r) => displayType(r.roomType), sortValue: (r) => r.roomType || "" },
    { key: "floor", header: "Floor", render: (r) => r.floor || "—", sortValue: (r) => r.floor || "" },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />,
      sortValue: (r) => (r.isActive ? "Active" : "Inactive"),
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
            { icon: Pencil, label: "Edit", onClick: () => openEdit(r) },
            {
              icon: Trash2,
              label: "Delete",
              destructive: true,
              onClick: () => setDeleteTarget({ id: r.id, name: r.name }),
            },
          ]}
        />
      ),
    },
  ]

  const roomFormFields = (
    <>
      <BranchFormField
        value={formBranchId}
        onValueChange={setFormBranchId}
        branches={branches}
        isLoading={isLoadingBranches}
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Room Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Consultation 1"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Room Type</Label>
        <Select value={form.roomType} onValueChange={(v) => setForm((f) => ({ ...f, roomType: v }))}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {typeOptions.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-adminreg-muted">Floor</Label>
        <Input
          value={form.floor}
          onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
          placeholder="e.g. Ground, 1, 2"
        />
      </div>
    </>
  )

  return (
    <div>
      <AdminPageHeader
        title="Rooms"
        subtitle="Consultation and procedure rooms — scoped by branch."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MtButton className="gap-2" onClick={openAdd} disabled={!hasBranch}>
              <Plus className="h-4 w-4" />
              Add room
            </MtButton>
          </div>
        }
      />

      <AdminCard title="Room Directory" noPadding>
        {!hasBranch ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{noBranchMessage}</p>
        ) : isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : isError ? (
          <p className="px-5 py-8 text-sm text-adminreg-red">{getToastErrorMessage(error, "Failed to load rooms")}</p>
        ) : (
          <MtDataTable
            columns={columns}
            rows={rooms}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => setViewId(r.id)}
            emptyTitle="No rooms yet"
            emptyDescription="Add a room to use it in doctor availability and appointments."
          />
        )}
      </AdminCard>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add room"
        onSubmit={handleAdd}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {createRoom.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add room
            </MtButton>
          </>
        }
      >
        {roomFormFields}
      </FormDialog>

      <FormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditing(null)
        }}
        title="Edit room"
        onSubmit={handleEdit}
        footer={
          <>
            <MtButton type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</MtButton>
            <MtButton type="submit" disabled={isSaving}>
              {updateRoom.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </MtButton>
          </>
        }
      >
        {roomFormFields}
      </FormDialog>

      <DetailDrawer
        open={!!viewId}
        onOpenChange={(open) => {
          if (!open) setViewId(null)
        }}
        title={viewedRoom?.name || "Room"}
      >
        {isLoadingView ? (
          <p className="text-sm text-adminreg-muted">Loading room…</p>
        ) : viewedRoom ? (
          <div className="divide-y divide-adminreg-border">
            <InfoRow label="Room" value={viewedRoom.name} />
            <InfoRow label="Type" value={displayType(viewedRoom.roomType)} />
            <InfoRow label="Floor" value={viewedRoom.floor || "—"} />
            <InfoRow label="Status" value={viewedRoom.isActive ? "Active" : "Inactive"} />
          </div>
        ) : (
          <p className="text-sm text-adminreg-muted">Room not found.</p>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete room"
        description={`Delete "${deleteTarget?.name || "this room"}"? This cannot be undone.`}
        confirmLabel={deleteRoom.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
