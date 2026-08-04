'use client'
import React, { useState } from "react";
import { DataTable } from "../../ui/data-table";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useGetRole } from "@/queries/roles/get-role";
import { useRootContext } from "@/context/RootContext"; // Import useRootContext
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet";
import NewRole from "./newRole";
import RoleDetails from "./roleDetails";
import { Role } from "@/queries/roles/get-role";
import { useRouter } from "next/navigation";

export default function Roles() {
  const router = useRouter();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const { userType, user: currentUser } = useRootContext(); // Get userType and currentUser
  
  const { data: rolesData, isLoading, isError } = useGetRole(pageNumber, pageSize, search);
  const roles = rolesData?.data || [];
  const totalPages = rolesData?.totalPages || 1;
  
  const [openNew, setOpenNew] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  const handleRoleClick = (roleId: string) => {
    setSelectedRoleId(roleId);
    setOpenDetails(true);
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

  const columns: ColumnDef<Role>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "value", header: "Value" },
    { 
      accessorKey: "colourName", 
      header: "Color", 
      cell: ({ getValue }) => (
        <div 
          className="w-6 h-6 rounded-full border border-gray-300" 
          style={{ backgroundColor: getValue() as string }}
        ></div>
      )
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => <Badge variant="default">{getValue() as number}</Badge>
    },

    { 
      accessorKey: "isClinicRequired", 
      header: "Clinic Required", 
      cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "secondary"}>{getValue() ? "Yes" : "No"}</Badge>
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
              handleRoleClick(row.original.id);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
      meta: { className: "text-center" },
    },
  ];

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
      {!userType?.isSuperAdmin && (
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push('/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold">Roles</h1>
        <Sheet open={openNew} onOpenChange={setOpenNew}>
          <SheetTrigger asChild>
           
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%] overflow-hidden">
            <SheetHeader>
              <SheetTitle>New Role</SheetTitle>
            </SheetHeader>
            <NewRole onSuccess={() => {
              setOpenNew(false);
            }} />
          </SheetContent>
        </Sheet>
      </div>
      </div>      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading roles...</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Error loading roles</p>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 border-none p-6">
        <DataTable
          columns={columns}
          data={roles.map((role: Role) => {
            const { isPrivileged, ...roleWithoutPrivileged } = role;
            return roleWithoutPrivileged;
          })}
          searchColumn="name"
          searchPlaceholder="Search roles..."
          page={pageNumber}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSearch={handleSearch}
        />
        </div>
      )}
      
      {/* Role Details Sheet */}
      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%] overflow-hidden">
          <SheetHeader>
            <SheetTitle>Role Details</SheetTitle>
          </SheetHeader>
          {selectedRoleId && (
            <RoleDetails 
              roleId={selectedRoleId}
              onSuccess={() => {
                setOpenDetails(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
