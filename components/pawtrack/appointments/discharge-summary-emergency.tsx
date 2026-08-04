"use client"

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2, AlertCircle } from "lucide-react"
import { useGetDischargeSummaryEmergency } from "@/queries/discharge-summary/get-discharge-summary-emergency"
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
    emergencyNotes: {
      backgroundColor: '#fff0f0',
      padding: 8,
      borderLeft: '3 solid #ff0000',
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
    criticalAlert: {
      backgroundColor: '#ffeeee',
      padding: 10,
      marginBottom: 10,
      borderRadius: 4,
      border: '1 solid #ff0000',
    },
  })

  // Get visit data from appointment ID
  const { data: visitData, isLoading: isLoadingVisit } = useGetVisitByAppointmentId(
    appointmentId,
    isOpen
  )

  // Get discharge summary data
  const { data: dischargeData, isLoading: isLoadingDischarge, error: dischargeError } = useGetDischargeSummaryEmergency(
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
            <Text style={styles.title}>EMERGENCY DISCHARGE SUMMARY</Text>
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
                <Text style={styles.value}>{data.emergencyVitals?.weightKg || 'N/A'} kg</Text>
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

          {/* Emergency Triage Information */}
          {data.emergencyTriage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EMERGENCY TRIAGE</Text>
              <View style={styles.criticalAlert}>
                <View style={styles.row}>
                  <Text style={styles.label}>Arrival Time:</Text>
                  <Text style={styles.value}>{data.emergencyTriage.arrivalTime ? formatDate(data.emergencyTriage.arrivalTime) : 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Triage Level:</Text>
                  <Text style={styles.value}>{data.emergencyTriage.triageLevel || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Presenting Complaint:</Text>
                  <Text style={styles.value}>{data.emergencyTriage.presentingComplaint || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Pain Score:</Text>
                  <Text style={styles.value}>{data.emergencyTriage.painScore || 'N/A'}/10</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Reason for Emergency:</Text>
                  <Text style={styles.value}>{data.emergencyTriage.reasonForEmergency || 'N/A'}</Text>
                </View>
                {data.emergencyTriage.immediateInterventionRequired && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Immediate Intervention:</Text>
                    <Text style={styles.value}>Required</Text>
                  </View>
                )}
              </View>
              {data.emergencyTriage.initialNotes && (
                <View style={styles.emergencyNotes}>
                  <Text style={styles.label}>Initial Notes:</Text>
                  <Text>{data.emergencyTriage.initialNotes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Vital Signs */}
          {data.emergencyVitals && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VITAL SIGNS</Text>
              <View style={styles.vitalSigns}>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Temperature:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.temperatureC}°C</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Heart Rate:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.heartRateBpm} bpm</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Respiratory Rate:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.respiratoryRateBpm} bpm</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Blood Pressure:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.bloodPressure || 'N/A'}</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Mucous Membrane:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.mucousMembraneColor || 'N/A'}</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Capillary Refill:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.capillaryRefillTimeSec} sec</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Oxygen Saturation:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.oxygenSaturationSpo2}%</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Blood Glucose:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.bloodGlucoseMgDl} mg/dL</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Heart Rhythm:</Text>
                  <Text style={styles.value}>{data.emergencyVitals.heartRhythm || 'N/A'}</Text>
                </View>
              </View>
              {data.emergencyVitals.notes && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text>{data.emergencyVitals.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Emergency Procedures */}
          {data.emergencyProcedures && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EMERGENCY PROCEDURES</Text>
              <View style={styles.criticalAlert}>
                <View style={styles.row}>
                  <Text style={styles.label}>Procedure Time:</Text>
                  <Text style={styles.value}>{data.emergencyProcedures.procedureTime ? formatDate(data.emergencyProcedures.procedureTime) : 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Performed By:</Text>
                  <Text style={styles.value}>{data.emergencyProcedures.performedBy || 'N/A'}</Text>
                </View>
                {data.emergencyProcedures.ivCatheterPlacement && (
                  <View style={styles.row}>
                    <Text style={styles.label}>IV Catheter:</Text>
                    <Text style={styles.value}>Placed</Text>
                  </View>
                )}
                {data.emergencyProcedures.oxygenTherapy && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Oxygen Therapy:</Text>
                    <Text style={styles.value}>Administered</Text>
                  </View>
                )}
                {data.emergencyProcedures.fluidsType && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Fluids:</Text>
                    <Text style={styles.value}>{data.emergencyProcedures.fluidsType} - {data.emergencyProcedures.fluidsVolumeMl}ml at {data.emergencyProcedures.fluidsRateMlHr}ml/hr</Text>
                  </View>
                )}
              </View>
              {data.emergencyProcedures.medications && data.emergencyProcedures.medications.length > 0 && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Medications Given:</Text>
                  {data.emergencyProcedures.medications.map((med: any, index: number) => (
                    <Text key={index}>• {med.name} - {med.dose} ({med.route}) at {formatTime(med.time)}</Text>
                  ))}
                </View>
              )}
              {data.emergencyProcedures.responseToTreatment && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Response to Treatment:</Text>
                  <Text>{data.emergencyProcedures.responseToTreatment}</Text>
                </View>
              )}
              {data.emergencyProcedures.notes && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text>{data.emergencyProcedures.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Discharge Information */}
          {data.emergencyDischarges && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DISCHARGE INFORMATION</Text>
              <View style={styles.criticalAlert}>
                <View style={styles.row}>
                  <Text style={styles.label}>Discharge Status:</Text>
                  <Text style={styles.value}>{data.emergencyDischarges.dischargeStatus || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Discharge Time:</Text>
                  <Text style={styles.value}>{data.emergencyDischarges.dischargeTime ? formatDate(data.emergencyDischarges.dischargeTime) : 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Responsible Clinician:</Text>
                  <Text style={styles.value}>{data.emergencyDischarges.responsibleClinician || 'N/A'}</Text>
                </View>
              </View>
              {data.emergencyDischarges.dischargeSummary && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Discharge Summary:</Text>
                  <Text>{data.emergencyDischarges.dischargeSummary}</Text>
                </View>
              )}
              {data.emergencyDischarges.homeCareInstructions && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Home Care Instructions:</Text>
                  <Text>{data.emergencyDischarges.homeCareInstructions}</Text>
                </View>
              )}
              {data.emergencyDischarges.followupInstructions && (
                <View style={styles.notes}>
                  <Text style={styles.label}>Follow-up Instructions:</Text>
                  <Text>{data.emergencyDischarges.followupInstructions}</Text>
                </View>
              )}
            </View>
          )}

          {/* Prescriptions */}
          {data.emergencyDischarges?.prescriptions && data.emergencyDischarges.prescriptions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PRESCRIPTIONS</Text>
              {data.emergencyDischarges.prescriptions.map((prescription: any, index: number) => (
                <View key={index} style={styles.prescriptionItem}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Medication:</Text>
                    <Text style={styles.value}>{prescription.medicationName || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Dosage:</Text>
                    <Text style={styles.value}>{prescription.dose || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Frequency:</Text>
                    <Text style={styles.value}>{prescription.frequency || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Duration:</Text>
                    <Text style={styles.value}>{prescription.duration || 'N/A'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Follow-up Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FOLLOW-UP INSTRUCTIONS</Text>
            <View style={styles.notes}>
              <Text>Please monitor your pet closely for the next 24-48 hours.</Text>
              <Text>Watch for signs of worsening condition such as increased lethargy, loss of appetite, vomiting, or difficulty breathing.</Text>
              <Text>Contact the clinic immediately if you notice any concerning symptoms.</Text>
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
    link.download = `emergency-summary-${dischargeData?.patient?.name || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Emergency discharge summary downloaded successfully",
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
            Emergency Discharge Summary
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
                <p className="text-gray-500">Loading emergency discharge summary...</p>
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
                    title="Emergency Discharge Summary Preview"
                  />
                </div>
              )}

              {/* Download Button */}
              <div className="flex justify-center">
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
                  Download Emergency Summary
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
                    <span className="font-medium">Discharge Status:</span> {dischargeData.emergencyDischarges?.dischargeStatus || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Triage Level:</span> {dischargeData.emergencyTriage?.triageLevel || 'N/A'}
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
