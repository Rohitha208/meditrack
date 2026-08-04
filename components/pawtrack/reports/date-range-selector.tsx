"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface DateRangeOption {
  label: string
  value: string
}

interface DateRangeSelectorProps {
  onRangeChange: (range: string) => void
}

export function DateRangeSelector({ onRangeChange }: DateRangeSelectorProps) {
  const [selectedRange, setSelectedRange] = useState<string>("this-month")

  const dateRanges: DateRangeOption[] = [
    { label: "This Month", value: "this-month" },
    { label: "Last Month", value: "last-month" },
    { label: "Last Quarter", value: "last-quarter" },
    { label: "Year to Date", value: "year-to-date" },
    { label: "Custom Range", value: "custom-range" },
  ]

  const handleRangeChange = (range: string) => {
    setSelectedRange(range)
    onRangeChange(range)
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-4">Date Range:</span>
        <div className="flex flex-wrap gap-2">
          {dateRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => handleRangeChange(range.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                selectedRange === range.value
                  ? "bg-blue-500 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600",
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
