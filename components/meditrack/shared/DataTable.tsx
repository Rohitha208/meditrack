"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, type LucideIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"
import { MtButton } from "./MtButton"

export interface MtColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Enables click-to-sort on this column using the returned comparable value. Omit for action/non-data columns. */
  sortValue?: (row: T) => string | number
  className?: string
  headerClassName?: string
  /** Always shown, hidden from the "Columns" visibility toggle (use for the primary identity column). */
  alwaysVisible?: boolean
}

interface MtDataTableProps<T> {
  columns: MtColumn<T>[]
  rows: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  isRowActive?: (row: T) => boolean
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  /** Shows a "Columns" toggle button above the table so users can hide/show columns. */
  enableColumnVisibility?: boolean
}

/**
 * The table used across every MediTrack list screen. Backed by TanStack
 * Table for real click-to-sort and column-visibility toggling; pagination
 * stays owned by the page (it passes in already-sliced `rows`), matching
 * every module's existing state-management pattern.
 */
export function MtDataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowClick,
  isRowActive,
  emptyIcon,
  emptyTitle = "No records found",
  emptyDescription,
  enableColumnVisibility,
}: MtDataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const tableColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        id: col.key,
        accessorFn: col.sortValue ?? (() => ""),
        enableSorting: !!col.sortValue,
        enableHiding: !col.alwaysVisible,
        header: col.header,
        cell: (info) => col.render(info.row.original),
      })),
    [columns]
  )

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const columnMeta = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns])
  const hideableColumns = table.getAllLeafColumns().filter((c) => c.getCanHide())

  return (
    <div>
      {enableColumnVisibility && (
        <div className="mb-2 flex justify-end px-5 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MtButton variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </MtButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="text-xs capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {columnMeta.get(column.id)?.header ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm text-adminreg-text">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-adminreg-border bg-adminreg-border/30">
                {headerGroup.headers.map((header) => {
                  const meta = columnMeta.get(header.column.id)
                  const canSort = header.column.getCanSort()
                  const sortState = header.column.getIsSorted()

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted",
                        meta?.headerClassName
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-adminreg-text"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortState === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sortState === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const original = row.original
                const active = isRowActive?.(original)
                return (
                  <tr
                    key={keyExtractor(original)}
                    onClick={onRowClick ? () => onRowClick(original) : undefined}
                    className={cn(
                      "border-b border-adminreg-border/70 transition-colors last:border-0 hover:bg-adminreg-border/20",
                      onRowClick && "cursor-pointer",
                      active && "bg-brand-50/70"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = columnMeta.get(cell.column.id)
                      return (
                        <td key={cell.id} className={cn("px-5 py-3.5 align-middle", meta?.className)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
