import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string
  change: {
    value: number
    isIncrease: boolean
  }
  valueClassName?: string
}

export function MetricCard({ title, value, change, valueClassName }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className={cn("text-3xl font-bold mt-1", valueClassName)}>{value}</p>
      <div className="flex items-center mt-2">
        {change.isIncrease ? (
          <ArrowUp className="h-4 w-4 text-green-500" />
        ) : (
          <ArrowDown className="h-4 w-4 text-amber-500" />
        )}
        <span className={cn("text-sm ml-1", change.isIncrease ? "text-green-500" : "text-amber-500")}>
          {Math.abs(change.value)}% from last month
        </span>
      </div>
    </div>
  )
}
