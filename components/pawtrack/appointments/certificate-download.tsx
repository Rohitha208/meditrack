"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { 
  FileText, 
  Heart, 
  Shield, 
  Syringe, 
  Pill, 
  Bug, 
  Cross, 
  Handshake,
  Clock,
  XCircle,
  Search
} from "lucide-react"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { useGetClientById } from "@/queries/clients/get-client"
import { useGetClinicById } from "@/queries/clinic/get-clinic-by-id"
import { useGetUserById } from "@/queries/users/get-user-by-id"

// Import the generic Certificate component
import Certificate from "./certification/certificate"

interface CertificateDownloadProps {
  appointmentId: string
  patientId: string
  onClose: () => void
}

interface CertificateData {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  template: string
}

// Certificate types configuration
const certificateTypes: CertificateData[] = [
  {
    id: "fitness-travel",
    name: "Fitness Certificate for Travelling",
    description: "Certifies the pet is fit for travel and meets transportation requirements",
    icon: <Heart className="h-6 w-6" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
    template: "fitness-travel"
  },
  {
    id: "health-hostel",
    name: "Health Certificate for Hostel",
    description: "Confirms the pet is healthy and suitable for boarding facilities",
    icon: <Shield className="h-6 w-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    template: "health-hostel"
  },
  {
    id: "vaccination",
    name: "Vaccination Certificate",
    description: "Documents all vaccinations and immunization records",
    icon: <Syringe className="h-6 w-6" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    template: "vaccination"
  },
  {
    id: "deworming",
    name: "Deworming Certificate",
    description: "Certifies deworming treatment and parasite control",
    icon: <Pill className="h-6 w-6" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    template: "deworming"
  },
  {
    id: "tick-medicine",
    name: "Tick Medicine Certificate",
    description: "Documents tick prevention and treatment protocols",
    icon: <Bug className="h-6 w-6" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    template: "tick-medicine"
  },
  {
    id: "euthanasia",
    name: "Euthanasia Certificate",
    description: "Official documentation for humane euthanasia procedures",
    icon: <Cross className="h-6 w-6" />,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    template: "euthanasia"
  },
  {
    id: "consent-bond",
    name: "Consent Bond Certificate",
    description: "Legal consent documentation for veterinary procedures",
    icon: <Handshake className="h-6 w-6" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    template: "consent-bond"
  }
]

export default function CertificateDownload({ appointmentId, patientId, onClose }: CertificateDownloadProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch real data from APIs
  const { data: appointment, isLoading: isLoadingAppointment } = useGetAppointmentById(appointmentId)
  const { data: patient, isLoading: isLoadingPatient } = useGetPatientById(patientId)
  const { data: client, isLoading: isLoadingClient } = useGetClientById(appointment?.clientId || '')
  const { data: clinic, isLoading: isLoadingClinic } = useGetClinicById(appointment?.clinicId || '')
  const { data: veterinarian, isLoading: isLoadingVet } = useGetUserById(appointment?.veterinarianId || '')

  const handleCertificateSelect = (certificate: CertificateData) => {
    setSelectedCertificate(certificate)
  }

  const handleBackToSelection = () => {
    setSelectedCertificate(null)
  }

  // Filter certificates based on search query
  const filteredCertificates = certificateTypes.filter(certificate =>
    certificate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    certificate.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Render the appropriate certificate component based on selection (READ-ONLY MODE)
  const renderSelectedCertificate = () => {
    if (!selectedCertificate || !appointment || !patient || !client || !clinic || !veterinarian) {
      return (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-8 max-w-4xl mx-auto shadow-lg">
          <div className="text-center">
            <p className="text-gray-600">Loading certificate data...</p>
          </div>
        </div>
      )
    }

    return (
      <Certificate
        certificateName={`${selectedCertificate.name}`}
        appointmentId={appointmentId}
        patientId={patientId}
        onClose={handleBackToSelection}
        readOnly={true}
      />
    )
  }

  // Show loading state while fetching data
  if (isLoadingAppointment || isLoadingPatient || isLoadingClient || isLoadingClinic || isLoadingVet) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-6xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Download Certificates
            </SheetTitle>
          </SheetHeader>
          <div className="py-6 flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading appointment data...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[40%] lg:!max-w-[50%] overflow-hidden flex flex-col">
        {/* Sticky Header */}
        <SheetHeader className="border-b pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Download Certificates  
          </SheetTitle>
        </SheetHeader>

          {!selectedCertificate ? (
            // Certificate Selection View
            <div className="flex flex-col h-full">
              {/* Sticky Search Box */}
              <div className="flex-shrink-0 py-4 border-b bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search certificates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Scrollable Certificate Container - Half Screen */}
              <div className="overflow-y-auto py-4 max-h-[50vh]">
                <div className="space-y-4 pr-2">
                  {filteredCertificates.map((certificate) => (
                    <Card
                      key={certificate.id}
                      className="cursor-pointer hover:shadow-md transition-shadow duration-200 w-full"
                      onClick={() => handleCertificateSelect(certificate)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${certificate.bgColor}`}>
                            <div className={certificate.color}>
                              {certificate.icon}
                            </div>
                          </div>
                          <div>
                            <CardTitle className="text-sm">{certificate.name}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription className="text-xs">
                          {certificate.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}

                  {/* No results message */}
                  {filteredCertificates.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No certificates found matching your search.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Note: NO CHECKOUT BUTTON in download mode */}
            </div>
          ) : (
            // Certificate Preview and Download View
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedCertificate.name}</h2>
                  <p className="text-gray-600">{selectedCertificate.description}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleBackToSelection}
                  className="flex items-center"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Back to Selection
                </Button>
              </div>

              <div className="py-6">
                {renderSelectedCertificate()}
              </div>
            </>
          )}
        </SheetContent>
    </Sheet>
  )
}
