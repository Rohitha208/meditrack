"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface MassLumpRemovalModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface MassLumpFormData {
  location: string
  sizeDescription: string
  appearance: string
  suspectedDiagnosis: string
  notes: string
  consent: boolean
}

export default function MassLumpRemovalModal({
  open,
  onClose,
  patientId,
  appointmentId,
  procedureId
}: MassLumpRemovalModalProps) {
  const [formData, setFormData] = useState<MassLumpFormData>({
    location: "",
    sizeDescription: "",
    appearance: "",
    suspectedDiagnosis: "",
    notes: "Excision of benign or malignant growths",
    consent: false,
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
          location: parsedDetails.location || "",
          sizeDescription: parsedDetails.sizeDescription || "",
          appearance: parsedDetails.appearance || "",
          suspectedDiagnosis: parsedDetails.suspectedDiagnosis || "",
          notes: parsedDetails.notes || "Excision of benign or malignant growths",
          
          // Ensure boolean values for checkboxes
          consent: !!parsedDetails.consent
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
        location: "",
        sizeDescription: "",
        appearance: "",
        suspectedDiagnosis: "",
        notes: "Excision of benign or malignant growths",
        consent: false,
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof MassLumpFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const saveDocumentation = async () => {
    if (!formData.location || !formData.notes || !formData.consent) {
      toast.error("Please complete all required fields and confirm consent.")
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
      
      toast.success("Mass/Lump Removal documentation updated successfully")
      return true
    } catch (error) {
      console.error("Error saving Mass/Lump Removal documentation:", error)
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
            🧼 Mass/Lump Removal Documentation
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Patient and appointment context is automatically linked.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Mass/Lump Location <span className="text-red-500">*</span></Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="e.g., Left forelimb"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sizeDescription">Size & Characteristics</Label>
                <Input
                  id="sizeDescription"
                  value={formData.sizeDescription}
                  onChange={(e) => handleInputChange("sizeDescription", e.target.value)}
                  placeholder="e.g., 2cm x 3cm, firm, movable"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appearance">Appearance</Label>
                <Textarea
                  id="appearance"
                  value={formData.appearance}
                  onChange={(e) => handleInputChange("appearance", e.target.value)}
                  placeholder="Surface, color, ulceration, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suspectedDiagnosis">Suspected Diagnosis</Label>
                <Textarea
                  id="suspectedDiagnosis"
                  value={formData.suspectedDiagnosis}
                  onChange={(e) => handleInputChange("suspectedDiagnosis", e.target.value)}
                  placeholder="e.g., Lipoma, Mast cell tumor"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Procedure Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Checkbox
                  id="consent"
                  checked={formData.consent}
                  onCheckedChange={(checked) => handleInputChange("consent", checked as boolean)}
                />
                <Label htmlFor="consent" className="ml-2">
                  Owner consent confirmed <span className="text-red-500">*</span>
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
