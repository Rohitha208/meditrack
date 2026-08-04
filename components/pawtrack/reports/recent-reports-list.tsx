interface RecentReport {
  title: string
  date: string
  description?: string
}

interface RecentReportsListProps {
  reports: RecentReport[]
}

export function RecentReportsList({ reports }: RecentReportsListProps) {
  return (
    <div className="space-y-3">
      {reports.map((report, index) => (
        <div
          key={index}
          className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
        >
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{report.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Generated {report.date}</p>
          {report.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{report.description}</p>}
        </div>
      ))}
    </div>
  )
}
