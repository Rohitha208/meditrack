"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, PackageCheck, Clock, Check, AlertCircle, Eye, Printer, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { useGetPurchaseOrders } from "@/queries/purchaseOrder/get-purchaseOrder"
import { getPurchaseOrderById } from "@/queries/purchaseOrder/get-purchaseOrder-by-id"
import type { PurchaseOrderData } from "@/queries/purchaseOrder/create-purchaseOrder"
import PurchaseOrderDetailsSheet from "./purhchase-order-details-sheet"
import { formatDate } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useGetSupplier } from "@/queries/suppliers"
import * as XLSX from 'xlsx'
import { toast } from "../../ui/use-toast"
import Loader from "@/components/ui/loader"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

type PurchaseOrderFilters = {
  orderNumber?: string
  supplierName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

interface PurchaseOrdersTabProps {
  clinicId: string
  onNewOrder: () => void
}
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ordered", label: "Ordered" },
  { value: "partial", label: "Partial" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'ordered':
      return {
        color: 'bg-blue-100 text-blue-800',
        icon: <Clock className="w-3 h-3 mr-1" />
      }
    case 'received':
      return {
        color: 'bg-green-100 text-green-800',
        icon: <Check className="w-3 h-3 mr-1" />
      }
    case 'partial':
      return {
        color: 'bg-amber-100 text-amber-800',
        icon: <PackageCheck className="w-3 h-3 mr-1" />
      }
    case 'cancelled':
      return {
        color: 'bg-red-100 text-red-800',
        icon: <AlertCircle className="w-3 h-3 mr-1" />
      }
    default:
      return {
        color: 'bg-gray-100 text-gray-800',
        icon: null
      }
  }
}

// Format currency
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-"
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}


export default function PurchaseOrdersTab({ clinicId, onNewOrder }: PurchaseOrdersTabProps) {
  // Filters state
  const [filters, setFilters] = useState<PurchaseOrderFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<PurchaseOrderData | null>(null)
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSupplier({
    pageNumber: 1,
    pageSize: 100,
    filters: { clinicId },
    enabled: Boolean(clinicId),
  })

  const suppliers = suppliersData?.items || []
  const apiFilters = useMemo(() => {
    let supplierId: string | undefined = undefined;

    if (filters.supplierName) {
      const supplier = suppliers.find(
        s => s.name.toLowerCase() === filters.supplierName!.toLowerCase()
      );
      if (supplier) {
        supplierId = supplier.id;
      } else {
        // No matching supplier, ignore filter or show message
        supplierId = undefined;
      }
    }

    return {
      ...filters,
      supplierId, // backend filter
      clinicId,
      page,
      pageSize
    };
  }, [filters, clinicId, page, pageSize, suppliers]);

  const { data: poResponse, refetch } = useGetPurchaseOrders(apiFilters, !!clinicId)
  const purchaseOrders = poResponse?.data ?? []
  const totalPages = poResponse?.meta?.totalPages ?? 1

  useEffect(() => {
    if (clinicId) {
      refetch().then(() => setIsLoaded(true))
    }
  }, [clinicId, filters, refetch])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // Build export filters using resolved supplierId
  const buildExportFilters = () => {
    const { supplierName, dateFrom, dateTo, status, orderNumber } = filters
    let supplierId: string | undefined = undefined
    if (supplierName) {
      const supplier = suppliers.find(
        s => s.name.toLowerCase() === supplierName.toLowerCase()
      )
      if (supplier) supplierId = supplier.id
    }
    return { clinicId, dateFrom, dateTo, status, orderNumber, supplierId }
  }

  // Fetch all purchase orders across pages for export
  const fetchAllPurchaseOrders = async (): Promise<PurchaseOrderData[]> => {
    const { getPurchaseOrders } = await import("@/queries/purchaseOrder/get-purchaseOrder")
    let all: PurchaseOrderData[] = []
    let pageNumber = 1
    const perPage = 100
    const baseFilters = buildExportFilters()
    // Safety cap
    const MAX_PAGES = 200

    while (true) {
      const response = await getPurchaseOrders({ ...baseFilters, page: pageNumber, pageSize: perPage })
      const items = Array.isArray(response) ? response : response.data
      all = all.concat(items || [])
      if (!Array.isArray(response)) {
        const totalPages = response.meta?.totalPages ?? 1
        if (pageNumber >= totalPages) break
      } else {
        // If API returns a flat array, assume single page
        break
      }
      pageNumber++
      if (pageNumber > MAX_PAGES) {
        console.warn('Reached maximum page limit during export')
        break
      }
    }
    return all
  }

  // Export to Excel
  const handleExportToExcel = async () => {
    if (!clinicId) {
      toast({
        title: "Error",
        description: "Clinic ID not found. Please try again.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      const allOrders = await fetchAllPurchaseOrders()

      if (!allOrders || allOrders.length === 0) {
        toast({
          title: "No Data",
          description: "No purchase orders found to export.",
          variant: "destructive",
        })
        return
      }

      const excelData = allOrders.map((po) => ({
        'Order #': po.orderNumber || '',
        'Supplier': po.supplier?.name || '',
        'Order Date': po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '',
        'Expected Delivery': po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : '',
        'Actual Delivery': po.actualDeliveryDate ? new Date(po.actualDeliveryDate).toLocaleDateString() : '',
        'Status': po.status || '',
        'Total Amount (INR)': po.totalAmount ?? 0,
        'Discount %': po.discountPercentage ?? 0,
        'Discount Amount': po.discountedAmount ?? 0,
        'Extended Amount': po.extendedAmount ?? 0,
        'Notes': po.notes || ''
      }))

      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      worksheet['!cols'] = [
        { wch: 14 }, // Order #
        { wch: 28 }, // Supplier
        { wch: 14 }, // Order Date
        { wch: 18 }, // Expected Delivery
        { wch: 16 }, // Actual Delivery
        { wch: 12 }, // Status
        { wch: 18 }, // Total Amount
        { wch: 12 }, // Discount %
        { wch: 18 }, // Discount Amount
        { wch: 18 }, // Extended Amount
        { wch: 40 }, // Notes
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders')

      const currentDate = new Date().toISOString().split('T')[0]
      const filename = `purchase_orders_export_${currentDate}.xlsx`
      XLSX.writeFile(workbook, filename)

      toast({
        title: "Success",
        description: `Successfully exported ${allOrders.length} purchase orders to Excel.`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Error",
        description: "Failed to export purchase orders to Excel. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrintOrder = async (order: PurchaseOrderData) => {
    try {
      // Fetch the full order data including PDF
      const fullOrder = await getPurchaseOrderById(order.id!)

      if (fullOrder.pdfBase64) {
        try {
          const blob = await fetch(`data:application/pdf;base64,${fullOrder.pdfBase64}`).then(res => res.blob());
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Clean up the URL after a delay
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
          // Fallback to sheet display
          setSelectedOrderForPrint(fullOrder)
          setIsPrintSheetOpen(true)
        }
      } else {
        // Show sheet with no PDF message
        setSelectedOrderForPrint(fullOrder)
        setIsPrintSheetOpen(true)
      }
    } catch (error) {
      // Fallback to original order data
      setSelectedOrderForPrint(order)
      setIsPrintSheetOpen(true)
    }
  }

  const handleDownloadPDF = () => {
    if (selectedOrderForPrint?.pdfBase64) {
      const byteCharacters = atob(selectedOrderForPrint.pdfBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `PurchaseOrder_${selectedOrderForPrint.orderNumber}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const columns: ColumnDef<PurchaseOrderData>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ getValue }) => (
        <div className="font-medium">{getValue() as string}</div>
      )
    },
    {
      accessorKey: "supplier.name",
      header: "Supplier",
      cell: ({ row }) => row.original.supplier?.name || "-"
    },
    {
      accessorKey: "orderDate",
      header: "Date",
      cell: ({ getValue }) => {
        const date = getValue() as string
        return date ? new Date(date).toLocaleDateString() : "-"
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const badge = getStatusBadge(status);
        return (
          <span className={`px-2 py-1 text-xs font-medium ${badge.color} rounded-full flex items-center justify-center w-fit`}>
            {badge.icon}
            {status}
          </span>
        );
      }
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ getValue }) => {
        const amount = getValue() as number
        return amount ? `₹${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"
      }
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-[#D2EFEC]/50 border-[#1E3D3D]/40 text-[#1E3D3D] hover:text-[#1E3D3D] hover:border-[#1E3D3D]"
            onClick={() => {
              setSelectedOrderId(row.original.id || null);
              setIsSheetOpen(true);
            }}
          >
            <Eye className="mr-1 h-4 w-4" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-[#D2EFEC]/50 border-[#1E3D3D]/40 text-[#1E3D3D] hover:text-[#1E3D3D] hover:border-[#1E3D3D]"
            onClick={() => handlePrintOrder(row.original)}
          >
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>
      ),
      meta: { className: "text-center" },
    },
  ]
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Purchase Orders</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting || !clinicId}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <Loader size="sm" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button className="theme-button text-white" onClick={onNewOrder}>
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>
      </div>
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {filters.orderNumber && (
            <span className="bg-[#D2EFEC] text-[#1E3D3D] px-2 py-1 rounded text-xs">Order #: {filters.orderNumber}</span>
          )}
          {filters.supplierName && (
            <span className="bg-[#D2EFEC]/80 text-[#1E3D3D] px-2 py-1 rounded text-xs">Supplier: {filters.supplierName}</span>
          )}
          {filters.status && (
            <span className="bg-[#D2EFEC]/70 text-[#1E3D3D] px-2 py-1 rounded text-xs">Status: {filters.status}</span>
          )}
          {filters.dateFrom && (
            <span className="bg-[#D2EFEC]/60 text-[#1E3D3D] px-2 py-1 rounded text-xs">From: {formatDate(filters.dateFrom)}</span>
          )}
          {filters.dateTo && (
            <span className="bg-[#D2EFEC]/60 text-[#1E3D3D] px-2 py-1 rounded text-xs">To: {formatDate(filters.dateTo)}</span>
          )}
          <button
            className="text-xs text-gray-500 underline"
            onClick={() => setFilters({})}
          >
            Clear all
          </button>
        </div>
      )}
      {/* Filters Section */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({})} // Clear Filters
            >
              Clear Filters
            </Button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order-number">Order #</Label>
              <Input
                id="order-number"
                placeholder="Search by order number..."
                value={filters.orderNumber || ""}
                onChange={(e) => setFilters(f => ({ ...f, orderNumber: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-id">Supplier ID</Label>
              <Input
                id="supplier-id"
                placeholder="Supplier ID..."
                value={filters.supplierName || ""}
                onChange={(e) => setFilters(f => ({ ...f, supplierName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || ""}
                onValueChange={(val) => setFilters(f => ({ ...f, status: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 space-y-2 relative z-50">
                <Label htmlFor="date-from">Date From</Label>
                <DatePicker
                  selected={filters.dateFrom ? new Date(filters.dateFrom) : null}
                  onChange={(date) => {
                    const dateString = date ? date.toISOString().split('T')[0] : ''
                    setFilters(f => ({ ...f, dateFrom: dateString }))
                  }}
                  minDate={new Date("1900-01-01")}
                  maxDate={new Date()}
                  placeholderText="dd/mm/yyyy"
                  dateFormat="dd/MM/yyyy"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  popperPlacement="bottom-start"
                  popperClassName="z-[100]"
                  className="w-full z-[100] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3D3D] focus:border-transparent"
                />
              </div>
              <div className="flex-1 space-y-2 relative z-50">
                <Label htmlFor="date-to">Date To</Label>
                <DatePicker
                  selected={filters.dateTo ? new Date(filters.dateTo) : null}
                  onChange={(date) => {
                    const dateString = date ? date.toISOString().split('T')[0] : ''
                    setFilters(f => ({ ...f, dateTo: dateString }))
                  }}
                  minDate={filters.dateFrom ? new Date(filters.dateFrom) : new Date("1900-01-01")}
                  maxDate={new Date()}
                  placeholderText="dd/mm/yyyy"
                  dateFormat="dd/MM/yyyy"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  popperPlacement="bottom-start"
                  popperClassName="z-[100]"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3D3D] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )
      }


      {/* Table */}
      <DataTable
        columns={columns}
        data={purchaseOrders}
        searchColumn="orderNumber"
        searchPlaceholder="Search orders..."
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

      <PurchaseOrderDetailsSheet
        orderId={selectedOrderId}
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedOrderId(null);
        }}
      />
      <Sheet open={isPrintSheetOpen} onOpenChange={setIsPrintSheetOpen}>
        <SheetContent className="w-[800px] sm:max-w-[800px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Purchase Order PDF</span>
              {selectedOrderForPrint && (
                <Button
                  onClick={handleDownloadPDF}
                  className="theme-button text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-full">
            {selectedOrderForPrint?.pdfBase64 ? (
              <div className="h-full">
                <div className="mb-2 text-sm text-gray-600">
                  PDF Data Length: {selectedOrderForPrint.pdfBase64.length} characters
                </div>
                <object
                  data={`data:application/pdf;base64,${selectedOrderForPrint.pdfBase64}`}
                  type="application/pdf"
                  className="w-full h-[calc(100%-40px)] border border-gray-300 rounded"
                >
                  <p>Your browser does not support PDF display.
                    <button
                      onClick={handleDownloadPDF}
                      className="ml-2 text-[#1E3D3D] underline"
                    >
                      Click here to download the PDF
                    </button>
                  </p>
                </object>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No PDF available for this order
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div >
  )
}
