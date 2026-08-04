"use client"

import { Package, AlertTriangle, Clock, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useGetInventoryDashboard } from "@/queries/inventory/get-dashboard";
import { ExpiringProductsCard } from "@/components/pawtrack/dashboard/shared/expiring-products-card"
import { useExpiringProducts } from "@/queries/dashboard/get-expiring-products"
import React, { useState } from "react"
import { OrderModal } from "./order-modal"
import Loader from "@/components/ui/loader"

interface DashboardTabProps {
  clinicId: string
}

export default function DashboardTab({ clinicId }: DashboardTabProps) {
  const { data, isLoading, isError } = useGetInventoryDashboard(clinicId);
  const { data: expiringProducts = [] } = useExpiringProducts(clinicId);
  const hasExpiringProducts = expiringProducts.length > 0;
  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [initialQuantity, setInitialQuantity] = useState<{current: number, threshold: number} | null>(null);

  if (isLoading) {
    return <div className="min-h-[calc(100vh-20rem)] flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <Loader size="lg" label="Loading dashboard..." />
    </div>
  </div>
  }
  if (isError || !data) {
    return <div>Error loading dashboard data.</div>;
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Items"
          value={data.totalItems}
          trend=""
          trendColor="text-[#1E3D3D]"
          icon={<Package className="h-8 w-8 text-[#1E3D3D]" />}
        />
        <StatsCard
          title="Low Stock Items"
          value={data.lowStockItemsCount}
          trend=""
          trendColor="text-[#1E3D3D]"
          icon={<AlertTriangle className="h-8 w-8 text-[#1E3D3D]" />}
        />
        <StatsCard
          title="Expiring Soon"
          value={data.expiringSoonItems}
          trend=""
          trendColor="text-[#1E3D3D]"
          icon={<Clock className="h-8 w-8 text-[#1E3D3D]" />}
        />
        <StatsCard
          title="Pending Orders"
          value={data.pendingPurchaseOrders}
          trend=""
          trendColor="text-[#1E3D3D]"
          icon={<ShoppingCart className="h-8 w-8 text-[#1E3D3D]" />}
        />
      </div>

      {hasExpiringProducts && (
        <div className="w-full mb-8">
          <ExpiringProductsCard className="w-full" clinicId={clinicId} products={expiringProducts} />
        </div>
      )}

      {/* Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        <Card className="bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Low Stock Alert</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#D2EFEC]/30 dark:bg-[#1E3D3D]/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                      Current
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#1E3D3D] dark:text-[#D2EFEC] uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {data.lowStockItems && data.lowStockItems.length > 0 ? (
                    data.lowStockItems.map((item) => (
                      <LowStockItem
                        key={item.productId}
                        name={item.productName}
                        current={item.currentItemUnits}
                        threshold={item.threshold}
                        onOrderClick={() => {
                          setSelectedProductId(item.productId);
                          setInitialQuantity({
                            current: item.currentItemUnits,
                            threshold: item.threshold
                          });
                          setOrderModalOpen(true);
                        }}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No low stock items.
                      </td>
                    </tr>
                  )}
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
            count={data.numberOfAntibiotics + data.numberOfPainManagement}
            bgColor="bg-[#D2EFEC] dark:bg-[#1E3D3D]/20"
            textColor="text-[#1E3D3D] dark:text-[#D2EFEC]"
          />
          <CategoryCard
            title="Vaccines"
            count={data.numberOfVaccines}
            bgColor="bg-[#D2EFEC]/80 dark:bg-[#1E3D3D]/15"
            textColor="text-[#1E3D3D] dark:text-[#D2EFEC]"
          />
          <CategoryCard
            title="Medical Supplies"
            count={data.numberOfMedicalSupplies}
            bgColor="bg-[#D2EFEC]/60 dark:bg-[#1E3D3D]/10"
            textColor="text-[#1E3D3D] dark:text-[#D2EFEC]"
          />
          <CategoryCard
            title="Food & Supplements"
            count={data.numberOfFood + data.numberOfSupplements}
            bgColor="bg-[#D2EFEC]/40 dark:bg-[#1E3D3D]/5"
            textColor="text-[#1E3D3D] dark:text-[#D2EFEC]"
          />
        </div>
      </div>
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setOrderModalOpen(false);
          setSelectedProductId(undefined);
          setInitialQuantity(null);
        }}
        clinicId={clinicId}
        initialProductId={selectedProductId}
        initialQuantity={initialQuantity}
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

function LowStockItem({ name, current, threshold, onOrderClick } : any) {
  const severity =
    current <= threshold * 0.25 ? "text-red-600" : current <= threshold * 0.5 ? "text-amber-600" : "text-blue-600"

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{name}</td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${severity}`}>{current}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{threshold}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <Button variant="secondary" size="sm" className="theme-button-secondary hover:bg-theme-button-secondary-hover" onClick={onOrderClick}>
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