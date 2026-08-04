"use client"

import { useState, useEffect } from "react"
import { Plus, Package, AlertTriangle, Clock, ShoppingCart, ArrowLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { OrderModal } from "./order-modal"

export default function Inventory() {
  const [mounted, setMounted] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <>
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inventory Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* <Button variant="destructive" className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800">
              <AlertTriangle className="mr-2 h-4 w-4" /> Low Stock
            </Button> */}
            <Button className="bg-primary text-white hover:bg-primary/90" asChild>
              <Link href="/inventory/stock-adjustment">Adjust Stock</Link>
            </Button>
            <Button 
              className="bg-primary text-white hover:bg-primary/90"
              onClick={() => setIsOrderModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Order
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Items"
            value="1,287"
            trend="+2.5% from last month"
            trendColor="text-green-500"
            icon={<Package className="h-8 w-8 text-blue-500" />}
          />
          <StatsCard
            title="Low Stock Items"
            value="23"
            trend="+4 since last week"
            trendColor="text-red-500"
            icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
          />
          <StatsCard
            title="Expiring Soon"
            value="12"
            trend="Within next 30 days"
            trendColor="text-amber-500"
            icon={<Clock className="h-8 w-8 text-amber-500" />}
          />
          <StatsCard
            title="Pending Orders"
            value="4"
            trend="Expected delivery: May 15"
            trendColor="text-blue-500"
            icon={<ShoppingCart className="h-8 w-8 text-blue-500" />}
          />
        </div>

        {/* Recent Activity and Low Stock Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          {/* Recent Activity */}
          {/* <Card className="bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              </div>
              <div className="p-4 space-y-4">
                <ActivityItem time="Today, 10:25 AM" description="Dr. Johnson dispensed 2x Amoxicillin 250mg to Max" />
                <ActivityItem time="Today, 9:15 AM" description="Sarah adjusted Rabies Vaccine stock (+12 units)" />
                <ActivityItem time="Today, 8:30 AM" description="Order #PO-482 received from Covetrus (15 items)" />
                <ActivityItem time="Yesterday, 4:20 PM" description="Mike flagged Cephalexin 500mg as low stock" />
                <ActivityItem
                  time="Yesterday, 1:15 PM"
                  description="New order #PO-483 placed to VetSupplies (8 items)"
                />
              </div>
            </CardContent>
          </Card> */}

          {/* Low Stock Alert */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Low Stock Alert</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Current
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Threshold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    <LowStockItem name="Cephalexin 500mg" current={3} threshold={10} />
                    <LowStockItem name="Rimadyl 75mg" current={5} threshold={15} />
                    <LowStockItem name="Syringes 3ml" current={12} threshold={25} />
                    <LowStockItem name="Heartworm Test Kits" current={4} threshold={10} />
                    <LowStockItem name="Vetmedin 5mg" current={2} threshold={8} />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Categories */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inventory Categories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <CategoryCard
              title="Medications"
              count="423"
              bgColor="bg-blue-50 dark:bg-blue-900/20"
              textColor="text-blue-500"
            />
            <CategoryCard
              title="Vaccines"
              count="57"
              bgColor="bg-green-50 dark:bg-green-900/20"
              textColor="text-green-500"
            />
            <CategoryCard
              title="Medical Supplies"
              count="315"
              bgColor="bg-red-50 dark:bg-red-900/20"
              textColor="text-red-500"
            />
            <CategoryCard
              title="Food & Supplements"
              count="172"
              bgColor="bg-purple-50 dark:bg-purple-900/20"
              textColor="text-purple-500"
            />
          </div>
        </div>

        {/* Quick Links */}
        {/* <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-gray-700 dark:text-gray-300">Quick Links:</span>
            <Button
              variant="secondary"
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
              asChild
            >
              <Link href="/inventory/product-catalog">Product Catalog</Link>
            </Button>
            <Button
              variant="secondary"
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
              asChild
            >
              <Link href="/inventory/suppliers">Suppliers</Link>
            </Button>
            <Button
              variant="secondary"
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
              asChild
            >
              <Link href="/inventory/order-history">Order History</Link>
            </Button>
            <Button
              variant="secondary"
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
              asChild
            >
              <Link href="/inventory/reports">Inventory Reports</Link>
            </Button>
            <Button
              variant="secondary"
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
              asChild
            >
              <Link href="/inventory/stock-adjustment">Stock Adjustment</Link>
            </Button>
            <Button
              variant="secondary"
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
              asChild
            >
              <Link href="/inventory/settings">
                <Settings className="h-4 w-4 mr-1" />
                Inventory Settings
              </Link>
            </Button>
          </div>
        </div> */}
      </div>

      <OrderModal 
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />
    </>
  )
}

function StatsCard({ title, value, trend, trendColor, icon } : any) {
  return (
    <Card className="bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="h-1 theme-accent"></div>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold mt-1 theme-text-primary">{value}</p>
            <p className={`text-sm mt-1 ${trendColor}`}>{trend}</p>
          </div>
          <div className="flex items-start">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ time, description } : any) {
  return (
    <div className="border-l-2 theme-border pl-4 py-1">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{time}</p>
      <p className="text-gray-900 dark:text-gray-200">{description}</p>
    </div>
  )
}

function LowStockItem({ name, current, threshold } : any) {
  const severity =
    current <= threshold * 0.25 ? "text-red-600" : current <= threshold * 0.5 ? "text-amber-600" : "text-blue-600"

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{name}</td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${severity}`}>{current}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{threshold}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <Button variant="secondary" size="sm" className="theme-button-secondary">
          Order
        </Button>
      </td>
    </tr>
  )
}

function CategoryCard({ title, count, bgColor, textColor } : any) {
  return (
    <Card className={`shadow-sm ${bgColor} border-0 overflow-hidden`}>
      <div className="h-1 theme-accent"></div>
      <CardContent className="p-6 text-center">
        <h4 className={`text-lg font-medium ${textColor}`}>{title}</h4>
        <p className={`text-3xl font-bold mt-2 theme-text-primary`}>{count}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">items</p>
      </CardContent>
    </Card>
  )
}
