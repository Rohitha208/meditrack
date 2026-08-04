"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Download, Printer, Plus } from "lucide-react"
import { useGetPatientInvoices, type PatientInvoice } from "@/queries/invoice/get-patient-invoices"
import InvoiceViewSheet from "@/components/pawtrack/invoice/InvoiceViewSheet"
import NewInvoiceForm from "@/components/pawtrack/billing/new-invoice-form"
import { formatDate } from "@/lib/utils"
import InvoiceSheet from "@/components/pawtrack/invoice/InvoiceSheet"
import { useGetVisitById } from "@/queries/visit/get-visit-by-id"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface PatientInvoicesProps {
  patientId: string
}

export default function PatientInvoices({ patientId }: PatientInvoicesProps) {
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
  const [isAddInvoiceSheetOpen, setIsAddInvoiceSheetOpen] = useState(false)
  const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false) // New state for InvoiceSheet
  const [selectedInvoice, setSelectedInvoice] = useState<PatientInvoice | null>(null)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  const { data: visitData } = useGetVisitById(selectedInvoice?.visitId || "", !!selectedInvoice?.visitId)
  const { data, isLoading, isError } = useGetPatientInvoices({
    patientId,
    pageNumber,
    pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
    // search: searchTerm, // Remove search term
    startDate: startDate ? format(startDate, "yyyy-MM-dd'T'00:00:00.000'Z'") : undefined,
    endDate: endDate ? format(endDate, "yyyy-MM-dd'T'23:59:59.999'Z'") : undefined,
  })

  const handleViewInvoice = (invoice: PatientInvoice) => {
    setSelectedInvoiceId(invoice.id)
    setIsViewSheetOpen(true)
  }

  const handleCloseViewSheet = () => {
    setIsViewSheetOpen(false)
    setSelectedInvoiceId(null)
  }

  const handleEditInvoice = (invoice: PatientInvoice) => {
    setSelectedInvoice(invoice)
    setIsInvoiceSheetOpen(true)
  }

  const handleCloseInvoiceSheet = () => {
    setIsInvoiceSheetOpen(false)
    setSelectedInvoice(null)
  }

  const handleAddNewInvoice = () => {
    setIsAddInvoiceSheetOpen(true)
  }

  const handleCloseAddInvoiceSheet = () => {
    setIsAddInvoiceSheetOpen(false)
  }

  const handlePrintInvoice = (invoice: PatientInvoice) => {
    // TODO: Implement print functionality
    console.log("Print invoice:", invoice.id)
  }

  const handleDownloadInvoice = (invoice: PatientInvoice) => {
    // TODO: Implement download functionality
    console.log("Download invoice:", invoice.id)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "default"
      case "unpaid":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-32">
          <p className="text-destructive">Error loading invoices. Please try again.</p>
        </div>
      </div>
    )
  }

  const invoices = data?.items || []

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Invoice Filters</CardTitle>
          <Button size="sm" onClick={handleAddNewInvoice}>
            <Plus className="h-4 w-4 mr-2" />
            Add Invoice
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex flex-col sm:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span className="mr-auto">Start Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span className="mr-auto">End Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No invoices found for this patient.</p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Total Amount:</span>
                        <p className="text-lg font-semibold text-foreground">₹{invoice.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Consultation Fee:</span>
                        <p>₹{invoice.consultationFee.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Items Total:</span>
                        <p>₹{invoice.itemsTotal.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <p>{formatDate(invoice.createdAt)}</p>
                      </div>
                    </div>

                    {invoice.consultationDiscount > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">Discount:</span> ₹{invoice.consultationDiscount.toFixed(2)}
                        {invoice.consultationDiscountPercentage > 0 && (
                          <span> ({invoice.consultationDiscountPercentage.toFixed(1)}%)</span>
                        )}
                      </div>
                    )}

                    {invoice.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {invoice.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditInvoice(invoice)}
                      disabled={invoice.status === "paid"}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((pageNumber - 1) * pageSize) + 1} to {Math.min(pageNumber * pageSize, data.totalCount)} of {data.totalCount} invoices
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber(pageNumber - 1)}
                  disabled={!data.hasPreviousPage}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pageNumber} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber(pageNumber + 1)}
                  disabled={!data.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice View Sheet */}
      {selectedInvoiceId && (
        <InvoiceViewSheet
          isOpen={isViewSheetOpen}
          onClose={handleCloseViewSheet}
          invoiceId={selectedInvoiceId}
        />
      )}

      {/* Add Invoice Sheet */}
      {isAddInvoiceSheetOpen && (
        <NewInvoiceForm
          open={isAddInvoiceSheetOpen}
          onClose={handleCloseAddInvoiceSheet}
          patientId={patientId}
        />
      )}

      {/* Invoice Edit Sheet */}
      {isInvoiceSheetOpen && selectedInvoice && (
        <InvoiceSheet
          isOpen={isInvoiceSheetOpen}
          onClose={handleCloseInvoiceSheet}
          invoiceId={selectedInvoice.id}
          patientId={selectedInvoice.patientId}
          appointmentId={visitData?.appointmentId || ""}
          visitId={selectedInvoice.visitId}
        />
      )}
    </div>
  )
}