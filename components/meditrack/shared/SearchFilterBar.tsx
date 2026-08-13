"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  className?: string
}

interface SearchFilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterConfig[]
  className?: string
}

/** Search input (+ optional inline filter selects) shared across every table's filter band. */
export function SearchFilterBar({ searchValue, onSearchChange, searchPlaceholder = "Search...", filters, className }: SearchFilterBarProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <div className="relative flex-1 sm:min-w-[220px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adminreg-muted" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 focus-visible:ring-brand-500"
        />
      </div>
      {filters?.map((filter) => (
        <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className={cn("w-full sm:w-44", filter.className)}>
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
