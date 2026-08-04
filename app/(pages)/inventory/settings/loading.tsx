import { InventoryBreadcrumb } from "@/components/pawtrack/inventory/inventory-breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"


export default function InventorySettingsLoading() {
  return (
    <>
      <div className="p-6">
        <InventoryBreadcrumb currentPage="Settings" pageSlug="settings" />

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Inventory Settings</h1>

        <Skeleton className="h-12 w-full mb-6" />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>

        <Skeleton className="h-20 w-full mb-6" />

        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>

        <div className="flex justify-between items-center mt-6">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </>
  )
}
