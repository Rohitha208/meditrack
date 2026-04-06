"use client"

import { useState, useCallback, useEffect, useMemo, memo } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
  getSortedRowModel,
  type ColumnFiltersState,
  getFilteredRowModel,
  type Row,
  type Cell,
} from "@tanstack/react-table"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit, Save, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumn?: string
  searchPlaceholder?: string
  /** When provided, the search input is controlled by this value (e.g. from parent state). */
  searchValue?: string
  onSearch?: (searchTerm: string) => void
  onUpdate?: (rowIndex: number, columnId: string, value: any) => void
  className?: string
  onEditButtonClick?: (rowId: string) => void
  onSaveButtonClick?: (rowId: string) => void
  onCancelButtonClick?: (rowId: string) => void
  onRowClick?: (row: TData) => void
  editingRow?: number[]
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

// Memoize individual table row to prevent all rows re-rendering when one row changes
const MemoizedTableRow = memo(
  ({ row, editingRow, onEditButtonClick, onSaveButtonClick, onCancelButtonClick, onRowClick }: {
    row: Row<any>;
    editingRow?: number[];
    onEditButtonClick?: (rowId: string) => void;
    onSaveButtonClick?: (rowId: string) => void;
    onCancelButtonClick?: (rowId: string) => void;
    onRowClick?: (row: any) => void;
  }) => {
    const isEditing = editingRow?.includes(row.index);
    
    // Focus the first input element when row enters edit mode
    useEffect(() => {
      if (isEditing) {
        const firstInput = document.querySelector(`tr[data-row-id="${row.id}"] input`);
        if (firstInput instanceof HTMLElement) {
          firstInput.focus();
        }
      }
    }, [isEditing, row.id]);

    return (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() && "selected"}
        data-editing={isEditing ? "true" : undefined}
        data-row-id={row.id}
        className={cn(
          "hover:bg-muted/30 h-4",
          onRowClick && "cursor-pointer",
          row.original.status === "cancelled" && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => {
          if (row.original.status !== "cancelled") {
            onRowClick?.(row.original)
          }
        }}
      >
        {row.getVisibleCells().map((cell: Cell<any, unknown>) => (
          <TableCell key={cell.id} className={cn("text-sm py-0", (cell.column.columnDef.meta as any)?.className)}>
            {flexRender(cell.column.columnDef.cell, {
              ...cell.getContext(),
            })}
          </TableCell>
        ))}
        <TableCell className="text-right">
          {/* {isEditing ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveButtonClick?.(row.id)
                }}
              >
                <Save className="h-4 w-4" />
                <span className="sr-only">Save</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelButtonClick?.(row.id)
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onEditButtonClick?.(row.id)
              }}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          )} */}
        </TableCell>
      </TableRow>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if editing state changes or row data changes
    const prevEditing = prevProps.editingRow?.includes(prevProps.row.index);
    const nextEditing = nextProps.editingRow?.includes(nextProps.row.index);
    
    // Compare row data
    const prevRowData = JSON.stringify(prevProps.row.original);
    const nextRowData = JSON.stringify(nextProps.row.original);
    
    return prevEditing === nextEditing && prevRowData === nextRowData;
  }
);

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Search...",
  searchValue,
  onSearch,
  onUpdate,
  className,
  onEditButtonClick,
  onSaveButtonClick,
  onCancelButtonClick,
  onRowClick,
  editingRow,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState(searchValue ?? "")
  const [rowData, setRowData] = useState<TData[]>(data ?? [])

  // Keep internal search in sync when parent passes controlled searchValue (e.g. after clear)
  useEffect(() => {
    if (searchValue !== undefined) {
      setGlobalFilter(searchValue)
    }
  }, [searchValue])

  useEffect(() => {
    setRowData(data ?? [])
  }, [data])

  const updateData = useCallback(
    (rowIndex: number, columnId: string, value: any) => {
      setRowData((old) =>
        old.map((row, index) => {
          if (index === rowIndex) {
            return {
              ...old[rowIndex],
              [columnId]: value,
            }
          }
          return row
        }),
      )
      if (onUpdate) {
        onUpdate(rowIndex, columnId, value)
      }
    },
    [onUpdate],
  )

  const table = useReactTable({
    data: rowData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    manualPagination: true,
    pageCount: totalPages,
    meta: {
      onEditButtonClick,
      onSaveButtonClick,
      onCancelButtonClick,
      editingRow,
      handleDeletePort: (typeof (onUpdate) === 'function' ? (onUpdate as any).handleDeletePort : undefined),
    },
  })

  return (
    <div className={cn("space-y-4", className, "relative flex flex-col h-full max-h-[calc(100vh-180px)] overflow-y-auto")}>
      {searchColumn && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-grow">
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setGlobalFilter(value);
                if (onSearch) {
                  onSearch(value);
                }
              }}
              className="pr-9 transition-all duration-200 pl-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground/70 transition-colors duration-200" />
            {globalFilter && (
              <Button 
                variant="ghost" 
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0 opacity-70 hover:opacity-100 hover:bg-transparent"
                onClick={() => {
                  setGlobalFilter("");
                  if (onSearch) {
                    onSearch("");
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Table Area */}
      <div className="rounded-md border flex-grow overflow-auto">
        <Table className="table-auto w-full bg-white">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "sticky top-0 z-20 bg-white font-bold text-black-600 whitespace-nowrap",
                      (header.column.columnDef.meta as any)?.className
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <MemoizedTableRow
                  key={row.id}
                  row={row}
                  editingRow={editingRow}
                  onEditButtonClick={onEditButtonClick}
                  onSaveButtonClick={onSaveButtonClick}
                  onCancelButtonClick={onCancelButtonClick}
                  onRowClick={onRowClick}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-16 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls - always visible at the bottom */}
      <div className="flex items-center justify-between bg-white sticky bottom-0 z-10 flex-shrink-0 p-4 rounded-md border">
        <div className="flex items-center space-x-2">
          <p className="text-md text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-md text-muted-foreground">rows per page</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}