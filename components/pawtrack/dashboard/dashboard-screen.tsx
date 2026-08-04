"use client"

import { useState, useEffect } from "react"
import { NewPatientModal } from "@/components/pawtrack/new-patient-modal"
import { NewAppointmentDrawer } from "@/components/pawtrack/new-appointment-drawer"
import { NewInvoiceDrawer } from "@/components/pawtrack/new-invoice-drawer"
import { useRootContext } from "@/context/RootContext"

// Import role-specific dashboards
import AdminDashboardWrapper from "./roles/admin"
import SuperAdminDashboardWrapper from "./roles/super-admin"
import ClinicAdminDashboardWrapper from "./roles/clinic-admin"
import ClinicStaffDashboardWrapper from "./roles/clinic-staff"
import ClientDashboardWrapper from "./roles/client"

// Import new components for veterinarian/provider functionality
import NewProduct from "@/components/pawtrack/products/newProduct"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import NewSupplier from "@/components/pawtrack/supplier/newSupplier"
import { ClientDrawerContent } from "@/components/pawtrack/clients/clientDrawer"
import { OrderModal } from "@/components/pawtrack/newInventory/order-modal"
import App from "next/app"
import { ApproveAppointmentDrawer } from "../approve-appointment-drawer"
 

export const DashboardScreen = () => {
  const [mounted, setMounted] = useState(false)
  const [showNewPatientModal, setShowNewPatientModal] = useState(false)
  const [showNewAppointmentDrawer, setShowNewAppointmentDrawer] = useState(false)
  const [showNewInvoiceDrawer, setShowNewInvoiceDrawer] = useState(false)
  const [editAppointmentId, setEditAppointmentId] = useState<string | null>(null);
  const [showApproveAppointmentDrawer, setShowApproveAppointmentDrawer] = useState(false);
  // New state for veterinarian/provider functionality
  const [showAddProductDrawer, setShowAddProductDrawer] = useState(false)
  const [showAddSupplierDrawer, setShowAddSupplierDrawer] = useState(false)
  const [showAddClientDrawer, setShowAddClientDrawer] = useState(false)
  const [showCreatePurchaseOrderModal, setShowCreatePurchaseOrderModal] = useState(false)

  const { IsAdmin, userType, clinic } = useRootContext();

  // Listen for appointment approval events
  useEffect(() => {
    const handleApproveAppointment = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.appointmentId) {
        setEditAppointmentId(customEvent.detail.appointmentId);
        setShowApproveAppointmentDrawer(true);
      }
    };

    window.addEventListener('approveAppointment', handleApproveAppointment as EventListener);
    return () => {
      window.removeEventListener('approveAppointment', handleApproveAppointment as EventListener);
    };
  }, []);

  // Ensure we only access browser APIs on the client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  // Render different dashboards based on user role
  const renderDashboardByRole = () => {
    if (IsAdmin && userType.isSuperAdmin) {
      return (
        <SuperAdminDashboardWrapper />
      );
    } else if (IsAdmin) {
      return (
        <AdminDashboardWrapper />
      );
    } else if (userType.isClinicAdmin) {
      return (
        <ClinicAdminDashboardWrapper 
          onNewPatient={() => setShowNewPatientModal(true)}
          onNewAppointment={() => setShowNewAppointmentDrawer(true)}
        />
      );
    } else if (userType.isProvider || userType.isReceptionist) {
  return (
        <ClinicStaffDashboardWrapper 
            onNewPatient={() => setShowNewPatientModal(true)}
            onNewAppointment={() => setShowNewAppointmentDrawer(true)}
            onNewInvoice={() => setShowNewInvoiceDrawer(true)}
            onAddProduct={() => setShowAddProductDrawer(true)}
            onAddSupplier={() => setShowAddSupplierDrawer(true)}
            onAddClient={() => setShowAddClientDrawer(true)}
            onCreatePurchaseOrder={() => setShowCreatePurchaseOrderModal(true)}
          editAppointmentId={editAppointmentId}
          setEditAppointmentId={setEditAppointmentId}
        />
      );
    } else if (userType.isClient) {
      return (
        <ClientDashboardWrapper 
          onNewAppointment={() => setShowNewAppointmentDrawer(true)} 
        />
      );
    } else {
      // Default dashboard or not authorized message
      return (
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold">Welcome to PawTrack</h1>
          <p className="mt-4">Your dashboard is not configured yet. Please contact support.</p>
        </div>
      );
    }
  };
              
              return (
    <>
      {renderDashboardByRole()}

      {/* Modals and Drawers (keep these outside the conditional so they work for all roles) */}
      <NewPatientModal isOpen={showNewPatientModal} onClose={() => setShowNewPatientModal(false)} />
      <NewAppointmentDrawer 
        isOpen={showNewAppointmentDrawer} 
        onClose={() => {
          setShowNewAppointmentDrawer(false);
          setEditAppointmentId(null);
        }} 
        appointmentId={editAppointmentId}
        sendEmail={!!editAppointmentId} // Send email when editing an appointment from requests
      />
      <ApproveAppointmentDrawer
        isOpen={showApproveAppointmentDrawer}
        appointmentId={editAppointmentId}
        onClose={() => {
          setShowApproveAppointmentDrawer(false);
          setEditAppointmentId(null);
        }}
      />
      <NewInvoiceDrawer 
        isOpen={showNewInvoiceDrawer} 
        onClose={() => setShowNewInvoiceDrawer(false)} 
        patientId=""
        appointmentId=""
      />

      {/* Veterinarian/Provider specific modals and drawers */}
      <Sheet open={showAddProductDrawer} onOpenChange={setShowAddProductDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-y-auto">
          <SheetHeader className="relative top-[-14px]">
            <SheetTitle>Add Product</SheetTitle>
          </SheetHeader>
          <NewProduct 
            onSuccess={() => setShowAddProductDrawer(false)} 
            onCancel={() => setShowAddProductDrawer(false)} 
          />
        </SheetContent>
      </Sheet>
      
      <Sheet open={showAddSupplierDrawer} onOpenChange={setShowAddSupplierDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-y-auto">
          <SheetHeader className="relative top-[-14px]">
            <SheetTitle>Add Supplier</SheetTitle>
          </SheetHeader>
          <NewSupplier onSuccess={() => setShowAddSupplierDrawer(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={showAddClientDrawer} onOpenChange={setShowAddClientDrawer}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[40%] overflow-auto">
          <SheetHeader className="relative top-[-14px]">
            <SheetTitle>Add Client</SheetTitle>
          </SheetHeader>
          <ClientDrawerContent onClose={() => setShowAddClientDrawer(false)} />
        </SheetContent>
      </Sheet>

      <OrderModal 
        isOpen={showCreatePurchaseOrderModal} 
        onClose={() => setShowCreatePurchaseOrderModal(false)} 
        clinicId={clinic?.id || ""}
      />
    </>
  )
}