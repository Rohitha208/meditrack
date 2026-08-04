"use client"

import { useState } from "react"
import { FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InventoryBreadcrumb } from "@/components/pawtrack/inventory/inventory-breadcrumb"
import { UsageReport } from "@/components/pawtrack/inventory/reports/usage-report"
import { ExpirationReport } from "@/components/pawtrack/inventory/reports/expiration-report"
import { LowStockReport } from "@/components/pawtrack/inventory/reports/low-stock-report"
import { OrderSpendingReport } from "@/components/pawtrack/inventory/reports/order-spending-report"

export default function InventoryReportsPage() {
  const [reportType, setReportType] = useState("valuation")
  const [dateRange, setDateRange] = useState("last30")
  const [category, setCategory] = useState("all")
  const [activeTab, setActiveTab] = useState("valuation")

  const handleRunReport = () => {
    // This is now just for refreshing the report with new parameters
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <>
      <div className="p-6">
      

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">Inventory Reports</h1>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valuation">Inventory Valuation</SelectItem>
                <SelectItem value="usage">Usage Report</SelectItem>
                <SelectItem value="expiration">Expiration Tracking</SelectItem>
                <SelectItem value="lowstock">Low Stock Items</SelectItem>
                <SelectItem value="spending">Order Spending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="last90">Last 90 Days</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="medications">Medications</SelectItem>
                <SelectItem value="supplies">Medical Supplies</SelectItem>
                <SelectItem value="food">Food & Supplements</SelectItem>
                <SelectItem value="vaccines">Vaccines</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button className="w-full theme-button text-white" onClick={handleRunReport}>
              Run
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <FileText className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="valuation" className="mb-6" onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="valuation" className="text-sm">
              Inventory Valuation
            </TabsTrigger>
            <TabsTrigger value="usage" className="text-sm">
              Usage Report
            </TabsTrigger>
            <TabsTrigger value="expiration" className="text-sm">
              Expiration Tracking
            </TabsTrigger>
            <TabsTrigger value="lowstock" className="text-sm">
              Low Stock Items
            </TabsTrigger>
            <TabsTrigger value="spending" className="text-sm">
              Order Spending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="valuation">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
              {/* Total Inventory Value */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Total Inventory Value</h3>
                  <p className="text-4xl font-bold text-purple-600">$24,875.50</p>
                </CardContent>
              </Card>

              {/* Value by Category */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Value by Category</h3>
                  <div className="flex items-center">
                    <div className="w-24 h-24 mr-4">
                      <CategoryPieChart />
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span>Medications: $10,542.25</span>
                      </div>
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span>Supplies: $8,650.75</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span>Other: $5,682.50</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Counts */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Inventory Counts</h3>
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span>Total Items:</span>
                      <span className="font-semibold">1,287</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Categories:</span>
                      <span className="font-semibold">4</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Low Stock Items:</span>
                      <span className="font-semibold text-red-500">23</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Items Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Avg Cost/Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        % of Inventory
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    <InventoryRow
                      category="Medications"
                      count={423}
                      avgCost="$24.92"
                      totalValue="$10,542.25"
                      percentage="42.4%"
                    />
                    <InventoryRow
                      category="Medical Supplies"
                      count={315}
                      avgCost="$27.46"
                      totalValue="$8,650.75"
                      percentage="34.8%"
                    />
                    <InventoryRow
                      category="Food & Supplements"
                      count={172}
                      avgCost="$18.30"
                      totalValue="$3,147.20"
                      percentage="12.7%"
                    />
                    <InventoryRow
                      category="Vaccines"
                      count={57}
                      avgCost="$44.48"
                      totalValue="$2,535.30"
                      percentage="10.2%"
                    />
                    <tr className="bg-gray-50 dark:bg-slate-700 font-medium">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">TOTAL</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">967</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">$25.72 avg</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">$24,875.50</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">100%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="usage">
            {/* Always show the Usage Report when this tab is selected */}
            <UsageReport />
          </TabsContent>

          <TabsContent value="expiration">
            {/* Always show the Expiration Report when this tab is selected */}
            <ExpirationReport />
          </TabsContent>

          <TabsContent value="lowstock">
            {/* Always show the Low Stock Report when this tab is selected */}
            <LowStockReport />
          </TabsContent>

          <TabsContent value="spending">
            {/* Always show the Order Spending Report when this tab is selected */}
            <OrderSpendingReport />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function InventoryRow({ 
  category, 
  count, 
  avgCost, 
  totalValue, 
  percentage 
}: { 
  category: string; 
  count: number; 
  avgCost: string; 
  totalValue: string; 
  percentage: string; 
}) {
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{category}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{count}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avgCost}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{totalValue}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{percentage}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
        <svg width="80" height="20" viewBox="0 0 80 20" className="text-purple-500">
          <polyline
            points="0,10 10,8 20,12 30,7 40,9 50,5 60,8 70,4 80,6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </td>
    </tr>
  )
}

function CategoryPieChart() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Simple pie chart with 3 sections */}
      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="20" />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#10b981"
        strokeWidth="20"
        strokeDasharray="83.8 166.2"
        strokeDashoffset="0"
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#3b82f6"
        strokeWidth="20"
        strokeDasharray="69.2 180.8"
        strokeDashoffset="-83.8"
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#ef4444"
        strokeWidth="20"
        strokeDasharray="47 203"
        strokeDashoffset="-153"
      />
    </svg>
  )
}
