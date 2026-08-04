"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2, AlertCircle, Printer } from "lucide-react"
import { useGetDischargeSummaryConsultation } from "@/queries/discharge-summary/get-discharge-summary-consultation"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { toast } from "@/hooks/use-toast"
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

interface DischargeSummarySheetProps {
  isOpen: boolean
  onClose: () => void
  appointmentId: string
}

export default function DischargeSummarySheet({ 
  isOpen, 
  onClose, 
  appointmentId 
}: DischargeSummarySheetProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // PDF Styles
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 30,
      fontSize: 12,
    },
    header: {
      textAlign: 'center',
      marginBottom: 20,
      borderBottom: '2 solid #333',
      paddingBottom: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 16,
      marginBottom: 5,
    },
    date: {
      fontSize: 12,
      color: '#666',
    },
    section: {
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
      borderBottom: '1 solid #ccc',
      paddingBottom: 3,
    },
    row: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    label: {
      fontWeight: 'bold',
      width: '30%',
    },
    value: {
      width: '70%',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    gridItem: {
      width: '50%',
      marginBottom: 4,
    },
    notes: {
      backgroundColor: '#f9f9f9',
      padding: 8,
      borderLeft: '3 solid #007bff',
      marginTop: 5,
    },
    vitalSigns: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    vitalItem: {
      width: '33%',
      marginBottom: 4,
    },
    prescriptionItem: {
      border: '1 solid #ddd',
      padding: 8,
      marginBottom: 8,
      borderRadius: 4,
    },
    signature: {
      marginTop: 30,
      textAlign: 'center',
      borderTop: '1 solid #ccc',
      paddingTop: 15,
    },
  })

  // Get visit data from appointment ID
  const { data: visitData, isLoading: isLoadingVisit } = useGetVisitByAppointmentId(
    appointmentId,
    isOpen
  )

  // Get discharge summary data
  const { data: dischargeData, isLoading: isLoadingDischarge, error: dischargeError } = useGetDischargeSummaryConsultation(
    visitData?.id || "",
    isOpen && !!visitData?.id
  )

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('DischargeSummarySheet Debug:', {
        appointmentId,
        visitData,
        dischargeData,
        dischargeError,
        isLoadingVisit,
        isLoadingDischarge
      })
    }
  }, [isOpen, appointmentId, visitData, dischargeData, dischargeError, isLoadingVisit, isLoadingDischarge])

  // Generate PDF when discharge data is available
  useEffect(() => {
    if (dischargeData && isOpen) {
      generatePDF()
    }
  }, [dischargeData, isOpen])

  // Clean up PDF URL when component unmounts or closes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
    }
  }, [pdfUrl])

  const generatePDF = async () => {
    if (!dischargeData) {
      console.log('No discharge data available for PDF generation')
      return
    }

    try {
      setIsDownloading(true)
      console.log('Generating PDF with discharge data:', dischargeData)
      
      // Generate PDF using react-pdf
      const pdfBlob = await pdf(<DischargeSummaryPDF data={dischargeData} />).toBlob()
      setPdfBlob(pdfBlob)
      
      // Create object URL for preview/download
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
      
      console.log('PDF generated successfully')
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Error",
        description: "Failed to generate discharge summary PDF",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // PDF Document Component
  const DischargeSummaryPDF = ({ data }: { data: any }) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString()
    }

    const formatTime = (timeString: string) => {
      if (!timeString) return ''
      return timeString.substring(0, 5) // Format as HH:MM
    }

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>DISCHARGE SUMMARY</Text>
            <Text style={styles.subtitle}>{data.clinic?.name || 'Veterinary Clinic'}</Text>
            <Text style={styles.date}>Date: {formatDate(data.appointment?.appointmentDate || new Date().toISOString())}</Text>
          </View>

          {/* Patient Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PATIENT INFORMATION</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Patient Name:</Text>
                <Text style={styles.value}>{data.patient?.name || 'N/A'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Species:</Text>
                <Text style={styles.value}>{data.patient?.species || 'N/A'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Breed:</Text>
                <Text style={styles.value}>{data.patient?.breed || 'N/A'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Age:</Text>
                <Text style={styles.value}>{data.patient?.dateOfBirth ? formatDate(data.patient.dateOfBirth) : 'N/A'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Weight:</Text>
                <Text style={styles.value}>{data.intakeDetail?.weightKg || 'N/A'} kg</Text>
              </View>
            </View>
          </View>

          {/* Owner Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OWNER INFORMATION</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Owner Name:</Text>
                <Text style={styles.value}>{data.client?.firstName || ''} {data.client?.lastName || ''}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{data.client?.phonePrimary || 'N/A'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{data.client?.email || 'N/A'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{data.client?.addressLine1 || ''} {data.client?.city || ''}, {data.client?.state || ''}</Text>
              </View>
            </View>
          </View>

          {/* Appointment Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APPOINTMENT DETAILS</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Date:</Text>
                <Text style={styles.value}>{formatDate(data.appointment?.appointmentDate || '')}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Time:</Text>
                <Text style={styles.value}>{formatTime(data.appointment?.appointmentTimeFrom || '')} - {formatTime(data.appointment?.appointmentTimeTo || '')}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Veterinarian:</Text>
                <Text style={styles.value}>Dr. {data.veterinarian?.firstName || ''} {data.veterinarian?.lastName || ''}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Appointment Type:</Text>
                <Text style={styles.value}>{data.appointment?.appointmentType?.name || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Intake Information */}
          {data.intakeDetail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INTAKE INFORMATION</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Weight:</Text>
                <Text style={styles.value}>{data.intakeDetail.weightKg} kg</Text>
              </View>
              {data.intakeDetail.notes && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text>{data.intakeDetail.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Chief Complaint */}
          {data.complaintDetail &&
  (
    (data.complaintDetail.notes?.trim() !== '' || 
     (Array.isArray(data.complaintDetail.symptoms) && data.complaintDetail.symptoms.length > 0))
  ) && (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CHIEF COMPLAINT</Text>

      {/* Notes */}
      {data.complaintDetail.notes?.trim() ? (
        <View style={styles.notes}>
          <Text>{data.complaintDetail.notes}</Text>
        </View>
      ) : null}

      {/* Symptoms */}
      {Array.isArray(data.complaintDetail.symptoms) &&
        data.complaintDetail.symptoms.length > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Symptoms: </Text>
            <Text style={styles.value}>
              {data.complaintDetail.symptoms
                .map((s: any) => s?.name || "")
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
      )}
    </View>
)}


          {/* Vital Signs */}
          {data.vitalDetail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VITAL SIGNS</Text>
              <View style={styles.vitalSigns}>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Temperature:</Text>
                  <Text style={styles.value}>{data.vitalDetail.temperatureC}°C</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Heart Rate:</Text>
                  <Text style={styles.value}>{data.vitalDetail.heartRateBpm} bpm</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Respiratory Rate:</Text>
                  <Text style={styles.value}>{data.vitalDetail.respiratoryRateBpm} bpm</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Mucous Membrane:</Text>
                  <Text style={styles.value}>{data.vitalDetail.mucousMembraneColor || 'N/A'}</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Capillary Refill:</Text>
                  <Text style={styles.value}>{data.vitalDetail.capillaryRefillTimeSec} sec</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Hydration:</Text>
                  <Text style={styles.value}>{data.vitalDetail.hydrationStatus || 'N/A'}</Text>
                </View>
              </View>
              {data.vitalDetail.notes?.trim() && (
                      <View style={styles.notes}>
                        <Text style={styles.label}>Notes:</Text>
                        <Text>{data.vitalDetail.notes}</Text>
                      </View>
              )}
            </View>
          )}

          {/* Treatment Plan */}
          {data.planDetail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TREATMENT PLAN</Text>
               {data.planDetail.notes?.trim() && (
                  <View style={styles.notes}>
                    <Text>{data.planDetail.notes}</Text>
                  </View>
                )}
              {data.planDetail.plans && data.planDetail.plans.length > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>Plans:</Text>
                  <Text style={styles.value}>{data.planDetail.plans.map((p: any) => p.name).join(', ')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Prescriptions */}
          {data.prescriptionDetail && data.prescriptionDetail.productMappings && data.prescriptionDetail.productMappings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PRESCRIPTIONS</Text>
              {data.prescriptionDetail.productMappings.map((prescription: any, index: number) => (
                <View key={index} style={styles.prescriptionItem}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Medication:</Text>
                    <Text style={styles.value}>{prescription.product?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Dosage:</Text>
                    <Text style={styles.value}>{prescription.dosage || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Frequency:</Text>
                    <Text style={styles.value}>{prescription.frequency || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Quantity:</Text>
                    <Text style={styles.value}>{prescription.quantity || 'N/A'}</Text>
                  </View>
                </View>
              ))}
              {data.prescriptionDetail.notes && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text>{data.prescriptionDetail.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Follow-up Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FOLLOW-UP INSTRUCTIONS</Text>
            <View style={styles.notes}>
              <Text>Please contact the clinic if you have any questions or concerns about your pet's health.</Text>
              <Text>Emergency Contact: {data.clinic?.phone || 'N/A'}</Text>
              <Text>Clinic Address: {data.clinic?.addressLine1 || ''} {data.clinic?.city || ''}, {data.clinic?.state || ''}</Text>
            </View>
          </View>

          {/* Signature */}
          <View style={styles.signature}>
            <Text>Veterinarian Signature: _________________________________</Text>
            <Text>Date: {formatDate(new Date().toISOString())}</Text>
          </View>
        </Page>
      </Document>
    )
  }

  const handleDownload = () => {
    if (!pdfBlob) return

    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `discharge-summary-${dischargeData?.patient?.name || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Discharge summary downloaded successfully",
    })
  }

  const handleClose = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }
    setPdfBlob(null)
    onClose()
  }

  const handlePrint = () => {
    if (!pdfUrl) return

    const iframeWindow = iframeRef.current?.contentWindow
    if (iframeWindow) {
      iframeWindow.focus()
      iframeWindow.print()
      return
    }

    const printWindow = window.open(pdfUrl)
    if (printWindow) {
      const onLoad = () => {
        printWindow.focus()
        printWindow.print()
      }
      try {
        if (printWindow.document?.readyState === 'complete') {
          onLoad()
        } else {
          printWindow.addEventListener('load', onLoad, { once: true })
        }
      } catch (_) {
        // noop
      }
    }
  }

  const isLoading = isLoadingVisit || isLoadingDischarge || isDownloading

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-[95%] sm:max-w-full md:max-w-[80%] lg:max-w-[70%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Discharge Summary
            {dischargeData?.patient?.name && (
              <span className="text-sm font-normal text-gray-500">
                - {dischargeData.patient.name}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading discharge summary...</p>
              </div>
            </div>
          ) : !visitData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-gray-500">No visit data found for this appointment</p>
              </div>
            </div>
                     ) : !dischargeData ? (
             <div className="flex items-center justify-center py-12">
               <div className="text-center">
                 <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
                 <p className="text-gray-500">No discharge summary available for this visit</p>
                 {dischargeError && (
                   <p className="text-sm text-red-500 mt-2">
                     Error: {dischargeError instanceof Error ? dischargeError.message : 'Unknown error'}
                   </p>
                 )}
               </div>
             </div>
          ) : (
            <div className="space-y-4">
              {/* PDF Preview */}
              {pdfUrl && (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-[600px]"
                    title="Discharge Summary Preview"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <Button
                  onClick={handleDownload}
                  disabled={!pdfBlob || isDownloading}
                  className="flex items-center gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download Discharge Summary
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={!pdfBlob || isDownloading}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Discharge Summary
                </Button>
              </div>

              {/* Summary Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Summary Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span> {dischargeData.patient?.name}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {new Date(dischargeData.appointment?.appointmentDate || '').toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Veterinarian:</span> Dr. {dischargeData.veterinarian?.firstName} {dischargeData.veterinarian?.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Clinic:</span> {dischargeData.clinic?.name}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
} 