"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { StatusBadge } from "./status-badge"

export function RefillRequests() {
  const [open, setOpen] = useState(false)
  const [colorTheme, setColorTheme] = useState("purple")
  const [mounted, setMounted] = useState(false)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
  }, [])

  // Don't render full component until after client-side hydration
  if (!mounted) return <Button variant="outline" className="theme-button-outline">
    Refill Requests
  </Button>

  // Sample refill request data
  const refillRequests = [
    {
      id: "REF-1234",
      patient: "Max (Golden Retriever)",
      medication: "Amoxicillin 250mg",
      originalRx: "RX-5829",
      requestDate: "May 12, 2025",
      status: "Pending",
    },
    {
      id: "REF-1233",
      patient: "Bella (Siamese Cat)",
      medication: "Doxycycline 100mg",
      originalRx: "RX-5828",
      requestDate: "May 11, 2025",
      status: "Approved",
    },
    {
      id: "REF-1232",
      patient: "Charlie (Labrador)",
      medication: "Prednisone 5mg",
      originalRx: "RX-5827",
      requestDate: "May 10, 2025",
      status: "Denied",
    },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="theme-button-outline">
          Refill Requests
        </Button>
      </SheetTrigger>
      <SheetContent className={`w-full sm:max-w-[80%] theme-${colorTheme}`}>
        <SheetHeader>
          <SheetTitle className="text-xl theme-text-primary">Prescription Refill Requests</SheetTitle>
          <SheetDescription>Review and manage refill requests</SheetDescription>
        </SheetHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Request ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Medication
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Original Rx
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Request Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {refillRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm theme-text-primary">{request.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {request.patient}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {request.medication}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {request.originalRx}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {request.requestDate}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                    {request.status === "Pending" ? (
                      <>
                        <Button size="sm" className="theme-button text-white">
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Deny
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="theme-button-outline">
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SheetFooter>
          <Button onClick={() => setOpen(false)} className="theme-button-outline">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 