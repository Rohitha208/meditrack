import { Skeleton } from "@/components/ui/skeleton"
import PatientSidebar from "@/components/pawtrack/patient-sidebar"

export default function PrescriptionsLoading() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      <PatientSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <Skeleton className="h-8 w-64" />
              <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>

            {/* Search and Filters */}
            <Skeleton className="h-20 w-full mb-6" />

            {/* Tabs */}
            <Skeleton className="h-12 w-full mb-6" />

            {/* Table */}
            <Skeleton className="h-[500px] w-full" />
          </div>
        </main>
      </div>
    </div>
  )
}
