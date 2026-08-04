"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface UltrasoundModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface UltrasoundFormData {
  bodyArea: string
  views: string
  urgencyLevel: string
  specialInstructions: string
  ownerConsent: boolean
}

export default function UltrasoundModal({ open, onClose, patientId, appointmentId, procedureId }: UltrasoundModalProps) {
  const [formData, setFormData] = useState<UltrasoundFormData>({
    bodyArea: "",
    views: "",
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
          views: parsedDetails.views || "",
          urgencyLevel: parsedDetails.urgencyLevel || "",
          specialInstructions: parsedDetails.specialInstructions || "",
          
          // Ensure boolean values for checkboxes
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
        views: "",
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

  const handleInputChange = (field: keyof UltrasoundFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const saveDocumentation = async () => {
    const requiredFields = ["bodyArea", "views", "urgencyLevel"]
    const missingFields = requiredFields.filter(field => !formData[field as keyof UltrasoundFormData])

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
      
      toast.success("Ultrasound documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving ultrasound documentation:", error)
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
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🔍 Ultrasound Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Ultrasound is a non-invasive imaging of internal organs. Patient and appointment details are automatically linked.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bodyArea">Body Area <span className="text-red-500">*</span></Label>
              <Input
                id="bodyArea"
                value={formData.bodyArea}
                onChange={(e) => handleInputChange("bodyArea", e.target.value)}
                placeholder="e.g., Abdomen, Thorax, Cardiac"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="views">Views Required <span className="text-red-500">*</span></Label>
              <Input
                id="views"
                value={formData.views}
                onChange={(e) => handleInputChange("views", e.target.value)}
                placeholder="e.g., Longitudinal, Transverse"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgencyLevel">Urgency Level <span className="text-red-500">*</span></Label>
              <Select value={formData.urgencyLevel} onValueChange={(val) => handleInputChange("urgencyLevel", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency..." />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                placeholder="e.g., patient must be fasting, repeat scan if needed"
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
