'use client'
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Trash2, Building } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useRouter, useSearchParams } from "next/navigation";
import { Company, useGetCompanies } from "@/queries/companies/get-company";
import { useDeleteCompany } from "@/queries/companies/delete-comapny";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";

interface CompaniesScreenProps {
  onEditCompany?: (company: Company | null) => void;
}

export default function CompaniesScreen({ onEditCompany }: CompaniesScreenProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParams = useSearchParams();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCompanyMutation = useDeleteCompany();

  const { data, isLoading, isError } = useGetCompanies(
    true,
    pageNumber,
    pageSize,
    debouncedSearch
  );

  // Initialize search from URL on component mount and keep it in sync
  useEffect(() => {
    const searchParam = searchParams.get('search');
    // Only update if the search param exists and is different from current search state
    if (searchParam !== null && decodeURIComponent(searchParam) !== search) {
      setSearch(decodeURIComponent(searchParam));
    }
  }, [searchParams, search]);

  const companies = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCompanyMutation.mutateAsync(companyToDelete.id);
      toast({
        title: "Company Deleted",
        description: "Company has been successfully deleted",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setCompanyToDelete(null);
    }
  };

  const handleSearch = (value: string) => {
    // Only update if the value has actually changed
    if (value !== search) {
      setSearch(value);
      setPageNumber(1);

      // Update URL with search parameter
      const url = new URL(window.location.href);
      if (value) {
        url.searchParams.set('search', encodeURIComponent(value));
      } else {
        url.searchParams.delete('search');
      }

      // Update the URL without page reload
      window.history.pushState({}, '', url.toString());
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(Number(newPageSize));
    setPageNumber(1); // Reset to first page when changing page size
  };

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: "name",
      header: "Company Name",
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    {
      accessorKey: "address",
      header: "Location",
      cell: ({ row }) => {
        const address = row.original.address;
        return `${address?.city}, ${address?.state}`;
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
        return (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {capitalizedStatus}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          {onEditCompany && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditCompany(row.original);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {/* <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/companies/${row.original.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button> */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(row.original);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
      meta: { className: "text-center" },
    },
  ];

  return (
    <div className="p-6">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Error loading companies. Please try again.</p>
          </div>
        ) : (
          <div onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="bg-slate-50 dark:bg-slate-900 p-1">

            <DataTable
              columns={columns}
              data={companies as unknown as Company[]}
              searchColumn="name"
              searchPlaceholder="Search companies..."
              page={pageNumber}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onSearch={handleSearch}
            />
          </div>
        )}
      </div>
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteCompany}
        itemName={companyToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}
