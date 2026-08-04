'use client'
import React, { useState, useImperativeHandle, forwardRef } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import withAuth from "@/utils/privateRouter";
import { useDeleteUser } from "@/queries/users/delete-user";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import NewUser from "./newUser";
import UserDetails from "./userDetails";
import { useGetUsers } from "@/queries/users/get-users";
import Loader from "@/components/ui/loader";

// Match the User type from the main user component
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  roleName: string;
  roleId: string;
  companyId: string;
  clinics?: { clinicId: string; clinicName: string }[];
  isActive: boolean;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type UserProps = {
  clinicId?: string;
};

const UserComponent = forwardRef(function UserComponent({ clinicId }: UserProps, ref) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  // Ensure clinicId is a string
  const safeClinicId = clinicId || '';

  // Pass clinicId explicitly
  const { data: usersData, isLoading, isError, refetch } = useGetUsers(
    pageNumber,
    pageSize,
    search,
    true, // enabled
    '', // companyId - not needed for clinic users
    safeClinicId ? [safeClinicId] : [], // Pass clinicId as an array
    [] // roleIds - not needed for all users
  );
  const users = usersData?.items || [];
  const totalPages = usersData?.totalPages || 1;

  const [openNew, setOpenNew] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteUser = useDeleteUser();

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setOpenDetails(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser.mutateAsync({ id: userToDelete.id });
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
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

  const columns: ColumnDef<User>[] = [
    { accessorKey: "firstName", header: "First Name" },
    { accessorKey: "lastName", header: "Last Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "roleName",
      header: "Role",
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return value && typeof value === 'string' && value.trim() !== '' ? value : null;
      }
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
              handleUserClick(row.original.id);
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

  const filteredUsers = clinicId
    ? users.filter(user => user.clinics?.some(c => c.clinicId === clinicId))
    : users;

  // Expose refreshUsers method to parent
  useImperativeHandle(ref, () => ({
    refreshUsers: () => refetch()
  }));

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold">Users</h1>
        <Sheet open={openNew} onOpenChange={setOpenNew}>
          <SheetTrigger asChild>
            <Button onClick={() => setOpenNew(true)}>
              <Plus className="mr-2 h-4 w-4" />Add User
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%] overflow-hidden">
            <SheetHeader>
              <SheetTitle>New User</SheetTitle>
            </SheetHeader>
            <NewUser
              clinicId={clinicId}
              onSuccess={() => {
                setOpenNew(false);
                refetch();
              }}
            />
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader size="lg" label="Loading users..." />
        </div>
      ) : isError ? (
        <p className="text-red-500 text-center">Error loading users</p>
      ) : users.length === 0 ? (
        <p className="text-center">
          No users found. Click "Add User" to create one.
        </p>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 p-6">
          <DataTable
            columns={columns}
            data={filteredUsers as unknown as User[]}
            searchColumn="email"
            searchPlaceholder="Search users..."
            page={pageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSearch={handleSearch}
          />
        </div>
      )}

      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%] overflow-hidden">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
          </SheetHeader>
          {selectedUserId && (
            <UserDetails
              userId={selectedUserId}
              clinicId={clinicId}
              onSuccess={() => {
                setOpenDetails(false);
                refetch(); // Refresh user list after editing
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="Delete User"
        itemName={userToDelete?.email}
        isDeleting={isDeleting}
      />
    </div>
  );
});

export default withAuth(UserComponent);