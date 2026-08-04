"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import NewInvoiceForm from "./new-invoice-form"
import ProcessPayment from "./process-payment"

export const BillingScreen = () => {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false)
  const [processPaymentOpen, setProcessPaymentOpen] = useState(false)

  // Sample invoice data
  const invoices = [
    {
      id: "INV-12345",
      client: "John Smith",
      patient: "Max (Dog)",
      date: "May 12, 2025",
      amount: 125.0,
      status: "Outstanding",
    },
    {
      id: "INV-12344",
      client: "Sarah Johnson",
      patient: "Bella (Cat)",
      date: "May 11, 2025",
      amount: 75.5,
      status: "Paid",
    },
    {
      id: "INV-12343",
      client: "Robert Thompson",
      patient: "Charlie (Dog)",
      date: "May 10, 2025",
      amount: 245.75,
      status: "Outstanding",
    },
    {
      id: "INV-12342",
      client: "Emma Wilson",
      patient: "Daisy (Rabbit)",
      date: "May 10, 2025",
      amount: 95.0,
      status: "Paid",
    },
    {
      id: "INV-12341",
      client: "Mike Davis",
      patient: "Oscar (Cat)",
      date: "May 9, 2025",
      amount: 315.25,
      status: "Payment Plan",
    },
    { id: "INV-12340", client: "Lisa Chen", patient: "Luna (Cat)", date: "May 8, 2025", amount: 165.0, status: "Paid" },
  ]

  // Filter invoices based on active tab
  const filteredInvoices = invoices.filter((invoice) => {
    if (activeTab === "all") return true
    if (activeTab === "outstanding") return invoice.status === "Outstanding"
    if (activeTab === "paid") return invoice.status === "Paid"
    if (activeTab === "voided") return invoice.status === "Voided"
    if (activeTab === "payment-plans") return invoice.status === "Payment Plan"
    return true
  })

  // Calculate summary statistics
  const totalOutstanding = invoices
    .filter((invoice) => invoice.status === "Outstanding")
    .reduce((sum, invoice) => sum + invoice.amount, 0)
    .toFixed(2)

  const revenueThisMonth = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0)
    .toFixed(2)

  const averageInvoice = (invoices.reduce((sum, invoice) => sum + invoice.amount, 0) / invoices.length).toFixed(2)

  const paymentPlansActive = invoices.filter((invoice) => invoice.status === "Payment Plan").length
  const paymentPlansTotal = invoices
    .filter((invoice) => invoice.status === "Payment Plan")
    .reduce((sum, invoice) => sum + invoice.amount, 0)
    .toFixed(2)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  // Function to get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Outstanding":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      case "Voided":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300"
      case "Payment Plan":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    }
  }

  return (
    <>
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Invoice Management</h1>
          <div className="flex gap-2">
            <Button className={`theme-button text-white`} onClick={() => setNewInvoiceOpen(true)}>
              + New Invoice
            </Button>
            <Button variant="outline" className="theme-button-outline" onClick={() => setProcessPaymentOpen(true)}>
              Process Payment
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by client, patient, or invoice #" className="pl-8" />
              </div>
              <div className="relative">
                <Button variant="outline" className="w-full justify-between">
                  Status: All
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </div>
              <div className="relative">
                <Button variant="outline" className="w-full justify-between">
                  Date Range
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 justify-between">
                  Sort By
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
                <Button className={`theme-button text-white`}>Apply</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full bg-card mb-6">
            <TabsTrigger
              value="all"
              className="flex-1 data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              All (94)
            </TabsTrigger>
            <TabsTrigger
              value="outstanding"
              className="flex-1 data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Outstanding (28)
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="flex-1 data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Paid (62)
            </TabsTrigger>
            <TabsTrigger
              value="voided"
              className="flex-1 data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Voided (4)
            </TabsTrigger>
            <TabsTrigger
              value="payment-plans"
              className="flex-1 data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Payment Plans (8)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {/* Invoice Table */}
            <div className="bg-white dark:bg-gray-800 rounded-md shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Client / Patient
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.client}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.patient}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{invoice.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${invoice.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                              invoice.status
                            )}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Invoice</DropdownMenuItem>
                              <DropdownMenuItem>Download PDF</DropdownMenuItem>
                              <DropdownMenuItem>Process Payment</DropdownMenuItem>
                              <DropdownMenuItem>Void Invoice</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outstanding" className="mt-0">
            {/* Same table structure as above, but with filtered data */}
          </TabsContent>

          <TabsContent value="paid" className="mt-0">
            {/* Same table structure as above, but with filtered data */}
          </TabsContent>

          <TabsContent value="voided" className="mt-0">
            {/* Same table structure as above, but with filtered data */}
          </TabsContent>

          <TabsContent value="payment-plans" className="mt-0">
            {/* Same table structure as above, but with filtered data */}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sliding pane for New Invoice */}
      <NewInvoiceForm open={newInvoiceOpen} onClose={() => setNewInvoiceOpen(false)} />

      {/* Modal for Processing Payment */}
      <ProcessPayment open={processPaymentOpen} onClose={() => setProcessPaymentOpen(false)} />
    </>
  )
} 