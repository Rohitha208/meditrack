'use client'
import React, { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import withAuth from "@/utils/privateRouter";
import { useDeleteAppointmentType } from "@/queries/appointmentType/delete-appointmentType";
import { toast } from "@/components/ui/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import NewAppointmentType from "./newAppointmentType";
import AppointmentTypeDetails from "./appointmentTypeDetails";
import { useGetAppointmentType, AppointmentType } from "@/queries/appointmentType/get-appointmentType";

function AppointmentTypeComponent() {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  // Use the global hook
  const { data: appointmentTypes = [], isLoading, isError, refetch } = useGetAppointmentType(1, 100, '', true);

  // For debugging
  useEffect(() => {
    if (appointmentTypes) {
    }
  }, [appointmentTypes]);

  const [openNew, setOpenNew] = useState(false);
  const [selectedAppointmentTypeId, setSelectedAppointmentTypeId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [appointmentTypeToDelete, setAppointmentTypeToDelete] = useState<AppointmentType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAppointmentType = useDeleteAppointmentType({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment Type deleted successfully",
      });
      refetch();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: "Failed to delete appointment type",
        variant: "destructive",
      });
    }
  });

  const handleEditAppointmentTypeClick = (appointmentTypeId: string) => {
    setSelectedAppointmentTypeId(appointmentTypeId);
    setOpenDetails(true);
  };

  const handleDeleteAppointmentType = async () => {
    if (!appointmentTypeToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteAppointmentType.mutateAsync(appointmentTypeToDelete.appointmentTypeId);
    } catch (error) {
      // Error is handled in onError callback
    } finally {
      setIsDeleting(false);
      setAppointmentTypeToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (appointmentType: AppointmentType) => {
    setAppointmentTypeToDelete(appointmentType);
    setIsDeleteDialogOpen(true);
  };

  const columns: ColumnDef<AppointmentType>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "isActive", header: "Active", cell: ({ getValue }) => getValue() ? "Yes" : "No" },
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
              handleEditAppointmentTypeClick(row.original.appointmentTypeId);
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointment Types</h1>
        <Sheet open={openNew} onOpenChange={setOpenNew}>
          <SheetTrigger asChild>
            <Button onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Appointment Type
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>New Appointment Type</SheetTitle>
            </SheetHeader>
            <NewAppointmentType 
              onSuccess={() => {
                setOpenNew(false);
                refetch();
              }} 
            />
          </SheetContent>
        </Sheet>
      </div>

      <DataTable
        columns={columns}
        data={appointmentTypes}
        searchColumn="name"
        searchPlaceholder="Search appointment types..."
        page={pageNumber}
        pageSize={pageSize}
        totalPages={1}
        onPageChange={setPageNumber}
        onPageSizeChange={() => {}}
      />

      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Appointment Type Details</SheetTitle>
          </SheetHeader>
          {selectedAppointmentTypeId && (
            <AppointmentTypeDetails 
              appointmentTypeId={selectedAppointmentTypeId} 
              onSuccess={() => {
                setOpenDetails(false);
                refetch();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
      
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteAppointmentType}
        title="Delete Appointment Type"
        itemName={appointmentTypeToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default withAuth(AppointmentTypeComponent);
