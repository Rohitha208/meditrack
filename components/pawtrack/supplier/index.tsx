'use client'
import React, { useState } from "react";
import { DataTable } from "../../ui/data-table";
import { Button } from "../../ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "../../ui/sheet";
import { Badge } from "../../ui/badge";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Edit, Filter, Plus, Trash2, Download, X } from "lucide-react";
import { useGetSupplier } from "@/queries/suppliers/get-supplier";
import withAuth from "@/utils/privateRouter";
import NewSupplier from "./newSupplier";
import { useDeleteSupplier } from "@/queries/suppliers/delete-supplier";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "../../ui/delete-confirmation-dialog";
import { useRouter } from "next/navigation";
import SupplierDetails from "./supplierDetails";
import { useRootContext } from "@/context/RootContext";
import Loader from "@/components/ui/loader";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input"
import * as XLSX from 'xlsx';;


// Supplier type based on provided schema
export type Supplier = {
  id: string;
  clinicId: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  accountNumber: string;
  paymentTerms: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinicDetail?: {
    id: string;
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website?: string;
    taxId: string;
    licenseNumber: string;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: string;
    createdAt: string;
    updatedAt: string;
    location?: {
      lat: number;
      lng: number;
      address: string;
    };
  };
};

type SupplierFormValues = Omit<Supplier, "id" | "createdAt" | "updatedAt">;

function Supplier() {
  const router = useRouter();
  const { userType, clinic } = useRootContext();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Use the useDebouncedValue hook to debounce the search string
  const debouncedSearch = useDebouncedValue(search, 300);

  const companyId = userType.isAdmin ? clinic?.companyId : null;
  const clinicId = (userType.isClinicAdmin || userType.isVeterinarian) ? clinic?.id : null;
  const [filters, setFilters] = useState<{ name?: string; contactPerson?: string; email?: string; phone?: string; city?: string; state?: string; clinicName?: string; }>({});

  const { data: supplierData, isLoading, isError } = useGetSupplier({
    pageNumber,
    pageSize,
    filters: {
      // Search bar and filter panel both can set name; search bar takes precedence
      ...((debouncedSearch || filters.name) && { name: debouncedSearch || filters.name }),
      ...(clinicId && { clinicId }),
      ...(companyId && { companyId }),
      ...filters,
    },
    enabled: Boolean(clinicId || companyId),
  })




  // Extract suppliers from the paginated response
  const suppliers = supplierData?.items || [];
  const totalPages = supplierData?.totalPages || 1;

  const [openNew, setOpenNew] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteSupplier = useDeleteSupplier();
  const [showFilters, setShowFilters] = useState(false);
  const handleEditSupplierClick = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setOpenDetails(true);
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    setIsDeleting(true);
    try {
      await deleteSupplier.mutateAsync({ id: supplierToDelete.id });
      toast({
        title: "Supplier Deleted",
        description: "Supplier has been deleted successfully",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while deleting the supplier.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setSupplierToDelete(null);
    }
  };

  const openDeleteDialog = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };



  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(Number(newPageSize));
    setPageNumber(1); // Reset to first page when changing page size
  };


  const fetchAllSuppliers = async () => {
    const params = new URLSearchParams({
      pageNumber: '1',
      pageSize: '10000', // Large number to get all suppliers
    });

    // Add filters: name from search bar or filter panel
    const nameFilter = debouncedSearch || filters.name;
    if (nameFilter) params.append('name', nameFilter);
    if (clinicId) params.append('clinicId', clinicId);
    if (companyId) params.append('companyId', companyId);

    // Add additional filters if present (name already added above)
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'name' && value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`/api/supplier?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch supplier data");
    }

    const data = await response.json();
    return data.items || [];
  };

  const handleExportToExcel = async () => {
    if (!companyId && !clinicId) {
      toast({
        title: "Error",
        description: "Company ID or Clinic ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const allSuppliers = await fetchAllSuppliers();

      if (allSuppliers.length === 0) {
        toast({
          title: "No Data",
          description: "No suppliers found to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel export
      const excelData = allSuppliers.map((supplier: Supplier) => ({
        'Name': supplier.name,
        'Contact Person': supplier.contactPerson,
        'Email': supplier.email,
        'Phone': supplier.phone,
        'Address Line 1': supplier.addressLine1,
        'Address Line 2': supplier.addressLine2 || '',
        'City': supplier.city,
        'State': supplier.state,
        'Postal Code': supplier.postalCode,
        'Account Number': supplier.accountNumber || '',
        'Payment Terms': supplier.paymentTerms || '',
        'Clinic': supplier.clinicDetail?.name || '',
        'Active': supplier.isActive ? 'Yes' : 'No',
        'Created At': supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : '',
        'Updated At': supplier.updatedAt ? new Date(supplier.updatedAt).toLocaleDateString() : ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 25 }, // Name
        { wch: 20 }, // Contact Person
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 30 }, // Address Line 1
        { wch: 30 }, // Address Line 2
        { wch: 15 }, // City
        { wch: 10 }, // State
        { wch: 12 }, // Postal Code
        { wch: 15 }, // Account Number
        { wch: 15 }, // Payment Terms
        { wch: 20 }, // Clinic
        { wch: 8 },  // Active
        { wch: 12 }, // Created At
        { wch: 12 }  // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `suppliers_export_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${allSuppliers.length} suppliers to ${filename}`,
        variant: "success",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export suppliers data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<Supplier>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "contactPerson", header: "Contact Person" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    ...(userType.isAdmin ? [{
      accessorKey: "clinic",
      header: "Clinic",
      cell: ({ row }: CellContext<Supplier, unknown>) => {
        const clinicName = row.original.clinicDetail?.name || "No Clinic Assigned";
        return (
          <Badge variant="outline" className="bg-white dark:bg-white text-foreground">
            {clinicName}
          </Badge>
        );
      },
    }] : []),
    { accessorKey: "city", header: "City" },
    { accessorKey: "state", header: "State" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? "default" : "destructive"}>
          {getValue() ? "Active" : "Inactive"}
        </Badge>
      )
    },
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
              handleEditSupplierClick(row.original.id);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-100"
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
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <div className="flex gap-2">

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.values(filters).filter(Boolean).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {Object.values(filters).filter(Boolean).length}
              </Badge>
            )}
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
          <Sheet open={openNew} onOpenChange={setOpenNew}>
            <SheetTrigger asChild>
              <Button className={`theme-button text-white`} onClick={() => setOpenNew(true)}><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[37%]">
              <SheetHeader className="relative top-[-14px]">
                <SheetTitle>New Supplier</SheetTitle>
              </SheetHeader>
              <NewSupplier onSuccess={() => { setOpenNew(false); }} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button variant="outline" size="sm" onClick={() => setFilters({
              name: '',
              contactPerson: '',
              email: '',
              phone: '',
              city: '',
              state: '',
              clinicName: ''
            })}>
              Clear Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="f-name" className="text-sm font-medium">Supplier Name</Label>
              <Input
                id="f-name"
                placeholder="Enter supplier name"
                value={filters.name || ''}
                onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))}
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-contact" className="text-sm font-medium">Contact Person</Label>
              <Input
                id="f-contact"
                placeholder="Enter contact person"
                value={filters.contactPerson || ''}
                onChange={(e) => setFilters(f => ({ ...f, contactPerson: e.target.value }))}
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-email" className="text-sm font-medium">Email</Label>
               <Input
                id="f-email"
                placeholder="Enter email address"
                value={filters.email || ''}
                onChange={(e) => setFilters(f => ({ ...f, email: e.target.value }))}
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="f-phone"
                type="tel"
                placeholder="Enter 10 digit phone"
                value={filters.phone || ''}
                maxLength={10}
                onKeyPress={(e) => {
                  // Allow only numbers
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  // Remove any non-digit characters
                  const value = e.target.value.replace(/\D/g, '');
                  setFilters(f => ({ ...f, phone: value }));
                }}
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-city" className="text-sm font-medium">City</Label>
              <Input
                id="f-city"
                placeholder="Enter city"
                value={filters.city || ''}
                onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-state" className="text-sm font-medium">State</Label>
              <Input
                id="f-state"
                placeholder="Enter state"
                value={filters.state || ''}
                onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))}
                className="border-border"
              />
            </div>
            {userType.isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="f-clinic" className="text-sm font-medium">Clinic Name</Label>
                <Input
                  id="f-clinic"
                  placeholder="Enter clinic name"
                  value={filters.clinicName || ''}
                  onChange={(e) => setFilters(f => ({ ...f, clinicName: e.target.value }))}
                  className="border-border"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Filters: search bar value (above table) and filter panel values */}
      {(search || Object.values(filters).filter(Boolean).length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4 px-6">
          {search && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Search: {search}
              <button onClick={() => setSearch('')} className="ml-1">×</button>
            </span>
          )}
          {filters.name && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Supplier Name: {filters.name}
              <button onClick={() => setFilters({ ...filters, name: '' })} className="ml-1">×</button>
            </span>
          )}
          {filters.contactPerson && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Contact: {filters.contactPerson}
              <button onClick={() => setFilters({ ...filters, contactPerson: '' })} className="ml-1">×</button>
            </span>
          )}
          {filters.email && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Email: {filters.email}
              <button onClick={() => setFilters({ ...filters, email: '' })} className="ml-1">×</button>
            </span>
          )}
          {filters.phone && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Phone: {filters.phone}
              <button onClick={() => setFilters({ ...filters, phone: '' })} className="ml-1">×</button>
            </span>
          )}
          {filters.city && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              City: {filters.city}
              <button onClick={() => setFilters({ ...filters, city: '' })} className="ml-1">×</button>
            </span>
          )}
          {filters.state && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              State: {filters.state}
              <button onClick={() => setFilters({ ...filters, state: '' })} className="ml-1">×</button>
            </span>
          )}
          {filters.clinicName && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              Clinic: {filters.clinicName}
              <button onClick={() => setFilters({ ...filters, clinicName: '' })} className="ml-1">×</button>
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p>Loading suppliers...</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-red-500">Error loading suppliers</p>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 p-6">
          <DataTable
            columns={columns}
            data={suppliers as unknown as Supplier[]}
            searchColumn="name"
            searchPlaceholder="Search by name..."
            page={pageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            searchValue={search}
            onSearch={(searchTerm) => {
              setSearch(searchTerm);
              setPageNumber(1);
            }}
          />
        </div>
      )}

      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[37%]">
          <SheetHeader className="relative top-[-10px]">
            <SheetTitle>Supplier Details</SheetTitle>
          </SheetHeader>
          {selectedSupplierId && (
            <SupplierDetails
              supplierId={selectedSupplierId}
              onSuccess={() => setOpenDetails(false)}
              onCancel={() => setOpenDetails(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        itemName={supplierToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default withAuth(Supplier); 