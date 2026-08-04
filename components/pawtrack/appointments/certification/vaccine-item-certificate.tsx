"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Syringe, Download, Printer, Clock, MapPin, Mail, Phone } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { useGetClientById } from "@/queries/clients/get-client"
import { useGetClinicById } from "@/queries/clinic/get-clinic-by-id"
import { useGetUserById } from "@/queries/users/get-user-by-id"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useGetVaccinationJsonByIds } from "@/queries/vaccinationDetail/get-vaccination-json-by-ids"
import { useGetVaccinationMasterById } from "@/queries/vaccinationMaster/get-vaccinationMaster-by-id"
import { Document, Page, Text, View } from "@react-pdf/renderer"
import { certificateStyles, downloadPDF, printPDF } from "./pdf-utils"

interface VaccineItemCertificateProps {
  appointmentId: string
  patientId: string
  vaccinationMasterId: string
  onClose: () => void
}

export default function VaccineItemCertificate({ appointmentId, patientId, vaccinationMasterId, onClose }: VaccineItemCertificateProps) {
  const { data: appointment, isLoading: isLoadingAppointment } = useGetAppointmentById(appointmentId)
  const { data: patient, isLoading: isLoadingPatient } = useGetPatientById(patientId)
  const { data: client, isLoading: isLoadingClient } = useGetClientById(appointment?.clientId || '')
  const { data: clinic, isLoading: isLoadingClinic } = useGetClinicById(appointment?.clinicId || '')
  const { data: veterinarian, isLoading: isLoadingVet } = useGetUserById(appointment?.veterinarianId || '')

  const { data: visit } = useGetVisitByAppointmentId(appointmentId)
  const { data: vaccineMaster } = useGetVaccinationMasterById(vaccinationMasterId)
  const { data: vaccinationJsonData } = useGetVaccinationJsonByIds(visit?.id || '', vaccinationMasterId)

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return ''
    try {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      const ageInYears = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      return ageInYears > 0 ? `${ageInYears} years` : 'Less than 1 year'
    } catch (e) {
      return ''
    }
  }

  const getClinicPlace = () => {
    const clinicName = clinic?.name || ''
    let city = ''
    if (clinic?.city) {
      city = clinic.city
    } else if (clinic?.address) {
      const addressParts = clinic.address.split(',').map((part: string) => part.trim())
      city = addressParts.length >= 2 ? addressParts[1] : addressParts[0] || ''
    }
    if (clinicName && city) return `${clinicName}, ${city}`
    if (clinicName) return clinicName
    if (city) return city
    return ''
  }

  const parsedVaccineJson = (() => {
    try {
      return vaccinationJsonData?.vaccinationJson ? JSON.parse(vaccinationJsonData.vaccinationJson) : {}
    } catch {
      return {}
    }
  })() as any

  const getVetDisplayName = () => {
    if (!veterinarian) return 'N/A'
    return `Dr. ${veterinarian.firstName || ''} ${veterinarian.lastName || ''}`.trim() || 'N/A'
  }

  const getOwnerDisplayName = () => {
    if (!client) return 'N/A'
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'N/A'
  }

  const getPatientDisplayName = () => {
    if (!patient) return 'N/A'
    if (patient.name) return patient.name
    if (patient.patientId) return patient.patientId
    if (patient.firstName || patient.lastName) {
      return `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
    }
    return `Patient (ID: ${patient.id.substring(0, 8)}...)`
  }

  const handlePrint = async () => {
    if (!appointment || !patient || !client || !clinic || !veterinarian) {
      toast({ title: "Error", description: "Certificate data not available", variant: "destructive" })
      return
    }

    const PDF = () => (
      <Document>
        <Page size="A4" style={certificateStyles.page}>
          <View style={certificateStyles.header}>
            <Text style={certificateStyles.clinicName}>{clinic.name}</Text>
            <Text style={certificateStyles.clinicTagline}>{clinic.tagline || "Professional Veterinary Care"}</Text>
          </View>

          <Text style={certificateStyles.title}>VACCINATION CERTIFICATE (Single Vaccine)</Text>

          <Text style={certificateStyles.sectionTitle}>Pet & Owner Details:</Text>
          <View style={certificateStyles.detailsGrid}>
            <View style={certificateStyles.detailsColumn}>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Pet Name:</Text><Text style={certificateStyles.detailValue}>{getPatientDisplayName()}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Owner Name:</Text><Text style={certificateStyles.detailValue}>{getOwnerDisplayName()}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Species:</Text><Text style={certificateStyles.detailValue}>{patient.species || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Age:</Text><Text style={certificateStyles.detailValue}>{calculateAge(patient.dateOfBirth)}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Weight:</Text><Text style={certificateStyles.detailValue}>{patient.weightKg || ''}Kg</Text></View>
            </View>
            <View style={certificateStyles.vetSection}>
              <Text style={certificateStyles.sectionTitle}>Vet. Stamp & Sign:</Text>
              <View style={certificateStyles.vetStamp}></View>
              <View style={certificateStyles.signatureLine}></View>
              <Text style={certificateStyles.vetName}>{getVetDisplayName()}</Text>
            </View>
          </View>

          <Text style={{ ...certificateStyles.sectionTitle, marginTop: 10 }}>Vaccination Details:</Text>
          <View style={certificateStyles.detailsGrid}>
            <View style={certificateStyles.detailsColumn}>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Vaccine:</Text><Text style={certificateStyles.detailValue}>{vaccineMaster?.disease || 'N/A'}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Type:</Text><Text style={certificateStyles.detailValue}>{vaccineMaster?.vaccineType || 'N/A'}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Next Due:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.nextDueDate ? new Date(parsedVaccineJson.nextDueDate).toLocaleDateString() : ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Batch No.:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.batchNumber || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Manufacturer:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.manufacturer || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Dose Volume:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.doseVolume || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Route:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.route || ''}</Text></View>
            </View>
          </View>

          <View style={certificateStyles.datePlace}>
            <View>
              <View style={certificateStyles.datePlaceItem}>
                <Text style={certificateStyles.datePlaceLabel}>Date:</Text>
                <Text style={certificateStyles.datePlaceValue}>{appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
              </View>
              <View style={certificateStyles.datePlaceItem}>
                <Text style={certificateStyles.datePlaceLabel}>Place:</Text>
                <Text style={certificateStyles.datePlaceValue}>{getClinicPlace()}</Text>
              </View>
            </View>
          </View>

          <View style={certificateStyles.footer}>
            {clinic.address && (<View style={certificateStyles.footerItem}><Text style={certificateStyles.footerText}>{clinic.address}</Text></View>)}
            {clinic.email && (<View style={certificateStyles.footerItem}><Text style={certificateStyles.footerText}>{clinic.email}</Text></View>)}
            {clinic.phone && (<View style={certificateStyles.footerItem}><Text style={certificateStyles.footerText}>{clinic.phone}</Text></View>)}
          </View>
        </Page>
      </Document>
    )

    await printPDF(
      <PDF />,
      () => toast({ title: "Success", description: "Vaccination certificate printed" }),
      () => toast({ title: "Error", description: "Failed to print certificate", variant: "destructive" })
    )
  }

  const handleDownload = async () => {
    if (!appointment || !patient || !client || !clinic || !veterinarian) {
      toast({ title: "Error", description: "Certificate data not available", variant: "destructive" })
      return
    }

    const PDF = () => (
      <Document>
        <Page size="A4" style={certificateStyles.page}>
          <View style={certificateStyles.header}>
            <Text style={certificateStyles.clinicName}>{clinic.name}</Text>
            <Text style={certificateStyles.clinicTagline}>{clinic.tagline || "Professional Veterinary Care"}</Text>
          </View>

          <Text style={certificateStyles.title}>VACCINATION CERTIFICATE (Single Vaccine)</Text>

          <Text style={certificateStyles.sectionTitle}>Pet & Owner Details:</Text>
          <View style={certificateStyles.detailsGrid}>
            <View style={certificateStyles.detailsColumn}>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Pet Name:</Text><Text style={certificateStyles.detailValue}>{getPatientDisplayName()}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Owner Name:</Text><Text style={certificateStyles.detailValue}>{getOwnerDisplayName()}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Species:</Text><Text style={certificateStyles.detailValue}>{patient.species || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Age:</Text><Text style={certificateStyles.detailValue}>{calculateAge(patient.dateOfBirth)}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Weight:</Text><Text style={certificateStyles.detailValue}>{patient.weightKg || ''}Kg</Text></View>
            </View>
            <View style={certificateStyles.vetSection}>
              <Text style={certificateStyles.sectionTitle}>Vet. Stamp & Sign:</Text>
              <View style={certificateStyles.vetStamp}></View>
              <View style={certificateStyles.signatureLine}></View>
              <Text style={certificateStyles.vetName}>{getVetDisplayName()}</Text>
            </View>
          </View>

          <Text style={{ ...certificateStyles.sectionTitle, marginTop: 10 }}>Vaccination Details:</Text>
          <View style={certificateStyles.detailsGrid}>
            <View style={certificateStyles.detailsColumn}>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Vaccine:</Text><Text style={certificateStyles.detailValue}>{vaccineMaster?.disease || 'N/A'}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Type:</Text><Text style={certificateStyles.detailValue}>{vaccineMaster?.vaccineType || 'N/A'}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Next Due:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.nextDueDate ? new Date(parsedVaccineJson.nextDueDate).toLocaleDateString() : ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Batch No.:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.batchNumber || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Manufacturer:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.manufacturer || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Dose Volume:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.doseVolume || ''}</Text></View>
              <View style={certificateStyles.detailRow}><Text style={certificateStyles.detailLabel}>Route:</Text><Text style={certificateStyles.detailValue}>{parsedVaccineJson?.route || ''}</Text></View>
            </View>
          </View>

          <View style={certificateStyles.datePlace}>
            <View>
              <View style={certificateStyles.datePlaceItem}>
                <Text style={certificateStyles.datePlaceLabel}>Date:</Text>
                <Text style={certificateStyles.datePlaceValue}>{appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
              </View>
              <View style={certificateStyles.datePlaceItem}>
                <Text style={certificateStyles.datePlaceLabel}>Place:</Text>
                <Text style={certificateStyles.datePlaceValue}>{getClinicPlace()}</Text>
              </View>
            </View>
          </View>

          <View style={certificateStyles.footer}>
            {clinic.address && (<View style={certificateStyles.footerItem}><Text style={certificateStyles.footerText}>{clinic.address}</Text></View>)}
            {clinic.email && (<View style={certificateStyles.footerItem}><Text style={certificateStyles.footerText}>{clinic.email}</Text></View>)}
            {clinic.phone && (<View style={certificateStyles.footerItem}><Text style={certificateStyles.footerText}>{clinic.phone}</Text></View>)}
          </View>
        </Page>
      </Document>
    )

    await downloadPDF(
      <PDF />,
      `vaccination-${vaccineMaster?.disease || 'vaccine'}-${getPatientDisplayName()}-${new Date().toISOString().split('T')[0]}.pdf`,
      () => toast({ title: "Success", description: "Vaccination certificate downloaded" }),
      () => toast({ title: "Error", description: "Failed to download certificate", variant: "destructive" })
    )
  }

  if (isLoadingAppointment || isLoadingPatient || isLoadingClient || isLoadingClinic || isLoadingVet) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <Syringe className="h-5 w-5 mr-2" />
              Vaccination Certificate
            </SheetTitle>
          </SheetHeader>
          <div className="py-6 flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading certificate data...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Syringe className="h-5 w-5 mr-2" />
            Vaccination Certificate - {vaccineMaster?.disease || "Vaccine"}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-8 max-w-4xl mx-auto shadow-lg">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-blue-600 mb-1">{clinic?.name}</h1>
              <p className="text-sm text-gray-600">{clinic?.tagline || "Professional Veterinary Care"}</p>
            </div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-blue-600 underline decoration-2 underline-offset-4">
                VACCINATION CERTIFICATE
              </h2>
              <p className="mt-2 text-gray-700">Single vaccine issuance for {getPatientDisplayName()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-2">
                <div><span className="font-semibold">Pet Name:</span> {getPatientDisplayName()}</div>
                <div><span className="font-semibold">Owner Name:</span> {getOwnerDisplayName()}</div>
                <div><span className="font-semibold">Species:</span> {patient?.species || ''}</div>
                <div><span className="font-semibold">Age:</span> {calculateAge(patient?.dateOfBirth)}</div>
                <div><span className="font-semibold">Weight:</span> {patient?.weightKg || ''}Kg</div>
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-gray-900 mb-4">Vet. Stamp & Sign:</h3>
                <div className="border-2 border-gray-300 rounded-lg p-4 h-32 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Veterinary Stamp</p>
                  </div>
                </div>
                <div className="border-b-2 border-gray-400 w-32 ml-auto mb-2"></div>
                <p className="text-sm font-semibold text-blue-600">{getVetDisplayName()}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Vaccination Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="font-semibold">Vaccine:</span> {vaccineMaster?.disease || 'N/A'}</div>
                <div><span className="font-semibold">Type:</span> {vaccineMaster?.vaccineType || 'N/A'}</div>
                <div><span className="font-semibold">Next Due:</span> {parsedVaccineJson?.nextDueDate ? new Date(parsedVaccineJson.nextDueDate).toLocaleDateString() : ''}</div>
                <div><span className="font-semibold">Batch No.:</span> {parsedVaccineJson?.batchNumber || ''}</div>
                <div><span className="font-semibold">Manufacturer:</span> {parsedVaccineJson?.manufacturer || ''}</div>
                <div><span className="font-semibold">Dose Volume:</span> {parsedVaccineJson?.doseVolume || ''}</div>
                <div><span className="font-semibold">Route:</span> {parsedVaccineJson?.route || ''}</div>
              </div>
            </div>

            <div className="flex justify-between items-end mb-6">
              <div>
                <p><span className="font-semibold">Date:</span> {appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                <p><span className="font-semibold">Place:</span> {getClinicPlace()}</p>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-4">
              <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-600">
                {clinic?.address && (<div className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{clinic.address}</div>)}
                {clinic?.email && (<div className="flex items-center"><Mail className="h-4 w-4 mr-1" />{clinic.email}</div>)}
                {clinic?.phone && (<div className="flex items-center"><Phone className="h-4 w-4 mr-1" />{clinic.phone}</div>)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" onClick={handleDownload} className="flex items-center"><Download className="h-4 w-4 mr-2" />Download</Button>
            <Button variant="outline" onClick={handlePrint} className="flex items-center"><Printer className="h-4 w-4 mr-2" />Print</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
