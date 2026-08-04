"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useGetProductById } from "@/queries/products/get-product-by-id"
import { useGetPurchaseOrderHistoryByProductIdClinicId } from "@/queries/purchaseOrderReceiving/get-purchase-order-history-by-productId-clinidId"
import { useGetProductUsageHistory } from "@/queries/products/get-product-usage-history"
import { formatDate } from "@/lib/utils"
import { InventoryData } from "@/queries/inventory/get-inventory"
import { Loader2, Package, History, AlertTriangle, CheckCircle, XCircle, Database, Download, Activity, ChevronLeft, ChevronRight } from "lucide-react"
import Barcode from "react-barcode"
import { Document, Page, View, Image, StyleSheet } from '@react-pdf/renderer'
import { toast } from "@/hooks/use-toast"
import { useMemo, useState } from "react"


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

interface InventoryItemDetailsSheetProps {
  inventoryItem: InventoryData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function InventoryItemDetailsSheet({
  inventoryItem,
  open,
  onOpenChange,
}: InventoryItemDetailsSheetProps) {
  const productId = inventoryItem?.productId
  const clinicId = inventoryItem?.clinicId

  const { data: product, isLoading: productLoading, isError: productError } = useGetProductById(
    productId || "", 
    !!productId
  )

  const { data: purchaseHistory, isLoading: historyLoading, isError: historyError } = useGetPurchaseOrderHistoryByProductIdClinicId(
    productId || "",
    clinicId || ""
  )
  const [usagePage, setUsagePage] = useState(1)
  const PAGE_SIZE = 5


  const {data: usageHistoryData,isLoading: usageLoading,isError: usageError,isFetching} = useGetProductUsageHistory(
  productId || "",
  usagePage,
  PAGE_SIZE
)


  const productUsageHistory = usageHistoryData?.items || []


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Stock':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />In Stock</Badge>
      case 'Out of Stock':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Out of Stock</Badge>
      case 'Warning':
        return <Badge className="bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>
      case 'Low Stock':
        return <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStockStatus = () => {
    if (!inventoryItem) return 'Unknown'
    
    const quantity = inventoryItem.quantityOnHand
    const reorderThreshold = inventoryItem.product?.reorderThreshold || 0
    
    if (quantity === 0) return 'Out of Stock'
    if (reorderThreshold > 0 && quantity <= reorderThreshold) return 'Low Stock'
    if (reorderThreshold > 0 && quantity <= reorderThreshold * 1.5) return 'Warning'
    return 'In Stock'
  }

  const handleDownloadBarcode = async (barcodeValue: string, productName: string) => {
    try {
      if (!barcodeValue) {
        toast({
          title: "Error",
          description: "Barcode value is missing",
          variant: "error",
        })
        return
      }
      // Create a temporary barcode element to generate the SVG
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      document.body.appendChild(tempDiv)

      // Create the barcode using react-barcode
      const React = await import('react')
      const ReactDOM = await import('react-dom/client')
      const Barcode = (await import('react-barcode')).default
      
      const barcodeElement = React.createElement(Barcode, {
        value: barcodeValue,
        format: "CODE128",
        height: 40,
        width: 0.7,
        displayValue: false,
        fontSize: 7
      })

      const root = ReactDOM.createRoot(tempDiv)
      root.render(barcodeElement)

      // Wait a bit for the SVG to render
      await new Promise(resolve => setTimeout(resolve, 100))

      // Get the SVG element
      const svgElement = tempDiv.querySelector('svg') as SVGElement
      if (!svgElement) {
        toast({
          title: "Error",
          description: "Barcode SVG element not found",
          variant: "error",
        })
        document.body.removeChild(tempDiv)
        return
      }

      const svgData = new XMLSerializer().serializeToString(svgElement)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new window.Image()

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        
        const imageDataUrl = canvas.toDataURL('image/png')

        // Create PDF with barcode
        const BarcodePDF = () => (
          <Document>
            <Page size="A4" style={styles.page}>
              <View style={styles.container}>
                <View style={styles.barcodeContainer}>
                  <Image src={imageDataUrl} style={styles.barcode} />
                  <View style={styles.barcodeText}>{barcodeValue}</View>
                </View>
                <View style={styles.header}>
                  <View style={styles.title}>Product Barcode</View>
                  <View style={styles.productName}>{productName}</View>
                </View>
              </View>
            </Page>
          </Document>
        )

        // Generate and download PDF
        const { pdf } = await import('@react-pdf/renderer')
        const blob = await pdf(<BarcodePDF />).toBlob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Barcode_${productName}_${barcodeValue}.pdf`
        link.click()
        URL.revokeObjectURL(url)

        // Clean up
        document.body.removeChild(tempDiv)
      }
      toast({
        title: "Downloading",
        description: "Barcode PDF download started",
        variant: "success",
      })

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while generating the barcode PDF.",
        variant: "error",
      })
    }
  }

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      backgroundColor: '#ffffff'
    },
    container: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 50
    },
    header: {
      marginTop: 60,
      textAlign: 'center'
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#333'
    },
    productName: {
      fontSize: 16,
      color: '#666',
      marginBottom: 5
    },
    barcodeContainer: {
      alignItems: 'center',
      marginTop: 0
    },
    barcode: {
      width: 300,
      height: 100,
      marginBottom: 10
    },
    barcodeText: {
      fontSize: 12,
      color: '#333',
      marginTop: 5
    }
  })


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:!max-w-full md:!max-w-[80%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 relative top-[-10px]">
            <Package className="w-5 h-5" />
            Inventory Item Details
          </SheetTitle>
        </SheetHeader>
        
        {!inventoryItem ? (
          <div className="p-6 text-center text-gray-500">No inventory item selected.</div>
        ) : (
          <div className="space-y-6 p-4">
            {/* Summary Header */}
            <div className="rounded-xl border bg-white/70 dark:bg-gray-900/60 backdrop-blur p-4 md:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg md:text-xl font-semibold tracking-tight">
                      {product?.name || "Product"}
                    </h3>
                    {getStatusBadge(getStockStatus())}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product?.brandName ? `${product.brandName} • ` : ""}
                    {product?.category || "Uncategorized"}
                  </p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  {product?.productNumber && (
                    <Badge variant="secondary" className="text-xs">SKU: {product.productNumber}</Badge>
                  )}
                  {inventoryItem.lotNumber && (
                    <Badge variant="outline" className="text-xs">Lot: {inventoryItem.lotNumber}</Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="shadow-none border border-gray-200/80 dark:border-gray-800/80">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Current Stock</p>
                    <p className="mt-1 text-base font-semibold">{inventoryItem.quantityOnHand}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border border-gray-200/80 dark:border-gray-800/80">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Reserved</p>
                    <p className="mt-1 text-base font-semibold">{inventoryItem.quantityReserved}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border border-gray-200/80 dark:border-gray-800/80">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Unit Cost</p>
                    <p className="mt-1 text-base font-semibold">{formatCurrency(inventoryItem.unitCost)}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border border-gray-200/80 dark:border-gray-800/80">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Retail Price</p>
                    <p className="mt-1 text-base font-semibold">{formatCurrency(inventoryItem.retailPrice)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            <Accordion type="multiple" defaultValue={[]} className="w-full">
              {/* Product Information */}
              <AccordionItem value="product-info" className="border-none mb-2">
                <AccordionTrigger className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-lg border border-gray-200/70 dark:border-gray-800/70">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    <span className="font-semibold">Product Information</span>
                  </div>
                  {getStatusBadge(getStockStatus())}
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 border rounded-md mt-1">
                  {productLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading product details...
                    </div>
                  ) : productError ? (
                    <div className="text-red-500 p-4">Failed to load product details.</div>
                  ) : product ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Product Name:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.name}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Brand Name:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.brandName || "-"}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Generic Name:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.genericName || "-"}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Product Number:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.productNumber}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.category}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Manufacturer:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.manufacturer || "-"}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">NDC Number:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.ndcNumber || "-"}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Strength:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.strength || "-"}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dosage Form:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.dosageForm}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unit of Measure:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.unitOfMeasure}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Requires Prescription:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {product.requiresPrescription ? "Yes" : "No"}
                        </p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Storage Requirements:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.storageRequirements || "-"}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Reorder Threshold:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.reorderThreshold || "Not set"}</p>
                      </div>
                      <div className="flex border-b gap-2 items-center pb-2">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Price:</h4>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(product.price)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 p-4">Product not found.</div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Inventory Details */}
              <AccordionItem value="inventory-details" className="border-none mb-2">
                <AccordionTrigger className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-lg border border-gray-200/70 dark:border-gray-800/70">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    <span className="font-semibold">Inventory Details</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 border rounded-md mt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Stock:</h4>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {inventoryItem.quantityOnHand}
                      </p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Reserved Quantity:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{inventoryItem.quantityReserved}</p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unit Cost:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(inventoryItem.unitCost)}</p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Wholesale Cost:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(inventoryItem.wholesaleCost)}</p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Retail Price:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(inventoryItem.retailPrice)}</p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Location:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{inventoryItem.location || "Not specified"}</p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Batch Number:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{inventoryItem.batchNumber}</p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Lot Number:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{inventoryItem.lotNumber || "Not specified"}</p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expiration Date:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {inventoryItem.expirationDate ? formatDate(inventoryItem.expirationDate) : "Not specified"}
                      </p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Manufacture:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {inventoryItem.dateOfManufacture ? formatDate(inventoryItem.dateOfManufacture) : "Not specified"}
                      </p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Received Date:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {inventoryItem.receivedDate ? formatDate(inventoryItem.receivedDate) : "Not specified"}
                      </p>
                    </div>
                    <div className="flex border-b gap-2 items-center pb-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Units Per Package:</h4>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{inventoryItem.unitsPerPackage}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Purchase Order History */}
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="w-5 h-5" />
                  Purchase Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading purchase history...
                  </div>
                ) : historyError ? (
                  <div className="text-red-500 p-4">Failed to load purchase history.</div>
                ) : purchaseHistory && purchaseHistory.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Order #</th>
                          <th className="text-left px-3 py-2 font-medium">Supplier</th>
                          <th className="text-center px-3 py-2 font-medium whitespace-nowrap">Qty Received</th>
                          <th className="text-center px-3 py-2 font-medium whitespace-nowrap">Qty In Hand</th>
                          <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Unit Cost</th>
                          <th className="text-left px-3 py-2 font-medium">Batch</th>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Barcode No.</th>
                          <th className="text-left px-3 py-2 font-medium">Expiry Date</th>
                          <th className="text-left px-3 py-2 font-medium">Received Date</th>
                          <th className="text-left px-3 py-2 font-medium">Shelf</th>
                          <th className="text-left px-3 py-2 font-medium">Bin</th>
                          <th className="text-left pl-3 pr-0 py-2 font-medium">Barcode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {(() => {
                          // Show each receiving entry as a separate row (no grouping)
                          return purchaseHistory.map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/60 odd:bg-white even:bg-gray-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-800/40">
                              <td className="px-3 py-2">
                                <div className="font-medium">{item.orderNumber || "-"}</div>
                              </td>
                              <td className="px-3 py-2">{item.supplierName || "-"}</td>
                              <td className="px-3 py-2 text-center font-medium">{item.quantityReceived}</td>
                              <td className="px-3 py-2 text-center font-medium">{item.quantityInHand}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                              <td className="px-3 py-2">{item.batchNumber}</td>
                              <td className="px-3 py-2">
                                {item.barcodeNumber || "-"}
                              </td>
                              <td className="px-3 py-2 min-w-32">
                                {item.expiryDate ? formatDate(item.expiryDate) : "-"}
                              </td>
                              <td className="px-3 py-2 min-w-32">
                                {item.receivedDate ? formatDate(item.receivedDate) : "-"}
                              </td>
                              <td className="px-3 py-2">{item.shelf || "-"}</td>
                              <td className="px-3 py-2">{item.bin || "-"}</td>
                              <td className="pl-3 pr-0 py-2">
                                 {product && item.barcode && (
                                   <div className="flex justify-end">
                                     <div className="inline-flex items-center gap-2">
                                       <div>
                                         <Barcode
                                           value={item.barcode}
                                           format="CODE128"          
                                           height={40}           
                                           width={0.7}                  
                                           displayValue={false}         
                                           fontSize={7}
                                         />
                                       </div>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => handleDownloadBarcode(item.barcode, product.name)}
                                         className="h-8 w-8 p-0 hover:bg-primary/10 mr-2"
                                         title="Download Barcode PDF"
                                       >
                                         <Download className="h-4 w-4 " />
                                       </Button>
                                     </div>
                                   </div>
                                 )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-500 p-4 text-center">No purchase order history found.</div>
                )}
              </CardContent>
            </Card>

            {/* Product Usage History */}
<Card className="rounded-xl border shadow-sm">
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-lg">
      <Activity className="w-5 h-5" />
      Product Usage History
      {isFetching && (
        <Loader2 className="w-4 h-4 animate-spin ml-2 opacity-60" />
      )}
    </CardTitle>
  </CardHeader>

  <CardContent>
    {usageLoading ? (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading product usage history...
      </div>
    ) : usageError ? (
      <div className="text-red-500 p-4">
        Failed to load product usage history.
      </div>
    ) : usageHistoryData && usageHistoryData.items.length > 0 ? (
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Client Name</th>
              <th className="text-left px-3 py-2 font-medium">Patient Name</th>
              <th className="text-center px-3 py-2 font-medium">Appointment Type</th>
              <th className="text-center px-3 py-2 font-medium">Appointment Date</th>
              <th className="text-center px-3 py-2 font-medium whitespace-nowrap">
                Quantity Given
              </th>
              <th className="text-center px-3 py-2 font-medium">Frequency</th>
              <th className="text-center px-3 py-2 font-medium">Number of Days</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {usageHistoryData.items.map((item, index) => (
              <tr
                key={`${item.dateGiven}-${item.clientName}-${item.patientName}-${index}`}
                className="hover:bg-gray-50/70 dark:hover:bg-gray-800/60 odd:bg-white even:bg-gray-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-800/40"
              >

                <td className="px-3 py-2">{item.clientName || "-"}</td>
                <td className="px-3 py-2">{item.patientName || "-"}</td>
                <td className="px-3 py-2 text-center">{item.appointmentType || "-"}</td>
                <td className="px-3 py-2 text-center min-w-32">
                  {item.dateGiven ? formatDate(item.dateGiven) : "-"}
                </td>
                <td className="px-3 py-2 text-center font-medium">
                  {item.quantityGiven}
                </td>
                <td className="px-3 py-2 text-center">{item.doseFrequency || "-"}</td>
                <td className="px-3 py-2 text-center">
                  {item.numberOfDaysGiven
                    ? `${item.numberOfDaysGiven} days`
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {usageHistoryData && usageHistoryData.totalPages >= 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <p className="text-sm text-muted-foreground">
              Page {usageHistoryData.pageNumber} of {usageHistoryData.totalPages}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!usageHistoryData.hasPreviousPage}
                onClick={() =>
                  setUsagePage((prev) => Math.max(prev - 1, 1))
                }
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Newer
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!usageHistoryData.hasNextPage}
                onClick={() =>
                  setUsagePage((prev) => prev + 1)
                }
              >
                Older
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    ) : (
      <div className="text-gray-500 p-4 text-center">
        No product usage history found.
      </div>
    )}
  </CardContent>
</Card>


            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => onOpenChange(false)} className="shadow-sm">
                Close
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
} 