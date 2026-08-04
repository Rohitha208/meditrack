"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface HealthCertificateModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface HealthCertificateFormData {
  certificateType: string
  destinationCountry: string
  travelDate: string
  vaccinations: string[]
  microchipVerified: boolean
  certNumber: string
  expirationDate: string
  certifyingVet: string
  certificationDate: string
  ownerConsent: boolean
  notes: string
}

export default function HealthCertificateModal({ open, onClose, patientId, appointmentId, procedureId }: HealthCertificateModalProps) {
  const [formData, setFormData] = useState<HealthCertificateFormData>({
    certificateType: "",
    destinationCountry: "",
    travelDate: "",
    vaccinations: [],
    microchipVerified: false,
    certNumber: "",
    expirationDate: "",
    certifyingVet: "",
    certificationDate: new Date().toISOString().slice(0, 10),
    ownerConsent: false,
    notes: ""
  })
  
  // Get visit data from appointment ID
  const { data: visitData } = useGetVisitByAppointmentId(appointmentId)
  const [formInitialized, setFormInitialized] = useState(false)

  // Get procedure documentation details using visit ID and procedure ID
  const { data: procedureDocumentDetails, isLoading } = useProcedureDocumentDetails(
    visitData?.id,
    procedureId,
    !!visitData?.id && !!procedureId && open
  )

  // Get update mutation
  const updateDocumentMutation = useUpdateProcedureDocumentDetails()

  // Populate form with existing data when available
  useEffect(() => {
    if (procedureDocumentDetails && procedureDocumentDetails.documentDetails) {
      try {
        const parsedDetails = JSON.parse(procedureDocumentDetails.documentDetails)
        console.log("Loaded procedure documentation details:", parsedDetails)
        
        // Create a new form data object with the parsed details
        const newFormData = {
          certificateType: parsedDetails.certificateType || "",
          destinationCountry: parsedDetails.destinationCountry || "",
          // Ensure array values
          vaccinations: Array.isArray(parsedDetails.vaccinations) ? parsedDetails.vaccinations : [],
          // Ensure date values are correctly formatted
          travelDate: parsedDetails.travelDate || "",
          certificationDate: parsedDetails.certificationDate || new Date().toISOString().slice(0, 10),
          expirationDate: parsedDetails.expirationDate || "",
          // Ensure boolean values for checkboxes
          microchipVerified: !!parsedDetails.microchipVerified,
          ownerConsent: !!parsedDetails.ownerConsent,
          certNumber: parsedDetails.certNumber || "",
          certifyingVet: parsedDetails.certifyingVet || "",
          notes: parsedDetails.notes || ""
        }
        
        if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
          setFormData(newFormData)
        }
      } catch (error) {
        console.error("Failed to parse procedure document details:", error)
      }
    } else if (formInitialized) {
      // Only reset if not already reset
      setFormData({
        certificateType: "",
        destinationCountry: "",
        travelDate: "",
        vaccinations: [],
        microchipVerified: false,
        certNumber: "",
        expirationDate: "",
        certifyingVet: "",
        certificationDate: new Date().toISOString().slice(0, 10),
        ownerConsent: false,
        notes: ""
      })  
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const certificateTypes = [
    { value: "domestic", label: "Domestic Health Certificate" },
    { value: "international", label: "International Health Certificate" },
    { value: "usda-endorsed", label: "USDA-Endorsed Health Certificate" },
    { value: "general", label: "General Health Certificate" }
  ]

  const requiredVaccinations = [
    { value: "rabies", label: "Rabies" },
    { value: "dhpp", label: "DHPP" },
    { value: "bordetella", label: "Bordetella" },
    { value: "influenza", label: "Influenza" },
    { value: "leptospirosis", label: "Leptospirosis" }
  ]

  const handleInputChange = (field: keyof HealthCertificateFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const requiredFields = [
      'certificateType', 
      'certifyingVet',
      'certificationDate'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof HealthCertificateFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return
    }

    if (formData.vaccinations.length === 0) {
      toast.error("At least one vaccination must be selected")
      return
    }

    if (!visitData?.id || !procedureId) {
      toast.error("Visit data or procedure ID not available")
      return
    }

    try {
      // Convert form data to JSON string
      const documentDetailsJson = JSON.stringify(formData)
      
      if (procedureDocumentDetails?.id) {
        // Update existing documentation
        await updateDocumentMutation.mutateAsync({
          id: procedureDocumentDetails.id,
          documentDetails: documentDetailsJson
        })
        
        toast.success("Health certificate documentation updated successfully!")
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return
      }
      
      onClose()
    } catch (error) {
      console.error("Error saving health certificate documentation:", error)
      toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            📋 Health Certificate Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Pet and client information will be automatically linked from the existing appointment record.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="certificateType">
                Certificate Type <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.certificateType || ""} 
                onValueChange={(value) => handleInputChange('certificateType', value)}
              >
                <SelectTrigger id="certificateType">
                  <SelectValue placeholder="Select certificate type..." />
                </SelectTrigger>
                <SelectContent>
                  {certificateTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Destination Country/State</Label>
                <Input
                  id="destinationCountry"
                  type="text"
                  value={formData.destinationCountry}
                  onChange={(e) => handleInputChange('destinationCountry', e.target.value)}
                  placeholder="Enter destination if applicable"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelDate">Travel Date (if applicable)</Label>
                <Input
                  id="travelDate"
                  type="date"
                  value={formData.travelDate}
                  onChange={(e) => handleInputChange('travelDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Vaccinations <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {requiredVaccinations.map(vax => (
                  <div key={vax.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vax-${vax.value}`}
                      checked={formData.vaccinations.includes(vax.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('vaccinations', [...formData.vaccinations, vax.value])
                        } else {
                          handleInputChange('vaccinations', formData.vaccinations.filter(v => v !== vax.value))
                        }
                      }}
                    />
                    <Label htmlFor={`vax-${vax.value}`}>{vax.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certNumber">Certificate Number</Label>
                <Input
                  id="certNumber"
                  type="text"
                  value={formData.certNumber}
                  onChange={(e) => handleInputChange('certNumber', e.target.value)}
                  placeholder="Enter certificate number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationDate">Certificate Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => handleInputChange('expirationDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certifyingVet">
                  Certifying Veterinarian <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="certifyingVet"
                  type="text"
                  value={formData.certifyingVet}
                  onChange={(e) => handleInputChange('certifyingVet', e.target.value)}
                  placeholder="Name of certifying vet"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificationDate">
                  Certification Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="certificationDate"
                  type="date"
                  value={formData.certificationDate}
                  onChange={(e) => handleInputChange('certificationDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="microchipVerified"
                  checked={formData.microchipVerified}
                  onCheckedChange={(checked) => handleInputChange('microchipVerified', checked as boolean)}
                />
                <Label htmlFor="microchipVerified">Microchip verified and scanned</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerConsent"
                  checked={formData.ownerConsent}
                  onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
                  required
                />
                <Label htmlFor="ownerConsent">
                  Owner consent obtained for procedure <span className="text-red-500">*</span>
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateDocumentMutation.isPending}
              >
                {updateDocumentMutation.isPending 
                  ? "Saving..." 
                  : "Save"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
} 