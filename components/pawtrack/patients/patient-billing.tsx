"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, CreditCard, Download, FileText, Plus, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Progress } from "@/components/ui/progress"

export default function PatientBilling() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [date, setDate] = useState<Date>()
  
  const invoices = [
    {
      id: "INV-2025-001",
      date: "May 1, 2025",
      total: "$250.00",
      paid: "$250.00",
      balance: "$0.00",
      status: "paid",
      items: [
        { name: "Annual Check-up", amount: "$85.00" },
        { name: "Vaccinations (Rabies, DHPP)", amount: "$120.00" },
        { name: "Nail Trim", amount: "$25.00" },
        { name: "Anal Gland Expression", amount: "$20.00" },
      ]
    },
    {
      id: "INV-2025-002",
      date: "Mar 15, 2025",
      total: "$65.00",
      paid: "$65.00",
      balance: "$0.00",
      status: "paid",
      items: [
        { name: "Medication Refill - Heartgard Plus (6 months)", amount: "$65.00" },
      ]
    },
    {
      id: "INV-2024-042",
      date: "Nov 10, 2024",
      total: "$175.00",
      paid: "$100.00",
      balance: "$75.00",
      status: "partial",
      items: [
        { name: "Sick Visit - Digestive Issues", amount: "$95.00" },
        { name: "Fecal Test", amount: "$45.00" },
        { name: "Medication - Metronidazole", amount: "$35.00" },
      ]
    },
  ]

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = searchTerm === "" || 
                          invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Balance */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Balance</h3>
            <div className="mt-4 mb-2">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">$75.00</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Due in 14 days</span>
              <Button className="theme-button text-white">Pay Now</Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Plan */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Care Plan</h3>
            <div className="mt-4 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Annual Wellness Plan</span>
                <span className="text-gray-900 dark:text-white">$65/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Membership status</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Active</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Next payment</span>
                <span className="text-gray-900 dark:text-white">Jun 1, 2025</span>
              </div>
              <Button variant="outline" className="w-full">Manage Plan</Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment Methods</h3>
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Visa ****4242</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Expires 12/26</div>
                  </div>
                </div>
                <Badge variant="outline">Default</Badge>
              </div>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice History</h3>
            <Button className="theme-button text-white">
              <Plus className="mr-2 h-4 w-4" /> Create Invoice
            </Button>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Label htmlFor="search-invoices" className="sr-only">Search</Label>
              <Input
                id="search-invoices"
                placeholder="Search invoices..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="absolute right-2 top-2 h-5 w-5 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div>
              <Label htmlFor="status-filter" className="sr-only">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-filter" className="sr-only">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-filter"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="detail">Detail View</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="p-0 mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                          {invoice.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {invoice.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {invoice.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {invoice.paid}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {invoice.balance}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {invoice.status === "paid" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                              Paid
                            </Badge>
                          ) : invoice.status === "partial" ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                              Partially Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                              Unpaid
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="sr-only">View Invoice</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Download className="h-3.5 w-3.5" />
                              <span className="sr-only">Download</span>
                            </Button>
                            {invoice.status !== "paid" && (
                              <Button size="sm" className="h-8 theme-button text-white">
                                Pay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredInvoices.length === 0 && (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <p>No invoices match your search criteria.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="detail" className="p-4">
              {filteredInvoices.length > 0 ? (
                <div className="space-y-6">
                  {filteredInvoices.map((invoice) => (
                    <Card key={invoice.id} className="p-4 border border-gray-200 dark:border-slate-700">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                            Invoice {invoice.id}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Issued on {invoice.date}</p>
                        </div>
                        <div className="flex items-center mt-2 md:mt-0">
                          {invoice.status === "paid" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 mr-2">
                              Paid
                            </Badge>
                          ) : invoice.status === "partial" ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 mr-2">
                              Partially Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 mr-2">
                              Unpaid
                            </Badge>
                          )}
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Services</p>
                        <ul className="mt-2 divide-y divide-gray-200 dark:divide-slate-700">
                          {invoice.items.map((item, index) => (
                            <li key={index} className="py-2 flex justify-between">
                              <span className="text-sm text-gray-900 dark:text-gray-200">{item.name}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.amount}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">Total</span>
                          <span className="font-medium text-gray-900 dark:text-white">{invoice.total}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Paid to Date</span>
                          <span className="text-sm text-gray-900 dark:text-gray-200">{invoice.paid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">Remaining Balance</span>
                          <span className="font-medium text-gray-900 dark:text-white">{invoice.balance}</span>
                        </div>
                      </div>
                      {invoice.status !== "paid" && (
                        <div className="mt-4">
                          <Button className="w-full theme-button text-white">Pay Balance</Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  <p>No invoices match your search criteria.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 