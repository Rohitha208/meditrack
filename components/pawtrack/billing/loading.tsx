import { Skeleton } from "@/components/ui/skeleton"
import PatientSidebar from "@/components/pawtrack/patient-sidebar"

export default function BillingLoading() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <PatientSidebar />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* Search and filters skeleton */}
          <Skeleton className="h-20 w-full mb-6" />

          {/* Tabs skeleton */}
          <Skeleton className="h-12 w-full mb-6" />

          {/* Table skeleton */}
          <div className="space-y-2 mb-6">
            <Skeleton className="h-12 w-full" />
            {Array(6)
              .fill(null)
              .map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
          </div>

          {/* Pagination skeleton */}
          <Skeleton className="h-14 w-full mb-6" />

          {/* Summary statistics skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array(4)
              .fill(null)
              .map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
