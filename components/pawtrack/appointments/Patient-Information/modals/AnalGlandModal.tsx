"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface AnalGlandModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface AnalGlandFormData {
  expressionMethod: string
  rightGlandStatus: string
  leftGlandStatus: string
  findings: string
  followUpRecommended: boolean
  ownerConsent: boolean
}

export default function AnalGlandModal({ open, onClose, patientId, appointmentId, procedureId }: AnalGlandModalProps) {
  const [formData, setFormData] = useState<AnalGlandFormData>({
    expressionMethod: "",
    rightGlandStatus: "",
    leftGlandStatus: "",
    findings: "",
    followUpRecommended: false,
    ownerConsent: false
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
          expressionMethod: parsedDetails.expressionMethod || "",
          rightGlandStatus: parsedDetails.rightGlandStatus || "",
          leftGlandStatus: parsedDetails.leftGlandStatus || "",
          // Ensure boolean values for checkboxes
          followUpRecommended: !!parsedDetails.followUpRecommended,
          ownerConsent: !!parsedDetails.ownerConsent,
          findings: parsedDetails.findings || "",
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
      // Reset the form when no data is available
      setFormData({
        expressionMethod: "",
        rightGlandStatus: "",
        leftGlandStatus: "",
        findings: "",
        followUpRecommended: false,
        ownerConsent: false
      })
    }
  }, [procedureDocumentDetails])

  const expressionMethods = [
    { value: "internal", label: "Internal Expression" },
    { value: "external", label: "External Expression" },
    { value: "combined", label: "Combined Approach" }
  ]

  const glandStatusOptions = [
    { value: "normal", label: "Normal" },
    { value: "impacted", label: "Impacted" },
    { value: "inflamed", label: "Inflamed" },
    { value: "infected", label: "Infected/Abscessed" },
    { value: "empty", label: "Empty After Expression" }
  ]

  const handleInputChange = (field: keyof AnalGlandFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const requiredFields = ['expressionMethod', 'rightGlandStatus', 'leftGlandStatus']
    const missingFields = requiredFields.filter(field => !formData[field as keyof AnalGlandFormData])
    
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
        
        toast.success("Anal gland expression documentation updated successfully!")
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return
      }
      
      onClose()
    } catch (error) {
      console.error("Error saving anal gland documentation:", error)
      toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-[600px] md:!max-w-[600px] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🔍 Anal Gland Expression Documentation
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>

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
              <Label htmlFor="expressionMethod">
                Expression Method <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.expressionMethod || ""} 
                onValueChange={(value) => handleInputChange('expressionMethod', value)}
              >
                <SelectTrigger id="expressionMethod">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {expressionMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rightGlandStatus">
                  Right Gland Status <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.rightGlandStatus || ""} 
                  onValueChange={(value) => handleInputChange('rightGlandStatus', value)}
                >
                  <SelectTrigger id="rightGlandStatus">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {glandStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leftGlandStatus">
                  Left Gland Status <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.leftGlandStatus || ""} 
                  onValueChange={(value) => handleInputChange('leftGlandStatus', value)}
                >
                  <SelectTrigger id="leftGlandStatus">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {glandStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="findings">Findings/Comments</Label>
              <Input
                id="findings"
                value={formData.findings}
                onChange={(e) => handleInputChange('findings', e.target.value)}
                placeholder="Any additional observations"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="followUpRecommended"
                  checked={formData.followUpRecommended}
                  onCheckedChange={(checked) => handleInputChange('followUpRecommended', checked as boolean)}
                />
                <Label htmlFor="followUpRecommended">Follow-up recommended</Label>
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
