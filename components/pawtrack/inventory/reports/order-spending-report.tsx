"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export function OrderSpendingReport() {
  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Select defaultValue="last90">
            <SelectTrigger>
              <SelectValue placeholder="Last 90 Days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="last60">Last 60 Days</SelectItem>
              <SelectItem value="last90">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              <SelectItem value="covetrus">Covetrus</SelectItem>
              <SelectItem value="idexx">IDEXX</SelectItem>
              <SelectItem value="zoetis">Zoetis</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="medications">Medications</SelectItem>
              <SelectItem value="supplies">Medical Supplies</SelectItem>
              <SelectItem value="vaccines">Vaccines</SelectItem>
              <SelectItem value="diagnostics">Lab Diagnostics</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button className="theme-button text-white flex-1">Run Report</Button>
          <Button variant="outline" className="flex-1">
            <FileText className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Order Spending */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Order Spending</h3>
            <p className="text-4xl font-bold text-purple-600">$12,486.75</p>
            <p className="text-sm text-red-600 mt-2">-3.5% from previous period</p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Orders</h3>
            <p className="text-4xl font-bold text-purple-600">32</p>
            <p className="text-sm text-green-600 mt-2">+2 from previous period</p>
          </CardContent>
        </Card>

        {/* Top Supplier */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Top Supplier</h3>
            <p className="text-4xl font-bold text-purple-600">Covetrus</p>
            <p className="text-sm text-gray-600 mt-2">$5,245.50 (42.0%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spending Trend Chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Spending Trend</h3>
          <div className="h-96 w-full">
            <MonthlySpendingTrendChart />
          </div>
        </CardContent>
      </Card>

      {/* Spending by Category and Supplier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
            <div className="flex items-center">
              <div className="w-40 h-40 mr-4">
                <CategoryPieChart />
              </div>
              <div className="text-sm space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <span>Medications (45%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span>Medical Supplies (25%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span>Vaccines (18%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span>Lab Diagnostics (12%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spending by Supplier */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Spending by Supplier</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Spend
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      % of Total
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  <SupplierRow supplier="Covetrus" spend="$5,245.50" percentage="42.0%" />
                  <SupplierRow supplier="IDEXX" spend="$2,865.25" percentage="22.9%" />
                  <SupplierRow supplier="Zoetis" spend="$1,985.75" percentage="15.9%" />
                  <SupplierRow supplier="Others (4)" spend="$2,390.25" percentage="19.2%" />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type SupplierRowProps = {
  supplier: string;
  spend: string;
  percentage: string;
}

function SupplierRow({ supplier, spend, percentage }: SupplierRowProps) {
  return (
    <tr>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{supplier}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{spend}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{percentage}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
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
      {/* Simple pie chart with 4 sections */}
      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="20" />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#1E3D3D"
        strokeWidth="20"
        strokeDasharray="90 270"
        strokeDashoffset="0"
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#10b981"
        strokeWidth="20"
        strokeDasharray="50 310"
        strokeDashoffset="-90"
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#3b82f6"
        strokeWidth="20"
        strokeDasharray="36 324"
        strokeDashoffset="-140"
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#ef4444"
        strokeWidth="20"
        strokeDasharray="24 336"
        strokeDashoffset="-176"
      />
    </svg>
  )
}

function MonthlySpendingTrendChart() {
  // Data for the chart
  const monthData = [
    { month: "Feb", value: 4250, type: "actual" },
    { month: "Mar", value: 2845, type: "actual" },
    { month: "Apr", value: 2560, type: "actual" },
    { month: "May", value: 3680, type: "actual", note: "YTD" },
    { month: "Jun", value: 3200, type: "projected" },
    { month: "Jul", value: 2500, type: "projected" },
    { month: "Aug", value: 1970, type: "projected" },
  ]

  // Calculate the maximum value for scaling
  const maxValue = Math.max(...monthData.map((item) => item.value))
  const chartHeight = 240 // Height of the chart area
  const barWidth = 50
  const barSpacing = 40
  const chartWidth = monthData.length * (barWidth + barSpacing)
  const bottomPadding = 80 // Extra space at the bottom for labels

  // Function to scale values to fit in the chart
  const scaleValue = (value: number) => {
    return chartHeight - (value / maxValue) * chartHeight
  }

  return (
    <svg viewBox={`0 0 ${chartWidth + 60} ${chartHeight + bottomPadding}`} className="w-full h-full">
      {/* Background grid */}
      <rect x="40" y="0" width={chartWidth} height={chartHeight} fill="#f9fafb" rx="4" />

      {/* Y-axis labels */}
      <text x="10" y="15" fontSize="14" fontWeight="bold" fill="#4b5563">
        $6K
      </text>
      <text x="10" y={chartHeight / 2} fontSize="14" fontWeight="bold" fill="#4b5563">
        $3K
      </text>
      <text x="10" y={chartHeight - 5} fontSize="14" fontWeight="bold" fill="#4b5563">
        $0
      </text>

      {/* Horizontal grid lines */}
      <line x1="40" y1="0" x2={chartWidth + 40} y2="0" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="40" y1={chartHeight / 2} x2={chartWidth + 40} y2={chartHeight / 2} stroke="#e5e7eb" strokeWidth="1" />
      <line x1="40" y1={chartHeight} x2={chartWidth + 40} y2={chartHeight} stroke="#e5e7eb" strokeWidth="1" />

      {/* X-axis line */}
      <line x1="40" y1={chartHeight} x2={chartWidth + 40} y2={chartHeight} stroke="#9ca3af" strokeWidth="2" />

      {/* Legend */}
      <g transform={`translate(${chartWidth - 160}, 20)`}>
        <rect x="0" y="0" width="16" height="16" fill="#1E3D3D" rx="2" />
        <text x="24" y="13" fontSize="14" fontWeight="bold" fill="#4b5563">
          Actual
        </text>

        <rect x="90" y="0" width="16" height="16" fill="#e5e7eb" rx="2" />
        <text x="114" y="13" fontSize="14" fontWeight="bold" fill="#4b5563">
          Projected
        </text>
      </g>

      {/* Bars and labels */}
      {monthData.map((item, index) => {
        const x = index * (barWidth + barSpacing) + 60
        const isActual = item.type === "actual"

        return (
          <g key={index}>
            {/* Bar */}
            <rect
              x={x}
              y={scaleValue(item.value)}
              width={barWidth}
              height={chartHeight - scaleValue(item.value)}
              fill={isActual ? "#1E3D3D" : "#e5e7eb"}
              rx="4"
            />

            {/* Value label */}
            <text
              x={x + barWidth / 2}
              y={scaleValue(item.value) - 10}
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              fill="#4b5563"
            >
              ${item.value.toLocaleString()}
            </text>

            {/* Month label */}
            <text
              x={x + barWidth / 2}
              y={chartHeight + 25}
              fontSize="16"
              fontWeight="bold"
              textAnchor="middle"
              fill="#4b5563"
            >
              {item.month}
            </text>

            {/* Additional note (YTD or Projected) */}
            <text x={x + barWidth / 2} y={chartHeight + 45} fontSize="12" textAnchor="middle" fill="#6b7280">
              {item.note || (item.type === "projected" ? "Projected" : "")}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
