"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NewPrescriptionForm } from "@/components/pawtrack/prescriptions/new-prescription-form"
import { RefillRequests } from "@/components/pawtrack/prescriptions/refill-requests"
import { PrescriptionDetail } from "@/components/pawtrack/prescriptions/prescription-detail"
import { StatusBadge } from "@/components/pawtrack/prescriptions/status-badge"

export function PrescriptionsScreen() {
  const [mounted, setMounted] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Sample prescription data
  const prescriptions = [
    {
      id: "RX-5829",
      patient: "Max (Golden Retriever)",
      medication: "Amoxicillin 250mg",
      prescribedBy: "Dr. Johnson",
      date: "May 12, 2025",
      status: "Pending",
    },
    {
      id: "RX-5828",
      patient: "Bella (Siamese Cat)",
      medication: "Doxycycline 100mg",
      prescribedBy: "Dr. Martinez",
      date: "May 11, 2025",
      status: "Approved",
    },
    {
      id: "RX-5827",
      patient: "Charlie (Labrador)",
      medication: "Prednisone 5mg",
      prescribedBy: "Dr. Johnson",
      date: "May 10, 2025",
      status: "Dispensed",
    },
    {
      id: "RX-5826",
      patient: "Daisy (Rabbit)",
      medication: "Enrofloxacin 15mg",
      prescribedBy: "Dr. Wilson",
      date: "May 9, 2025",
      status: "Delivered",
    },
    {
      id: "RX-5825",
      patient: "Oscar (Maine Coon)",
      medication: "Famotidine 10mg",
      prescribedBy: "Dr. Martinez",
      date: "May 8, 2025",
      status: "Dispensed",
    },
  ]

  const handleViewPrescription = (prescription: any) => {
    setSelectedPrescription(prescription)
    setDetailOpen(true)
  }

  // Ensure we only access browser APIs on the client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  // Get counts for each status
  const allCount = prescriptions.length
  const pendingCount = prescriptions.filter((p) => p.status === "Pending").length
  const approvedCount = prescriptions.filter((p) => p.status === "Approved").length
  const dispensedCount = prescriptions.filter((p) => p.status === "Dispensed").length
  const deliveredCount = prescriptions.filter((p) => p.status === "Delivered").length

  // Filter prescriptions based on active tab
  const filteredPrescriptions = prescriptions.filter((p) => {
    if (activeTab === "all") return true
    return p.status.toLowerCase() === activeTab.toLowerCase()
  })

  return (
    <>
      <div className="p-4 md:p-6">
        <div className="mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prescription Management</h1>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
              <NewPrescriptionForm />
              <RefillRequests />
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  value=""
                  onChange={() => {}}
                  placeholder="Search by patient, medication, or prescription #"
                  className="w-full bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex-1 md:max-w-[200px]">
                <Select defaultValue="all">
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="dispensed">Dispensed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 md:max-w-[200px]">
                <Select defaultValue="all">
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="theme-button text-white">Apply</Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="all" className="data-[state=active]:theme-active data-[state=active]:text-white">
                All ({allCount})
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:theme-active data-[state=active]:text-white">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:theme-active data-[state=active]:text-white">
                Approved ({approvedCount})
              </TabsTrigger>
              <TabsTrigger
                value="dispensed"
                className="data-[state=active]:theme-active data-[state=active]:text-white"
              >
                Dispensed ({dispensedCount})
              </TabsTrigger>
              <TabsTrigger
                value="delivered"
                className="data-[state=active]:theme-active data-[state=active]:text-white"
              >
                Delivered ({deliveredCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <PrescriptionTable prescriptions={filteredPrescriptions} onViewPrescription={handleViewPrescription} />
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              <PrescriptionTable prescriptions={filteredPrescriptions} onViewPrescription={handleViewPrescription} />
            </TabsContent>
            <TabsContent value="approved" className="mt-0">
              <PrescriptionTable prescriptions={filteredPrescriptions} onViewPrescription={handleViewPrescription} />
            </TabsContent>
            <TabsContent value="dispensed" className="mt-0">
              <PrescriptionTable prescriptions={filteredPrescriptions} onViewPrescription={handleViewPrescription} />
            </TabsContent>
            <TabsContent value="delivered" className="mt-0">
              <PrescriptionTable prescriptions={filteredPrescriptions} onViewPrescription={handleViewPrescription} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {selectedPrescription && (
        <PrescriptionDetail prescription={selectedPrescription} open={detailOpen} onOpenChange={setDetailOpen} />
      )}
    </>
  )
}

function PrescriptionTable({ prescriptions, onViewPrescription }: { prescriptions: any[], onViewPrescription: (prescription: any) => void }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Rx #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Medication
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Prescribed By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {prescriptions.map((prescription) => (
              <tr key={prescription.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium theme-text-primary">
                  {prescription.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {prescription.patient}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {prescription.medication}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {prescription.prescribedBy}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {prescription.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={prescription.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 theme-button-secondary"
                    onClick={() => onViewPrescription(prescription)}
                  >
                    View <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 