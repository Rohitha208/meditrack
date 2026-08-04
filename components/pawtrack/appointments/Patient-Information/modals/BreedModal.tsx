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

interface BreedModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface BreedTestingFormData {
  testType: string
  sampleType: string
  collectionDateTime: string
  collector: string
  labFacility: string
  testPurpose: string
  primaryBreed: string
  secondaryBreed: string
  geneticMarkers: string
  healthScreening: boolean
  ownerConsent: boolean
  notes: string
}

export default function BreedModal({ open, onClose, patientId, appointmentId, procedureId }: BreedModalProps) {
  const [formData, setFormData] = useState<BreedTestingFormData>({
    testType: "",
    sampleType: "",
    collectionDateTime: new Date().toISOString().slice(0, 16),
    collector: "",
    labFacility: "",
    testPurpose: "",
    primaryBreed: "",
    secondaryBreed: "",
    geneticMarkers: "",
    healthScreening: false,
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
          testType: parsedDetails.testType || "",
          sampleType: parsedDetails.sampleType || "",
          collectionDateTime: parsedDetails.collectionDateTime || new Date().toISOString().slice(0, 16),
          collector: parsedDetails.collector || "",
          labFacility: parsedDetails.labFacility || "",
          testPurpose: parsedDetails.testPurpose || "",
          primaryBreed: parsedDetails.primaryBreed || "",
          secondaryBreed: parsedDetails.secondaryBreed || "",
          geneticMarkers: parsedDetails.geneticMarkers || "",
          // Ensure boolean values for checkboxes
          healthScreening: !!parsedDetails.healthScreening,
          ownerConsent: !!parsedDetails.ownerConsent,
          notes: parsedDetails.notes || ""
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
        testType: "",
        sampleType: "",
        collectionDateTime: new Date().toISOString().slice(0, 16),
        collector: "",
        labFacility: "",
        testPurpose: "",
        primaryBreed: "",
        secondaryBreed: "",
        geneticMarkers: "",
        healthScreening: false,
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails, formData, open])

  const testTypes = [
    { value: "breed-identification", label: "Breed Identification" },
    { value: "dna-profiling", label: "DNA Profiling" },
    { value: "genetic-health", label: "Genetic Health Screening" },
    { value: "parentage", label: "Parentage Verification" },
    { value: "mixed-breed", label: "Mixed Breed Analysis" }
  ]

  const sampleTypes = [
    { value: "blood", label: "Blood Sample" },
    { value: "cheek-swab", label: "Cheek Swab" },
    { value: "hair", label: "Hair Follicle" },
    { value: "tissue", label: "Tissue Sample" }
  ]

  const labFacilities = [
    { value: "wisdom-panel", label: "Wisdom Panel" },
    { value: "embark", label: "Embark Veterinary" },
    { value: "paw-print", label: "Paw Print Genetics" },
    { value: "other", label: "Other" }
  ]

  const testPurposes = [
    { value: "certification", label: "Breed Certification" },
    { value: "registration", label: "Breed Registration" },
    { value: "health-screening", label: "Health Screening" },
    { value: "breeding-program", label: "Breeding Program" },
    { value: "curiosity", label: "Owner Curiosity" }
  ]

  const handleInputChange = (field: keyof BreedTestingFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = ['testType', 'sampleType', 'collectionDateTime', 'collector', 'labFacility', 'testPurpose']
    const missingFields = requiredFields.filter(field => !formData[field as keyof BreedTestingFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }
    
    if (!visitData?.id || !procedureId) {
      toast.error("Visit data or procedure ID not available")
      return false
    }

    if (!procedureDocumentDetails?.id) {
      toast.error("No documentation record found to update")
      return false
    }

    try {
      const documentDetailsJson = JSON.stringify(formData)
      
      await updateDocumentMutation.mutateAsync({
        id: procedureDocumentDetails.id,
        documentDetails: documentDetailsJson
      })
      
      toast.success("Breed testing documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving documentation:", error)
      // Check for Zod validation errors
      if (error instanceof Error && error.message.includes("Zod")) {
        toast.error(`Validation error: ${error.message}`)
      } else {
        toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
            🧬 Breed Certification / DNA Testing Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Pet and client information will be automatically linked from the existing appointment record.
          </p>
        </div>

        {isLoading || !formInitialized ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testType">
                  Test Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.testType} onValueChange={(value) => handleInputChange('testType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select test type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="collectionDateTime">
                  Collection Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.collectionDateTime}
                  onChange={(e) => handleInputChange('collectionDateTime', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collector">
                  Collector <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.collector}
                  onChange={(e) => handleInputChange('collector', e.target.value)}
                  placeholder="Name of person collecting sample"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labFacility">
                  Testing Laboratory <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.labFacility} onValueChange={(value) => handleInputChange('labFacility', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select laboratory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {labFacilities.map(lab => (
                      <SelectItem key={lab.value} value={lab.value}>{lab.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testPurpose">
                  Test Purpose <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.testPurpose} onValueChange={(value) => handleInputChange('testPurpose', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {testPurposes.map(purpose => (
                      <SelectItem key={purpose.value} value={purpose.value}>{purpose.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryBreed">Primary Breed Suspected</Label>
                <Input
                  type="text"
                  value={formData.primaryBreed}
                  onChange={(e) => handleInputChange('primaryBreed', e.target.value)}
                  placeholder="e.g., Labrador Retriever"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryBreed">Secondary Breed Suspected</Label>
                <Input
                  type="text"
                  value={formData.secondaryBreed}
                  onChange={(e) => handleInputChange('secondaryBreed', e.target.value)}
                  placeholder="e.g., German Shepherd"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="geneticMarkers">Specific Genetic Markers Requested</Label>
              <Textarea
                value={formData.geneticMarkers}
                onChange={(e) => handleInputChange('geneticMarkers', e.target.value)}
                placeholder="List any specific genetic markers or traits to be tested..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes about the testing procedure..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="healthScreening"
                  checked={formData.healthScreening}
                  onCheckedChange={(checked) => handleInputChange('healthScreening', checked as boolean)}
                />
                <Label htmlFor="healthScreening">Include breed-specific health screening</Label>
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