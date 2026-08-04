"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, Plus, Trash2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { useGetPatients } from "@/queries/patients/get-patients"
import { useCreateInvoice } from "@/queries/invoice/create-invoice"
import { toast } from "@/components/ui/use-toast"
import { useContentLayout } from "@/hooks/useContentLayout"
import { useGetPurchaseOrderReceivingHistoryByClinicId } from "@/queries/purchaseOrderRecevingHiistory/get-purchase-order-receiving-history-by-clinic-id"
import { PurchaseOrderReceivingHistoryItem } from "@/queries/purchaseOrderRecevingHiistory/types"
import { useGetClinic, Clinic } from "@/queries/clinic/get-clinic"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { BarcodeScanner } from "@/components/ui/barcode-scanner"

interface CreateInvoiceRequest {
  visitId?: string | null
  clientId: string
  patientId: string
  invoiceNumber: string
  itemsTotal: number
  consultationFee: number
  consultationDiscountPercentage: number
  consultationDiscount: number
  consultationFeeAfterDiscount: number
  notes: string
  total: number
  status: string
  paymentMethod?: string
  clinicId: string
  overallProductDiscount?: number
  products: {
    purchaseOrderReceivingHistoryId: string;
    quantity: number;
    isGiven: boolean;
    discount: number; 
  }[];
}

interface NewInvoiceFormProps {
  open: boolean
  onClose: () => void
  patientId?: string
  clinicId?: string
}

interface InvoiceItem {
  id: string; // purchaseOrderReceivingHistoryId
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export default function NewInvoiceForm({ open, onClose, patientId, clinicId }: NewInvoiceFormProps) {
  const { userType, clinic: userClinic, user } = useContentLayout();
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string>(patientId || "")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceNotes, setInvoiceNotes] = useState("")
  const [invoiceStatus, setInvoiceStatus] = useState("unpaid")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [consultationFee, setConsultationFee] = useState<number>(0)
  const [consultationDiscountValue, setConsultationDiscountValue] = useState<number>(0)
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage") // New state for discount type
  const [formSubmitted, setFormSubmitted] = useState(false)

  // Product search states
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState<PurchaseOrderReceivingHistoryItem[]>([])
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false)

  const [selectedClinicForPO, setSelectedClinicForPO] = useState<string>(
    clinicId || userClinic?.id || ""
  );

  const { data: patientData, isLoading: isLoadingPatient } = useGetPatientById(patientId || "")
  const { data: allPatientsData, isLoading: isLoadingAllPatients } = !patientId
    ? useGetPatients(1, 1000, '', '', undefined)
    : { data: undefined, isLoading: false }

  const { data: clinicsData, isLoading: isLoadingClinics } = useGetClinic(
    1,
    10,
    userType?.isAdmin && userClinic?.companyId ? (userClinic.companyId ?? null) : null,
    userType?.isAdmin,
    undefined
  )

  // Determine filters for purchase order history based on user role and props
  let currentTargetClinicId: string | undefined;
  let currentTargetCompanyId: string | undefined;
  let poHistoryEnabled = false;

  if (userType?.isAdmin && userClinic?.companyId) {
    currentTargetCompanyId = userClinic.companyId as string | undefined;
    currentTargetClinicId = selectedClinicForPO;
    poHistoryEnabled = !!selectedClinicForPO;
  } else if ((userType?.isClinicAdmin || userType?.isVeterinarian) && userClinic?.id) {
    currentTargetClinicId = userClinic.id;
    poHistoryEnabled = true;
  } else if (clinicId) {
    currentTargetClinicId = clinicId;
    poHistoryEnabled = true;
  }
  
  const { data: purchaseOrderHistoryData, isLoading: isLoadingPurchaseOrderHistory } = useGetPurchaseOrderReceivingHistoryByClinicId(
    currentTargetClinicId || "",
    1,
    1000, // Changed from 10 to 1000 to fetch more products for search
    '', // Use empty string instead of null for searchQuery
    currentTargetCompanyId,
    poHistoryEnabled
  );

  // Initialize with empty items when modal opens
  useEffect(() => {
    if (open) {
      setItems([])
      setSearchQuery("")
      setFormSubmitted(false)
      const timestamp = Date.now().toString().slice(-6)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      setInvoiceNumber(`INV-${timestamp}-${random}`)
      setInvoiceNotes("")
      setConsultationFee(0)
      setConsultationDiscountValue(0)
      setDiscountType("percentage")
      setPaymentMethod("")
    }
  }, [open, selectedClinicForPO]);

  useEffect(() => {
    if (!userType?.isAdmin && userType?.isClinicAdmin && userClinic?.id) {
      setSelectedClinicForPO(userClinic.id);
    } else if (clinicId) {
      setSelectedClinicForPO(clinicId);
    }
  }, [userType, userClinic, clinicId]);

  // Effect to filter products when search query or purchase order data changes (Client-side filtering)
  useEffect(() => {
    if (purchaseOrderHistoryData) {
      const poItems = (purchaseOrderHistoryData as any) || [];
      const query = searchQuery.toLowerCase().trim();

      if (query) {
        const filtered = (poItems as PurchaseOrderReceivingHistoryItem[])
          .filter((item: PurchaseOrderReceivingHistoryItem) => 
            (item.productName?.toLowerCase().includes(query) ||
             item.barcodeNumber?.toLowerCase().includes(query) ||
             item.productDetails?.productNumber?.toLowerCase().includes(query))
          )
          .slice(0, 10); // Limit to 10 results for dropdown
        setFilteredProducts(filtered);
      } else {
        // If no search query, show no products
        setFilteredProducts([]);
      }
    } else {
      setFilteredProducts([]);
    }
  }, [purchaseOrderHistoryData, searchQuery]);

  const { mutate: createInvoiceMutation, isPending } = useCreateInvoice({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Invoice created successfully.",
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: `Failed to create invoice: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  // Product search handler
  const handleProductSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchDropdownOpen(true);
  }

  // Barcode scanner handler
  const handleBarcodeDetected = (barcode: string) => {
    setSearchQuery(barcode);
    setIsSearchDropdownOpen(true);
    setIsBarcodeScannerOpen(false);
    
    // Auto-search for products with this barcode
    if (purchaseOrderHistoryData) {
      const poItems = (purchaseOrderHistoryData as any) || [];
      const filtered = (poItems as PurchaseOrderReceivingHistoryItem[])
        .filter((item: PurchaseOrderReceivingHistoryItem) => 
          item.barcodeNumber?.toLowerCase().includes(barcode.toLowerCase())
        )
        .slice(0, 10);
      setFilteredProducts(filtered);
    }
  }
  

  // Product selection handler
  const handleProductSelect = (product: PurchaseOrderReceivingHistoryItem, index: number) => {
    let updatedItems = [...items];
    updatedItems[index] = {
      id: product.id,
      productName: product.productName || "Unknown Product",
      quantity: 1,
      unitCost: product.productDetails?.sellingPrice || 0,
      total: (product.productDetails?.sellingPrice || 0) * 1 // Calculate total based on selling price and default quantity 1
    };

    updatedItems = calculateItemTotal(updatedItems, index); // Recalculate total after setting unitCost and quantity

    setItems(updatedItems);
    setSearchQuery("");
    setIsSearchDropdownOpen(false);
    setActiveItemIndex(null);
  }
  

  // Clear selected product
  const clearSelectedProduct = (index: number) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      id: "",
      productName: "",
      quantity: 1,
      unitCost: 0,
      total: 0
    };
    setItems(updatedItems);
  };

  // Calculate item total
  const calculateItemTotal = (itemsArray: InvoiceItem[], index: number) => {
    const item = itemsArray[index];
    const total = (item.quantity || 0) * (item.unitCost || 0);
    
    const updatedItems = [...itemsArray];
    updatedItems[index] = {
      ...updatedItems[index],
      total,
    };
    return updatedItems;
  };

  // Add new item
  const addItem = () => {
    setItems([
      ...items,
      {
        id: "",
        productName: "",
        quantity: 1,
        unitCost: 0,
        total: 0
      }
    ])
  }

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index)
      setItems(updatedItems)
    }
  }

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    let updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: quantity
    };

    updatedItems = calculateItemTotal(updatedItems, index); // Recalculate total after updating quantity

    setItems(updatedItems);
  }

  // Calculate subtotal
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  // Calculate consultation discount
  const calculateConsultationDiscount = () => {
    if (discountType === "percentage") {
      return (consultationFee * consultationDiscountValue) / 100
    } else {
      return consultationDiscountValue
    }
  }

  // Calculate consultation fee after discount
  const calculateConsultationFeeAfterDiscount = () => {
    return consultationFee - calculateConsultationDiscount()
  }

  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateConsultationFeeAfterDiscount()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Validation helpers
  const hasProductErrors = (index: number) => {
    return formSubmitted && !items[index]?.id
  }
  
  const hasQuantityErrors = (index: number) => {
    return formSubmitted && (!items[index]?.quantity || items[index]?.quantity <= 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitted(true)

    if (!selectedPatient) {
      toast({
        title: "Error!",
        description: "Please select a patient.",
        variant: "destructive",
      })
      return
    }

    if (!currentTargetClinicId) {
      toast({
        title: "Error!",
        description: "Please select a clinic.",
        variant: "destructive",
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "Error!",
        description: "Please add at least one invoice item.",
        variant: "destructive",
      })
      return
    }

    // Validate items
    let hasErrors = false;
    let invalidItemMessages: string[] = []
    
    items.forEach((item, index) => {
      if (!item.id) {
        invalidItemMessages.push(`Item ${index + 1}: Please select a product`);
        hasErrors = true;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        invalidItemMessages.push(`Item ${index + 1}: Please enter a valid quantity`);
        hasErrors = true;
      }

      // if (item.quantity > item.quantityInHand) {
      //   invalidItemMessages.push(`Item ${index + 1}: Quantity exceeds available stock (${item.quantityInHand})`);
      //   hasErrors = true;
      // }
    })
    
    if (invalidItemMessages.length > 0) {
      toast({
        title: "Validation Errors",
        description: invalidItemMessages.join(", "),
        variant: "destructive"
      });
    }

    if (hasErrors) {
      return;
    }

    const currentPatient = patientData || allPatientsData?.items.find(p => p.id === selectedPatient)

    if (!currentPatient) {
      toast({
        title: "Error!",
        description: "Patient not found.",
        variant: "destructive",
      })
      return
    }

    // Replace this part in your handleSubmit function:

const invoiceItems = items.map(item => ({
  purchaseOrderReceivingHistoryId: item.id, 
  quantity: item.quantity,
  isGiven: invoiceStatus === "paid", // Only deduct stock if invoice is paid
}))

const requestBody: CreateInvoiceRequest = {
  visitId: null,
  clientId: currentPatient.clientId,
  patientId: currentPatient.id,
  clinicId: currentTargetClinicId,
  invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
  itemsTotal: calculateSubtotal(),
  consultationFee: consultationFee,
  consultationDiscountPercentage: discountType === "percentage" ? consultationDiscountValue : 0,
  consultationDiscount: discountType === "amount" ? consultationDiscountValue : 0,
  consultationFeeAfterDiscount: calculateConsultationFeeAfterDiscount(),
  notes: invoiceNotes,
  total: calculateTotal(),
  status: invoiceStatus,
  paymentMethod: paymentMethod,
  products: invoiceItems.map(item => ({
    ...item,
    discount: 0,
  })), 
  overallProductDiscount: 0,
}

    createInvoiceMutation({ request: requestBody })
  }

  // Get product from purchase order history by ID
  const getProductById = (productId: string): PurchaseOrderReceivingHistoryItem | undefined => {
    if (!filteredProducts) return undefined;
    return filteredProducts.find(item => item.id === productId);
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[90%] lg:!max-w-[90%] overflow-x-hidden overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>
            New Invoice
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client & Patient Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Patient Details */}
            <Card className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Patient Details</h3>
                <div>
                  <Label htmlFor="patient">Patient <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedPatient}
                    onValueChange={setSelectedPatient}
                    disabled={!!patientId || isLoadingPatient || isLoadingAllPatients}
                  >
                    <SelectTrigger id="patient" className={cn(formSubmitted && !selectedPatient && "border-red-500")}>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientId && patientData ? (
                        <SelectItem value={patientData.id} key={patientData.id}> 
                          {patientData.name} ({patientData.species})
                        </SelectItem>
                      ) : (allPatientsData?.items || []).map((patient) => (
                        <SelectItem value={patient.id} key={patient.id}>
                          {patient.name} ({patient.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Clinic Selection (Admin Only) */}
            {userType?.isAdmin && (
              <Card className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-700">Clinic Details</h3>
                  <div>
                    <Label htmlFor="clinic-select">Clinic <span className="text-red-500">*</span></Label>
                    <Select
                      value={selectedClinicForPO}
                      onValueChange={setSelectedClinicForPO}
                      disabled={isLoadingClinics}
                    >
                      <SelectTrigger id="clinic-select" className={cn(formSubmitted && !selectedClinicForPO && "border-red-500")}>
                        <SelectValue placeholder="Select a clinic" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinicsData?.items?.map((clinic: Clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Invoice Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-number">Invoice Number</Label>
                  <Input
                    id="invoice-number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Auto-generated if left empty"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="consultation-fee">Consultation Fee</Label>
                  <Input
                    id="consultation-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
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
                      // Adjust consultationDiscountValue based on the new type
                      if (value === "percentage") {
                        // If switching to percentage, calculate equivalent percentage from current amount
                        const equivalentPercentage = consultationFee > 0 ? (consultationDiscountValue / consultationFee) * 100 : 0;
                        setConsultationDiscountValue(equivalentPercentage);
                      } else { // switching to amount
                        // If switching to amount, calculate equivalent amount from current percentage
                        const equivalentAmount = (consultationFee * consultationDiscountValue) / 100;
                        setConsultationDiscountValue(equivalentAmount);
                      }
                    }}
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
                      id="consultation-discount-value"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={consultationDiscountValue}
                      onChange={(e) => setConsultationDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0-100"
                      className="text-sm"
                    />
                  )}
                  {discountType === "amount" && (
                    <Input
                      id="consultation-discount-value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={consultationDiscountValue}
                      onChange={(e) => setConsultationDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-sm"
                    />
                  )}
                </div>
                {calculateConsultationDiscount() > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Discount: ₹{calculateConsultationDiscount().toFixed(2)} {discountType === "percentage" && consultationDiscountValue > 0 && `(${consultationDiscountValue.toFixed(1)}%)`}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Invoice notes or special instructions"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="min-h-20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items Section */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addItem}
                  className="flex items-center gap-1"
                  disabled={!poHistoryEnabled}
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>

              {!poHistoryEnabled ? (
                <p className="text-muted-foreground text-center py-4">
                  Please select a clinic to load available products
                </p>
              ) : isLoadingPurchaseOrderHistory ? (
                <p className="text-muted-foreground text-center py-4">
                  Loading available products...
                </p>
              ) : (
                <div className="border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Product</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Quantity</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Unit Price</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Total</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-muted-foreground">
                            Click "Add Item" to start adding products to your invoice
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => {
                          const selectedProduct = item.id ? getProductById(item.id) : null;
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 relative">
                                <div className="relative overflow-visible" ref={dropdownRef}>
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                    <Input
                                      type="text"
                                      placeholder="Search products or scan barcode..."
                                      className={cn(
                                        "pl-10",
                                        hasProductErrors(index) && "border-red-500 focus-visible:ring-red-500",
                                        item.id ? "pr-16" : "pr-16"
                                      )}
                                      value={item.id ? (item.productName || "") : (activeItemIndex === index ? searchQuery : "")}
                                      onChange={(e) => {
                                        if (item.id) {
                                          const updatedItems = [...items];
                                          updatedItems[index] = {
                                            ...updatedItems[index],
                                            id: "",
                                            productName: "",
                                            unitCost: 0,
                                            total: 0,
                                          };
                                          setItems(updatedItems);
                                        }
                                        setActiveItemIndex(index);
                                        setSearchQuery(e.target.value);
                                        handleProductSearch(e.target.value);
                                      }}
                                      onFocus={() => {
                                        setActiveItemIndex(index);
                                        setIsSearchDropdownOpen(true);
                                      }}
                                    />

                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                                      {!item.id && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 rounded-full hover:bg-slate-200"
                                          onClick={() => {
                                            setActiveItemIndex(index);
                                            setIsBarcodeScannerOpen(true);
                                          }}
                                          title="Scan barcode"
                                        >
                                          <Camera className="h-3 w-3" />
                                        </Button>
                                      )}
                                      
                                      {item.id && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 rounded-full hover:bg-slate-200"
                                          onClick={() => clearSelectedProduct(index)}
                                          title="Clear product"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>

                                    {isSearchDropdownOpen && activeItemIndex === index && !item.id && searchQuery.length > 0 && (
                                      <div className="absolute z-10 top-full bottom-auto w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                        {isLoadingPurchaseOrderHistory ? (
                                          <div className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-700">
                                            Loading products...
                                          </div>
                                        ) : filteredProducts.length > 0 ? (
                                          filteredProducts.map((product) => (
                                            <div
                                              key={product.id}
                                              className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-slate-100"
                                              onClick={() => handleProductSelect(product, index)}
                                            >
                                              <div className="flex flex-col">
                                                <span className="font-medium">{product.productName}</span>
                                                <span className="text-sm text-gray-500">
                                                  {product.productDetails?.productNumber ? `${product.productDetails.productNumber} | ` : ''}
                                                  {product.productDetails?.brandName ? `Brand: ${product.productDetails.brandName} | ` : ''}
                                                  {product.productDetails?.unitOfMeasure ? `${product.productDetails.unitOfMeasure} | ` : ''}
                                                  {product.batchNumber ? `Batch: ${product.batchNumber} | ` : ''}
                                                  {product.expiryDate ? `Exp: ${new Date(product.expiryDate).toLocaleDateString()} | ` : ''}
                                                  {product.quantityInHand !== undefined ? `Avail: ${product.quantityInHand} | ` : ''}
                                                  ₹{product.productDetails?.sellingPrice?.toFixed(2)}
                                                </span>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-700">
                                            No products found.
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {hasProductErrors(index) && (
                                  <div className="text-xs text-red-500 mt-1">Please select a product</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                                  className={cn(
                                    hasQuantityErrors(index) && "border-red-500 focus-visible:ring-red-500"
                                  )}
                                />
                                {hasQuantityErrors(index) && (
                                  <div className="text-xs text-red-500 mt-1">Enter valid quantity</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                ₹{item.unitCost.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                ₹{item.total.toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItem(index)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  disabled={items.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
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
              <div className="flex justify-between">
                <span>Items Total:</span>
                <span>₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Consultation Fee:</span>
                  <span>₹{consultationFee.toFixed(2)}</span>
                </div>
                {(discountType === "percentage" && consultationDiscountValue > 0) || (discountType === "amount" && consultationDiscountValue > 0) ? (
                  <div className="flex justify-between text-sm text-muted-foreground ml-4">
                    <span>
                      Discount{discountType === "percentage" ? ` (${consultationDiscountValue.toFixed(1)}%)` : ""}:
                    </span>
                    <span>-₹{calculateConsultationDiscount().toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-medium">
                  <span>Consultation Fee (after discount):</span>
                  <span>₹{calculateConsultationFeeAfterDiscount().toFixed(2)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <SheetFooter className="pt-6">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button className="theme-button text-white" type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </SheetFooter>
        </form>

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          isOpen={isBarcodeScannerOpen}
          onClose={() => setIsBarcodeScannerOpen(false)}
          onBarcodeDetected={handleBarcodeDetected}
        />
      </SheetContent>
    </Sheet>
  )
}