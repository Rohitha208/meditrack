"use client"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { Filter, Eye, Download, Loader2 } from "lucide-react"
import { InventoryData } from "@/queries/inventory/get-inventory"
import { useGetInventoryInfinite } from "@/queries/inventory/get-inventory"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import InventoryItemDetailsSheet from "./inventory-item-details-sheet"
import * as XLSX from 'xlsx'
import { toast } from "@/hooks/use-toast"

export type StockFilters = {
  search?: string
  batchNumber?: string
}

interface StockTabProps {
  clinicId: string
}

export default function StockTab({ clinicId }: StockTabProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<StockFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryData | null>(null)
  const [openDetailsSheet, setOpenDetailsSheet] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Function to export stock to Excel
  const handleExportToExcel = () => {
    setIsExporting(true);

    try {
      const allItems = data?.pages.flatMap(page => page.items) || [];

      if (!allItems || allItems.length === 0) {
        toast({
          title: "No Data",
          description: "No stock data available to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel export with only the specified columns
      const excelData = allItems.map((item) => ({
        'Item Name': item.product?.name || 'N/A',
        'Brand Name': item.product?.genericName || 'N/A',
        'Batch Number': item.batchNumber || 'N/A',
        'Quantity': item.quantityOnHand || 0,
        'Unit Cost': item.unitCost ? `₹${Number(item.unitCost).toFixed(2)}` : 'N/A',
        'Status': item.status || 'N/A'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 30 }, // Item Name
        { wch: 25 }, // Brand Name
        { wch: 15 }, // Batch Number
        { wch: 10 }, // Quantity
        { wch: 15 }, // Unit Cost
        { wch: 15 }  // Status
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Report');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `stock_report_export_${currentDate}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Exported ${allItems.length} items to Excel.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export stock data to Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useGetInventoryInfinite(
    {
      clinicId,
      pageSize,
      search: searchQuery,
      ...filters,
    },
    true
  )

  const activeFilterCount = Object.values(filters).filter(Boolean).length

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

  const handleViewDetails = (inventoryItem: InventoryData) => {
    setSelectedInventoryItem(inventoryItem)
    setOpenDetailsSheet(true)
  }

  const columns: ColumnDef<InventoryData>[] = [
    {
      accessorKey: "product.name",
      header: "Item Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.product?.name || 'N/A'}</div>
      )
    },
    {
      accessorKey: "product.brandName",
      header: "Brand Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.product?.name || 'N/A'}</div>
      )
    },
    {
      accessorKey: "quantityOnHand",
      header: "Current Stock",
      cell: ({ row }) => {
        const quantity = row.original.quantityOnHand
        const reorderThreshold = row.original.product?.reorderThreshold || 0
        const isLowStock = reorderThreshold > 0 && quantity <= reorderThreshold
        const isWarning = reorderThreshold > 0 && quantity <= reorderThreshold * 1.5

        return (
          <div className={`font-medium ${isLowStock ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-900 dark:text-gray-200'
            }`}>
            {quantity}
          </div>
        )
      }
    },
    {
      accessorKey: "product.reorderThreshold",
      header: "Min Threshold",
      cell: ({ row }) => (
        <div>{row.original.product?.reorderThreshold || 'N/A'}</div>
      )
    },
    {
      accessorKey: "unitCost",
      header: "Unit Cost",
      cell: ({ row }) => (
        <div>₹{row.original.unitCost?.toFixed(2) || '0.00'}</div>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status
        let color = ''
        let text = ''

        switch (status) {
          case 'In Stock':
            color = 'bg-green-100 text-green-800'
            text = 'In Stock'
            break
          case 'Out of Stock':
            color = 'bg-red-100 text-red-800'
            text = 'Out of Stock'
            break
          case 'Warning':
            color = 'bg-amber-100 text-amber-800'
            text = 'Warning'
            break
          case 'Low Stock':
            color = 'bg-orange-100 text-orange-800'
            text = 'Low Stock'
            break
          default:
            color = 'bg-gray-100 text-gray-800'
            text = 'Unknown'
        }

        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
            {text}
          </span>
        )
      }
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        return (
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleViewDetails(row.original)
              }}
              className="flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              View
            </Button>
          </div>
        )
      },
      meta: { className: "text-center" },
    },
  ]

  const allItems = data?.pages.flatMap(page => page.items) || []
  const totalPages = data?.pages[0]?.totalPages || 1

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stock Management</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting || !data || data.pages.length === 0}
            className="flex items-center gap-2"
            title="Export to Excel"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
              Export to Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          {filters.search && (
            <span className="bg-[#D2EFEC] text-[#1E3D3D] px-2 py-1 rounded text-xs">
              Search: {filters.search}
            </span>
          )}
          {filters.batchNumber && (
            <span className="bg-[#D2EFEC]/70 text-[#1E3D3D] px-2 py-1 rounded text-xs">
              Batch: {filters.batchNumber}
            </span>
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
              <Label htmlFor="search">Product Name</Label>
              <Input
                id="search"
                placeholder="Search product..."
                value={filters.search || ""}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                placeholder="Batch number..."
                value={filters.batchNumber || ""}
                onChange={(e) => setFilters(f => ({ ...f, batchNumber: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={allItems}
        searchPlaceholder="Search inventory..."
        onSearch={handleSearch}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onRowClick={handleViewDetails}
      />

      {/* Inventory Item Details Sheet */}
      <InventoryItemDetailsSheet
        inventoryItem={selectedInventoryItem}
        open={openDetailsSheet}
        onOpenChange={setOpenDetailsSheet}
      />
    </div>
  )
}
