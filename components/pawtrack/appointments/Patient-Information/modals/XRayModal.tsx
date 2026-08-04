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

interface XRayModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface XRayFormData {
  bodyArea: string
  viewsRequested: string
  sedationRequired: boolean
  clinicalIndication: string
  urgencyLevel: string
  specialInstructions: string
  ownerConsent: boolean
}

export default function XRayModal({ open, onClose, patientId, appointmentId, procedureId }: XRayModalProps) {
  const [formData, setFormData] = useState<XRayFormData>({
    bodyArea: "",
    viewsRequested: "",
    sedationRequired: false,
    clinicalIndication: "",
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
          bodyArea: parsedDetails.bodyArea || "",
          viewsRequested: parsedDetails.viewsRequested || "",
          clinicalIndication: parsedDetails.clinicalIndication || "",
          urgencyLevel: parsedDetails.urgencyLevel || "",
          specialInstructions: parsedDetails.specialInstructions || "",
          // Ensure boolean values for checkboxes
          sedationRequired: !!parsedDetails.sedationRequired,
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
        bodyArea: "",
        viewsRequested: "",
        sedationRequired: false,
        clinicalIndication: "",
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

  const handleInputChange = (field: keyof XRayFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    const requiredFields = ["bodyArea", "viewsRequested", "urgencyLevel"]
    const missingFields = requiredFields.filter(field => !formData[field as keyof XRayFormData])

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(", ")}`)
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
      
      toast.success("X-Ray documentation updated successfully!")
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
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[60%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            📷 X-Ray Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Patient will need to remain still for X-rays. Sedation may be necessary in some cases.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bodyArea">
                Body Area <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.bodyArea}
                onChange={(e) => handleInputChange("bodyArea", e.target.value)}
                placeholder="e.g., Thorax, Abdomen, Cervical spine"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="viewsRequested">
                Views Requested <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.viewsRequested}
                onChange={(e) => handleInputChange("viewsRequested", e.target.value)}
                placeholder="e.g., Lateral and VD views"
              />
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="sedationRequired"
                checked={formData.sedationRequired}
                onCheckedChange={(checked) => handleInputChange("sedationRequired", checked as boolean)}
              />
              <Label htmlFor="sedationRequired">Sedation May Be Required</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicalIndication">Clinical Indication</Label>
              <Textarea
                value={formData.clinicalIndication}
                onChange={(e) => handleInputChange("clinicalIndication", e.target.value)}
                placeholder="Reason for X-ray request"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgencyLevel">
                Urgency Level <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.urgencyLevel} 
                onValueChange={(value) => handleInputChange("urgencyLevel", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                placeholder="Any special positioning needs or concerns"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ownerConsent"
                checked={formData.ownerConsent}
                onCheckedChange={(checked) => handleInputChange("ownerConsent", checked as boolean)}
              />
              <Label htmlFor="ownerConsent">
                Owner consent obtained <span className="text-red-500">*</span>
              </Label>
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
