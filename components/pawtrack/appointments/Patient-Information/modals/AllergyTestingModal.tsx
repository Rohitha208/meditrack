"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface AllergyTestingModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface AllergyTestingFormData {
  allergenType: string
  suspectedAllergens: string
  reactionHistory: string
  testPanel: string
  urgencyLevel: string
  specialInstructions: string
  ownerConsent: boolean
}

export default function AllergyTestingModal({ open, onClose, patientId, appointmentId, procedureId }: AllergyTestingModalProps) {
  const [formData, setFormData] = useState<AllergyTestingFormData>({
    allergenType: "",
    suspectedAllergens: "",
    reactionHistory: "",
    testPanel: "",
    urgencyLevel: "",
    specialInstructions: "",
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
          allergenType: parsedDetails.allergenType || "",
          testPanel: parsedDetails.testPanel || "",
          urgencyLevel: parsedDetails.urgencyLevel || "",
          // Ensure boolean values for checkboxes
          ownerConsent: !!parsedDetails.ownerConsent,
          suspectedAllergens: parsedDetails.suspectedAllergens || "",
          reactionHistory: parsedDetails.reactionHistory || "",
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
        allergenType: "",
        suspectedAllergens: "",
        reactionHistory: "",
        testPanel: "",
        urgencyLevel: "",
        specialInstructions: "",
        ownerConsent: false
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const urgencyLevels = [
    { value: "routine", label: "Routine" },
    { value: "urgent", label: "Urgent" },
    { value: "emergency", label: "Emergency" }
  ]

  const handleInputChange = (field: keyof AllergyTestingFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    const requiredFields = ['allergenType', 'testPanel', 'urgencyLevel']
    const missingFields = requiredFields.filter(field => !formData[field as keyof AllergyTestingFormData])

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
      
      toast.success("Allergy testing documentation updated successfully!")
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
            🌿 Allergy Testing Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Allergens may include environmental or food triggers. Confirm owner consent before proceeding.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Allergen Type <span className="text-red-500">*</span></Label>
              <Select value={formData.allergenType} onValueChange={(value) => handleInputChange('allergenType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select allergen type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Suspected Allergens</Label>
              <Textarea
                value={formData.suspectedAllergens}
                onChange={(e) => handleInputChange('suspectedAllergens', e.target.value)}
                placeholder="List any suspected triggers..."
              />
            </div>

            <div className="space-y-2">
              <Label>Reaction History</Label>
              <Textarea
                value={formData.reactionHistory}
                onChange={(e) => handleInputChange('reactionHistory', e.target.value)}
                placeholder="Describe previous reactions, timing, severity, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Test Panel <span className="text-red-500">*</span></Label>
              <Select value={formData.testPanel} onValueChange={(value) => handleInputChange('testPanel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select panel..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Panel</SelectItem>
                  <SelectItem value="extended">Extended Panel</SelectItem>
                  <SelectItem value="custom">Custom Panel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgency Level <span className="text-red-500">*</span></Label>
              <Select value={formData.urgencyLevel} onValueChange={(value) => handleInputChange('urgencyLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency..." />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                placeholder="Include dietary restrictions, pre-test conditions, etc."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerConsent"
                  checked={formData.ownerConsent}
                  onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
                />
                <Label htmlFor="ownerConsent">
                  Owner consent obtained <span className="text-red-500">*</span>
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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
