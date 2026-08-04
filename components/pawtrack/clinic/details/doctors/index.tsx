'use client'
import React, { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2, Download } from "lucide-react";
import withAuth from "@/utils/privateRouter";
import { useDeleteUser } from "@/queries/users/delete-user";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import * as XLSX from 'xlsx';
import NewDoctor from "./newDoctor";
import DoctorDetails from "./doctorDetails";
import { useGetUsers } from "@/queries/users/get-users";
import { useGetRole } from "@/queries/roles/get-role";
import { useRouter } from "next/navigation";

// Match the User type from the main user component
export type Doctor = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleName: string;
  isActive: boolean;
  licenseNumber?: string;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Add any other fields that might be needed for export
  [key: string]: any; // This allows for dynamic properties
};

type DoctorProps = {
  clinicId?: string;
};

function DoctorComponent({ clinicId }: DoctorProps) {
  
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null);

  // Get roles to find veterinarian role ID
  const { data: rolesData } = useGetRole();
  const router = useRouter();

  // Find and set the veterinarian role ID when roles are loaded
  useEffect(() => {
    if (rolesData?.data) {
      const vetRole = rolesData.data.find(
        (role: { name: string, value: string }) => role.name.toLowerCase() === 'veterinarian' || role.value.toLowerCase() === 'veterinarian'
      );
      if (vetRole) {
        setVeterinarianRoleId(vetRole.id);
      }
    }
  }, [rolesData]);

  // Use the roleId parameter when fetching users
  const { data: usersData, isLoading, isError } = useGetUsers(
    pageNumber,
    pageSize,
    search,
    !!veterinarianRoleId, // enabled - only when veterinarianRoleId is available
    '', // companyId - not needed for doctors tab
    clinicId ? [clinicId] : [], // Pass clinicId as an array
    veterinarianRoleId ? [veterinarianRoleId] : [] // Pass veterinarianRoleId as an array
  );

  const doctors = clinicId
    ? usersData?.items?.filter(user => user.clinics?.some(c => c.clinicId === clinicId)) || []
    : usersData?.items || [];
  const totalPages = usersData?.totalPages || 1;

  const [openNew, setOpenNew] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const deleteUser = useDeleteUser();

  const handleDoctorClick = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    setOpenDetails(true);
  };

  const handleDeleteDoctor = async () => {
    if (!doctorToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser.mutateAsync({ id: doctorToDelete.id });
      toast({
        title: "Doctor Deleted",
        description: "Doctor has been deleted successfully",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete doctor",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDoctorToDelete(null);
    }
  };

  const openDeleteDialog = (doctor: Doctor) => {
    setDoctorToDelete(doctor);
    setIsDeleteDialogOpen(true);
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
  };

  const handleExportToExcel = async () => {
    if (!doctors || doctors.length === 0) {
      toast({
        title: "No Data",
        description: "No doctors data available to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = doctors.map(doctor => ({
        'First Name': doctor.firstName || '',
        'Last Name': doctor.lastName || '',
        'Email': doctor.email || '',
        'Role': doctor.roleName || doctor.role || 'Doctor',
        'Status': doctor.isActive ? 'Active' : 'Inactive',

        // Add other fields that are guaranteed to exist in the Doctor type
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 20 }, // First Name
        { wch: 20 }, // Last Name
        { wch: 30 }, // Email
        { wch: 20 }, // Role
        { wch: 15 }, // Status

      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Doctors');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `doctors_export_${currentDate}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Exported ${doctors.length} doctors to Excel.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export doctors to Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<Doctor>[] = [
    {
      accessorKey: "firstName",
      header: "First Name",
    },
    { accessorKey: "lastName", header: "Last Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "roleName",
      header: "Role",
      cell: ({ row }) => row.original.roleName || row.original.role || "Doctor"
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "destructive"}>{getValue() ? "Active" : "Inactive"}</Badge>
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
              handleDoctorClick(row.original.id);
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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 dark:bg-slate-900 p-6 gap-4">
        <h1 className="text-2xl font-bold">Doctors</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting || !doctors?.length}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export to Excel
          </Button>
          <Sheet open={openNew} onOpenChange={setOpenNew}>
            <SheetTrigger asChild>
              <Button className="theme-button text-white w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Doctor
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%] overflow-hidden">
              <SheetHeader className="relative top-[-14px]">
                <SheetTitle>New Doctor</SheetTitle>
              </SheetHeader>
              <NewDoctor
                clinicId={clinicId}
                onSuccess={() => setOpenNew(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900 p-6">
        {isLoading || !veterinarianRoleId ? (
          <div className="flex items-center justify-center h-32">
            <p>Loading doctors...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-red-500">Error loading doctors</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={doctors as unknown as Doctor[]}
            searchColumn="email"
            searchPlaceholder="Search doctors email..."
            page={pageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSearch={handleSearch}
            onRowClick={(row) => {
              const url = `/clinic/${clinicId}/doctors/slots/${row.id}`;
              router.push(url);
            }}
          />
        )}

        <Sheet open={openDetails} onOpenChange={setOpenDetails}>
          <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%] overflow-hidden">
            <SheetHeader className="relative top-[-14px]">
              <SheetTitle>Doctor Details</SheetTitle>
            </SheetHeader>
            {selectedDoctorId && (
              <DoctorDetails
                doctorId={selectedDoctorId}
                clinicId={clinicId}
                onSuccess={() => setOpenDetails(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteDoctor}
        title="Delete Doctor"
        itemName={`${doctorToDelete?.firstName || ''} ${doctorToDelete?.lastName || ''}`.trim()}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default withAuth(DoctorComponent);
