'use client'
import React, { useMemo, useState, useEffect } from "react";
import { DataTable } from "../../ui/data-table";
import { Button } from "../../ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../../ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Filter, Plus, Trash2 } from "lucide-react";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import withAuth from "@/utils/privateRouter";
import NewClinic from "./newClinic";
import ClinicDetails from "./clinicDetails";
import { useDeleteClinic } from "@/queries/clinic/delete-clinic";
import { toast } from "../../ui/use-toast";
import { DeleteConfirmationDialog } from "../../ui/delete-confirmation-dialog";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useRootContext } from "@/context/RootContext";
import { getCompanyId } from "@/utils/clientCookie";
import Loader from "@/components/ui/loader";
import * as XLSX from 'xlsx';
import { Download } from "lucide-react";

// Clinic type based on provided schema
export type Clinic = {
  id: string;
  companyId: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  licenseNumber: string;
  // subscriptionStatus: string;
  // subscriptionExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  distance: number;
};

type ClinicFormValues = Omit<Clinic, "id" | "createdAt" | "updatedAt">;

function Clinic() {
  const router = useRouter();
  const { userType, clinic: userClinic, user } = useRootContext();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ name?: string; city?: string; state?: string; country?: string; phone?: string; email?: string }>({});
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Use the useDebouncedValue hook to debounce the search string
  const debouncedSearch = useDebouncedValue(search, 300);

  // Set company ID from local storage or user context (similar to newClinic.tsx)
  useEffect(() => {
    const storedCompanyId = getCompanyId();
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    }
  }, []);

  // Alternative: Set company ID when user data is available
  useEffect(() => {
    if (user?.companyId && !companyId) {
      setCompanyId(user.companyId);
    }
  }, [user, companyId]);

  const { data: clinicData, isLoading, isError } = useGetClinic(pageNumber, pageSize, companyId, true, undefined, filters);

  // Extract the clinics from the paginated response
  const clinics = clinicData?.items || [];
  const totalPages = clinicData?.totalPages || 1;

  const [openNew, setOpenNew] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clinicToDelete, setClinicToDelete] = useState<Clinic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const deleteClinic = useDeleteClinic();
  const queryClient = useQueryClient();

  // Redirect clinicAdmin users to the details page with rooms tab
  useEffect(() => {
    if ((userType.isClinicAdmin || userType.isVeterinarian) && userClinic.id) {
      router.push(`/clinic/${userClinic.id}/rooms`);
    }
  }, [userType.isClinicAdmin, userType.isVeterinarian, userClinic.id, router]);

  const handleEditClinicClick = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    setOpenDetails(true);
  };

  const handleDeleteClinic = async () => {
    if (!clinicToDelete) return;

    setIsDeleting(true);
    try {
      await deleteClinic.mutateAsync({ id: clinicToDelete.id });
      toast({
        title: "Success",
        description: "Clinic deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete clinic",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setClinicToDelete(null);
    }
  };

  const openDeleteDialog = (clinic: Clinic) => {
    setClinicToDelete(clinic);
    setIsDeleteDialogOpen(true);
  };

  const handleRowClick = (clinic: Clinic) => {
    // setSelectedClinicId(clinic.id);
    router.push(`/clinic/${clinic.id}?tab=rooms`);
  };

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(Number(newPageSize));
    setPageNumber(1); // Reset to first page when changing page size
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPageNumber(1); // Reset to first page when searching

    // Update URL with search parameter
    const url = new URL(window.location.href);
    url.searchParams.set('search', encodeURIComponent(value));

    // Update the URL without page reload
    window.history.pushState({}, '', url.toString());
  };

  // Function to fetch all clinics data for export
  const fetchAllClinics = async () => {
    let allClinics: Clinic[] = [];
    let pageNumber = 1;
    const pageSize = 100; // Reasonable page size
    let hasMorePages = true;

    while (hasMorePages) {
      const params = new URLSearchParams({
        pageNumber: pageNumber.toString(),
        pageSize: pageSize.toString(),
        paginationRequired: 'true'
      });

      if (companyId) {
        params.append('companyId', companyId);
      }

      const response = await fetch(`/api/clinic?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch clinic data");
      }

      const result = await response.json();
      const clinics = result.data.items;

      allClinics = [...allClinics, ...clinics];

      // Check if there are more pages
      hasMorePages = result.data.hasNextPage;
      pageNumber++;

      // Safety check to prevent infinite loops
      if (pageNumber > 100) {
        console.warn('Reached maximum page limit (100) during export');
        break;
      }
    }

    return allClinics;
  };

  // Function to export clinics to Excel
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
      const allClinics = await fetchAllClinics();

      if (allClinics.length === 0) {
        toast({
          title: "No Data",
          description: "No clinics found to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel export
      const excelData = allClinics.map((clinic: Clinic) => ({
        'Clinic Name': clinic.name,
        'Address Line 1': clinic.addressLine1,
        'Address Line 2': clinic.addressLine2 || '',
        'City': clinic.city,
        'State': clinic.state,
        'Postal Code': clinic.postalCode,
        'Country': clinic.country,
        'Phone': clinic.phone,
        'Email': clinic.email,
        'Website': clinic.website || '',
        'Tax ID': clinic.taxId || '',
        'License Number': clinic.licenseNumber || '',
        'Created At': clinic.createdAt ? new Date(clinic.createdAt).toLocaleDateString() : '',
        'Updated At': clinic.updatedAt ? new Date(clinic.updatedAt).toLocaleDateString() : '',
        'Latitude': clinic.location?.lat || '',
        'Longitude': clinic.location?.lng || '',
        'Full Address': clinic.location?.address || '',
        'Distance': clinic.distance || ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 25 }, // Clinic Name
        { wch: 30 }, // Address Line 1
        { wch: 30 }, // Address Line 2
        { wch: 15 }, // City
        { wch: 10 }, // State
        { wch: 12 }, // Postal Code
        { wch: 15 }, // Country
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
        { wch: 25 }, // Website
        { wch: 15 }, // Tax ID
        { wch: 15 }, // License Number
        { wch: 12 }, // Created At
        { wch: 12 }, // Updated At
        { wch: 12 }, // Latitude
        { wch: 12 }, // Longitude
        { wch: 40 }, // Full Address
        { wch: 10 }  // Distance
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clinics');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `clinics_export_${currentDate}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Successfully exported ${allClinics.length} clinics to Excel.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export clinics to Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<Clinic>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div >
          {row.original.name}
        </div>
      )
    },
    { accessorKey: "city", header: "City" },
    { accessorKey: "state", header: "State" },
    { accessorKey: "country", header: "Country" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "email", header: "Email" },
    // { accessorKey: "subscriptionStatus", header: "Subscription", cell: ({ getValue }) => <Badge>{getValue() as string}</Badge> },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClinicClick(row.original.id);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(row.original);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      meta: { className: "text-center" },
    },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold">Clinics</h1>
        <div className="flex gap-2">

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters {Object.values(filters).filter(Boolean).length ? ` (${Object.values(filters).filter(Boolean).length})` : ''}
          </Button>

          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting || !companyId}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <Loader size="sm" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Sheet open={openNew} onOpenChange={setOpenNew}>
            <SheetTrigger asChild>
              <Button className={`theme-button text-white`} onClick={() => setOpenNew(true)}><Plus className="mr-2 h-4 w-4" />Add Clinic</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-hidden">
              <SheetHeader className="relative top-[-14px]">
                <SheetTitle>New Clinic</SheetTitle>
              </SheetHeader>
              <NewClinic onSuccess={() => { setOpenNew(false); }} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button variant="outline" size="sm" onClick={() => setFilters({})}>
              Clear Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="f-name">Name</Label>
              <Input id="f-name" placeholder="Clinic name" value={filters.name || ''} onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-city">City</Label>
              <Input id="f-city" placeholder="City" value={filters.city || ''} onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-state">State</Label>
              <Input id="f-state" placeholder="State" value={filters.state || ''} onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-country">Country</Label>
              <Input id="f-country" placeholder="Country" value={filters.country || ''} onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-phone">Phone</Label>
              <Input 
                id="f-phone" 
                placeholder="Phone" 
                value={filters.phone || ''} 
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFilters(f => ({ ...f, phone: value }));
                }}
                pattern="\d{10}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-email">Email</Label>
              <Input id="f-email" placeholder="Email" value={filters.email || ''} onChange={(e) => setFilters(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {Object.values(filters).filter(Boolean).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 px-6">
          {filters.name && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Name: {filters.name}
              <button onClick={() => setFilters({ ...filters, name: '' })} className="ml-1">
                ×
              </button>
            </span>
          )}
          {filters.city && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              City: {filters.city}
              <button onClick={() => setFilters({ ...filters, city: '' })} className="ml-1">
                ×
              </button>
            </span>
          )}
          {filters.state && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              State: {filters.state}
              <button onClick={() => setFilters({ ...filters, state: '' })} className="ml-1">
                ×
              </button>
            </span>
          )}
          {filters.country && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Country: {filters.country}
              <button onClick={() => setFilters({ ...filters, country: '' })} className="ml-1">
                ×
              </button>
            </span>
          )}
          {filters.phone && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Phone: {filters.phone}
              <button onClick={() => setFilters({ ...filters, phone: '' })} className="ml-1">
                ×
              </button>
            </span>
          )}
          {filters.email && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Email: {filters.email}
              <button onClick={() => setFilters({ ...filters, email: '' })} className="ml-1">
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="min-h-[calc(100vh-20rem)] flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader size="lg" label="Loading clinics..." />
          </div>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-red-500">Error loading clinics</p>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 p-6">
          <DataTable
            columns={columns}
            data={clinics as Clinic[]}
            searchColumn="name"
            searchPlaceholder="Search clinics..."
            page={pageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSearch={handleSearch}
            onRowClick={(row) => handleRowClick(row)}
          />
        </div>
      )}

      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-hidden">
          <SheetHeader className="relative top-[-10px]">
            <SheetTitle>Clinic Details</SheetTitle>
          </SheetHeader>
          {selectedClinicId && (
            <ClinicDetails
              clinicId={selectedClinicId}
              onSuccess={() => { setOpenDetails(false); setSelectedClinicId(null); }}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteClinic}
        title="Delete Clinic"
        itemName={clinicToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default withAuth(Clinic);