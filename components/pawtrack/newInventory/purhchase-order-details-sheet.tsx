"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useGetPurchaseOrderById } from "@/queries/purchaseOrder/get-purchaseOrder-by-id"
import { formatDate } from "@/lib/utils"
import { PurchaseOrderData, PurchaseOrderItem } from "@/queries/purchaseOrder/create-purchaseOrder"

// Format currency consistently
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-"
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

interface PurchaseOrderDetailsSheetProps {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PurchaseOrderDetailsSheet({
  orderId,
  open,
  onOpenChange,
}: PurchaseOrderDetailsSheetProps) {
  const { data: order, isLoading, isError } = useGetPurchaseOrderById(orderId || "", !!orderId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[40%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle  className="relative top-[-10px]">Purchase Order Details</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : isError ? (
          <div className="p-6 text-center text-red-500">Failed to load purchase order details.</div>
        ) : order ? (
          <div>
          <div className="space-y-6 p-4 border rounded-md">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Order #:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">{order.orderNumber || "-"}</p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Supplier:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">{order.supplier?.name || "-"}</p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Date:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {order.orderDate ? formatDate(order.orderDate) : "-"}
                </p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Delivery:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : "-"}
                </p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Actual Delivery:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : "-"}
                </p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">{order.status || "-"}</p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {/* Calculate subtotal as extendedAmount + discountedAmount */}
                  {formatCurrency((order.extendedAmount || 0) + (order.discountedAmount || 0))}
                </p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tax:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {/* Sum up tax amounts from items */}
                  {formatCurrency(order.items?.reduce((sum, item) => sum + (item.taxAmount || 0), 0) || 0)}
                </p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Discount:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(order.discountedAmount || 0)}
                </p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Extended Amount:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(order.extendedAmount || 0)}
                </p>
              </div>
              <div className="flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total:</h3>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(order.totalAmount || 0)}
                </p>
              </div>
              <div className="col-span-2 flex gap-4 items-center border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes:</h3>
                <p className="text-sm text-gray-900 dark:text-gray-100">{order.notes || "-"}</p>
              </div>
            </div>
            {/* Items Table */}
            {order.items && order.items.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Items</h3>
                <div className="overflow-x-auto border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="text-left px-2 py-2 font-medium">Product</th>
                        <th className="text-center px-2 py-2 font-medium">Quantity</th>
                        <th className="text-right px-2 py-2 font-medium">Unit Cost</th>
                        <th className="text-right px-2 py-2 font-medium">Discount %</th>
                        <th className="text-right px-2 py-2 font-medium">Disc. Amount</th>
                        <th className="text-right px-2 py-2 font-medium">Extended</th>
                        <th className="text-right px-2 py-2 font-medium">Tax</th>
                        <th className="text-right px-2 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(order.items as PurchaseOrderItem[]).map((item) => {
                        // Calculate total cost (quantity * unit cost)
                        const totalCost = item.quantityOrdered * item.unitCost
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-2 py-2 align-top">
                              <div className="font-medium">{item.product?.name || "-"}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {item.product?.productNumber || ""}
                                {item.product?.unitOfMeasure ? ` • ${item.product.unitOfMeasure}` : ""}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">{item.quantityOrdered}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                            <td className="px-2 py-2 text-right">{item.discountPercentage}%</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(item.discountedAmount)}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(item.extendedAmount)}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(item.taxAmount)}</td>
                            <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
          <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">No data found.</div>
        )}
      </SheetContent>
    </Sheet>
  )
}