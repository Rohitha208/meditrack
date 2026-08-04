'use client'
import React, { useMemo, useState } from "react";
import { DataTable } from "../../ui/data-table";
import { Button } from "../../ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "../../ui/sheet";
import { Badge } from "../../ui/badge";
import type { BadgeProps } from "../../ui/badge";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2, Filter, CalendarIcon, Download } from "lucide-react";
import { useGetExpense, Expense, ExpenseFilters } from "@/queries/expense/get-expense";
import { useRootContext } from "@/context/RootContext";
import withAuth from "@/utils/privateRouter";
import NewExpense from "./newExpense";
import { useDeleteExpense } from "@/queries/expense/delete-expense";

import { DeleteConfirmationDialog } from "../../ui/delete-confirmation-dialog";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import ExpenseDetails from "./expenseDetails";
import Loader from "@/components/ui/loader";
import { Label } from "../../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker-fix.css";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/mulitselect";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

type ExpenseFormValues = Omit<Expense, "id" | "createdAt" | "updatedAt">;

function ExpenseTracker() {
  const router = useRouter();
  const { userType, clinic, user } = useRootContext(); // ✅ Added user to get clinic data
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const companyId: string | null = userType.isAdmin ? clinic?.companyId ?? null : null;

  // ✅ Fixed clinic ID logic - get from user's clinics array for clinic admin and receptionist
  const clinicId: string | null = useMemo(() => {
    if (userType.isClinicAdmin) {
      // For clinic admin, get the clinic ID from user's clinics array
      return user?.clinics?.[0]?.clinicId ?? null;
    } else if (userType.isVeterinarian || userType.isReceptionist) {
      // For veterinarian and receptionist, use the clinic ID from context
      return clinic?.id ?? null;
    }
    return null;
  }, [userType, user, clinic]);
  // Filter states
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { data: clinicData } = useGetClinic(1, 100, companyId, !!companyId);

  const clinicOptions =
    clinicData?.items?.map((c) => ({
      value: c.id,
      label: c.name,
    })) || [];

  const { data: expenseData, isLoading, isError } = useGetExpense(
    pageNumber,
    pageSize,
    clinicId,
    companyId,
    {
      ...filters,
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined,
    },
    Boolean(clinicId || companyId)
  );

  const expenses = expenseData?.items || [];
  const totalPages = expenseData?.totalPages || 1;

  const [openNew, setOpenNew] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();

  const clinicColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    const predefinedColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
      '#F9E79F', '#ABEBC6', '#FAD7A0', '#AED6F1', '#D5A6BD'
    ];

    if (expenseData?.items) {
      expenseData.items.forEach((expense) => {
        const clinicName = expense.clinicDetail?.name || "No Clinic Assigned";
        if (clinicName && !colors[clinicName]) {
          const randomIndex = Math.floor(Math.random() * predefinedColors.length);
          colors[clinicName] = predefinedColors[randomIndex];
        }
      });
    }
    return colors;
  }, [expenseData?.items]);

  const handleEditExpenseClick = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setOpenDetails(true);
  };

  // Fetch all expenses (respecting current filters and scope) for export
  const fetchAllExpenses = async () => {
    let allExpenses: Expense[] = [];
    let page = 1;
    const pageSize = 100; // export in big chunks
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        pageNumber: String(page),
        pageSize: String(pageSize),
      });

      if (clinicId) params.append('clinicId', clinicId);
      if (companyId) params.append('companyId', companyId);

      if (filters.clinicIds && filters.clinicIds.length > 0) {
        filters.clinicIds.forEach((id) => params.append('clinicIds', id));
      }
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/expense?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch expense data for export');
      }

      const result = await response.json();
      const items: Expense[] = result.items || [];
      allExpenses = allExpenses.concat(items);
      hasMore = Boolean(result.hasNextPage);
      page += 1;

      if (page > 200) {
        console.warn('Reached max pages (200) while exporting expenses');
        break;
      }
    }

    return allExpenses;
  };

  // Export to Excel
  const handleExportToExcel = async () => {
    if (!clinicId && !companyId) {
      toast("No scope found to export. Please make sure you have a clinic or company context.");
      return;
    }

    setIsExporting(true);
    try {
      const allExpenses = await fetchAllExpenses();

      if (allExpenses.length === 0) {
        toast("No expenses found to export.");
        return;
      }

      const excelData = allExpenses.map((e) => ({
        'Date': e.dateOfExpense ? new Date(e.dateOfExpense).toLocaleDateString() : '',
        'Category': e.category,
        'Description': e.description,
        'Amount': e.amount,
        'Payment Mode': e.paymentMode,
        'Paid To': e.paidTo,
        'Clinic': e.clinicDetail?.name || '',
        'Created At': e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '',
        'Updated At': e.updatedAt ? new Date(e.updatedAt).toLocaleDateString() : '',
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [
        { wch: 12 }, // Date
        { wch: 16 }, // Category
        { wch: 40 }, // Description
        { wch: 12 }, // Amount
        { wch: 16 }, // Payment Mode
        { wch: 20 }, // Paid To
        { wch: 24 }, // Clinic
        { wch: 14 }, // Created At
        { wch: 14 }, // Updated At
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `expenses_export_${currentDate}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast(`Successfully exported ${allExpenses.length} expenses to Excel.`);
    } catch (error) {
      console.error('Expense export error:', error);
      toast("Failed to export expenses to Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;

    setIsDeleting(true);
    try {
      await deleteExpense.mutateAsync({ id: expenseToDelete.id });
      toast("Expense has been deleted successfully");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "An unexpected error occurred while deleting the expense.");
    } finally {
      setIsDeleting(false);
      setExpenseToDelete(null);
    }
  };

  const clearFilters = () => {
    setFilters({ clinicIds: [] })
    setStartDate(undefined)
    setEndDate(undefined)
    setPageNumber(1)
  }

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "dateOfExpense",
      header: "Date",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return date.toLocaleDateString();
      }
    },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ getValue }) => {
        const amount = getValue() as number;
        return `₹ ${amount.toFixed(2)}`;
      }
    },
    { accessorKey: "paymentMode", header: "Payment Mode" },
    { accessorKey: "paidTo", header: "Paid To" },

    // ✅ Only show Clinic column if NOT clinic admin
    ...(!userType.isClinicAdmin
      ? [{
        accessorKey: "clinic",
        header: "Clinic",
        cell: ({ row }: CellContext<Expense, unknown>) => {
          const clinicName = row.original.clinicDetail?.name || "No Clinic Assigned";
          return (
            <Badge variant="outline" className="bg-white dark:bg-white text-foreground">
              {clinicName}
            </Badge>
          );
        },
      }] as ColumnDef<Expense>[]
      : []),

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
              handleEditExpenseClick(row.original.id);
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
              setExpenseToDelete(row.original);
              setIsDeleteDialogOpen(true);
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
        <h1 className="text-2xl font-bold">Expense Tracker</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting || (!clinicId && !companyId)}
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
              <Button className={`theme-button text-white`} onClick={() => setOpenNew(true)}>
                <Plus className="mr-2 h-4 w-4" />Add Expense
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[37%]">
              <SheetHeader className="relative top-[-14px]">
                <SheetTitle>New Expense</SheetTitle>
              </SheetHeader>
              <NewExpense onSuccess={() => { setOpenNew(false); }} />
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
            {/* ✅ Clinic MultiSelect - only for Admin */}
            {userType.isAdmin && (
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

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date as Date)}
                minDate={new Date('2000-01-01')}
                placeholderText="dd/mm/yyyy"
                dateFormat="dd/MM/yyyy"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                popperClassName="date-picker-popper"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date as Date)}
                minDate={startDate || new Date('2000-01-01')}
                placeholderText="dd/mm/yyyy"
                dateFormat="dd/MM/yyyy"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                popperClassName="date-picker-popper"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader size="lg" label="Loading expenses..." />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-red-500 text-center">Error loading expenses</p>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 p-6">
          <DataTable
            columns={columns}
            data={expenses}
            searchColumn="description"
            searchPlaceholder="Search expenses..."
            page={pageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setPageNumber}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNumber(1);
            }}
            onSearch={setSearch}
          />
        </div>
      )}

      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[37%]">
          <SheetHeader className="relative top-[-14px]">
            <SheetTitle>Expense Details</SheetTitle>
          </SheetHeader>
          {selectedExpenseId && (
            <ExpenseDetails
              expenseId={selectedExpenseId}
              onSuccess={() => setOpenDetails(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        itemName={expenseToDelete?.description || expenseToDelete?.category}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default withAuth(ExpenseTracker);