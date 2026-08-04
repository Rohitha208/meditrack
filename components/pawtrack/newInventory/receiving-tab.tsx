"use client"
import { Button } from "@/components/ui/button"
import { Plus, PackageCheck, Clock, Check, AlertCircle, Eye, Printer, Download, Filter } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { useGetPurchaseOrders } from "@/queries/purchaseOrder/get-purchaseOrder"
import { useMemo, useState } from "react";
import { PurchaseOrderReceivingSheet } from "./purchase-order-receiving-sheet";
import { PurchaseOrderData } from "@/queries/purchaseOrder/create-purchaseOrder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Badge } from "@/components/ui/badge";
import { useGetSupplier } from "@/queries/suppliers"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"


type EntityFilters = {
  name?: string
  orderNumber?: string
  supplierName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

interface ReceivingTabProps {
  clinicId: string
  onNewEntity?: () => void
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ordered", label: "Ordered" },
  { value: "partial", label: "Partial" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ReceivingTab({ clinicId, onNewEntity = () => {} }: ReceivingTabProps) {
  const [filters, setFilters] = useState<EntityFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  // const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSupplier(1, 100, '', clinicId)
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


  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

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

  const columns: ColumnDef<PurchaseOrderData>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ getValue }) => (
        <div className="font-medium">{getValue() as string}</div>
      )
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
      accessorKey: "supplier.name",
      header: "Supplier",
      cell: ({ row }) => row.original.supplier?.name || "-"
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Expected Date",
      cell: ({ getValue }) => {
        const date = getValue() as string
        return date ? new Date(date).toLocaleDateString() : "-"
      }
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => {
        const items = row.original.items
        return items?.length ? `${items.length} items` : "-"
      }
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const status = row.original.status?.toLowerCase();
        const isReceived = status === 'received';

        return (
          <div className="flex gap-2 justify-center">
            {!isReceived && (
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-[#D2EFEC]/50 border-[#1E3D3D]/40 text-[#1E3D3D] hover:text-[#1E3D3D] hover:border-[#1E3D3D]"
                onClick={() => setSelectedOrderId(row.original.id || null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package-check mr-1 h-4 w-4"><path d="M16 16h6" /><path d="m22 10-5.5 5.5-3-3" /><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 4 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" /><path d="M16 5.3V8L12 10 8 8V5.3" /></svg> Receive
              </Button>
            )}
            {isReceived && (
              <span className="text-sm text-gray-500 italic">Fully Received</span>
            )}
          </div>
        );
      },
      meta: { className: "text-center" },
    },
  ]
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase Order Receiving</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </div>
      </div>
      {activeFilterCount > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Active Filters:</Label>
          <div className="flex flex-wrap gap-2">
            {filters.orderNumber && (
              <Badge variant="secondary" className="text-xs">Order #: {filters.orderNumber}</Badge>
            )}
            {filters.supplierName && (
              <Badge variant="secondary" className="text-xs">Supplier: {filters.supplierName}</Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="text-xs">Status: {filters.status}</Badge>
            )}
            {filters.dateFrom && (
              <Badge variant="secondary" className="text-xs">From: {filters.dateFrom}</Badge>
            )}
            {filters.dateTo && (
              <Badge variant="secondary" className="text-xs">To: {filters.dateTo}</Badge>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3D3D] focus:border-transparent"
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
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={purchaseOrders}
        searchColumn="orderNumber"
        searchPlaceholder="Search orders..."
        onSearch={handleSearch}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <PurchaseOrderReceivingSheet
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        purchaseOrderId={selectedOrderId}
      />

    </div>
  )
}


