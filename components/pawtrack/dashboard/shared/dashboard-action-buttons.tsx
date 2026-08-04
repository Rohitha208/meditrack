"use client"

import { Button } from "@/components/ui/button"
import { useRootContext } from "@/context/RootContext"

interface DashboardActionButtonsProps {
  onNewPatient: () => void
  onNewAppointment: () => void
  onNewInvoice: () => void
  // New props for veterinarian/provider functionality
  onAddProduct?: () => void
  onAddSupplier?: () => void
  onAddClient?: () => void
  onCreatePurchaseOrder?: () => void
}

export const DashboardActionButtons = ({
  onNewPatient,
  onNewAppointment,
  onNewInvoice,
  onAddProduct,
  onAddSupplier,
  onAddClient,
  onCreatePurchaseOrder
}: DashboardActionButtonsProps) => {
  const { userType } = useRootContext()
  
  // Check if user is veterinarian/provider
  const isProvider = userType?.isProvider

  return (
    <div className="flex justify-start gap-3 mb-1 flex-wrap bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 p-4 rounded-md border-b border-slate-200 dark:border-slate-700 -m-4 mb-4">
      <Button className="flex items-center gap-2 bg-white border border-[#1E3D3D] text-[#1E3D3D] hover:bg-[#1E3D3D]/10 hover:text-[#1E3D3D]" onClick={onNewPatient}>
        New Patient
      </Button>
      <Button className="flex items-center gap-2 bg-white border border-[#1E3D3D] text-[#1E3D3D] hover:bg-[#1E3D3D]/10 hover:text-[#1E3D3D]" onClick={onNewAppointment}>
        New Appointment
      </Button>
      {/* <Button className="flex items-center gap-2 bg-white border border-[#1E3D3D] text-[#1E3D3D] hover:bg-[#1E3D3D]/10 hover:text-[#1E3D3D]" onClick={onNewInvoice}>
        New Invoice
      </Button> */}
      
      {/* Veterinarian/Provider specific buttons */}
      {isProvider && (
        <>
          {onAddProduct && (
            <Button className="flex items-center gap-2 bg-white border border-[#1E3D3D] text-[#1E3D3D] hover:bg-[#1E3D3D]/10 hover:text-[#1E3D3D]" onClick={onAddProduct}>
              Add Product
            </Button>
          )}
          {onAddSupplier && (
            <Button className="flex items-center gap-2 bg-white border border-[#1E3D3D] text-[#1E3D3D] hover:bg-[#1E3D3D]/10 hover:text-[#1E3D3D]" onClick={onAddSupplier}>
              Add Supplier
            </Button>
          )}
          {onAddClient && (
            <Button className="flex items-center gap-2 bg-white border border-[#1E3D3D] text-[#1E3D3D] hover:bg-[#1E3D3D]/10 hover:text-[#1E3D3D]" onClick={onAddClient}>
              Add Client
            </Button>
          )}
          {onCreatePurchaseOrder && (
            <Button className="flex items-center gap-2 bg-white border border-[#1E3D3D] text-[#1E3D3D] hover:bg-[#1E3D3D]/10 hover:text-[#1E3D3D]" onClick={onCreatePurchaseOrder}>
              Create Purchase Order
            </Button>
          )}
        </>
      )}
    </div>
  )
} 