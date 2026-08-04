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

interface RabiesTiterModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface RabiesTiterFormData {
  destinationCountry: string
  sampleType: string
  sampleCollectionDate: string
  lastVaccinationDate: string
  vaccineBrand: string
  vaccineSerialNumber: string
  vaccineExpiryDate: string
  laboratoryName: string
  testMethod: string
  microchipVerified: boolean
  microchipNumber: string
  collectorName: string
  collectorLicense: string
  shippingDate: string
  courierService: string
  trackingNumber: string
  ownerConsent: boolean
  notes: string
}

export default function RabiesTiterModal({ open, onClose, patientId, appointmentId, procedureId }: RabiesTiterModalProps) {
  const [formData, setFormData] = useState<RabiesTiterFormData>({
    destinationCountry: "",
    sampleType: "",
    sampleCollectionDate: new Date().toISOString().slice(0, 16),
    lastVaccinationDate: "",
    vaccineBrand: "",
    vaccineSerialNumber: "",
    vaccineExpiryDate: "",
    laboratoryName: "",
    testMethod: "",
    microchipVerified: false,
    microchipNumber: "",
    collectorName: "",
    collectorLicense: "",
    shippingDate: "",
    courierService: "",
    trackingNumber: "",
    ownerConsent: false,
    notes: ""
  })

  const [formInitialized, setFormInitialized] = useState(false)

  // Get visit data from appointment ID
  const { data: visitData } = useGetVisitByAppointmentId(appointmentId)

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
          destinationCountry: parsedDetails.destinationCountry || "",
          sampleType: parsedDetails.sampleType || "",
          sampleCollectionDate: parsedDetails.sampleCollectionDate || new Date().toISOString().slice(0, 16),
          lastVaccinationDate: parsedDetails.lastVaccinationDate || "",
          vaccineBrand: parsedDetails.vaccineBrand || "",
          vaccineSerialNumber: parsedDetails.vaccineSerialNumber || "",
          vaccineExpiryDate: parsedDetails.vaccineExpiryDate || "",
          laboratoryName: parsedDetails.laboratoryName || "",
          testMethod: parsedDetails.testMethod || "",
          microchipNumber: parsedDetails.microchipNumber || "",
          collectorName: parsedDetails.collectorName || "",
          collectorLicense: parsedDetails.collectorLicense || "",
          shippingDate: parsedDetails.shippingDate || "",
          courierService: parsedDetails.courierService || "",
          trackingNumber: parsedDetails.trackingNumber || "",
          notes: parsedDetails.notes || "",
          
          // Ensure boolean values for checkboxes
          microchipVerified: !!parsedDetails.microchipVerified,
          ownerConsent: !!parsedDetails.ownerConsent
        }
        
        if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
          setFormData(newFormData)
          setFormInitialized(true)
        }
      } catch (error) {
        console.error("Failed to parse procedure document details:", error)
      }
    } else if (formInitialized) {
      // Only reset if not already reset
      setFormData({
        destinationCountry: "",
        sampleType: "",
        sampleCollectionDate: new Date().toISOString().slice(0, 16),
        lastVaccinationDate: "",
        vaccineBrand: "",
        vaccineSerialNumber: "",
        vaccineExpiryDate: "",
        laboratoryName: "",
        testMethod: "",
        microchipVerified: false,
        microchipNumber: "",
        collectorName: "",
        collectorLicense: "",
        shippingDate: "",
        courierService: "",
        trackingNumber: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const sampleTypes = [
    { value: "serum", label: "Serum" },
    { value: "plasma", label: "Plasma" },
    { value: "blood", label: "Whole Blood" }
  ]

  const laboratories = [
    { value: "kansas-state", label: "Kansas State Rabies Laboratory" },
    { value: "antech", label: "ANTECH Diagnostics" },
    { value: "idexx", label: "IDEXX Reference Laboratories" },
    { value: "other", label: "Other Approved Laboratory" }
  ]

  const testMethods = [
    { value: "favn", label: "FAVN (Fluorescent Antibody Virus Neutralization)" },
    { value: "rffit", label: "RFFIT (Rapid Fluorescent Focus Inhibition Test)" }
  ]

  const courierServices = [
    { value: "fedex", label: "FedEx" },
    { value: "ups", label: "UPS" },
    { value: "dhl", label: "DHL" },
    { value: "other", label: "Other" }
  ]

  const handleInputChange = (field: keyof RabiesTiterFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = [
      'destinationCountry',
      'sampleType',
      'sampleCollectionDate',
      'lastVaccinationDate',
      'vaccineBrand',
      'vaccineSerialNumber',
      'laboratoryName',
      'testMethod',
      'microchipNumber',
      'collectorName',
      'collectorLicense'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof RabiesTiterFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (!formData.microchipVerified) {
      toast.error("Microchip must be verified before proceeding")
      return false
    }

    if (!visitData?.id || !procedureId) {
      toast.error("Visit data or procedure ID not available")
      return false
    }

    try {
      if (!procedureDocumentDetails?.id) {
        toast.error("No documentation record found to update")
        return false
      }

      // Convert form data to JSON string
      const documentDetailsJson = JSON.stringify(formData)
      
      // Update existing documentation
      await updateDocumentMutation.mutateAsync({
        id: procedureDocumentDetails.id,
        documentDetails: documentDetailsJson
      })
      
      toast.success("Rabies titer test documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving rabies titer documentation:", error)
      // Check for Zod validation errors
      if (error instanceof Error && error.message.includes("Zod")) {
        toast.error(`Validation error: ${error.message}`)
      } else {
        toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await saveDocumentation()
    if (success) {
      onClose()
    }
  }

  // This is a direct button click handler that doesn't rely on the form submission
  const handleSaveClick = async () => {
    const success = await saveDocumentation()
    if (success) {
      onClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🧪 Rabies Titer Test (RNATT) Documentation
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">
                  Destination Country <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.destinationCountry}
                  onChange={(e) => handleInputChange('destinationCountry', e.target.value)}
                  placeholder="Enter destination country"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sampleType">
                  Sample Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.sampleType} onValueChange={(value) => handleInputChange('sampleType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sample type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sampleCollectionDate">
                  Sample Collection Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.sampleCollectionDate}
                  onChange={(e) => handleInputChange('sampleCollectionDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastVaccinationDate">
                  Last Rabies Vaccination Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.lastVaccinationDate}
                  onChange={(e) => handleInputChange('lastVaccinationDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vaccineBrand">
                  Vaccine Brand <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.vaccineBrand}
                  onChange={(e) => handleInputChange('vaccineBrand', e.target.value)}
                  placeholder="Enter vaccine brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vaccineSerialNumber">
                  Vaccine Serial Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.vaccineSerialNumber}
                  onChange={(e) => handleInputChange('vaccineSerialNumber', e.target.value)}
                  placeholder="Enter serial number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vaccineExpiryDate">Vaccine Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.vaccineExpiryDate}
                  onChange={(e) => handleInputChange('vaccineExpiryDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="laboratoryName">
                  Testing Laboratory <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.laboratoryName} onValueChange={(value) => handleInputChange('laboratoryName', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select laboratory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {laboratories.map(lab => (
                      <SelectItem key={lab.value} value={lab.value}>{lab.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMethod">
                  Test Method <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.testMethod} onValueChange={(value) => handleInputChange('testMethod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select test method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {testMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="microchipNumber">
                  Microchip Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.microchipNumber}
                  onChange={(e) => handleInputChange('microchipNumber', e.target.value)}
                  placeholder="Enter microchip number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectorName">
                  Sample Collector Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.collectorName}
                  onChange={(e) => handleInputChange('collectorName', e.target.value)}
                  placeholder="Enter collector's name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collectorLicense">
                  Collector's License Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.collectorLicense}
                  onChange={(e) => handleInputChange('collectorLicense', e.target.value)}
                  placeholder="Enter license number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingDate">Shipping Date</Label>
                <Input
                  type="date"
                  value={formData.shippingDate}
                  onChange={(e) => handleInputChange('shippingDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courierService">Courier Service</Label>
                <Select value={formData.courierService} onValueChange={(value) => handleInputChange('courierService', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select courier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courierServices.map(service => (
                      <SelectItem key={service.value} value={service.value}>{service.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) => handleInputChange('trackingNumber', e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes about the rabies titer test..."
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
                <Label htmlFor="microchipVerified">
                  Microchip verified and scanned <span className="text-red-500">*</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerConsent"
                  checked={formData.ownerConsent}
                  onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
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
                type="button" 
                onClick={handleSaveClick} 
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