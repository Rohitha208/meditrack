'use client'
import React, { useState, useMemo, useEffect } from "react";
import { DataTable } from "../../ui/data-table";
import { Button } from "../../ui/button";
import { Badge, BadgeProps } from "../../ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2, Filter, Download } from "lucide-react";
import { useGetUsers } from "@/queries/users/get-users";
import { useGetRole } from "@/queries/roles/get-role";
import { Role } from "@/queries/roles/get-role";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Label } from "../../ui/label";
import { MultiSelect } from "@/components/ui/mulitselect";
import NewUser from "./newUser";
import UserDetails from "./userDetails";
import { useDeleteUser } from "@/queries/users/delete-user";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "../../ui/delete-confirmation-dialog";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useRootContext } from "@/context/RootContext";
import { getCompanyId } from "@/utils/clientCookie";
import { useGetCompanies } from "@/queries/companies/get-company";
import Loader from "@/components/ui/loader";
import * as XLSX from 'xlsx';

// Filter interface
export interface UserFilters {
  clinicIds?: string[];
  roleIds?: string[];
}

// User type based on the provided API schema
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: string;
  roleName: string;
  clinicId?: string;
  clinicName?: string;
  clinicIds?: string[]; // Array of clinic IDs as per API
  clinics?: { clinicId: string; clinicName: string }[]; // Array of clinic objects for display
  companyId?: string; // Added for superadmin functionality
  slots?: string[]; // Array of slot IDs as per API
  clinic?: {
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
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export default function Users() {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { userType, clinic, user: currentUser } = useRootContext();

  // Filter states
  const [filters, setFilters] = useState<UserFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Changed to useDebouncedValue for the search input value
  const debouncedSearch = useDebouncedValue(search, 300);

  const queryClient = useQueryClient();

  // Set company ID from root context or local storage for Administrator users
  useEffect(() => {
    if (userType?.isAdmin || currentUser?.roleName === 'Administrator') {
      if (currentUser?.companyId) {
        setCompanyId(currentUser.companyId);
      } else {
        const storedCompanyId = getCompanyId();
        if (storedCompanyId) {
          setCompanyId(storedCompanyId);
        }
      }
    }
  }, [userType?.isAdmin, currentUser?.roleName, currentUser?.companyId]);

  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["role"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.refetchQueries({ queryKey: ["role"] });
    queryClient.refetchQueries({ queryKey: ["users"] });
  }, [queryClient]);

  const { data: rolesData, isLoading: isRolesLoading, isError: isRolesError } = useGetRole(1, 1000, '', true); // Fetch all roles for color mapping


  // Fetch companies for Super Admin to display company names
  const { data: companiesData } = useGetCompanies(!!userType?.isSuperAdmin, 1, 100);
  const companyMap = useMemo(() => {
    const items = (companiesData as any)?.items ?? [];
    const map: Record<string, string> = {};
    items.forEach((c: any) => { if (c?.id) map[c.id] = c?.name || c?.companyName || c?.nameEnglish || c?.nameLocal || c.id; });
    return map;
  }, [companiesData]);

  // Fetch clinics for admin users to show in filter
  const { data: clinicData } = useGetClinic(1, 100, companyId, !!companyId);
  const clinicOptions = useMemo(() => {
    return clinicData?.items?.map((c) => ({
      value: c.id,
      label: c.name,
    })) || [];
  }, [clinicData]);

  const getAllowedRoles = (currentPriority: number, sortedRoles: Role[]): Role[] => {
    return sortedRoles.filter(role => {
      if (currentPriority === 1) {
        // Super Admin → can see all except other Super Admin
        return role.priority !== 1;
      }
      if (currentPriority === 2) {
        // Administrator → cannot see Super Admin
        return role.priority > 1;
      }
      if (currentPriority === 3) {
        // Clinic Admin → cannot see Super Admin & Administrator
        return role.priority > 2;
      }
      // Any role with priority >= 4 → cannot create/manage anyone else
      return false;
    });
  };

  const roleOptions = useMemo(() => {
    if (!rolesData?.data || !currentUser?.roleId) return [];

    const sortedRoles = [...rolesData.data].sort((a, b) => a.priority - b.priority);

    const currentRole = rolesData.data.find((r: Role) => r.id === currentUser.roleId);
    const currentPriority = currentRole?.priority || 0;

    const allowedRoles = getAllowedRoles(currentPriority, sortedRoles);

    return allowedRoles.map(role => ({
      value: role.id,
      label: role.name,
    }));
  }, [rolesData?.data, currentUser?.roleId]);



  // Determine clinic ID based on user role
  const clinicId = useMemo(() => {
    if (userType?.isClinicAdmin || userType?.isVeterinarian) {
      return clinic?.id || '';
    }
    // For admin users, don't filter by clinic - show all users
    return '';
  }, [userType?.isClinicAdmin, userType?.isVeterinarian, clinic?.id]);

  // For superadmin, get Administrator role ID to filter users
  const administratorRole = rolesData?.data?.find((role: any) => role.name === 'Administrator');
  const roleIdForQuery = userType?.isSuperAdmin ? (administratorRole?.id || '') : '';

  // Apply filters to the query
  const appliedFilters = useMemo(() => {
    // For clinic admin/vet, use their context clinic ID
    // For admin, use selected clinic IDs or all clinics if none selected
    const appliedClinicIds = userType?.isAdmin
      ? (filters.clinicIds || [])
      : (clinicId ? [clinicId] : []); // Use context clinic ID for clinic admin/vet as an array

    // Use selected role IDs or superadmin role filter
    const appliedRoleIds = filters.roleIds?.length
      ? (filters.roleIds || [])
      : (roleIdForQuery ? [roleIdForQuery] : []); // Use superadmin role filter as an array

    return {
      clinicIds: appliedClinicIds,
      roleIds: appliedRoleIds,
    };
  }, [filters, clinicId, roleIdForQuery, userType?.isAdmin]);

  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError } = useGetUsers(
    pageNumber,
    pageSize,
    debouncedSearch, // Use the debounced search value here
    !!rolesData, // enabled
    companyId || '', // Pass company ID for admin users
    appliedFilters.clinicIds, // Pass the filtered clinic IDs as array
    appliedFilters.roleIds // Pass the filtered role IDs as array
  );

  // Filter users based on role priority
  const filteredUsers = useMemo(() => {
    if (!usersData?.items || !rolesData?.data || !currentUser?.roleId) {
      return [];
    }

    // For superadmin, show all Administrator users (already filtered by roleId in query)
    if (userType?.isSuperAdmin) {
      return usersData.items;
    }

    // Get current user's role priority
    const currentUserRole = rolesData.data.find((role: any) => role.id === currentUser.roleId);
    const currentUserPriority = currentUserRole?.priority || 0;

    // Filter users to show only those with higher priority number (lower privilege)
    return usersData.items.filter(user => {
      const userRole = rolesData.data.find((role: any) => role.id === user.roleId);
      const userPriority = userRole?.priority || 0;

      // Keep users with higher priority values (lower privilege)
      return userPriority > currentUserPriority;
    });
  }, [usersData?.items, rolesData?.data, currentUser?.roleId, userType?.isSuperAdmin]);

  const totalPages = usersData?.totalPages || 1;

  // Teal gradient from darkest (highest privilege) to lightest (lowest privilege)
  const ROLE_GRADIENT: { bg: string; text: string }[] = [
    { bg: '#1E3D3D', text: '#FFFFFF' },  // priority 1 – Super Admin
    { bg: '#2A5555', text: '#FFFFFF' },  // priority 2 – Administrator
    { bg: '#3A7272', text: '#FFFFFF' },  // priority 3 – Clinic Admin
    { bg: '#549090', text: '#FFFFFF' },  // priority 4 – Veterinarian
    { bg: '#7AB3B3', text: '#1E3D3D' },  // priority 5 – Receptionist
    { bg: '#A3D1D1', text: '#1E3D3D' },  // priority 6 – Client
    { bg: '#D2EFEC', text: '#1E3D3D' },  // priority 7+ – Patient / lowest
  ];

  const roleColors = React.useMemo(() => {
    const colors: { [key: string]: { bg: string; text: string } } = {};
    if (rolesData?.data) {
      const sorted = [...rolesData.data].sort((a: any, b: any) => a.priority - b.priority);
      sorted.forEach((role: any, idx: number) => {
        const gradientIdx = Math.min(idx, ROLE_GRADIENT.length - 1);
        colors[role.name] = ROLE_GRADIENT[gradientIdx];
      });
    }
    return colors;
  }, [rolesData]);




  const [openNew, setOpenNew] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const deleteUser = useDeleteUser();

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setOpenDetails(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const openRolePage = () => {
    router.push("/roles")
  }

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

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(Number(newPageSize));
    setPageNumber(1); // Reset to first page when changing page size
  };

  const clearFilters = () => {
    setFilters({ clinicIds: [], roleIds: [] });
    setPageNumber(1);
  };

  const fetchAllUsers = async () => {
    const queryParams = new URLSearchParams({
      pageNumber: '1',
      pageSize: '10000', // Large number to get all users
      paginationRequired: 'true',
    });

    if (search) queryParams.append('search', search);
    if (companyId) queryParams.append('companyId', companyId);

    // Add applied filters
    appliedFilters.clinicIds.forEach(id => {
      queryParams.append('clinicIds', id);
    });
    appliedFilters.roleIds.forEach(id => {
      queryParams.append('roleIds', id);
    });

    const url = `/api/user?${queryParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch user data');
    }
    const data = await response.json();
    return data.items || [];
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
      const allUsers = await fetchAllUsers();

      if (allUsers.length === 0) {
        toast({
          title: "No Data",
          description: "No users found to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel export
      const excelData = allUsers.map((user: User) => ({
        'First Name': user.firstName,
        'Last Name': user.lastName,
        'Email': user.email,
        'Role': user.roleName,
        ...(userType?.isSuperAdmin && { 'Company': user.companyId ? companyMap[user.companyId] || user.companyId : '-' }),
        // 'Clinics': user.clinics?.map(c => c.clinicName).join(', ') || '',
        'Active': user.isActive ? 'Yes' : 'No',
        'Last Login': user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '',
        'Created At': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        'Updated At': user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 25 }, // Email
        { wch: 15 }, // Role
        ...(userType?.isSuperAdmin ? [{ wch: 20 }] : []), // Company (only for superadmin)
        { wch: 30 }, // Clinics
        { wch: 8 },  // Active
        { wch: 12 }, // Last Login
        { wch: 12 }, // Created At
        { wch: 12 }  // Updated At
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `users_export_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${allUsers.length} users to ${filename}`,
        variant: "success",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export users data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  function handleSearch(value: string) {
    setSearch(value);
    setPageNumber(1); // Reset to first page when searching

    // Update URL with search parameter
    const url = new URL(window.location.href);
    url.searchParams.set('search', encodeURIComponent(value));

    // Update the URL without page reload
    window.history.pushState({}, '', url.toString());
  };

  const columns: ColumnDef<User>[] = [
    { accessorKey: "firstName", header: "First Name" },
    { accessorKey: "lastName", header: "Last Name" },
    { accessorKey: "email", header: "Email" },
    ...(userType?.isSuperAdmin ? [{
      id: "company",
      header: "Company",
      cell: ({ row }: any) => {
        const cid = row.original.companyId as string | undefined;
        const name = cid ? companyMap[cid] || cid : "-";
        return <span>{name}</span>;
      }
    } as ColumnDef<User>] : []),
    ...(userType?.isSuperAdmin ? [] : [{
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const roleDisplayName = row.original.roleName as string;
        const colorEntry = roleColors[roleDisplayName];

        const badgeStyle = colorEntry
          ? { backgroundColor: colorEntry.bg, color: colorEntry.text }
          : { backgroundColor: '#D2EFEC', color: '#1E3D3D' };

        return <Badge style={badgeStyle}>{roleDisplayName}</Badge>;
      },
    } as ColumnDef<User>]),
    ...(userType?.isSuperAdmin ? [] : [{
      id: "clinics",
      header: "Clinics",
      cell: ({ row }) => {
        const clinics = row.original.clinics || [];
        if (clinics.length === 0) {
          return <span className="text-gray-500">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {clinics.map((clinic: { clinicId: string; clinicName: string }, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {clinic.clinicName}
              </Badge>
            ))}
          </div>
        );
      },
    } as ColumnDef<User>]),
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

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold">{userType?.isSuperAdmin ? "Admins" : "Users"}</h1>
        <div className="flex gap-2">
          {!userType?.isSuperAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </Button>

          <Sheet open={openNew} onOpenChange={setOpenNew}>
            <SheetTrigger asChild>
              <Button className="theme-button text-white">
                <Plus className="mr-2 h-4 w-4" />
                {userType?.isSuperAdmin ? "Add Admin" : "Add User"}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%]">
              <SheetHeader className="relative top-[-14px]">
                <SheetTitle>{userType?.isSuperAdmin ? "New Admin" : "New User"}</SheetTitle>
              </SheetHeader>
              <NewUser onSuccess={() => setOpenNew(false)} />
            </SheetContent>
          </Sheet>


        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Clinic MultiSelect - only for Admin */}
            {userType?.isAdmin && (
              <div className="space-y-2">
                <Label>Clinics</Label>
                <MultiSelect
                  options={clinicOptions}
                  value={filters.clinicIds || []}
                  onValueChange={(values: any) => {
                    setFilters((prev) => ({ ...prev, clinicIds: values }))
                  }}
                  placeholder="Select clinics"
                  maxCount={3}
                />
              </div>
            )}

            {/* Role MultiSelect - for both Admin and Clinic Admin */}
            <div className="space-y-2">
              <Label>Roles</Label>
              <MultiSelect
                options={roleOptions}
                value={filters.roleIds || []}
                onValueChange={(values: any) => {
                  setFilters((prev) => ({ ...prev, roleIds: values }))
                }}
                placeholder="Select roles"
                maxCount={3}
              />
            </div>
          </div>
        </div>
      )}

      {isUsersLoading || isRolesLoading || !rolesData?.data ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader size="lg" label="Loading users..." />
        </div>
      ) : isUsersError || isRolesError ? (
        <p className="text-red-500 text-center">Error loading users</p>
      ) : (
        <div onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="bg-slate-50 dark:bg-slate-900 p-6">
          <DataTable
            columns={columns}
            data={filteredUsers as User[]}
            searchColumn="firstName"
            searchPlaceholder="Search users by name or email..."
            page={pageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSearch={handleSearch} // Pass the immediate handleSearch function
          />
        </div>
      )}

      {/* User Details Sheet */}
      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[22%] overflow-hidden">
          <SheetHeader className="relative top-[-14px]">
            <SheetTitle>User Details</SheetTitle>
          </SheetHeader>
          {selectedUserId && (
            <UserDetails
              userId={selectedUserId}
              onSuccess={() => {
                setOpenDetails(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
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
}