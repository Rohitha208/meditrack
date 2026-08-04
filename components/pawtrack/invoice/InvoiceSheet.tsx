
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet"
import { Save, Printer, Download, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useGetInvoiceByVisit } from "@/queries/invoice/get-invoice-by-visit"
import { useCreateInvoice } from "@/queries/invoice/create-invoice"
import { useUpdateInvoice } from "@/queries/invoice/update-invoice"
import { useGetPrescriptionDetailByVisitId } from "@/queries/PrescriptionDetail/get-prescription-detail-by-visit-id"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { printPdfBlob, downloadPdfBlob } from "@/utils/pdf"
import { createInvoicePdfBlob } from "./invoicePdf"
import { useGetInvoiceById } from "@/queries/invoice/get-invoice-by-id"


interface InvoiceSheetProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  appointmentId?: string
  visitId?: string
  invoiceId?: string
}

export default function InvoiceSheet({ isOpen, onClose, patientId, appointmentId, visitId, invoiceId }: InvoiceSheetProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [consultationFee, setConsultationFee] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [overallProductDiscount, setOverallProductDiscount] = useState(0)
  const [overallProductDiscountPercentage, setOverallProductDiscountPercentage] = useState(0)
  const [overallDiscountType, setOverallDiscountType] = useState<"percentage" | "amount">("amount")
  const [status, setStatus] = useState<"paid" | "unpaid">("unpaid")
  const [notes, setNotes] = useState("")
  const [isEditing, setIsEditing] = useState(!!invoiceId)
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage")
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "online" | "upi" | "cheque" | "bank_transfer">("cash")
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | undefined>(invoiceId)
  const [invoiceItems, setInvoiceItems] = useState<any[]>([])

  // Get visit and appointment data
  const { data: visitData } = useGetVisitByAppointmentId(appointmentId || "", !!appointmentId)
  const { data: appointmentData } = useGetAppointmentById(appointmentId || "")
  
  // Check if visit is completed
  const isVisitCompleted = appointmentData?.status === "completed"
  const { data: prescriptionData } = useGetPrescriptionDetailByVisitId(visitId || "")
  const { data: existingInvoice, refetch: refetchInvoice } = invoiceId
    ? useGetInvoiceById(invoiceId, isOpen) 
    : useGetInvoiceByVisit(visitId || "", !!visitId)

  // Force refetch when sheet opens to ensure fresh data
  useEffect(() => {
    if (isOpen && (invoiceId || visitId)) {
      refetchInvoice()
    }
  }, [isOpen, invoiceId, visitId])

  // Mutations
  const createInvoiceMutation = useCreateInvoice({
    onSuccess: (data) => {
      toast.success("Invoice created successfully")
      setCurrentInvoiceId(data.id)
      refetchInvoice()
      setIsEditing(true)
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`)
    }
  })

  const updateInvoiceMutation = useUpdateInvoice({
    onSuccess: () => {
      toast.success("Invoice updated successfully")
      refetchInvoice()
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(`Failed to update invoice: ${error.message}`)
    }
  })

  // Generate invoice number
  useEffect(() => {
    if (!existingInvoice && !invoiceNumber && !currentInvoiceId) {
      const timestamp = Date.now().toString().slice(-6)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      setInvoiceNumber(`INV-${timestamp}-${random}`)
    }
  }, [invoiceNumber, existingInvoice, currentInvoiceId])

  // Load existing invoice data
  useEffect(() => {
    if (existingInvoice) {
      setInvoiceNumber(existingInvoice.invoiceNumber)
      setConsultationFee(existingInvoice.consultationFee || 0)
      setDiscountPercentage(existingInvoice.consultationDiscountPercentage || 0)
      setDiscountAmount(existingInvoice.consultationDiscount || 0)
      setOverallProductDiscount(existingInvoice.overallProductDiscount || 0)
      setOverallProductDiscountPercentage(existingInvoice.overallProductDiscountPercentage || 0)
      setStatus(existingInvoice.status || "unpaid")
      setNotes(existingInvoice.notes || "")
      
      if (existingInvoice.consultationDiscountPercentage > 0) {
        setDiscountType("percentage")
      } else if (existingInvoice.consultationDiscount > 0) {
        setDiscountType("amount")
      } else {
        setDiscountType("percentage")
      }

      // Determine overall discount type
      if (existingInvoice.overallProductDiscountPercentage > 0) {
        setOverallDiscountType("percentage")
      } else if (existingInvoice.overallProductDiscount > 0) {
        setOverallDiscountType("amount")
      } else {
        setOverallDiscountType("amount")
      }

      setPaymentMethod(existingInvoice.paymentMethod || "cash")
      setCurrentInvoiceId(existingInvoice.id)
    }
  }, [existingInvoice])

  // Prepare items from existing invoice or prescription
  useEffect(() => {
    const items = existingInvoice?.products?.length > 0
      ? existingInvoice.products.map((p: any) => {
          const productName = p.product?.name || p.receivingHistory?.productName || 'Item'
          const truncatedName = productName.length > 50 ? `${productName.substring(0, 47)}...` : productName
          
          // Try to find matching prescription data to get frequency and days
          const matchingPrescription = prescriptionData?.productMappings?.find(
            (pm: any) => pm.purchaseOrderReceivingHistoryId === p.purchaseOrderReceivingHistoryId
          )
          
          return {
            purchaseOrderReceivingHistoryId: p.purchaseOrderReceivingHistoryId,
            name: truncatedName,
            quantity: p.quantity || 0,
            unitPrice: p.product?.sellingPrice || p.receivingHistory?.unitCost || 0,
            discount: p.discount || 0,
            discountPercentage: p.discountPercentage || 0,
            discountType: p.discountPercentage > 0 ? "percentage" : "amount",
            total: (p.quantity || 0) * (p.product?.sellingPrice || p.receivingHistory?.unitCost || 0),
            isGiven: p.isGiven,
            frequency: p.frequency || matchingPrescription?.frequency || "-",
            numberOfDays: p.numberOfDays || matchingPrescription?.numberOfDays || "-",
          }
        })
      : prescriptionData?.productMappings
            ?.filter((m: any) => m.isChecked)
            ?.map((m: any) => {
              const productName = m.product?.name || m.productName || 'Item'
              const truncatedName = productName.length > 50 ? `${productName.substring(0, 47)}...` : productName
              return {
                purchaseOrderReceivingHistoryId: m.purchaseOrderReceivingHistoryId,
                name: truncatedName,
                quantity: m.quantity || 0,
                unitPrice: m.product?.sellingPrice || 0,
                discount: 0,
                discountPercentage: 0,
                discountType: "amount",
                total: (m.quantity || 0) * (m.product?.sellingPrice || 0),
                isGiven: false,
                frequency: m.frequency || "-",
                numberOfDays: m.numberOfDays || "-",
              }
            }) || []
    
    setInvoiceItems(items)
  }, [existingInvoice, prescriptionData])

  // Build PDF props for generator
  const getPdfProps = () => {
    const clinicName = (appointmentData as any)?.clinic?.name || (appointmentData as any)?.clinicName || 'Clinic'
    const clinicPhone = (appointmentData as any)?.clinic?.phone || ''
    const clinicAddress = [
      (appointmentData as any)?.clinic?.addressLine1,
      (appointmentData as any)?.clinic?.city,
      (appointmentData as any)?.clinic?.state,
    ].filter(Boolean).join(', ')

    return {
      invoiceNumber: existingInvoice?.invoiceNumber || invoiceNumber,
      clinicName,
      clinicPhone,
      clinicAddress,
      clientName: existingInvoice?.client ? `${existingInvoice.client.firstName} ${existingInvoice.client.lastName}` : 'Client',
      clientPhone: existingInvoice?.client?.phonePrimary,
      clientEmail: existingInvoice?.client?.email,
      patientName: existingInvoice?.patient?.name || 'N/A',
      dateString: new Date(appointmentData?.appointmentDate || Date.now()).toLocaleDateString(),
      status: status.toUpperCase(),
      visitId,
      items: invoiceItems,
      consultationFee,
      consultationDiscountAmount: discountAmount,
      consultationFeeAfterDiscount,
      itemsTotal,
      overallProductDiscount: finalOverallProductDiscount,
      grandTotal: totalAmount,
      notes,
      paymentMethod: paymentMethod,
    }
  }

  const generatePDF = async (): Promise<Blob | null> => {
    if (!existingInvoice) return null
    try {
      const blob = await createInvoicePdfBlob(getPdfProps())
      setPdfBlob(blob)
      return blob
    } catch (e) {
      console.error('Failed to generate invoice PDF', e)
      toast.error('Failed to generate invoice PDF')
      return null
    }
  }

  useEffect(() => {
    if (isOpen && existingInvoice) {
      generatePDF()
    }
  }, [isOpen, existingInvoice, invoiceItems, consultationFee, discountAmount, discountPercentage, status, notes, overallProductDiscount, overallProductDiscountPercentage])

  // Calculate individual item discount
  const calculateItemDiscount = (item: any) => {
    if (item.discountType === "percentage") {
      return (item.unitPrice * item.discountPercentage / 100) * item.quantity
    } else {
      return item.discount * item.quantity
    }
  }

  // Calculate items total with per-product discounts
  const calculateItemsTotal = () => {
    return invoiceItems.reduce((sum: number, item: any) => {
      const itemDiscount = calculateItemDiscount(item)
      return sum + (item.unitPrice * item.quantity) - itemDiscount
    }, 0)
  }

  const itemsTotal = calculateItemsTotal()
  
  // Calculate totals
  const productsTotal = invoiceItems.reduce((sum: number, item: any) => {
    const itemDiscount = calculateItemDiscount(item)
    return sum + (item.unitPrice * item.quantity) - itemDiscount
  }, 0)

  const consultationDiscount = discountType === 'percentage' 
    ? (consultationFee * discountPercentage) / 100
    : discountAmount
  
  const finalDiscountAmount = consultationDiscount
  const consultationFeeAfterDiscount = Math.max(0, consultationFee - consultationDiscount)

  // Calculate overall product discount
  const finalOverallProductDiscount = overallDiscountType === 'percentage'
    ? (productsTotal * overallProductDiscountPercentage) / 100
    : overallProductDiscount

  const subtotal = productsTotal + consultationFeeAfterDiscount
  const totalAmount = Math.max(0, subtotal - finalOverallProductDiscount)

  const handleSave = async () => {
    if (!visitId || !appointmentId) {
      toast.error("Missing required data")
      return
    }
  
    const products = invoiceItems
      .filter((item: any) => item.purchaseOrderReceivingHistoryId && item.quantity > 0)
      .map((item: any) => ({
        purchaseOrderReceivingHistoryId: item.purchaseOrderReceivingHistoryId,
        quantity: item.quantity,
        discount: item.discountType === "amount" ? item.discount || 0 : (item.unitPrice * item.discountPercentage / 100),
        discountPercentage: item.discountType === "percentage" ? item.discountPercentage || 0 : 0,
        isGiven: status === "paid",
        frequency: item.frequency || "-",
        numberOfDays: item.numberOfDays || "-",
      }))
  
    if (itemsTotal === 0 && products.length === 0) {
      toast.error("Please add at least one item or prescription product to the invoice")
      return
    }
  
    const invoiceData = {
      visitId,
      clientId: appointmentData.patient.clientId, 
      patientId: appointmentData.patientId,
      invoiceNumber,
      itemsTotal,
      consultationFee,
      consultationDiscountPercentage: discountType === "percentage" ? discountPercentage : 0,
      consultationDiscount: finalDiscountAmount,
      consultationFeeAfterDiscount,
      overallProductDiscount: overallDiscountType === "amount" ? overallProductDiscount : finalOverallProductDiscount,
      overallProductDiscountPercentage: overallDiscountType === "percentage" ? overallProductDiscountPercentage : 0,
      notes,
      total: totalAmount,
      status,
      products: products,
      paymentMethod,
    }
  
    if (currentInvoiceId) {
      const { visitId, clientId, patientId, ...updateData } = invoiceData
      await updateInvoiceMutation.mutateAsync({
        id: currentInvoiceId,
        request: { 
          ...updateData, 
          clinicId: appointmentData.clinicId,
          products: products.map(p => ({
            ...p,
            isGiven: status === "paid"
          }))
        }
      })
    } else {
      await createInvoiceMutation.mutateAsync({ request: invoiceData })
    }
  }

  const handlePrint = async () => {
    const blob = pdfBlob || await generatePDF()
    if (!blob) {
      toast.error("Failed to generate PDF for printing")
      return
    }
    await printPdfBlob(blob)
  }

  const handleClose = () => {
    setIsEditing(false)
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[90%] lg:!max-w-[90%] overflow-x-hidden overflow-y-auto">
        {currentInvoiceId ? (
          <SheetHeader className="mb-6">
            <SheetTitle>Edit Invoice</SheetTitle>
            <SheetDescription>Edit the details of this invoice.</SheetDescription>
          </SheetHeader>
        ) : (
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
              <SheetTitle>Create Invoice</SheetTitle>
              <SheetDescription>Fill in the details to create a new invoice.</SheetDescription>
            </div>
          </SheetHeader>
        )}

        <div className="space-y-6">
          {/* Visit Status Warning */}
          {isVisitCompleted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Visit Completed
                  </h3>
                  <div className="mt-1 text-sm text-yellow-700">
                    <p>This visit has been completed. Invoice fields are read-only and cannot be modified.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Client & Patient Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Client Details */}
            <Card className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Client</h3>
                {(existingInvoice?.client || appointmentData?.client) ? (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      {existingInvoice?.client 
                        ? `${existingInvoice.client.firstName} ${existingInvoice.client.lastName}`
                        : `${appointmentData?.client?.firstName} ${appointmentData?.client?.lastName}`
                      }
                    </p>
                    {(existingInvoice?.client?.email || appointmentData?.client?.email) && (
                      <p className="text-xs text-gray-500">
                        {existingInvoice?.client?.email || appointmentData?.client?.email}
                      </p>
                    )}
                    {(existingInvoice?.client?.phonePrimary || appointmentData?.client?.phonePrimary) && (
                      <p className="text-xs text-gray-500">
                        {existingInvoice?.client?.phonePrimary || appointmentData?.client?.phonePrimary}
                      </p>
                    )}
                    {(existingInvoice?.client?.phoneSecondary || appointmentData?.client?.phoneSecondary) && (
                      <p className="text-xs text-gray-500">
                        {existingInvoice?.client?.phoneSecondary || appointmentData?.client?.phoneSecondary}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No client info</p>
                )}
              </div>
            </Card>
              
            {/* Patient Details */}
            <Card className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Patient</h3>
                {(existingInvoice?.patient || appointmentData?.patient) ? (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      {existingInvoice?.patient?.name || appointmentData?.patient?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {existingInvoice?.patient?.species || appointmentData?.patient?.species} • {existingInvoice?.patient?.breed || appointmentData?.patient?.breed}
                      {(existingInvoice?.patient?.gender || appointmentData?.patient?.gender) && ` • ${existingInvoice?.patient?.gender || appointmentData?.patient?.gender}`}
                    </p>
                    {(existingInvoice?.patient?.dateOfBirth || appointmentData?.patient?.dateOfBirth) && (
                      <p className="text-xs text-gray-500">
                        DOB: {new Date(existingInvoice?.patient?.dateOfBirth || appointmentData?.patient?.dateOfBirth).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No patient info</p>
                )}
              </div>
            </Card>
          </div>

          {/* Invoice Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="status"
                      checked={status === "paid"}
                      onCheckedChange={(checked) => setStatus(checked ? "paid" : "unpaid")}
                      disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                    />
                    <Label htmlFor="status" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Paid
                    </Label>
                    <Badge variant={status === "paid" ? "default" : "secondary"}>
                      {status === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value: "cash" | "card" | "online" | "upi" | "cheque" | "bank_transfer") => setPaymentMethod(value)}
                    disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="consultationFee">Consultation Fee</Label>
                  <Input
                    id="consultationFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                    disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                  />
                </div>
              </div>

              <div>
                <Label>Consultation Discount</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={discountType}
                    onValueChange={(value: "percentage" | "amount") => {
                      setDiscountType(value)
                      if (value === "percentage") {
                        setDiscountAmount((consultationFee * discountPercentage) / 100)
                      } else {
                        setDiscountPercentage(consultationFee > 0 ? (discountAmount / consultationFee) * 100 : 0)
                      }
                    }}
                    disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>

                  {discountType === "percentage" && (
                    <Input
                      id="discountPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={discountPercentage}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0
                        setDiscountPercentage(percentage)
                        setDiscountAmount((consultationFee * percentage) / 100)
                      }}
                      disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                      placeholder="0-100"
                      className="text-sm"
                    />
                  )}
                  {discountType === "amount" && (
                    <Input
                      id="discountAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        setDiscountAmount(amount)
                        setDiscountPercentage(consultationFee > 0 ? (amount / consultationFee) * 100 : 0)
                      }}
                      disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                      placeholder="0.00"
                      className="text-sm"
                    />
                  )}
                </div>
                {finalDiscountAmount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Discount: ₹{finalDiscountAmount.toFixed(2)} {discountPercentage > 0 && `(${discountPercentage.toFixed(1)}%)`}
                  </p>
                )}
              </div>

              <div>
                <Label>Overall Product Discount</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={overallDiscountType}
                    onValueChange={(value: "percentage" | "amount") => {
                      setOverallDiscountType(value)
                      if (value === "percentage") {
                        setOverallProductDiscount((productsTotal * overallProductDiscountPercentage) / 100)
                      } else {
                        setOverallProductDiscountPercentage(productsTotal > 0 ? (overallProductDiscount / productsTotal) * 100 : 0)
                      }
                    }}
                    disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>

                  {overallDiscountType === "percentage" && (
                    <Input
                      id="overallProductDiscountPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={overallProductDiscountPercentage}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0
                        setOverallProductDiscountPercentage(percentage)
                        setOverallProductDiscount((productsTotal * percentage) / 100)
                      }}
                      disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                      placeholder="0-100"
                      className="text-sm"
                    />
                  )}
                  {overallDiscountType === "amount" && (
                    <Input
                      id="overallProductDiscount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={overallProductDiscount}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        setOverallProductDiscount(amount)
                        setOverallProductDiscountPercentage(productsTotal > 0 ? (amount / productsTotal) * 100 : 0)
                      }}
                      disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                      placeholder="0.00"
                      className="text-sm"
                    />
                  )}
                </div>
                {finalOverallProductDiscount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Discount: ₹{finalOverallProductDiscount.toFixed(2)} {overallProductDiscountPercentage > 0 && `(${overallProductDiscountPercentage.toFixed(1)}%)`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Applied to total products amount after individual product discounts
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No items in this invoice.
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Product</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Frequency</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Days</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Quantity</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Unit Price</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Discount Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Discount</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoiceItems.map((item: any, index: number) => {
                        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0)
                        const itemDiscount = calculateItemDiscount(item)
                        const totalPrice = Math.max(0, itemTotal - itemDiscount)
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.frequency || "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.numberOfDays || "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.quantity || 0}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              ₹{(item.unitPrice || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
  <Select
    value={item.discountType || "percentage"}
    onValueChange={(value: "percentage" | "amount") => {
      const updatedItems = [...invoiceItems];
      updatedItems[index] = {
        ...item,
        discountType: value,
        // Reset discount when changing type
        discount: 0,
        discountPercentage: 0
      };
      setInvoiceItems(updatedItems);
    }}
    disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
  >
    <SelectTrigger className="w-24">
      <SelectValue placeholder="Type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="percentage">%</SelectItem>
      <SelectItem value="amount">₹</SelectItem>
    </SelectContent>
  </Select>
</td>
                            <td className="px-4 py-3">
  <Input
    type="number"
    min="0"
    step={item.discountType === "percentage" ? "1" : "0.01"}
    max={item.discountType === "percentage" ? "100" : undefined}
    value={item.discountType === "percentage" ? (item.discountPercentage || '') : (item.discount || '')}
    onChange={(e) => {
      const value = parseFloat(e.target.value) || 0;
      const updatedItems = [...invoiceItems];
      updatedItems[index] = {
        ...item,
        [item.discountType === "percentage" ? "discountPercentage" : "discount"]: value
      };
      setInvoiceItems(updatedItems);
    }}
    disabled={isVisitCompleted || (!isEditing && !!currentInvoiceId)}
    className="w-24"
    placeholder={item.discountType === "percentage" ? "0-100" : "0.00"}
  />
</td>
<td className="px-4 py-3 font-medium text-gray-900">
  ₹{totalPrice.toFixed(2)}
  {itemDiscount > 0 && (
    <span className="block text-xs text-green-600">
      -₹{itemDiscount.toFixed(2)} saved
      {item.discountType === "percentage" && item.discountPercentage > 0 && 
        ` (${item.discountPercentage}%)`}
    </span>
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
                <span>₹{invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}</span>
              </div>
              
              {invoiceItems.some(item => item.discount > 0) && (
                <div className="flex justify-between text-sm text-green-600 ml-4">
                  <span>Individual Product Discounts:</span>
                  <span>-₹{invoiceItems.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Products Total (after individual discounts):</span>
                <span>₹{productsTotal.toFixed(2)}</span>
              </div>
              
              {overallProductDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 ml-4">
                  <span>Overall Product Discount:</span>
                  <span>-₹{overallProductDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-medium">
                <span>Products Final Total:</span>
                <span>₹{Math.max(0, productsTotal - overallProductDiscount).toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between">
                <span>Consultation Fee:</span>
                <span>₹{consultationFee.toFixed(2)}</span>
              </div>
              
              {consultationDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 ml-4">
                  <span>
                    Consultation Discount{discountPercentage > 0 ? ` (${discountPercentage.toFixed(1)}%)` : ""}:
                  </span>
                  <span>-₹{consultationDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-medium">
                <span>Consultation Fee (after discount):</span>
                <span>₹{consultationFeeAfterDiscount.toFixed(2)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              
              {(invoiceItems.some(item => item.discount > 0) || overallProductDiscount > 0 || consultationDiscount > 0) && (
                <div className="flex justify-between text-sm text-green-600 font-medium pt-2 border-t">
                  <span>Total Savings:</span>
                  <span>
                    ₹{(
                      invoiceItems.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0) +
                      overallProductDiscount +
                      consultationDiscount
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="pt-6">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {currentInvoiceId && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={isVisitCompleted || createInvoiceMutation.isPending || updateInvoiceMutation.isPending || existingInvoice?.status === "paid"}
                  >
                    {isEditing ? "Cancel Edit" : "Edit"}
                  </Button>
                  <Button variant="outline" onClick={handlePrint} disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={isVisitCompleted || createInvoiceMutation.isPending || updateInvoiceMutation.isPending || (!isEditing && !!currentInvoiceId)}
              className="bg-[#1E3D3D] hover:bg-[#1E3D3D]/90 text-white"
            >
              {createInvoiceMutation.isPending || updateInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}