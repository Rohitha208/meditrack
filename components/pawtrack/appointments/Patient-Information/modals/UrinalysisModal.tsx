"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface UrinalysisModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface UrinalysisFormData {
  sampleType: string
  collectionTime: string
  sampleVolume: string
  sampleColor: string
  testRequested: string
  clinicalSigns: string
  urgencyLevel: string
  specialInstructions: string
  fastingStatus: boolean
  ownerConsent: boolean
}

export default function UrinalysisModal({ open, onClose, patientId, appointmentId, procedureId }: UrinalysisModalProps) {
  const [formData, setFormData] = useState<UrinalysisFormData>({
    sampleType: "",
    collectionTime: new Date().toISOString().slice(0, 16),
    sampleVolume: "",
    sampleColor: "",
    testRequested: "",
    clinicalSigns: "",
    urgencyLevel: "",
    specialInstructions: "",
    fastingStatus: false,
    ownerConsent: false
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
          sampleType: parsedDetails.sampleType || "",
          sampleColor: parsedDetails.sampleColor || "",
          testRequested: parsedDetails.testRequested || "",
          urgencyLevel: parsedDetails.urgencyLevel || "",
          // Ensure boolean values for checkboxes
          fastingStatus: !!parsedDetails.fastingStatus,
          ownerConsent: !!parsedDetails.ownerConsent,
          collectionTime: parsedDetails.collectionTime || new Date().toISOString().slice(0, 16),
          sampleVolume: parsedDetails.sampleVolume || "",
          clinicalSigns: parsedDetails.clinicalSigns || "",
          specialInstructions: parsedDetails.specialInstructions || ""
        }
        
        if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
          setFormData(newFormData)
          setFormInitialized(true)
        }
      } catch (error) {
        console.error("Failed to parse procedure document details:", error)
      }
    } else if (formInitialized) {
      // Reset the form when no data is available
      setFormData({
        sampleType: "",
        collectionTime: new Date().toISOString().slice(0, 16),
        sampleVolume: "",
        sampleColor: "",
        testRequested: "",
        clinicalSigns: "",
        urgencyLevel: "",
        specialInstructions: "",
        fastingStatus: false,
        ownerConsent: false
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const urgencyLevels = [
    { value: "routine", label: "Routine", color: "bg-green-100 text-green-800 border-green-200" },
    { value: "urgent", label: "Urgent", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    { value: "emergency", label: "Emergency", color: "bg-red-100 text-red-800 border-red-200" }
  ]

  const sampleTypes = [
    { value: "free-catch", label: "Free Catch" },
    { value: "catheterization", label: "Catheterization" },
    { value: "cystocentesis", label: "Cystocentesis" },
    { value: "manual-expression", label: "Manual Expression" }
  ]

  const sampleColors = [
    { value: "clear-yellow", label: "Clear Yellow" },
    { value: "pale-yellow", label: "Pale Yellow" },
    { value: "dark-yellow", label: "Dark Yellow" },
    { value: "cloudy", label: "Cloudy" },
    { value: "red-blood", label: "Red/Bloody" },
    { value: "brown", label: "Brown" },
    { value: "other", label: "Other" }
  ]

  const testTypes = [
    { value: "routine", label: "Routine Urinalysis" },
    { value: "complete", label: "Complete Urinalysis + Microscopy" },
    { value: "culture", label: "Urinalysis + Culture & Sensitivity" },
    { value: "protein", label: "Protein/Microalbumin Focus" },
    { value: "crystals", label: "Crystal Analysis" },
    { value: "custom", label: "Custom Panel" }
  ]

  const handleInputChange = (field: keyof UrinalysisFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const requiredFields = ['sampleType', 'collectionTime', 'testRequested', 'urgencyLevel']
    const missingFields = requiredFields.filter(field => !formData[field as keyof UrinalysisFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
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
        
        toast.success("Urinalysis documentation updated successfully!")
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return
      }
      
      onClose()
    } catch (error) {
      console.error("Error saving urinalysis documentation:", error)
      toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🧪 Urinalysis Documentation
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
                <Label htmlFor="sampleType">
                  Sample Collection Method <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.sampleType || ""} 
                  onValueChange={(value) => handleInputChange('sampleType', value)}
                >
                  <SelectTrigger id="sampleType">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectionTime">
                  Collection Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  id="collectionTime"
                  value={formData.collectionTime}
                  onChange={(e) => handleInputChange('collectionTime', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sampleVolume">Sample Volume (ml)</Label>
                <Input
                  type="number"
                  id="sampleVolume"
                  value={formData.sampleVolume}
                  onChange={(e) => handleInputChange('sampleVolume', e.target.value)}
                  min="0"
                  step="0.1"
                  placeholder="e.g., 5.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sampleColor">Sample Color/Appearance</Label>
                <Select 
                  value={formData.sampleColor || ""} 
                  onValueChange={(value) => handleInputChange('sampleColor', value)}
                >
                  <SelectTrigger id="sampleColor">
                    <SelectValue placeholder="Select appearance..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleColors.map(color => (
                      <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testRequested">
                Tests Requested <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.testRequested || ""} 
                onValueChange={(value) => handleInputChange('testRequested', value)}
              >
                <SelectTrigger id="testRequested">
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
              <Label htmlFor="urgencyLevel">
                Urgency Level <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.urgencyLevel || ""} 
                onValueChange={(value) => handleInputChange('urgencyLevel', value)}
              >
                <SelectTrigger id="urgencyLevel">
                  <SelectValue placeholder="Select urgency level..." />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicalSigns">Clinical Signs/Symptoms</Label>
              <Textarea
                id="clinicalSigns"
                value={formData.clinicalSigns}
                onChange={(e) => handleInputChange('clinicalSigns', e.target.value)}
                placeholder="Describe any observed symptoms: frequent urination, blood in urine, difficulty urinating, etc."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                placeholder="Any special handling requirements or additional notes for the lab..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fastingStatus"
                  checked={formData.fastingStatus}
                  onCheckedChange={(checked) => handleInputChange('fastingStatus', checked as boolean)}
                />
                <Label htmlFor="fastingStatus">Pet was fasting at time of collection</Label>
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