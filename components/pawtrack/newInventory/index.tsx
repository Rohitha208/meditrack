"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { OrderModal } from "./order-modal"
import DashboardTab from "./dashboard-tab"
import PurchaseOrdersTab from "./purchase-orders-tab"
import ReceivingTab from "./receiving-tab"
import StockTab from "./stock-tab"
import { useGetClinic } from "@/queries/clinic/get-clinic"
import { useRootContext } from "@/context/RootContext"
import LocationsTab from "./location-tab"
import { parseAsString, useQueryStates } from "nuqs"
import StockAdjustmentTab from "./stock-adjustment-tab"

export default function Inventory() {
  const [mounted, setMounted] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")

  const { userType, clinic } = useRootContext();
  const companyId = clinic?.companyId ?? null;
  console.log("Company ID from clinic context:", companyId);
  const { data, isLoading, error } = useGetClinic(
    1,
    10,
    companyId
);
  const clinicsData = data?.items || null;
  
  // Use clinic ID from context for clinic admin/veterinarian users
  const clinicId = (userType.isClinicAdmin || userType.isVeterinarian) ? clinic?.id || '' : '';
  // nuqs-backed query param for clinic selection (by id)
  const [qp, setQp] = useQueryStates({ clinicId: parseAsString });
  const handleClinicChange = (value: string) => {
    setQp({ clinicId: value })
  }
  
  // Initialize query param when missing: prefer context clinicId, otherwise first clinic id
  useEffect(() => {
    if (!qp.clinicId) {
      const initial = clinicId || (clinicsData && clinicsData.length > 0 ? clinicsData[0].id : '');
      if (initial) {
        setQp({ clinicId: initial });
      }
    }
  }, [qp.clinicId, clinicId, clinicsData, setQp])

  // Debug logging for clinic changes
  useEffect(() => {
    console.log('newInventory: clinic context changed:', {
      clinicId: clinic?.id,
      clinicName: clinic?.name,
      effectiveClinicId: qp.clinicId,
      userType: userType
    })
  }, [clinic, qp.clinicId, userType])

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  // Determine which clinic ID to use
  const effectiveClinicId = qp.clinicId || (clinicsData && clinicsData.length > 0 ? clinicsData[0].id : '')

  return (
    <>
      <div className="p-0">
        {!clinicId && !userType?.isReceptionist && (
          <div className="flex flex-col md:flex-row justify-between items-center md:items-center mb-6">
            <div className="flex items-center gap-2">
              <Select value={effectiveClinicId} onValueChange={handleClinicChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinicsData?.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="purchase-orders"
              className="data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Purchase Orders
            </TabsTrigger>
            <TabsTrigger
              value="receiving"
              className="data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Purchase Order Receiving
            </TabsTrigger>
            <TabsTrigger
              value="locations"
              className="data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Locations
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              className="data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Stock
            </TabsTrigger>
            <TabsTrigger
              value="stock-adjustment"
              className="data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]"
            >
              Stock Adjustment
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" key={`dashboard-${effectiveClinicId}`}>
            <DashboardTab clinicId={effectiveClinicId} />
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="purchase-orders" key={`purchase-orders-${effectiveClinicId}`}>
            <PurchaseOrdersTab
              clinicId={effectiveClinicId}
              onNewOrder={() => setIsOrderModalOpen(true)}
            />
          </TabsContent>

          {/* Purchase Order Receiving Tab */}
          <TabsContent value="receiving" key={`receiving-${effectiveClinicId}`}>
            <ReceivingTab clinicId={effectiveClinicId} />
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" key={`locations-${effectiveClinicId}`}>
            <LocationsTab clinicId={effectiveClinicId} />
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock" key={`stock-${effectiveClinicId}`}>
            <StockTab clinicId={effectiveClinicId} />
          </TabsContent>

          {/* Stock Adjustment Tab */}
          <TabsContent value="stock-adjustment" key={`stock-adjustment-${effectiveClinicId}`}>
            <StockAdjustmentTab clinicId={effectiveClinicId} />
          </TabsContent>
        </Tabs>
      </div>

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        clinicId={effectiveClinicId}
      />
    </>
  )
}
