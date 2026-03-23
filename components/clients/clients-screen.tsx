"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "../ui/badge";
import { Client, useGetClients } from "@/queries/clients/get-client"
import { useDebounce } from "@/hooks/use-debounce"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { useDeleteClient } from "@/queries/clients/delete-client"
import { toast } from "@/components/ui/use-toast"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useRouter } from "next/navigation"
import { getCompanyId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"
import Loader from "@/components/ui/loader"
import { Edit, Eye, Filter } from "lucide-react"

interface ClientsScreenProps {
  onEditClient?: (client: Client | null) => void;
  showFilters: boolean;
  filters: { firstName?: string; lastName?: string; email?: string; phonePrimary?: string };
  setFilters: React.Dispatch<React.SetStateAction<{ firstName?: string; lastName?: string; email?: string; phonePrimary?: string }>>;
  activeFilterCount: number;
}

export const ClientsScreen = ({ onEditClient, showFilters, filters, setFilters, activeFilterCount }: ClientsScreenProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { user } = useRootContext()
  const companyId = (typeof window !== 'undefined' && getCompanyId()) || user?.companyId || ''
  // Removed const [showFilters, setShowFilters] = useState(false)
  // Removed const [filters, setFilters] = useState<{ firstName?: string; lastName?: string; email?: string; phonePrimary?: string }>({})

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const debouncedSearch = useDebounce((value: string) => {
    setDebouncedSearchQuery(value)
    handleSearch(value)
  }, 300)

  const { data: clientsData, isLoading, isError } = useGetClients(
    page,
    pageSize,
    searchQuery,
    'first_name',
    companyId || user?.companyId, // Pass companyId for filtering
    true,
    filters
  )

  const clients = clientsData?.items || []
  const totalPages = clientsData?.totalPages || 1

  // Removed const activeFilterCount = Object.values(filters).filter(Boolean).length

  const deleteClientMutation = useDeleteClient();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter()

  const handleSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm)
    setPage(1) // Reset to first page on new search

    // Update URL with search parameter but don't expose specific fields
    const url = new URL(window.location.href);
    url.searchParams.set('search', encodeURIComponent(searchTerm));

    // Update the URL without page reload
    window.history.pushState({}, '', url.toString());
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset to first page when changing page size
  }

  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await deleteClientMutation.mutateAsync(clientToDelete.id);
      toast({
        title: "Success",
        description: "Owner deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete owner",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "firstName",
      header: "First Name",
    },
    { accessorKey: "lastName", header: "Last Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phonePrimary", header: "Phone" },
   {
      accessorKey: "isPremium",
      header: "Premium",
      cell: ({ getValue }) => getValue() ? 
        <Badge className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80">Premium</Badge> : 
        <Badge variant="secondary">Standard</Badge>
    },
   {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ getValue }) => getValue() ? 
        <Badge className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80">Active</Badge> : 
        <Badge variant="destructive">Inactive</Badge>
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          {onEditClient && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditClient(row.original);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      meta: { className: "text-center" },
    },
  ];


  return (
    <div>
      {/* Filters Section */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4 mb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button variant="outline" size="sm" onClick={() => setFilters({
              firstName: '',
              lastName: '',
              email: '',
              phonePrimary: '',
            })}>
              Clear Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                placeholder="Search by first name..."
                value={filters.firstName || ""}
                onChange={(e) => setFilters(f => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                placeholder="Search by last name..."
                value={filters.lastName || ""}
                onChange={(e) => setFilters(f => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Search by email..."
                value={filters.email || ""}
                onChange={(e) => setFilters(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Primary</Label>
              <Input
                id="phone"
                placeholder="Search by phone..."
                value={filters.phonePrimary || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFilters(f => ({ ...f, phonePrimary: value }));
                }}
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.firstName && (
            <span className="bg-blue-100 text-blue-800 px-1 py-1 rounded text-xs">First: {filters.firstName}</span>
          )}
          {filters.lastName && (
            <span className="bg-green-100 text-green-800 px-1 py-1 rounded text-xs">Last: {filters.lastName}</span>
          )}
          {filters.email && (
            <span className="bg-purple-100 text-purple-800 px-1 py-1 rounded text-xs">Email: {filters.email}</span>
          )}
          {filters.phonePrimary && (
            <span className="bg-gray-100 text-gray-800 px-1 py-1 rounded text-xs">Phone: {filters.phonePrimary}</span>
          )}
          <button
            className="text-xs text-gray-500 underline"
            onClick={() => setFilters({})}
          >
            Clear all
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="min-h-[calc(100vh-20rem)] flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader size="lg" label="Loading owners..." />
          </div>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading owners. Please try again.</p>
        </div>
      ) : (
        <div
          onKeyDown={(e) => {
            // Prevent form submission when pressing Enter
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="search-container"
        >
          <DataTable
            columns={columns}
            data={clients as Client[]}
            searchColumn="firstName"
            searchPlaceholder="Search owners by first or last name..."
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSearch={debouncedSearch}
            onRowClick={(row) => router.push(`/clients/${row.id}`)}
          />
        </div>
      )}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteClient}
        itemName={clientToDelete?.firstName + " " + clientToDelete?.lastName}
        isDeleting={isDeleting}
      />
    </div>
  )
} 