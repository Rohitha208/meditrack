import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbProps {
  currentPage: string
  pageSlug?: string
}

export function InventoryBreadcrumb({ currentPage, pageSlug }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white flex items-center">
            <Home className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link href="/inventory" className="hover:text-gray-900 dark:hover:text-white">
            Inventory
          </Link>
        </li>
        {pageSlug && (
          <li className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-gray-900 dark:text-white font-medium">{currentPage}</span>
          </li>
        )}
      </ol>
    </nav>
  )
}
