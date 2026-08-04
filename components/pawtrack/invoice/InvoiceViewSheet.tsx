"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Printer, Download, X } from "lucide-react"
import { useGetInvoiceById, type InvoiceDetail } from "@/queries/invoice/get-invoice-by-id"
import { formatDate } from "@/lib/utils"
import Barcode from "react-barcode"
import { Document, Page, View, Image, StyleSheet } from '@react-pdf/renderer'
import { toast } from "sonner"
import { createInvoicePdfBlob, type InvoicePdfProps, type InvoiceItem } from '@/components/pawtrack/invoice/invoicePdf'
import { useGetCompanyById, type Company } from "@/queries/companies/get-company"

interface InvoiceProductItem {
  id: string
  purchaseOrderReceivingHistoryId: string
  quantity: number
  isGiven: boolean
  discount?: number
  discountPercentage?: number
  receivingHistory?: {
    barcodeNumber?: string
  }
  product?: {
    name?: string
    sellingPrice?: number
  }
}

interface InvoiceViewSheetProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
}

export default function InvoiceViewSheet({ isOpen, onClose, invoiceId }: InvoiceViewSheetProps) {
  const { data: invoice, isLoading, isError } = useGetInvoiceById(invoiceId, isOpen)
  const { data: companyDetails } = useGetCompanyById(invoice?.client.companyId || "")

  const handlePrint = () => {
    window.print()
  }

  // Calculate item discount
  const calculateItemDiscount = (item: InvoiceProductItem) => {
    if (item.discountPercentage && item.discountPercentage > 0) {
      return ((item.product?.sellingPrice || 0) * item.discountPercentage / 100) * item.quantity
    } else if (item.discount) {
      return item.discount * item.quantity
    }
    return 0
  }

  const handleDownload = async () => {
    if (!invoice) return

    try {
      const items: InvoiceItem[] = (invoice.products ?? []).map(p => {
        const itemDiscount = calculateItemDiscount(p)
        const itemTotal = (p.quantity * (p.product?.sellingPrice || 0)) - itemDiscount
        
        return {
          name: p.product?.name || "",
          quantity: p.quantity,
          unitPrice: p.product?.sellingPrice || 0,
          discount: p.discount || 0,
          discountPercentage: p.discountPercentage || 0,
          total: itemTotal
        }
      })

      const invoicePdfProps: InvoicePdfProps = {
        invoiceNumber: invoice.invoiceNumber,
        clinicName: companyDetails?.name || "",
        clinicPhone: companyDetails?.phone || "",
        clinicAddress: `${companyDetails?.address?.street || ""}, ${companyDetails?.address?.city || ""}, ${companyDetails?.address?.state || ""}, ${companyDetails?.address?.postalCode || ""}`,
        clientName: `${invoice.client.firstName} ${invoice.client.lastName}`,
        clientPhone: invoice.client.phonePrimary || "",
        clientEmail: invoice.client.email || "",
        patientName: invoice.patient.name,
        dateString: formatDate(invoice.createdAt),
        status: invoice.status,
        visitId: invoice.visitId,
        items: items,
        consultationFee: invoice.consultationFee,
        consultationDiscountAmount: invoice.consultationDiscount,
        consultationFeeAfterDiscount: invoice.consultationFeeAfterDiscount,
        itemsTotal: invoice.itemsTotal,
        overallProductDiscount: invoice.overallProductDiscount || 0,
        grandTotal: invoice.total,
        notes: invoice.notes || "",
    paymentMethod: (invoice.paymentMethod as "cash" | "card" | "online" | "upi" | "cheque" | "bank_transfer") || "cash",
      }

      const blob = await createInvoicePdfBlob(invoicePdfProps)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice_${invoice.invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("Invoice PDF download started.")
    } catch (error) {
      console.error("Failed to generate or download invoice PDF:", error)
      toast.error("Failed to download invoice PDF.")
    }
  }

  const handleDownloadBarcode = async (barcodeValue: string, productName: string) => {
    try {
      if (!barcodeValue) {
        toast.error("Barcode value is missing")
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
        height: 60,
        width: 1.2,
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
        toast.error("Barcode SVG element not found")
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
      
      toast.success("Barcode PDF download started")
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred while generating the barcode PDF.")
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

  const handleClose = () => {
    onClose()
  }

  if (isLoading) {
    return (
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[90%] lg:!max-w-[90%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Loading Invoice...</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading invoice details...</p>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (isError || !invoice) {
    return (
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[90%] lg:!max-w-[90%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Error</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Error loading invoice details. Please try again.</p>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Calculate totals with discounts
  const productsSubtotal = (invoice.products ?? []).reduce((sum, item) => {
    return sum + (item.quantity * (item.product?.sellingPrice || 0))
  }, 0)

  const totalProductDiscounts = (invoice.products ?? []).reduce((sum, item) => {
    return sum + calculateItemDiscount(item)
  }, 0)

  const productsAfterIndividualDiscounts = productsSubtotal - totalProductDiscounts
  const overallProductDiscount = invoice.overallProductDiscount || 0
  const productsFinalTotal = Math.max(0, productsAfterIndividualDiscounts - overallProductDiscount)

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[90%] lg:!max-w-[90%] overflow-x-hidden overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle>Invoice Details</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{invoice.invoiceNumber}</CardTitle>
                <Badge variant={invoice.status === "paid" ? "default" : "destructive"}>
                  {invoice.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">{formatDate(invoice.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <p className="font-medium">{formatDate(invoice.updatedAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Method:</span>
                  <p className="font-medium capitalize">{invoice.paymentMethod?.replace('_', ' ') || 'Cash'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client & Patient Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Client Details */}
            <Card className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Client</h3>
                <div className="space-y-1">
                  <p className="font-medium text-sm">{invoice.client.firstName} {invoice.client.lastName}</p>
                  {invoice.client.email && (
                    <p className="text-xs text-gray-500">{invoice.client.email}</p>
                  )}
                  {invoice.client.phonePrimary && (
                    <p className="text-xs text-gray-500">{invoice.client.phonePrimary}</p>
                  )}
                  {invoice.client.phoneSecondary && (
                    <p className="text-xs text-gray-500">{invoice.client.phoneSecondary}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Patient Details */}
            <Card className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Patient</h3>
                <div className="space-y-1">
                  <p className="font-medium text-sm">{invoice.patient.name}</p>
                  <p className="text-xs text-gray-500">
                    {invoice.patient.species} • {invoice.patient.breed}
                    {invoice.patient.gender && ` • ${invoice.patient.gender}`}
                  </p>
                  {invoice.patient.dateOfBirth && (
                    <p className="text-xs text-gray-500">
                      DOB: {formatDate(invoice.patient.dateOfBirth)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.products?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No items in this invoice.
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Sl No</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Product</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Quantity</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Unit Price</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Discount</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Total</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Barcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoice.products
                        ?.map((productItem: InvoiceProductItem, index: number) => {
                          const itemDiscount = calculateItemDiscount(productItem)
                          const itemTotal = (productItem.quantity * (productItem.product?.sellingPrice || 0))
                          const totalPrice = itemTotal - itemDiscount
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-900">{productItem.product?.name || "Medicine"}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {productItem.quantity || 0}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                ₹{(productItem.product?.sellingPrice || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {itemDiscount > 0 ? (
                                  <span className="text-green-600">
                                    -₹{itemDiscount.toFixed(2)}
                                    {productItem.discountPercentage && productItem.discountPercentage > 0 && (
                                      <span className="text-xs ml-1">({productItem.discountPercentage}%)</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                ₹{totalPrice.toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                {productItem.receivingHistory?.barcodeNumber ? (
                                  <div className="w-[180px]">
                                    <div className="flex flex-row items-center gap-2">
                                      <div className="w-full">
                                        <Barcode
                                          value={productItem.receivingHistory!.barcodeNumber!}
                                          format="CODE128"          
                                          height={60}           
                                          width={1.2}                  
                                          displayValue={false}         
                                          fontSize={7}
                                        />
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadBarcode(
                                          productItem.receivingHistory!.barcodeNumber as string,
                                          productItem.product?.name || "Medicine"
                                        )}
                                        className="h-8 w-8 p-0"
                                        title="Download Barcode PDF"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">No barcode</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Products Subtotal (before discounts):</span>
                <span>₹{productsSubtotal.toFixed(2)}</span>
              </div>
              
              {totalProductDiscounts > 0 && (
                <div className="flex justify-between text-sm text-green-600 ml-4">
                  <span>Individual Product Discounts:</span>
                  <span>-₹{totalProductDiscounts.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Products Total (after individual discounts):</span>
                <span>₹{productsAfterIndividualDiscounts.toFixed(2)}</span>
              </div>
              
              {overallProductDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 ml-4">
                  <span>
                    Overall Product Discount
                    {invoice.overallProductDiscountPercentage && invoice.overallProductDiscountPercentage > 0 
                      ? ` (${invoice.overallProductDiscountPercentage.toFixed(1)}%)` 
                      : ""}:
                  </span>
                  <span>-₹{overallProductDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-medium">
                <span>Products Final Total:</span>
                <span>₹{productsFinalTotal.toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between">
                <span>Consultation Fee:</span>
                <span>₹{invoice.consultationFee.toFixed(2)}</span>
              </div>
              
              {invoice.consultationDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 ml-4">
                  <span>
                    Consultation Discount{invoice.consultationDiscountPercentage > 0 ? ` (${invoice.consultationDiscountPercentage.toFixed(1)}%)` : ""}:
                  </span>
                  <span>-₹{invoice.consultationDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-medium">
                <span>Consultation Fee (after discount):</span>
                <span>₹{invoice.consultationFeeAfterDiscount.toFixed(2)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>₹{invoice.total.toFixed(2)}</span>
              </div>
              
              {(totalProductDiscounts > 0 || overallProductDiscount > 0 || invoice.consultationDiscount > 0) && (
                <div className="flex justify-between text-sm text-green-600 font-medium pt-2 border-t">
                  <span>Total Savings:</span>
                  <span>
                    ₹{(totalProductDiscounts + overallProductDiscount + invoice.consultationDiscount).toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <SheetFooter className="pt-6">
          <div className="flex justify-between w-full">
            <div></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}