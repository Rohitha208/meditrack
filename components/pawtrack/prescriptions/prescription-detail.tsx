"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "./status-badge"
import { Printer, Download, FileText, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PrescriptionDetailProps {
  prescription: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrescriptionDetail({ prescription, open, onOpenChange }: PrescriptionDetailProps) {
  const [colorTheme, setColorTheme] = useState("purple")
  const [mounted, setMounted] = useState(false)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
  }, [])

  // Don't render until after component has mounted on the client
  if (!mounted) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className={`text-xl theme-text-${colorTheme}`}>Prescription #{prescription.id}</SheetTitle>
          <SheetDescription>View and manage prescription details</SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <StatusBadge status={prescription.status} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="details" className="data-[state=active]:theme-active data-[state=active]:text-white">
                Details
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:theme-active data-[state=active]:text-white">
                History
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:theme-active data-[state=active]:text-white">
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient</h3>
                  <p className="text-sm text-gray-900 dark:text-gray-200">{prescription.patient}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prescribed By</h3>
                  <p className="text-sm text-gray-900 dark:text-gray-200">{prescription.prescribedBy}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Medication</h3>
                <p className="text-sm text-gray-900 dark:text-gray-200">{prescription.medication}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dosage</h3>
                  <p className="text-sm text-gray-900 dark:text-gray-200">1 tablet twice daily</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</h3>
                  <p className="text-sm text-gray-900 dark:text-gray-200">30 tablets</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Instructions</h3>
                <p className="text-sm text-gray-900 dark:text-gray-200">
                  Administer with food. Complete entire course even if symptoms improve.
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Prescribed Date</h3>
                  <p className="text-sm text-gray-900 dark:text-gray-200">{prescription.date}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expiry Date</h3>
                  <p className="text-sm text-gray-900 dark:text-gray-200">May 12, 2026</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Refills</h3>
                <p className="text-sm text-gray-900 dark:text-gray-200">2 refills remaining (of 3)</p>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Prescription Created</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">By Dr. Johnson</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{prescription.date} at 10:30 AM</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Prescription Approved</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">By Pharmacy Staff</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{prescription.date} at 11:45 AM</p>
                  </div>
                </div>

                {prescription.status === "Dispensed" || prescription.status === "Delivered" ? (
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Prescription Dispensed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">By Pharmacy Staff</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{prescription.date} at 2:30 PM</p>
                    </div>
                  </div>
                ) : null}

                {prescription.status === "Delivered" ? (
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Prescription Delivered</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Via Standard Shipping</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{prescription.date} at 5:15 PM</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-500">Patient has known allergies</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-600">
                    Please confirm medication is appropriate. Check medical history.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Note from Dr. Johnson</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{prescription.date}</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Patient responded well to previous course. Monitor for any digestive side effects.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          {prescription.status === "Pending" && (
            <>
              <Button className={`theme-${colorTheme} text-white`}>Approve Prescription</Button>
              <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                Deny
              </Button>
            </>
          )}

          {prescription.status === "Approved" && (
            <Button className={`theme-${colorTheme} text-white`}>Mark as Dispensed</Button>
          )}

          {prescription.status === "Dispensed" && (
            <Button className={`theme-${colorTheme} text-white`}>Mark as Delivered</Button>
          )}

          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 