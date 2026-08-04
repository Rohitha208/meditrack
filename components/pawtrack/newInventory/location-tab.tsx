"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { useGetInventoryInfinite } from "@/queries/inventory/get-inventory"
import { useGetPurchaseOrders } from "@/queries/purchaseOrder/get-purchaseOrder"
import { Filter, Loader2, Eye, MapPin, Edit, Save, X, AlertTriangle } from "lucide-react"
import { InventoryData } from "@/queries/inventory/get-inventory"
import { Badge } from "../../ui/badge"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { toast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useUpdateInventoryLocation } from "@/queries/inventory/update-inventory-location"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { useGetReceivedPurchaseOrders } from "@/queries/purchaseOrderReceiving/get-received-purchase-orders"
import { useUpdateReceivingHistory } from "@/queries/purchaseOrderReceiving/update-receiving-history"
import { useUpdatePurchaseOrderReceivingHistory } from "@/queries/purchaseOrderRecevingHiistory/update-purchase-order-receiving-history"
import { useGetPurchaseOrderReceivingHistory } from "@/queries/purchaseOrderRecevingHiistory/get-purchase-order-receiving-history"
import { PurchaseOrderData, PurchaseOrderItem } from "@/queries/purchaseOrder/create-purchaseOrder"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LocationData } from "../map/hooks/useMapAdvanced"
import * as XLSX from 'xlsx';
import { Download } from "lucide-react"

interface LocationsTabProps {
  clinicId: string
}

// Form schema for location assignment
const locationFormSchema = z.object({
  shelf: z.string().min(1, "Shelf is required"),
  bin: z.string().min(1, "Bin is required"),
  notes: z.string().optional(),
})

type LocationFormValues = z.infer<typeof locationFormSchema>

// Type for batch data
interface BatchData {
  productId: string
  productName: string
  batchNumber: string
  totalQuantity: number
  location: string | null
  expirationDate: string | null
  receivedDate: string | null
  reorderThreshold: number
  items: InventoryData[]
  // Purchase order information
  orderNumber?: string
  supplierName?: string
  quantityReceived?: number
  isReceivedItem?: boolean
  // Purchase order specific fields
  purchaseOrderId?: string
  purchaseOrderItemId?: string
  quantityOrdered?: number
  unitCost?: number
  isPurchaseOrderItem?: boolean
  // Shelf and bin information
  shelf?: string | null
  bin?: string | null
}



export interface LocationFilters {
  search?: string
  shelf?: string
  bin?: string
  batchNumber?: string
  hasLocation?: boolean
}


export default function LocationsTab({ clinicId }: LocationsTabProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<LocationFilters>({})
  const [openFilter, setOpenFilter] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<BatchData | null>(null)
  const [activeTab, setActiveTab] = useState<"located" | "unlocated">("unlocated")
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Function to export batches to Excel
  const handleExportToExcel = () => {
    setIsExporting(true);
    
    try {
      // Get all batches that are currently loaded and have a location
      const locatedBatches = batches.filter(batch => 
        batch.location || (batch.shelf && batch.bin)
      );
      
      if (locatedBatches.length === 0) {
        toast({
          title: "No Data",
          description: "No located batches found to export.",
          variant: "destructive",
        });
        return;
      }
      
      // Prepare data for Excel export
      const excelData = locatedBatches.map((batch) => ({
        'Product Name': batch.productName || 'N/A',
        'Batch Number': batch.batchNumber || 'N/A',
        'Quantity': batch.totalQuantity || 0,
        'Location': batch.location || 'N/A',
        'Shelf': batch.shelf || 'N/A',
        'Bin': batch.bin || 'N/A',
        'Expiration Date': batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : 'N/A',
        'Received Date': batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString() : 'N/A',
        'Reorder Threshold': batch.reorderThreshold || 0,
        'Order Number': batch.orderNumber || 'N/A',
        'Supplier': batch.supplierName || 'N/A',
        'Unit Cost': batch.unitCost ? `$${Number(batch.unitCost).toFixed(2)}` : 'N/A',
        'Total Value': batch.unitCost && batch.totalQuantity 
          ? `$${(Number(batch.unitCost) * Number(batch.totalQuantity)).toFixed(2)}` 
          : 'N/A'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const columnWidths = [
        { wch: 30 }, // Product Name
        { wch: 15 }, // Batch Number
        { wch: 10 }, // Quantity
        { wch: 20 }, // Location
        { wch: 10 }, // Shelf
        { wch: 10 }, // Bin
        { wch: 15 }, // Expiration Date
        { wch: 15 }, // Received Date
        { wch: 15 }, // Reorder Threshold
        { wch: 15 }, // Order Number
        { wch: 25 }, // Supplier
        { wch: 15 }, // Unit Cost
        { wch: 15 }  // Total Value
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Located Batches');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `located_batches_export_${currentDate}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Exported ${locatedBatches.length} located batches to Excel.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export located batches to Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const apiFilters = useMemo(() => {
    return {
      clinicId,
      pageSize,
      search: filters.search || searchQuery, // unify search
      shelf: filters.shelf,
      bin: filters.bin,
      batchNumber: filters.batchNumber,
      hasLocation: filters.hasLocation,
    }
  }, [clinicId, pageSize, searchQuery, filters])


  const { data } = useGetInventoryInfinite(apiFilters, !!clinicId)


  const activeFilterCount = Object.values(filters).filter(Boolean).length



  // Fetch purchase orders with received and partial status
  const { data: poResponseForBatches } = useGetPurchaseOrders(
    {
      clinicId,
      status: "received,partial",
      pageSize: 100 // Get more purchase orders to process
    },
    !!clinicId
  )
  const purchaseOrders = poResponseForBatches?.data ?? []



  // Mutation for updating inventory location
  const updateLocationMutation = useUpdateInventoryLocation()

  // Query for received purchase orders
  const { data: receivedItems = [] } = useGetReceivedPurchaseOrders(
    {
      clinicId,
    },
    !!clinicId
  )

  // Query for purchase order receiving history (includes shelf and bin data)
  const { data: receivingHistoryItems = [] } = useGetPurchaseOrderReceivingHistory(
    {
      clinicId,
    },
    !!clinicId
  )


  // Mutation for updating receiving history
  const updateReceivingHistoryMutation = useUpdateReceivingHistory()

  // Mutation for updating purchase order receiving history
  const updatePurchaseOrderReceivingHistoryMutation = useUpdatePurchaseOrderReceivingHistory()

  console.log('Update receiving history mutation:', updateReceivingHistoryMutation)



  // Form for location assignment
  const locationForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      shelf: "",
      bin: "",
      notes: "",
    },
  })

  // Group inventory items by batch and include purchase orders and receiving history
  const batches = useMemo(() => {
    const allItems = data?.pages.flatMap(page => page.items) || []
    const batchMap = new Map<string, BatchData>()

    // Process inventory items
    allItems.forEach(item => {
      const batchKey = `${item.productId}-${item.batchNumber}`

      if (!batchMap.has(batchKey)) {
        batchMap.set(batchKey, {
          productId: item.productId,
          productName: item.product?.name || 'N/A',
          batchNumber: item.batchNumber || 'N/A',
          totalQuantity: 0,
          location: item.location,
          expirationDate: item.expirationDate,
          receivedDate: item.receivedDate,
          reorderThreshold: item.product?.reorderThreshold || 0,
          items: [],
          isReceivedItem: false,
          isPurchaseOrderItem: false
        })
      }

      const batch = batchMap.get(batchKey)!
      batch.totalQuantity += item.quantityOnHand
      batch.items.push(item)

      // Use the first location found for the batch
      if (!batch.location && item.location) {
        batch.location = item.location
      }
    })

    // Process purchase order items
    purchaseOrders.forEach((purchaseOrder: PurchaseOrderData) => {
      purchaseOrder.items?.forEach((item: PurchaseOrderItem) => {
        if (item.batchNumber) {
          const batchKey = `${item.productId}-${item.batchNumber}`

          if (!batchMap.has(batchKey)) {
            // Create new batch for purchase order item
            batchMap.set(batchKey, {
              productId: item.productId,
              productName: item.product?.name || 'N/A',
              batchNumber: item.batchNumber,
              totalQuantity: item.quantityReceived || 0,
              location: null, // Purchase order items don't have location initially
              expirationDate: item.expirationDate || null,
              receivedDate: item.actualDeliveryDate || null,
              reorderThreshold: 0,
              items: [],
              orderNumber: purchaseOrder.orderNumber,
              supplierName: purchaseOrder.supplier?.name,
              quantityReceived: item.quantityReceived,
              quantityOrdered: item.quantityOrdered,
              unitCost: item.unitCost,
              purchaseOrderId: purchaseOrder.id,
              purchaseOrderItemId: item.id,
              isReceivedItem: false,
              isPurchaseOrderItem: true
            })
          } else {
            // Update existing batch with purchase order info
            const batch = batchMap.get(batchKey)!
            batch.totalQuantity += (item.quantityReceived || 0)
            batch.orderNumber = purchaseOrder.orderNumber
            batch.supplierName = purchaseOrder.supplier?.name
            batch.quantityReceived = (batch.quantityReceived || 0) + (item.quantityReceived || 0)
            batch.quantityOrdered = (batch.quantityOrdered || 0) + item.quantityOrdered
            batch.unitCost = item.unitCost
            batch.purchaseOrderId = purchaseOrder.id
            batch.purchaseOrderItemId = item.id
            batch.isPurchaseOrderItem = true
          }
        }
      })
    })

    // Process received purchase order items
    receivedItems.forEach(receivedItem => {
      const batchKey = `${receivedItem.productId}-${receivedItem.batchNumber}`

      if (!batchMap.has(batchKey)) {
        // Create new batch for received item
        const hasShelfBin = receivedItem.shelf && receivedItem.bin;
        const location = hasShelfBin ? `${receivedItem.shelf}-${receivedItem.bin}` : (receivedItem.location || null);

        batchMap.set(batchKey, {
          productId: receivedItem.productId,
          productName: receivedItem.productName || 'N/A',
          batchNumber: receivedItem.batchNumber,
          totalQuantity: receivedItem.quantityReceived,
          location: location,
          expirationDate: receivedItem.expiryDate || null,
          receivedDate: receivedItem.receivedDate || null,
          reorderThreshold: 0,
          items: [],
          orderNumber: receivedItem.orderNumber,
          supplierName: receivedItem.supplierName,
          quantityReceived: receivedItem.quantityReceived,
          isReceivedItem: true,
          isPurchaseOrderItem: false,
          shelf: receivedItem.shelf || null,
          bin: receivedItem.bin || null
        })
      } else {
        // Update existing batch with received item info
        const batch = batchMap.get(batchKey)!
        batch.totalQuantity += receivedItem.quantityReceived
        batch.orderNumber = receivedItem.orderNumber
        batch.supplierName = receivedItem.supplierName
        batch.quantityReceived = (batch.quantityReceived || 0) + receivedItem.quantityReceived
        batch.isReceivedItem = true

        // Update shelf and bin info
        if (receivedItem.shelf && receivedItem.bin) {
          batch.shelf = receivedItem.shelf
          batch.bin = receivedItem.bin
          batch.location = `${receivedItem.shelf}-${receivedItem.bin}`
        } else if (!batch.location && receivedItem.location) {
          batch.location = receivedItem.location
        }
      }
    })

    // Process purchase order receiving history items (includes shelf and bin data)
    receivingHistoryItems.forEach(historyItem => {
      const batchKey = `${historyItem.productId}-${historyItem.batchNumber}`

      if (!batchMap.has(batchKey)) {
        // Create new batch for receiving history item
        const hasShelfBin = historyItem.shelf && historyItem.bin;
        const location = hasShelfBin ? `${historyItem.shelf}-${historyItem.bin}` : null;

        batchMap.set(batchKey, {
          productId: historyItem.productId,
          productName: historyItem.productName || 'N/A',
          batchNumber: historyItem.batchNumber,
          totalQuantity: historyItem.quantityReceived,
          location: location,
          expirationDate: historyItem.expiryDate || null,
          receivedDate: historyItem.receivedDate || null,
          reorderThreshold: 0,
          items: [],
          orderNumber: historyItem.orderNumber,
          supplierName: historyItem.supplierName,
          quantityReceived: historyItem.quantityReceived,
          isReceivedItem: true,
          isPurchaseOrderItem: false,
          shelf: historyItem.shelf || null,
          bin: historyItem.bin || null
        })
      } else {
        // Update existing batch with receiving history info
        const batch = batchMap.get(batchKey)!
        batch.totalQuantity += historyItem.quantityReceived
        batch.orderNumber = historyItem.orderNumber
        batch.supplierName = historyItem.supplierName
        batch.quantityReceived = (batch.quantityReceived || 0) + historyItem.quantityReceived
        batch.isReceivedItem = true

        // Update shelf and bin info from receiving history
        if (historyItem.shelf && historyItem.bin) {
          batch.shelf = historyItem.shelf
          batch.bin = historyItem.bin
          batch.location = `${historyItem.shelf}-${historyItem.bin}`
        }
      }
    })

    return Array.from(batchMap.values())
  }, [data, purchaseOrders, receivedItems, receivingHistoryItems])

  // Filter batches based on active tab and shelf/bin data
  const filteredBatches = useMemo(() => {
    let filtered: BatchData[] = [];

    if (activeTab === "located") {
      // Show data where shelf and bin are not null
      filtered = batches.filter(batch => {
        // Check if batch has location OR if it has shelf and bin data
        const hasLocation = batch.location;
        const hasShelfBin = batch.shelf && batch.bin;
        return hasLocation || hasShelfBin;
      })
    } else {
      // Show data where shelf and bin are null (unlocated)
      filtered = batches.filter(batch => {
        // Check if batch has no location AND no shelf/bin data
        const hasLocation = batch.location;
        const hasShelfBin = batch.shelf && batch.bin;
        return !hasLocation && !hasShelfBin;
      })
    }

    // 🔹 Apply filters from state
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(batch =>
        batch.productName.toLowerCase().includes(query) ||
        batch.batchNumber.toLowerCase().includes(query) ||
        batch.supplierName?.toLowerCase().includes(query) ||
        batch.orderNumber?.toLowerCase().includes(query)
      );
    }

    if (filters.shelf) {
      filtered = filtered.filter(batch => batch.shelf?.toLowerCase() === filters.shelf!.toLowerCase());
    }

    if (filters.bin) {
      filtered = filtered.filter(batch => batch.bin?.toLowerCase() === filters.bin!.toLowerCase());
    }

    if (filters.batchNumber) {
      filtered = filtered.filter(batch =>
        batch.batchNumber.toLowerCase().includes(filters.batchNumber!.toLowerCase())
      );
    }


    if (filters.hasLocation !== undefined) {
      filtered = filtered.filter(batch => {
        const hasLocation = batch.location || (batch.shelf && batch.bin);
        return filters.hasLocation ? !!hasLocation : !hasLocation;
      });
    }

    // Sort by received date, then batch
    return filtered.sort((a, b) => {
      if (a.receivedDate && b.receivedDate) {
        return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
      } else if (a.receivedDate) {
        return -1;
      } else if (b.receivedDate) {
        return 1;
      }
      return a.batchNumber.localeCompare(b.batchNumber);
    });
  }, [batches, activeTab, filters]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

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

  const handleAssignLocation = (batch: BatchData) => {
    setSelectedBatch(batch)
    // Pre-fill form with existing shelf/bin data or location
    if (batch.shelf && batch.bin) {
      locationForm.reset({
        shelf: batch.shelf,
        bin: batch.bin,
        notes: "",
      })
    } else if (batch.location) {
      const locationParts = batch.location.split('-')
      locationForm.reset({
        shelf: locationParts[0] || "",
        bin: locationParts[1] || "",
        notes: "",
      })
    } else {
      locationForm.reset({
        shelf: "",
        bin: "",
        notes: "",
      })
    }
    setLocationDialogOpen(true)
  }

  const handleSaveLocation = async (values: LocationFormValues) => {
    if (!selectedBatch) return

    const newLocation = `${values.shelf}-${values.bin}`

    try {
      // First check if this is a receiving history item that needs to be updated
      const receivingHistoryItem = receivingHistoryItems.find(item =>
        item.productId === selectedBatch.productId &&
        item.batchNumber === selectedBatch.batchNumber
      )

      if (receivingHistoryItem) {
        // Handle receiving history items using useUpdatePurchaseOrderReceivingHistory
        const updateData = {
          id: receivingHistoryItem.id,
          purchaseOrderId: receivingHistoryItem.purchaseOrderId,
          purchaseOrderItemId: receivingHistoryItem.purchaseOrderItemId,
          productId: receivingHistoryItem.productId,
          clinicId: clinicId,
          quantityReceived: receivingHistoryItem.quantityReceived,
          batchNumber: receivingHistoryItem.batchNumber,
          expiryDate: receivingHistoryItem.expiryDate,
          dateOfManufacture: receivingHistoryItem.dateOfManufacture,
          receivedDate: receivingHistoryItem.receivedDate,
          receivedBy: receivingHistoryItem.receivedBy,
          notes: values.notes || receivingHistoryItem.notes,
          unitCost: receivingHistoryItem.unitCost,
          lotNumber: receivingHistoryItem.lotNumber,
          supplierId: receivingHistoryItem.supplierId,
          quantityOnHand: receivingHistoryItem.quantityOnHand || receivingHistoryItem.quantityReceived,
          barcode: receivingHistoryItem.barcode,
          shelf: values.shelf,
          bin: values.bin,
        }

        console.log('Updating receiving history item with data:', updateData)

        // Use the purchase order receiving history mutation (this goes to /api/purchaseOrderRecevingHiistory/[id])
        const result = await updatePurchaseOrderReceivingHistoryMutation.mutateAsync(updateData)
        console.log('Update receiving history result:', result)
      } else if (selectedBatch.isReceivedItem) {
        // Handle received purchase order items using useUpdateReceivingHistory
        const receivedItem = receivedItems.find(item =>
          item.productId === selectedBatch.productId &&
          item.batchNumber === selectedBatch.batchNumber
        )

        console.log('Found received item:', receivedItem)
        console.log('Selected batch:', selectedBatch)

        if (receivedItem) {
          const updateData = {
            id: receivedItem.id,
            purchaseOrderId: receivedItem.purchaseOrderId,
            purchaseOrderItemId: receivedItem.purchaseOrderItemId,
            productId: receivedItem.productId,
            clinicId: clinicId,
            quantityReceived: receivedItem.quantityReceived,
            batchNumber: receivedItem.batchNumber,
            expiryDate: receivedItem.expiryDate,
            receivedDate: receivedItem.receivedDate,
            receivedBy: receivedItem.receivedBy,
            notes: values.notes || receivedItem.notes,
            unitCost: receivedItem.unitCost,
            lotNumber: receivedItem.lotNumber,
            supplierId: receivedItem.supplierId,
            quantityOnHand: receivedItem.quantityInHand || receivedItem.quantityReceived,
            barcode: receivedItem.barcode,
            shelf: values.shelf,
            bin: values.bin,
          }

          console.log('Updating received item with data:', updateData)

          // Use the correct mutation for received items (this goes to /api/purchaseOrderReceiving/[id])
          const result = await updateReceivingHistoryMutation.mutateAsync(updateData)
          console.log('Update result:', result)
        }
      } else if (selectedBatch.isPurchaseOrderItem) {
        // Handle purchase order items - create received item or update existing
        const receivedItem = receivedItems.find(item =>
          item.productId === selectedBatch.productId &&
          item.batchNumber === selectedBatch.batchNumber &&
          item.purchaseOrderItemId === selectedBatch.purchaseOrderItemId
        )

        console.log('Found purchase order item:', receivedItem)
        console.log('Selected batch (PO):', selectedBatch)

        if (receivedItem) {
          const updateData = {
            id: receivedItem.id,
            purchaseOrderId: receivedItem.purchaseOrderId,
            purchaseOrderItemId: receivedItem.purchaseOrderItemId,
            productId: receivedItem.productId,
            clinicId: clinicId,
            quantityReceived: receivedItem.quantityReceived,
            batchNumber: receivedItem.batchNumber,
            expiryDate: receivedItem.expiryDate,
            receivedDate: receivedItem.receivedDate,
            receivedBy: receivedItem.receivedBy,
            notes: values.notes || receivedItem.notes,
            unitCost: receivedItem.unitCost,
            lotNumber: receivedItem.lotNumber,
            supplierId: receivedItem.supplierId,
            quantityOnHand: receivedItem.quantityInHand || receivedItem.quantityReceived,
            barcode: receivedItem.barcode,
            shelf: values.shelf,
            bin: values.bin,
          }

          console.log('Updating PO item with data:', updateData)

          // Use the correct mutation for received items
          const result = await updateReceivingHistoryMutation.mutateAsync(updateData)
          console.log('Update PO result:', result)
        } else {
          // Create new received item for purchase order item
          // This would require a new API call to create received item
          toast({
            title: "Info",
            description: "Location will be assigned when item is received",
          })
        }
      } else {
        // Handle inventory items
        const updatePromises = selectedBatch.items.map(item =>
          updateLocationMutation.mutateAsync({
            id: item.id,
            location: newLocation,
            notes: values.notes,
          })
        )
        await Promise.all(updatePromises)
      }

      toast({
        title: "Location Updated",
        description: `Location ${newLocation} assigned to batch ${selectedBatch.batchNumber}`,
        variant: "success",
      })

      setLocationDialogOpen(false)
      setSelectedBatch(null)
      locationForm.reset()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update location",
        variant: "error",
      })
    }
  }



  const getLocationDisplay = (batch: BatchData) => {
    // Check if we have shelf and bin data directly
    if (batch.shelf && batch.bin) {
      return (
        <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#1E3D3D]" />
          <span className="font-medium">Shelf {batch.shelf}</span>
          <span className="text-gray-500">•</span>
          <span className="font-medium">Bin {batch.bin}</span>
        </div>
      )
    }

    // Fall back to location string
    if (batch.location) {
      const parts = batch.location.split('-')
      if (parts.length >= 2) {
        return (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#1E3D3D]" />
            <span className="font-medium">Shelf {parts[0]}</span>
            <span className="text-gray-500">•</span>
            <span className="font-medium">Bin {parts[1]}</span>
          </div>
        )
      }
      return batch.location
    }

    return "Not assigned"
  }





  const getColumns = (activeTab: "located" | "unlocated"): ColumnDef<BatchData>[] => {
    const baseColumns: ColumnDef<BatchData>[] = [
      {
        accessorKey: "orderNumber",
        header: "Order Number",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.orderNumber ? (
              <div className="flex items-center gap-1">
                <span className="text-[#1E3D3D] font-medium">{row.original.orderNumber}</span>
                {row.original.isReceivedItem && (
                  <Badge variant="outline" className="text-xs">Received</Badge>
                )}
              </div>
            ) : (
              <span className="text-gray-500">N/A</span>
            )}
          </div>
        )
      },
      {
        accessorKey: "productName",
        header: "Product Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.productName}</div>
        )
      },
      {
        accessorKey: "batchNumber",
        header: "Batch Number",
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.original.batchNumber}</div>
        )
      },
      {
        accessorKey: "supplierName",
        header: "Supplier",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.supplierName || <span className="text-gray-500">N/A</span>}
          </div>
        )
      },
      {
        accessorKey: "expirationDate",
        header: "Expiry Date",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.expirationDate ? formatDate(row.original.expirationDate) : 'N/A'}
          </div>
        )
      },
      {
        accessorKey: "receivedDate",
        header: "Received Date",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.receivedDate ? formatDate(row.original.receivedDate) : 'N/A'}
          </div>
        )
      },
    ]

    // Add location column only for located batches tab
    if (activeTab === "located") {
      baseColumns.push({
        accessorKey: "location",
        header: "Current Location",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {getLocationDisplay(row.original)}
          </div>
        )
      })
    }

    // Add actions column
    baseColumns.push({
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const batch = row.original
        return (
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAssignLocation(batch);
              }}
              className="flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              {(batch.location || (batch.shelf && batch.bin)) ? 'Update' : 'Assign'}
            </Button>
          </div>
        )
      },
      meta: { className: "text-center" },
    })

    return baseColumns
  }




  const totalPages = data?.pages[0]?.totalPages || 1

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location Management</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Assign and update shelf/bin locations for inventory and received items.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting || activeTab === 'unlocated'}
            className="flex items-center gap-2"
            title={activeTab === 'unlocated' ? 'Only available for located batches' : 'Export to Excel'}
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

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          {filters.search && (
            <span className="bg-[#D2EFEC] text-[#1E3D3D] px-2 py-1 rounded text-xs">
              Search: {filters.search}
            </span>
          )}
          {filters.shelf && (
            <span className="bg-[#D2EFEC]/80 text-[#1E3D3D] px-2 py-1 rounded text-xs">
              Shelf: {filters.shelf}
            </span>
          )}
          {filters.bin && (
            <span className="bg-[#D2EFEC]/70 text-[#1E3D3D] px-2 py-1 rounded text-xs">
              Bin: {filters.bin}
            </span>
          )}
          {filters.batchNumber && (
            <span className="bg-[#D2EFEC]/60 text-[#1E3D3D] px-2 py-1 rounded text-xs">
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
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({})} // Clear all filters
            >
              Clear Filters
            </Button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by product name, batch number..."
                value={filters.search || ""}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>

            {/* Shelf */}
            <div className="space-y-2">
              <Label htmlFor="shelf">Shelf</Label>
              <Input
                id="shelf"
                placeholder="e.g., A, B, 1, 2"
                value={filters.shelf || ""}
                onChange={(e) => setFilters(f => ({ ...f, shelf: e.target.value }))}
              />
            </div>

            {/* Bin */}
            <div className="space-y-2">
              <Label htmlFor="bin">Bin</Label>
              <Input
                id="bin"
                placeholder="e.g., 01, 02, 15"
                value={filters.bin || ""}
                onChange={(e) => setFilters(f => ({ ...f, bin: e.target.value }))}
              />
            </div>

            {/* Batch Number */}
            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                placeholder="Enter batch number"
                value={filters.batchNumber || ""}
                onChange={(e) => setFilters(f => ({ ...f, batchNumber: e.target.value }))}
              />
            </div>

            {/* Product Type */}


            {/* Has Location */}
            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="hasLocation"
                checked={filters.hasLocation === true}
                onCheckedChange={(checked) =>
                  setFilters(f => ({ ...f, hasLocation: checked ? true : undefined }))
                }
              />
              <Label htmlFor="hasLocation">Only show batches with assigned locations</Label>
            </div>
          </div>
        </div>
      )}


      {/* Tabs for Located and Unlocated Batches */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "located" | "unlocated")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unlocated" className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Unlocated Batches
            <Badge variant="secondary" className="ml-1">
              {batches.filter(batch => !batch.location && !(batch.shelf && batch.bin)).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="located" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Located Batches
            <Badge variant="secondary" className="ml-1">
              {batches.filter(batch => batch.location || (batch.shelf && batch.bin)).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unlocated" className="space-y-4">
          <div className="bg-gradient-to-r from-[#D2EFEC]/40 to-[#D2EFEC]/70 border border-[#1E3D3D]/15 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#1E3D3D]" />
              <div>
                <h4 className="font-medium text-[#1E3D3D]">Unlocated Batches</h4>
                <p className="text-sm text-[#1E3D3D]/70">
                  These batches need shelf and bin locations assigned. Click &quot;Assign&quot; to set their storage location.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <DataTable
              columns={getColumns(activeTab)}
              data={filteredBatches}
              searchPlaceholder="Search by product name or batch number..."
              onSearch={handleSearch}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </TabsContent>

        <TabsContent value="located" className="space-y-4">
          <div className="bg-gradient-to-r from-[#D2EFEC]/60 to-[#D2EFEC] border border-[#1E3D3D]/15 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#1E3D3D]" />
              <div>
                <h4 className="font-medium text-[#1E3D3D]">Located Batches</h4>
                <p className="text-sm text-[#1E3D3D]/70">
                  These batches have assigned shelf and bin locations. Click &quot;Update&quot; to modify their storage location.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <DataTable
              columns={getColumns(activeTab)}
              data={filteredBatches}
              searchPlaceholder="Search by product name, batch number, or location..."
              onSearch={handleSearch}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </TabsContent>


      </Tabs>

      {/* Location Assignment Sheet */}
      <Sheet open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="relative top-[-10px]">
              {selectedBatch?.location ? 'Update Location' : 'Assign Location'}
              {selectedBatch?.isReceivedItem ? ' (Received Item)' :
                selectedBatch?.isPurchaseOrderItem ? ' (Purchase Order Item)' : ' (Inventory Batch)'}
            </SheetTitle>
          </SheetHeader>
          <Form {...locationForm}>
            <form onSubmit={locationForm.handleSubmit(handleSaveLocation)} className="space-y-4 border p-4 rounded-md h-full overflow-y-auto">
              {selectedBatch && (
                <div className="rounded-md border border-gray-200 bg-gray-100 dark:bg-gray-900/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{selectedBatch.productName}</p>
                    <div className="text-[10px]">
                      {selectedBatch.isReceivedItem ? (
                        <Badge variant="secondary">Received Item</Badge>
                      ) : selectedBatch.isPurchaseOrderItem ? (
                        <Badge variant="secondary">Purchase Order Item</Badge>
                      ) : (
                        <Badge variant="outline">Inventory Batch</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-gray-600"><span className="text-gray-500">Batch:</span> <span className="font-medium">{selectedBatch.batchNumber}</span></div>
                    {selectedBatch.isReceivedItem || selectedBatch.isPurchaseOrderItem ? (
                      <>
                        <div className="text-gray-600"><span className="text-gray-500">Order:</span> <span className="font-medium">{selectedBatch.orderNumber || 'N/A'}</span></div>
                        <div className="text-gray-600"><span className="text-gray-500">Supplier:</span> <span className="font-medium">{selectedBatch.supplierName || 'N/A'}</span></div>
                        {selectedBatch.isPurchaseOrderItem && (
                          <div className="text-gray-600"><span className="text-gray-500">Qty Ordered:</span> <span className="font-medium">{selectedBatch.quantityOrdered}</span></div>
                        )}
                        <div className="text-gray-600"><span className="text-gray-500">Qty Received:</span> <span className="font-medium">{selectedBatch.quantityReceived}</span></div>
                      </>
                    ) : (
                      <div className="text-gray-600"><span className="text-gray-500">Total Stock:</span> <span className="font-medium">{selectedBatch.totalQuantity}</span></div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    <strong>Note:</strong>{' '}
                    {selectedBatch.isReceivedItem
                      ? 'This location will apply to this received purchase order item'
                      : selectedBatch.isPurchaseOrderItem
                        ? 'This location will apply to this purchase order item'
                        : 'This location will apply to all items in this batch'}
                  </p>
                </div>
              )}

              <FormField
                control={locationForm.control}
                name="shelf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shelf Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., A, B, C, 1, 2, 3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={locationForm.control}
                name="bin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 01, 02, 15, 23" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={locationForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional location notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateLocationMutation.isPending || updateReceivingHistoryMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {(updateLocationMutation.isPending || updateReceivingHistoryMutation.isPending) ? 'Saving...' : 'Save Batch Location'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>


    </div>
  )
}
