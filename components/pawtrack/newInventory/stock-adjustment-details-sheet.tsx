"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { useGetPurchaseOrderHistoryByProductIdClinicId } from "@/queries/purchaseOrderReceiving/get-purchase-order-history-by-productId-clinidId"
import { useUpdatePurchaseOrderReceivingHistory } from "@/queries/purchaseOrderRecevingHiistory/update-purchase-order-receiving-history"
import { PurchaseOrderReceivingHistoryItem } from "@/queries/purchaseOrderRecevingHiistory/types"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"

type Props = {
  productId?: string
  clinicId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function StockAdjustmentDetailsSheet({ productId = "", clinicId, open, onOpenChange }: Props) {
  const { data: purchaseHistory = [], isLoading } =
    useGetPurchaseOrderHistoryByProductIdClinicId(productId || "", clinicId || "")

  const updateMutation = useUpdatePurchaseOrderReceivingHistory()

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<PurchaseOrderReceivingHistoryItem | null>(null)
  const [editQty, setEditQty] = useState<number>(0)

  const handleQtyInHandUpdate = () => {
    if (!editRow?.id) return
    updateMutation.mutate({
      id: editRow.id,
      purchaseOrderId: editRow.purchaseOrderId,
      purchaseOrderItemId: editRow.purchaseOrderItemId,
      productId: editRow.productId,
      clinicId: editRow.clinicId,
      quantityReceived: editRow.quantityReceived,
      batchNumber: editRow.batchNumber,
      expiryDate: editRow.expiryDate,
      dateOfManufacture: editRow.dateOfManufacture,
      receivedDate: editRow.receivedDate,
      receivedBy: editRow.receivedBy,
      notes: editRow.notes,
      unitCost: editRow.unitCost,
      lotNumber: editRow.lotNumber,
      supplierId: editRow.supplierId,
      quantityOnHand: editQty, // only updating Qty In Hand
      barcode: editRow.barcodeNumber,
      shelf: editRow.shelf,
      bin: editRow.bin,
    }, {
      onSuccess: () => {
        setEditOpen(false)
        setEditRow(null)
      }
    })
  }

  const columns: ColumnDef<PurchaseOrderReceivingHistoryItem>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => <div>{row.original.orderNumber || "-"}</div>,
    },
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => <div>{row.original.supplierName || "-"}</div>,
    },
    {
      accessorKey: "quantityReceived",
      header: "Qty Received",
      cell: ({ row }) => (
        <div className="text-right font-mono">{row.original.quantityReceived ?? 0}</div>
      ),
      meta: { className: "text-right" },
    },
    {
      accessorKey: "quantityInHand",
      header: "Qty In Hand",
      cell: ({ row }) => (
        <div className="text-right font-mono">{row.original.quantityInHand ?? 0}</div>
      ),
      meta: { className: "text-right" },
    },
    {
      accessorKey: "batchNumber",
      header: "Batch",
      cell: ({ row }) => <div>{row.original.batchNumber || "-"}</div>,
    },
    {
      id: "editQty",
      header: "Edit",
      cell: ({ row }) => {
        return (
          <div className="flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditRow(row.original)
                    setEditQty(row.original.quantityInHand ?? 0)
                    setEditOpen(true)
                  }}
                  aria-label="Edit Qty In Hand"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Qty In Hand</TooltipContent>
            </Tooltip>
          </div>
        )
      },
      meta: { className: "text-center" },
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Purchase Order History</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <DataTable<PurchaseOrderReceivingHistoryItem, any>
            columns={columns}
            data={purchaseHistory ?? []}
            searchPlaceholder="Search history..."
            onSearch={() => {}}
            page={1}
            pageSize={purchaseHistory?.length || 10}
            totalPages={1}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
          />
          {isLoading && <div className="text-sm text-gray-500 mt-2">Loading...</div>}
          {!isLoading && (purchaseHistory?.length ?? 0) === 0 && (
            <div className="text-sm text-gray-500 mt-2">No purchase order history found.</div>
          )}
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Qty In Hand</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {editRow?.orderNumber ? <span className="font-mono">#{editRow.orderNumber}</span> : null}
                {editRow?.batchNumber ? (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs">
                    Batch {editRow.batchNumber}
                  </span>
                ) : null}
                {editRow?.supplierName ? (
                  <span className="text-xs text-gray-600">• {editRow.supplierName}</span>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editQty">Qty In Hand</Label>
                <Input
                  id="editQty"
                  type="number"
                  min={0}
                  value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value))}
                />
                <div className="text-xs text-muted-foreground">
                  Current: <span className="font-mono">{editRow?.quantityInHand ?? 0}</span>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleQtyInHandUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}