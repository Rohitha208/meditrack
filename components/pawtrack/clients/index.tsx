"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Filter, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ClientsScreen } from "./clients-screen"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { ClientDrawerContent } from "./clientDrawer"
import { Client } from "@/queries/clients/get-client"
import * as XLSX from 'xlsx'
import { toast } from "@/components/ui/use-toast"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"

export default function ClientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeView, setActiveView] = useState("owners")
  const [mounted, setMounted] = useState(false)
  const [isClientDrawerOpen, setIsClientDrawerOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{ firstName?: string; lastName?: string; email?: string; phonePrimary?: string }>({})
  const [isExporting, setIsExporting] = useState(false)
  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const { user } = useRootContext()
  const companyId = (typeof window !== 'undefined' && getCompanyId()) || user?.companyId || ''

  // Ensure we only access localStorage and URL params on the client side
  useEffect(() => {
    setMounted(true)
    const view = searchParams.get("view") || "owners"
    setActiveView(view)
  }, [searchParams])

  const handleViewChange = (view: string) => {
    setActiveView(view)
    // Force replace the entire URL with just the view parameter
    window.history.replaceState(null, '', `/clients?view=${view}`);
  }

  const handleEditClient = (client?: Client | null) => {
    setSelectedClient(client || null);
    setIsClientDrawerOpen(true);
  };

  const handleDrawerClose = useCallback(() => {
    setIsClientDrawerOpen(false);
    setSelectedClient(null);
  }, []);

  const fetchAllClients = async () => {
    const params = new URLSearchParams();

    if (companyId) params.append('CompanyId', companyId);

    // Append filters if present
    if (filters.firstName) params.append('FirstName', filters.firstName);
    if (filters.lastName) params.append('LastName', filters.lastName);
    if (filters.email) params.append('Email', filters.email);
    if (filters.phonePrimary) params.append('PhonePrimary', filters.phonePrimary);

    const url = `/api/clients${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch clients data');
    }

    const data = await response.json();
    return data.items || data || [];
  };

  const handleExportToExcel = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const allClients = await fetchAllClients();

      if (allClients.length === 0) {
        toast({
          title: "No Data",
          description: "No clients found to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel export
      const excelData = allClients.map((client: Client) => ({
        'First Name': client.firstName,
        'Last Name': client.lastName,
        'Email': client.email,
        'Phone Primary': client.phonePrimary,
        'Phone Secondary': client.phoneSecondary || '',
        'Address Line 1': client.addressLine1,
        'Address Line 2': client.addressLine2 || '',
        'City': client.city,
        'State': client.state,
        'Postal Code': client.postalCode,
        'Emergency Contact Name': client.emergencyContactName || '',
        'Emergency Contact Phone': client.emergencyContactPhone || '',
        'Notes': client.notes || '',
        'Active': client.isActive ? 'Yes' : 'No',
        'Created At': client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '',
        'Updated At': client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone Primary
        { wch: 15 }, // Phone Secondary
        { wch: 25 }, // Address Line 1
        { wch: 25 }, // Address Line 2
        { wch: 15 }, // City
        { wch: 10 }, // State
        { wch: 12 }, // Postal Code
        { wch: 20 }, // Emergency Contact Name
        { wch: 15 }, // Emergency Contact Phone
        { wch: 30 }, // Notes
        { wch: 8 },  // Active
        { wch: 12 }, // Created At
        { wch: 12 }  // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `clients_export_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${allClients.length} clients to ${filename}`,
        variant: "success",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export clients data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <>
      <div className="flex justify-between items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex-1">
          <h1 className="min-h-10 text-xl font-bold flex items-center">Clients</h1>
        </div>
        {activeView === "owners" && (
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>

            <Button
              variant="outline"
              onClick={handleExportToExcel}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export to Excel"}
            </Button>
            <Button
              className={`theme-button text-white`}
              onClick={() => handleEditClient(null)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </div>
        )}
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-6">
        <ClientsScreen onEditClient={handleEditClient} showFilters={showFilters} filters={filters} setFilters={setFilters} activeFilterCount={activeFilterCount} />
      </div>

      {/* New/Edit Client Sheet */}
      <Sheet open={isClientDrawerOpen} onOpenChange={setIsClientDrawerOpen}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[40%]">
          <SheetHeader>
            <SheetTitle className="relative top-[-14px]">{selectedClient ? "Update Client" : "New Client"}</SheetTitle>
          </SheetHeader>
          <ClientDrawerContent
            onClose={handleDrawerClose}
            defaultValues={selectedClient || undefined}
            isUpdate={!!selectedClient}
            isClientContext={activeView === "owners"}
          />
        </SheetContent>
      </Sheet>
    </>
  )
} 