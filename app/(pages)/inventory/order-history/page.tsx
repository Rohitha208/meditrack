"use client"

import { useState } from "react"
import { InventoryBreadcrumb } from "@/components/pawtrack/inventory/inventory-breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function OrderHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [supplierFilter, setSupplierFilter] = useState("All")
  const [dateRange, setDateRange] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Sample data for the orders
  const orders = [
    {
      id: "PO-482",
      date: "May 13, 2025",
      supplier: "Covetrus",
      items: 15,
      total: "$428.75",
      status: "Ordered",
    },
    {
      id: "PO-481",
      date: "May 10, 2025",
      supplier: "IDEXX",
      items: 8,
      total: "$345.50",
      status: "Shipped",
    },
    {
      id: "PO-480",
      date: "May 8, 2025",
      supplier: "MWI Animal Health",
      items: 12,
      total: "$525.25",
      status: "Received",
    },
    {
      id: "PO-479",
      date: "May 5, 2025",
      supplier: "Zoetis",
      items: 6,
      total: "$198.50",
      status: "Received",
    },
    {
      id: "PO-478",
      date: "May 1, 2025",
      supplier: "VetSupplies",
      items: 10,
      total: "$420.00",
      status: "Received",
    },
  ]

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Ordered":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "Shipped":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      case "Received":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <>
      <div className="p-6">
       

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Order History</h1>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Status: All</SelectItem>
                <SelectItem value="Ordered">Ordered</SelectItem>
                <SelectItem value="Shipped">Shipped</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Supplier: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Supplier: All</SelectItem>
                <SelectItem value="Covetrus">Covetrus</SelectItem>
                <SelectItem value="IDEXX">IDEXX</SelectItem>
                <SelectItem value="Zoetis">Zoetis</SelectItem>
                <SelectItem value="MWI Animal Health">MWI Animal Health</SelectItem>
                <SelectItem value="VetSupplies">VetSupplies</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">Apply</Button>
        </div>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/20 dark:data-[state=active]:text-purple-300 border border-purple-200 dark:border-purple-800"
            >
              All (45)
            </TabsTrigger>
            <TabsTrigger
              value="ordered"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white border border-purple-200 dark:border-purple-800"
            >
              Ordered (12)
            </TabsTrigger>
            <TabsTrigger
              value="shipped"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/20 dark:data-[state=active]:text-purple-300 border border-purple-200 dark:border-purple-800"
            >
              Shipped (8)
            </TabsTrigger>
            <TabsTrigger
              value="received"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/20 dark:data-[state=active]:text-purple-300 border border-purple-200 dark:border-purple-800"
            >
              Received (25)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders Table */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm mb-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total
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
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {order.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {order.supplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {order.items}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {order.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusBadgeClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                        >
                          View
                        </Button>
                        {(order.status === "Ordered" || order.status === "Shipped") && (
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                            Track
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Orders This Month</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">14</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Spend This Month</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">$4,328.75</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pending Deliveries</h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">8</p>
            </CardContent>
          </Card>
        </div>

        {/* Pagination */}
        <div className="flex justify-end">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-10 h-10 p-0 bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:border-purple-700"
            >
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-10 h-10 p-0 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
            >
              2
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-10 h-10 p-0 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
            >
              →
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
