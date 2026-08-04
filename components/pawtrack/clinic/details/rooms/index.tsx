'use client'
import React, { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2, Calendar, Download } from "lucide-react";
import withAuth from "@/utils/privateRouter";
import { useDeleteRoom } from "@/queries/rooms/delete-room";
import { toast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import NewRoom from "./newRoom";
import RoomDetails from "./roomDetails";
import { useGetRoom } from "@/queries/rooms/get-room";
import { useRouter } from "next/navigation";
import { NewAppointmentDrawer } from "@/components/pawtrack/new-appointment-drawer";

// Room type based on API response
export type Room = {
  id: string;
  clinicId: string;
  name: string;
  roomType: string | null;
  isActive: boolean;
};

type RoomFormValues = Omit<Room, "id" | "createdAt" | "updatedAt">;

type RoomProps = {
  clinicId?: string;
};

function Room({ clinicId }: RoomProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const { data: result, isLoading, isError, refetch } = useGetRoom(page, pageSize, search, clinicId || '');
  const [openNew, setOpenNew] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // New states for appointment drawer
  const [isAppointmentDrawerOpen, setIsAppointmentDrawerOpen] = useState(false);
  const [selectedRoomForAppointment, setSelectedRoomForAppointment] = useState<string | null>(null);

  const deleteRoom = useDeleteRoom({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    }
  });

  const handleEditRoomClick = (roomId: string) => {
    setSelectedRoomId(roomId);
    setOpenDetails(true);
  };

  const handleSlotsClick = (roomId: string) => {
    router.push(`/clinic/${clinicId}/rooms/${roomId}/slots`);
  };

  const handleNewAppointmentClick = (roomId: string) => {
    setSelectedRoomForAppointment(roomId);
    setIsAppointmentDrawerOpen(true);
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;

    setIsDeleting(true);
    try {
      await deleteRoom.mutateAsync(roomToDelete.id);
    } catch (error) {
      // Handle error
    } finally {
      setIsDeleting(false);
      setRoomToDelete(null);
    }
  };

  const handleExportToExcel = async () => {
    if (!result?.items || result.items.length === 0) {
      toast({
        title: "No Data",
        description: "No rooms data available to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = result.items.map(room => ({
        'Name': room.name || '',
        'Room Type': room.roomType || 'N/A',
        'Status': room.isActive ? 'Active' : 'Inactive',
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const columnWidths = [
        { wch: 30 }, // Name
        { wch: 20 }, // Room Type
        { wch: 15 }, // Status
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rooms');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `rooms_export_${currentDate}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Exported ${result.items.length} rooms to Excel.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export rooms to Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const openDeleteDialog = (room: Room) => {
    setRoomToDelete(room);
    setIsDeleteDialogOpen(true);
  };

  const columns: ColumnDef<Room>[] = [
    {
      accessorKey: "name",
      header: "Name"
    },
    { accessorKey: "roomType", header: "Room Type" },
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
              handleEditRoomClick(row.original.id);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleNewAppointmentClick(row.original.id);
            }}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          {/* Delete button commented out
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
          */}
        </div>
      ),
      meta: { className: "text-center" },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
            disabled={isExporting || !result?.items?.length}
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
              <Button className="theme-button text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader className="relative top-[-14px]">
                <SheetTitle>New Room</SheetTitle>
              </SheetHeader>
              <NewRoom clinicId={clinicId} onSuccess={() => { setOpenNew(false); refetch(); }} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900 p-6">
        <DataTable
          columns={columns}
          data={result?.items ?? []}
          searchColumn="name"
          searchPlaceholder="Search rooms..."
          onSearch={(term) => { setSearch(term); setPage(1); }}
          page={result?.pageNumber ?? page}
          pageSize={result?.pageSize ?? pageSize}
          totalPages={result?.totalPages ?? 1}
          onPageChange={(p) => { setPage(p); }}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>

      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right">
          <SheetHeader className="relative top-[-14px]">
            <SheetTitle>Room Details</SheetTitle>
          </SheetHeader>
          {selectedRoomId && (
            <RoomDetails
              roomId={selectedRoomId}
              clinicId={clinicId || ''}
              onSuccess={() => { setOpenDetails(false); refetch(); }}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteRoom}
        title="Delete Room"
        itemName={roomToDelete?.name}
        isDeleting={isDeleting}
      />

      {/* New Appointment Drawer */}
      <NewAppointmentDrawer
        isOpen={isAppointmentDrawerOpen}
        onClose={() => setIsAppointmentDrawerOpen(false)}
        preSelectedClinic={clinicId}
        preSelectedRoom={selectedRoomForAppointment}
      />
    </div>
  );
}

export default withAuth(Room);
