"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2, AlertCircle, Printer } from "lucide-react"
import { useGetDischargeSummarySurgery } from "@/queries/discharge-summary/get-discharge-summary-surgery"
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
    surgeryDetails: {
      border: '1 solid #ddd',
      padding: 8,
      marginBottom: 8,
      borderRadius: 4,
    },
    warning: {
      backgroundColor: '#fff3cd',
      padding: 8,
      borderLeft: '3 solid #ffc107',
      marginTop: 5,
    },
  })

  // Get visit data from appointment ID
  const { data: visitData, isLoading: isLoadingVisit } = useGetVisitByAppointmentId(
    appointmentId,
    isOpen
  )

  // Get discharge summary data
  const { data: dischargeData, isLoading: isLoadingDischarge, error: dischargeError } = useGetDischargeSummarySurgery(
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

  // Handle print functionality
  const handlePrint = () => {
    if (!pdfUrl) return

    const iframeWindow = iframeRef.current?.contentWindow
    if (iframeWindow) {
      iframeWindow.focus()
      iframeWindow.print()
      return
    }

    // Fallback to window.open if iframe method fails
    const printWindow = window.open(pdfUrl, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    } else {
      toast({
        title: "Error",
        description: "Could not open print dialog. Please try again.",
        variant: "destructive",
      })
    }
  }

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
            <Text style={styles.title}>SURGICAL DISCHARGE SUMMARY</Text>
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
                <Text style={styles.value}>{data.surgeryPreOp?.weightKg || 'N/A'} kg</Text>
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

          {/* Pre-Operative Information */}
          {data.surgeryPreOp && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PRE-OPERATIVE ASSESSMENT</Text>
              <View style={styles.surgeryDetails}>
                <View style={styles.row}>
                  <Text style={styles.label}>Weight:</Text>
                  <Text style={styles.value}>{data.surgeryPreOp.weightKg} kg</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Anesthesia Risk:</Text>
                  <Text style={styles.value}>{data.surgeryPreOp.anesthesiaRiskAssessment || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Fasting Status:</Text>
                  <Text style={styles.value}>{data.surgeryPreOp.fastingStatus || 'N/A'}</Text>
                </View>
                {data.surgeryPreOp.preOpBloodworkResults && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Bloodwork Results:</Text>
                    <Text style={styles.value}>{data.surgeryPreOp.preOpBloodworkResults}</Text>
                  </View>
                )}
                {data.surgeryPreOp.preOpMedications && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Pre-Op Medications:</Text>
                    <Text style={styles.value}>{data.surgeryPreOp.preOpMedications}</Text>
                  </View>
                )}
              </View>
              {data.surgeryPreOp.notes && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text>{data.surgeryPreOp.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Surgery Information */}
          {data.surgeryDetail && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SURGERY INFORMATION</Text>
              <View style={styles.surgeryDetails}>
                <View style={styles.row}>
                  <Text style={styles.label}>Surgery Type:</Text>
                  <Text style={styles.value}>{data.surgeryDetail.surgeryType || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Surgeon:</Text>
                  <Text style={styles.value}>{data.surgeryDetail.surgeon || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Anesthesiologist:</Text>
                  <Text style={styles.value}>{data.surgeryDetail.anesthesiologist || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Surgery Start:</Text>
                  <Text style={styles.value}>{data.surgeryDetail.surgeryStartTime ? formatDate(data.surgeryDetail.surgeryStartTime) + ' ' + formatTime(data.surgeryDetail.surgeryStartTime) : 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Surgery End:</Text>
                  <Text style={styles.value}>{data.surgeryDetail.surgeryEndTime ? formatDate(data.surgeryDetail.surgeryEndTime) + ' ' + formatTime(data.surgeryDetail.surgeryEndTime) : 'N/A'}</Text>
                </View>
                {data.surgeryDetail.anesthesiaProtocol && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Anesthesia Protocol:</Text>
                    <Text style={styles.value}>{data.surgeryDetail.anesthesiaProtocol}</Text>
                  </View>
                )}
                {data.surgeryDetail.surgicalFindings && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Surgical Findings:</Text>
                    <Text style={styles.value}>{data.surgeryDetail.surgicalFindings}</Text>
                  </View>
                )}
                {data.surgeryDetail.complications && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Complications:</Text>
                    <Text style={styles.value}>{data.surgeryDetail.complications}</Text>
                  </View>
                )}
              </View>
              {data.surgeryDetail.notes && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text>{data.surgeryDetail.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Post-Operative Information */}
          {data.surgeryPostOp && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>POST-OPERATIVE ASSESSMENT</Text>
              <View style={styles.surgeryDetails}>
                <View style={styles.row}>
                  <Text style={styles.label}>Recovery Status:</Text>
                  <Text style={styles.value}>{data.surgeryPostOp.recoveryStatus || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Pain Assessment:</Text>
                  <Text style={styles.value}>{data.surgeryPostOp.painAssessment || 'N/A'}</Text>
                </View>
                {data.surgeryPostOp.vitalSigns && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Vital Signs:</Text>
                    <Text style={styles.value}>{data.surgeryPostOp.vitalSigns}</Text>
                  </View>
                )}
                {data.surgeryPostOp.postOpMedications && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Post-Op Medications:</Text>
                    <Text style={styles.value}>{data.surgeryPostOp.postOpMedications}</Text>
                  </View>
                )}
                {data.surgeryPostOp.woundCare && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Wound Care:</Text>
                    <Text style={styles.value}>{data.surgeryPostOp.woundCare}</Text>
                  </View>
                )}
              </View>
              {data.surgeryPostOp.notes && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text>{data.surgeryPostOp.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Discharge Information */}
          {data.surgeryDischarge && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DISCHARGE INFORMATION</Text>
              <View style={styles.surgeryDetails}>
                <View style={styles.row}>
                  <Text style={styles.label}>Discharge Status:</Text>
                  <Text style={styles.value}>{data.surgeryDischarge.dischargeStatus || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Discharge Date/Time:</Text>
                  <Text style={styles.value}>{data.surgeryDischarge.dischargeDatetime ? formatDate(data.surgeryDischarge.dischargeDatetime) + ' ' + formatTime(data.surgeryDischarge.dischargeDatetime) : 'N/A'}</Text>
                </View>
              </View>
              {data.surgeryDischarge.homeCareInstructions && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Home Care Instructions:</Text>
                  <Text>{data.surgeryDischarge.homeCareInstructions}</Text>
                </View>
              )}
              {data.surgeryDischarge.medicationsToGoHome && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Medications to Go Home:</Text>
                  <Text>{data.surgeryDischarge.medicationsToGoHome}</Text>
                </View>
              )}
              {data.surgeryDischarge.followUpInstructions && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Follow-up Instructions:</Text>
                  <Text>{data.surgeryDischarge.followUpInstructions}</Text>
                </View>
              )}
            </View>
          )}

          {/* Home Care Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HOME CARE INSTRUCTIONS</Text>
            <View style={styles.warning}>
              <Text>1. Monitor the incision site for redness, swelling, discharge, or opening.</Text>
              <Text>2. Prevent licking or chewing at the incision - use an E-collar if necessary.</Text>
              <Text>3. Restrict activity as advised - no jumping, running, or stairs if indicated.</Text>
              <Text>4. Administer all medications as prescribed.</Text>
              <Text>5. Keep the incision clean and dry - no bathing until sutures are removed.</Text>
              <Text>6. Return for suture removal in 10-14 days, unless absorbable sutures were used.</Text>
            </View>
          </View>

          {/* Follow-up Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FOLLOW-UP INSTRUCTIONS</Text>
            <View style={styles.notes}>
              <Text>Schedule a follow-up appointment in _____ days for evaluation and/or suture removal.</Text>
              <Text>Call immediately if you notice any of the following:</Text>
              <Text>- Excessive pain, swelling, or redness at the incision site</Text>
              <Text>- Discharge or opening of the incision</Text>
              <Text>- Lethargy, lack of appetite, vomiting, or diarrhea</Text>
              <Text>- Difficulty breathing or collapse</Text>
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
    link.download = `surgery-summary-${dischargeData?.patient?.name || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Surgery discharge summary downloaded successfully",
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

  const isLoading = isLoadingVisit || isLoadingDischarge || isDownloading

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-[95%] sm:max-w-full md:max-w-[80%] lg:max-w-[70%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Surgery Discharge Summary
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
                <p className="text-gray-500">Loading surgery discharge summary...</p>
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
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-[600px]"
                    title="Surgery Discharge Summary Preview"
                  />
                </div>
              )}

              {/* Action Buttons */}
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
                  Download Surgery Summary
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
                  <div>
                    <span className="font-medium">Surgery Type:</span> {dischargeData.surgeryDetail?.surgeryType || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Discharge Status:</span> {dischargeData.surgeryDischarge?.dischargeStatus || 'N/A'}
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
