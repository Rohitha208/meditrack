import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Download,
  Clock,
  Printer,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useGetPatientById } from "@/queries/patients/get-patient-by-id";
import { useGetClientById } from "@/queries/clients/get-client";
import { useGetClinicById } from "@/queries/clinic/get-clinic-by-id";
import { useGetUserById } from "@/queries/users/get-user-by-id";
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { certificateStyles, downloadPDF, printPDF } from './pdf-utils';
import { useCreateCertificate, Certificate } from "@/queries/certificate/create-certificate";
import { useGetCertificateTypes, CertificateType } from "@/queries/certificateType/get-certificate-type";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetCertificateByVisitId } from "@/queries/certificate/get-certificate-by-visit-id";
import { useUpdateCertificate } from "@/queries/certificate/update-certificate";
import { CertificateConfig } from "@/utils/certificate-configs";

interface GenericCertificateSheetProps {
  config: CertificateConfig;
  appointmentId: string;
  patientId: string;
  onClose: () => void;
  readOnly?: boolean;
  onCertificateCreated?: (certificateName: string) => void;
}

export default function GenericCertificateSheet({
  config,
  appointmentId,
  patientId,
  onClose,
  readOnly = false,
  onCertificateCreated,
}: GenericCertificateSheetProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [petDescription, setPetDescription] = useState(config.initialPetDescription)
  const [petWeight, setPetWeight] = useState("")
  const [petPlace, setPetPlace] = useState("")
  const [certificateTypeId, setCertificateTypeId] = useState<string | undefined>(undefined)

  // Fetch real data from APIs
  const { data: appointment, isLoading: isLoadingAppointment } = useGetAppointmentById(appointmentId)
  const { data: patient, isLoading: isLoadingPatient } = useGetPatientById(patientId)
  const { data: client, isLoading: isLoadingClient } = useGetClientById(appointment?.clientId || "")
  const { data: clinic, isLoading: isLoadingClinic } = useGetClinicById(appointment?.clinicId || "")
  const { data: veterinarian, isLoading: isLoadingVet } = useGetUserById(appointment?.veterinarianId || "")

  // Certificate API hooks
  const { mutateAsync: createCertificate } = useCreateCertificate()
  const { data: visit, isLoading: isLoadingVisit } = useGetVisitByAppointmentId(appointmentId)
  const {
    data: certificateData,
    isLoading: isLoadingCertificate,
    refetch: refetchCertificates,
  } = useGetCertificateByVisitId(visit?.id)
  const { mutateAsync: updateCertificate } = useUpdateCertificate()
  const { data: certificateTypes, isLoading: isLoadingCertificateTypes } = useGetCertificateTypes()

  // Find the specific Certificate Type ID
  useEffect(() => {
    if (certificateTypes) {
      const foundType = certificateTypes.find((type: CertificateType) => type.name === config.name)
      if (foundType) {
        setCertificateTypeId(foundType.id)
      }
    }
  }, [certificateTypes, config.name])

  useEffect(() => {
    if (certificateData && certificateData.length > 0) {
      const allCertificates = certificateData.flatMap((item: any) => {
        if (item.certificates && Array.isArray(item.certificates)) {
          return item.certificates;
        }
        return [item];
      });

      let matchingCertificates: any[] = [];

      if (certificateTypeId) {
        matchingCertificates = allCertificates.filter((cert) => cert.certificateTypeId === certificateTypeId);
      } else if (certificateTypes) {
        const foundType = certificateTypes.find((type: CertificateType) => type.name === config.name);
        if (foundType) {
          matchingCertificates = allCertificates.filter((cert) => cert.certificateTypeId === foundType.id);
        }
      }
      if (matchingCertificates.length === 0) {
        setPetDescription(config.initialPetDescription || '')
        setPetWeight('')
        setPetPlace('')
        setIsSaved(false)
        return
      }

      if (matchingCertificates.length > 0) {
        const latestCertificate = matchingCertificates.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt).getTime()
          const dateB = new Date(b.updatedAt || b.createdAt).getTime()
          return dateB - dateA
        })[0]

        try {
          const jsonString = latestCertificate.certificateJson

          if (jsonString) {
            const parsedData = JSON.parse(jsonString)

            if (parsedData.petDescription !== undefined && parsedData.petDescription !== null) {
              setPetDescription(parsedData.petDescription)
            }
            if (parsedData.petWeight !== undefined && parsedData.petWeight !== null) {
              setPetWeight(parsedData.petWeight)
            }
            if (parsedData.petPlace !== undefined && parsedData.petPlace !== null) {
              setPetPlace(parsedData.petPlace)
            }

            setIsSaved(true)
          }
        } catch (e) {
          console.error("Error parsing certificate JSON:", e)
        }
      }
    }
  }, [certificateData, certificateTypeId, certificateTypes, config.name])

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return ""
    try {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      const ageInYears = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      return ageInYears > 0 ? `${ageInYears} years` : "Less than 1 year"
    } catch (e) {
      return ""
    }
  }

  // Get clinic name + city for place field
  const getClinicPlace = () => {
    const clinicName = clinic?.name || ""
    let city = ""

    if (clinic?.city) {
      city = clinic.city
    } else if (clinic?.address) {
      const addressParts = clinic.address.split(",").map((part: string) => part.trim())
      city = addressParts.length >= 2 ? addressParts[1] : addressParts[0] || ""
    }

    if (clinicName && city) {
      return `${clinicName}, ${city}`
    } else if (clinicName) {
      return clinicName
    } else if (city) {
      return city
    }

    return ""
  }

  // Helper function to get patient display name
  const getPatientDisplayName = () => {
    if (!patient) return "N/A"
    if (patient.name) return patient.name
    if (patient.patientId) return patient.patientId
    if (patient.firstName || patient.lastName) {
      return `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
    }
    return `Patient (ID: ${patient.id.substring(0, 8)}...)`
  }

  // Helper function to get owner display name
  const getOwnerDisplayName = () => {
    if (!client) return "N/A"
    return `${client.firstName || ""} ${client.lastName || ""}`.trim() || "N/A"
  }

  // Helper function to get veterinarian display name
  const getVetDisplayName = () => {
    if (!veterinarian) return "N/A"
    return `Dr. ${veterinarian.firstName || ""} ${veterinarian.lastName || ""}`.trim() || "N/A"
  }

  // 🔹 helper: build merged certificates safely
  const buildCertificatesArray = async (): Promise<Certificate[]> => {
    if (!certificateTypeId) return []

    // ✅ Always refetch to avoid stale data
    const { data: latestCertificates = [] } = await refetchCertificates()

    const serverCertificates: Certificate[] = Array.isArray(latestCertificates)
      ? latestCertificates
        .filter((c) => c?.certificateTypeId && c?.certificateJson)
        .map((c) => ({
          certificateTypeId: c.certificateTypeId,
          certificateJson: c.certificateJson,
        }))
      : []

    const currentCertificate: Certificate = {
      certificateTypeId,
      certificateJson: JSON.stringify({
        petDescription,
        petWeight,
        petPlace,
        appointmentId,
        patientId,
        ownerName: getOwnerDisplayName(),
        petName: getPatientDisplayName(),
        vetName: getVetDisplayName(),
        vetRegistration: veterinarian?.registrationNumber,
        vetQualification: veterinarian?.qualification,
        clinicName: clinic?.name,
        clinicAddress: clinic?.address,
        date: appointment?.appointmentDate || new Date().toISOString(),
      }),
    }

    const index = serverCertificates.findIndex((c) => c.certificateTypeId === certificateTypeId)

    if (index >= 0) {
      serverCertificates[index] = currentCertificate
    } else {
      serverCertificates.push(currentCertificate)
    }

    return serverCertificates
  }

  // Determine if any certificates exist for this visit
  const hasExistingCertificates = () => {
    return Array.isArray(certificateData) && certificateData && certificateData.length > 0
  }

  const saveCertificateToBackend = async (): Promise<boolean> => {
    if (!visit?.id || !certificateTypeId) {
      toast({
        title: "Error",
        description: "Missing visit or certificate type",
        variant: "destructive",
      })
      return false
    }

    try {
      const mergedCertificates = await buildCertificatesArray()

      if (!mergedCertificates.length) {
        throw new Error("No valid certificates to save")
      }

      // 🔥 Decide POST vs PUT correctly
      const isFirstCertificate = !Array.isArray(certificateData) || certificateData.length === 0

      if (isFirstCertificate) {
        await createCertificate({
          visitId: visit.id,
          certificates: mergedCertificates,
        })

        toast({
          title: "Saved",
          description: config.toastMessages.saved,
        })
      } else {
        await updateCertificate({
          visitId: visit.id,
          certificates: mergedCertificates,
        })

        toast({
          title: "Updated",
          description: config.toastMessages.updated,
        })
      }

      await refetchCertificates()
      setIsSaved(true)
      return true
    } catch (error: any) {
      console.error("Save certificate error:", error)
      toast({
        title: "Error",
        description: error?.message || config.toastMessages.failedToSave,
        variant: "destructive",
      })
      return false
    }
  }

  const handlePrintCertificate = async () => {
    if (!appointment || !patient || !client || !clinic || !veterinarian) {
      toast({
        title: "Error",
        description: "Certificate data not available",
        variant: "destructive",
      })
      return
    }

    try {
      setIsGenerating(true)

      // First save the certificate to backend
      const saved = await saveCertificateToBackend()

      if (!saved) {
        setIsGenerating(false)
        return
      }

      // Then print
      await printPDF(
        renderCertificatePDF(),
        () => {
          toast({
            title: "Success",
            description: config.toastMessages.printed,
          })
          onCertificateCreated?.(config.name)
        },
        (error) => {
          toast({
            title: "Error",
            description: config.toastMessages.failedToPrint,
            variant: "destructive",
          })
        },
      )
    } catch (error) {
      toast({
        title: "Error",
        description: config.toastMessages.failedToPrint,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadCertificate = async () => {
    if (!appointment || !patient || !client || !clinic || !veterinarian) {
      toast({
        title: "Error",
        description: "Certificate data not available",
        variant: "destructive",
      })
      return
    }

    try {
      setIsGenerating(true)

      // First save the certificate to backend
      const saved = await saveCertificateToBackend()

      if (!saved) {
        setIsGenerating(false)
        return
      }

      // Then download
      await downloadPDF(
        renderCertificatePDF(),
        `${config.name.toLowerCase().replace(/ /g, "-")}-${getPatientDisplayName()}-${new Date().toISOString().split("T")[0]}.pdf`,
        () => {
          toast({
            title: "Success",
            description: config.toastMessages.downloaded,
          })
          onCertificateCreated?.(config.name)
        },
        (error) => {
          toast({
            title: "Error",
            description: config.toastMessages.failedToDownload,
            variant: "destructive",
          })
        },
      )
    } catch (error) {
      toast({
        title: "Error",
        description: config.toastMessages.failedToDownload,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const renderCertificatePDF = () => (
    <Document>
      <Page size="A4" style={certificateStyles.page}>
        {/* Header */}
        <View style={certificateStyles.header}>
          <Text style={certificateStyles.clinicName}>{clinic?.name}</Text>
          <Text style={certificateStyles.clinicTagline}>{clinic?.tagline || "Professional Veterinary Care"}</Text>
        </View>

        {/* Title */}
        <Text style={certificateStyles.title}>{config.title}</Text>

        {/* Main Content */}
        <Text style={certificateStyles.content}>
          {config.certificationText
            .replace("{getPatientDisplayName()}", getPatientDisplayName())
            .replace("{getOwnerDisplayName()}", getOwnerDisplayName())}
        </Text>

        {/* Pet Description */}
        <Text style={certificateStyles.sectionTitle}>Pet Description:</Text>
        <Text style={certificateStyles.petDescription}>{petDescription}</Text>

        {/* Details Grid */}
        <View style={certificateStyles.detailsGrid}>
          {/* Left Column - Pet Details */}
          <View style={certificateStyles.detailsColumn}>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Pet Name:</Text>
              <Text style={certificateStyles.detailValue}>{getPatientDisplayName()}</Text>
            </View>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Owner Name:</Text>
              <Text style={certificateStyles.detailValue}>{getOwnerDisplayName()}</Text>
            </View>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Species:</Text>
              <Text style={certificateStyles.detailValue}>{patient?.species || ""}</Text>
            </View>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Gender:</Text>
              <Text style={certificateStyles.detailValue}>{patient?.gender || ""}</Text>
            </View>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Primary Breed:</Text>
              <Text style={certificateStyles.detailValue}>{patient?.breed || ""}</Text>
            </View>
            {patient?.secondaryBreed && (
              <View style={certificateStyles.detailRow}>
                <Text style={certificateStyles.detailLabel}>Secondary Breed:</Text>
                <Text style={certificateStyles.detailValue}>{patient?.secondaryBreed}</Text>
              </View>
            )}
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Age:</Text>
              <Text style={certificateStyles.inputValue}>{calculateAge(patient?.dateOfBirth || "")}</Text>
            </View>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Weight:</Text>
              <Text style={certificateStyles.inputValue}>{patient?.weightKg || ""}Kg</Text>
            </View>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Color:</Text>
              <Text style={certificateStyles.detailValue}>{patient?.color || ""}</Text>
            </View>
            <View style={certificateStyles.detailRow}>
              <Text style={certificateStyles.detailLabel}>Microchip ID:</Text>
              <Text style={certificateStyles.inputValue}>{patient?.microchipNumber || ""}</Text>
            </View>
          </View>

          {/* Right Column - Vet Section */}
          <View style={certificateStyles.vetSection}>
            <Text style={certificateStyles.sectionTitle}>Vet. Stamp & Sign:</Text>
            <View style={certificateStyles.vetStamp}></View>
            <View style={certificateStyles.signatureLine}></View>
            <Text style={certificateStyles.vetName}>{getVetDisplayName()}</Text>
          </View>
        </View>

        {/* Date and Place */}
        <View style={certificateStyles.datePlace}>
          <View>
            <View style={certificateStyles.datePlaceItem}>
              <Text style={certificateStyles.datePlaceLabel}>Date:</Text>
              <Text style={certificateStyles.datePlaceValue}>
                {appointment?.appointmentDate
                  ? new Date(appointment.appointmentDate).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </Text>
            </View>
            <View style={certificateStyles.datePlaceItem}>
              <Text style={certificateStyles.datePlaceLabel}>Place:</Text>
              <Text style={certificateStyles.datePlaceValue}>{petPlace || getClinicPlace()}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={certificateStyles.footer}>
          {clinic?.address && (
            <View style={certificateStyles.footerItem}>
              <Text style={certificateStyles.footerText}>{clinic.address}</Text>
            </View>
          )}
          {clinic?.email && (
            <View style={certificateStyles.footerItem}>
              <Text style={certificateStyles.footerText}>{clinic.email}</Text>
            </View>
          )}
          {clinic?.phone && (
            <View style={certificateStyles.footerItem}>
              <Text style={certificateStyles.footerText}>{clinic.phone}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )

  const renderCertificatePreview = () => {
    if (!appointment || !patient || !client || !clinic || !veterinarian || !visit?.id) {
      return (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-8 max-w-4xl mx-auto shadow-lg">
          <div className="text-center">
            <p className="text-gray-600">Loading certificate data...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 max-w-4xl mx-auto shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600 mb-1">{clinic?.name}</h1>
          <p className="text-sm text-gray-600">{clinic?.tagline || "Professional Veterinary Care"}</p>
        </div>

        {/* Certificate Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-600 underline decoration-2 underline-offset-4">{config.title}</h2>
        </div>

        {/* Main Certificate Content */}
        <div className="mb-8">
          <p className="text-lg leading-relaxed text-gray-800 mb-6">
            {config.certificationText
              .replace("{getPatientDisplayName()}", getPatientDisplayName())
              .replace("{getOwnerDisplayName()}", getOwnerDisplayName())}
          </p>
        </div>

        {/* Pet Description - Editable */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Pet Description:</h3>
          <textarea
            value={petDescription}
            onChange={(e) => setPetDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter pet description..."
            readOnly={readOnly}
          />
        </div>

        {/* Pet and Owner Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <div>
              <span className="font-semibold">Pet Name:</span> {getPatientDisplayName()}
            </div>
            <div>
              <span className="font-semibold">Owner Name:</span> {getOwnerDisplayName()}
            </div>
            <div>
              <span className="font-semibold">Species:</span> {patient?.species || ""}
            </div>
            <div>
              <span className="font-semibold">Gender:</span> {patient?.gender || ""}
            </div>
            <div>
              <span className="font-semibold">Primary Breed:</span> {patient?.breed || ""}
            </div>
            {patient?.secondaryBreed && (
              <div>
                <span className="font-semibold">Secondary Breed:</span> {patient.secondaryBreed}
              </div>
            )}
            <div>
              <span className="font-semibold">Age:</span> {calculateAge(patient?.dateOfBirth || "")}
            </div>
            <div>
              <span className="font-semibold">Weight:</span>{" "}
              {petWeight || (patient?.weightKg ? `${patient.weightKg} kg` : "Not specified")}
            </div>
            <div>
              <span className="font-semibold">Color:</span> {patient?.color || ""}
            </div>
            <div>
              <span className="font-semibold">Microchip ID:</span> {patient?.microchipNumber || ""}
            </div>
          </div>

          {/* Vet Stamp & Sign Section */}
          <div className="text-right">
            <h3 className="font-semibold text-gray-900 mb-4">Vet. Stamp & Sign:</h3>
            <div className="border-2 border-gray-300 rounded-lg p-4 h-32 flex items-center justify-center mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Veterinary Stamp</p>
              </div>
            </div>
            <div className="border-b-2 border-gray-400 w-32 mx-auto mb-2"></div>
            <p className="text-sm font-semibold text-blue-600">{getVetDisplayName()}</p>
          </div>
        </div>

        {/* Date and Place */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <p>
              <span className="font-semibold">Date:</span>{" "}
              {appointment?.appointmentDate
                ? new Date(appointment.appointmentDate).toLocaleDateString()
                : new Date().toLocaleDateString()}
            </p>
            <p>
              <span className="font-semibold">Place:</span> {getClinicPlace()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-600">
            {clinic?.address && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {clinic.address}
              </div>
            )}
            {clinic?.email && (
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                {clinic.email}
              </div>
            )}
            {clinic?.phone && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                {clinic.phone}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while fetching data
  if (
    isLoadingAppointment ||
    isLoadingPatient ||
    isLoadingClient ||
    isLoadingClinic ||
    isLoadingVet ||
    isLoadingVisit
  ) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-6xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <config.icon className="h-5 w-5 mr-2" />
              {config.name}
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
      <SheetContent className="w-full sm:max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <config.icon className="h-5 w-5 mr-2" />
            {config.name}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="mb-6">{renderCertificatePreview()}</div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadCertificate}
              className="flex items-center bg-transparent"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Download"}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrintCertificate}
              className="flex items-center bg-transparent"
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Print"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
