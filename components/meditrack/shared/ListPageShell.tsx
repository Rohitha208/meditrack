"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { PageHeader } from "./PageHeader"
import { MtCard } from "./MtCard"
import { MtButton } from "./MtButton"
import { MtDataTable, type MtColumn } from "./DataTable"
import { MtPagination } from "./Pagination"
import { SearchFilterBar, type FilterConfig } from "./SearchFilterBar"

interface ListPageShellProps<T> {
  title: string
  subtitle?: string
  icon?: LucideIcon
  primaryActionLabel?: string
  primaryActionIcon?: LucideIcon
  onPrimaryAction?: () => void
  /** Extra buttons rendered to the left of the primary action (e.g. Export). */
  headerExtra?: ReactNode
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  filters?: FilterConfig[]
  columns: MtColumn<T>[]
  /** Already search/filter-matched rows — this shell owns pagination only. */
  rows: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  isRowActive?: (row: T) => boolean
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  pageSize?: number
  itemLabel?: string
  enableColumnVisibility?: boolean
  /** Dialogs/drawers owned by the page (FormDialog/DetailDrawer/ConfirmDialog) render here. */
  children?: ReactNode
}

/**
 * One-card list-screen shell shared across every MediTrack module list page
 * (Appointments, Patients, Lab Orders, ...) — a page header with a single
 * primary action, then exactly one card holding search/filters, the table,
 * and pagination. Deliberately avoids stacking extra stat cards above the
 * table so every list screen stays uncluttered.
 */
export function ListPageShell<T>({
  title,
  subtitle,
  icon,
  primaryActionLabel,
  primaryActionIcon: PrimaryIcon,
  onPrimaryAction,
  headerExtra,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  columns,
  rows,
  keyExtractor,
  onRowClick,
  isRowActive,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  pageSize = 10,
  itemLabel = "records",
  enableColumnVisibility,
  children,
}: ListPageShellProps<T>) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(pageSize)

  const start = (page - 1) * size
  const pagedRows = useMemo(() => rows.slice(start, start + size), [rows, start, size])

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        actions={
          <>
            {headerExtra}
            {onPrimaryAction && primaryActionLabel && (
              <MtButton className="gap-2" onClick={onPrimaryAction}>
                {PrimaryIcon && <PrimaryIcon className="h-4 w-4" />}
                {primaryActionLabel}
              </MtButton>
            )}
          </>
        }
      />

      <MtCard noPadding>
        <div className="border-b border-adminreg-border p-4">
          <SearchFilterBar
            searchValue={searchValue}
            onSearchChange={(v) => {
              onSearchChange(v)
              setPage(1)
            }}
            searchPlaceholder={searchPlaceholder}
            filters={filters}
          />
        </div>

        <MtDataTable
          columns={columns}
          rows={pagedRows}
          keyExtractor={keyExtractor}
          onRowClick={onRowClick}
          isRowActive={isRowActive}
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle ?? `No ${itemLabel} found`}
          emptyDescription={emptyDescription}
          enableColumnVisibility={enableColumnVisibility}
        />

        <div className="border-t border-adminreg-border p-4">
          <MtPagination
            page={page}
            pageSize={size}
            totalItems={rows.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setSize(s)
              setPage(1)
            }}
            itemLabel={itemLabel}
          />
        </div>
      </MtCard>

      {children}
    </div>
  )
}
