"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface EarSurgeryModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface EarSurgeryFormData {
  surgeryType: string
  surgeryLocation: string
  anesthesiaType: string
  preOpDiagnosis: string
  surgicalApproach: string
  bleedingControl: string
  closureTechnique: string
  drainagePlaced: boolean
  drainageDetails: string
  complications: string
  postOpInstructions: string
  medications: string
  followUpPlan: string
  consentObtained: boolean
  surgeonName: string
  assistantName: string
}

export default function EarSurgeryModal({
  open,
  onClose,
  patientId,
  appointmentId,
  procedureId
}: EarSurgeryModalProps) {
  // Form state
  const [formData, setFormData] = useState<EarSurgeryFormData>({
    surgeryType: "",
    surgeryLocation: "",
    anesthesiaType: "",
    preOpDiagnosis: "",
    surgicalApproach: "",
    bleedingControl: "",
    closureTechnique: "",
    drainagePlaced: false,
    drainageDetails: "",
    complications: "",
    postOpInstructions: "",
    medications: "",
    followUpPlan: "",
    consentObtained: false,
    surgeonName: "",
    assistantName: ""
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
          surgeryType: parsedDetails.surgeryType || "",
          surgeryLocation: parsedDetails.surgeryLocation || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          preOpDiagnosis: parsedDetails.preOpDiagnosis || "",
          surgicalApproach: parsedDetails.surgicalApproach || "",
          bleedingControl: parsedDetails.bleedingControl || "",
          closureTechnique: parsedDetails.closureTechnique || "",
          drainageDetails: parsedDetails.drainageDetails || "",
          complications: parsedDetails.complications || "",
          postOpInstructions: parsedDetails.postOpInstructions || "",
          medications: parsedDetails.medications || "",
          followUpPlan: parsedDetails.followUpPlan || "",
          surgeonName: parsedDetails.surgeonName || "",
          assistantName: parsedDetails.assistantName || "",
          
          // Ensure boolean values for checkboxes
          drainagePlaced: !!parsedDetails.drainagePlaced,
          consentObtained: !!parsedDetails.consentObtained
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
        surgeryType: "",
        surgeryLocation: "",
        anesthesiaType: "",
        preOpDiagnosis: "",
        surgicalApproach: "",
        bleedingControl: "",
        closureTechnique: "",
        drainagePlaced: false,
        drainageDetails: "",
        complications: "",
        postOpInstructions: "",
        medications: "",
        followUpPlan: "",
        consentObtained: false,
        surgeonName: "",
        assistantName: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof EarSurgeryFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    if (!formData.consentObtained) {
      toast.error("Owner consent is required before proceeding")
      return false
    }

    if (!formData.surgeryType || !formData.surgeryLocation || !formData.anesthesiaType || !formData.surgeonName) {
      toast.error("Please fill in all required fields")
      return false
    }
    
    if (!visitData?.id || !procedureId) {
      toast.error("Visit data or procedure ID not available")
      return false
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
        
        toast.success("Ear surgery documentation updated successfully!")
        return true
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return false
      }
    } catch (error) {
      console.error("Error saving ear surgery documentation:", error)
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
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ear Surgery Documentation</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="surgeryType">Surgery Type *</Label>
                <Select 
                  value={formData.surgeryType} 
                  onValueChange={(value) => handleInputChange('surgeryType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select surgery type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hematoma">Ear Hematoma Drainage</SelectItem>
                    <SelectItem value="resection">Ear Canal Resection</SelectItem>
                    <SelectItem value="ablation">Total Ear Canal Ablation</SelectItem>
                    <SelectItem value="polyp">Ear Polyp Removal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="surgeryLocation">Surgery Location *</Label>
                <Select 
                  value={formData.surgeryLocation} 
                  onValueChange={(value) => handleInputChange('surgeryLocation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ear location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left Ear</SelectItem>
                    <SelectItem value="right">Right Ear</SelectItem>
                    <SelectItem value="bilateral">Bilateral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="anesthesiaType">Anesthesia Type *</Label>
                <Select 
                  value={formData.anesthesiaType} 
                  onValueChange={(value) => handleInputChange('anesthesiaType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select anesthesia type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Anesthesia</SelectItem>
                    <SelectItem value="local">Local Anesthesia</SelectItem>
                    <SelectItem value="sedation">Sedation with Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="preOpDiagnosis">Pre-operative Diagnosis</Label>
                <Textarea
                  id="preOpDiagnosis"
                  value={formData.preOpDiagnosis}
                  onChange={(e) => handleInputChange('preOpDiagnosis', e.target.value)}
                  placeholder="Enter pre-operative diagnosis"
                />
              </div>

              <div>
                <Label htmlFor="surgicalApproach">Surgical Approach</Label>
                <Textarea
                  id="surgicalApproach"
                  value={formData.surgicalApproach}
                  onChange={(e) => handleInputChange('surgicalApproach', e.target.value)}
                  placeholder="Describe surgical approach and technique"
                />
              </div>

              <div>
                <Label htmlFor="bleedingControl">Bleeding Control</Label>
                <Input
                  id="bleedingControl"
                  value={formData.bleedingControl}
                  onChange={(e) => handleInputChange('bleedingControl', e.target.value)}
                  placeholder="Methods used for hemostasis"
                />
              </div>

              <div>
                <Label htmlFor="closureTechnique">Closure Technique</Label>
                <Input
                  id="closureTechnique"
                  value={formData.closureTechnique}
                  onChange={(e) => handleInputChange('closureTechnique', e.target.value)}
                  placeholder="Describe closure method"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="drainagePlaced"
                  checked={formData.drainagePlaced}
                  onCheckedChange={(checked) => handleInputChange('drainagePlaced', checked as boolean)}
                />
                <Label htmlFor="drainagePlaced">Drainage Placed</Label>
              </div>

              {formData.drainagePlaced && (
                <div>
                  <Label htmlFor="drainageDetails">Drainage Details</Label>
                  <Input
                    id="drainageDetails"
                    value={formData.drainageDetails}
                    onChange={(e) => handleInputChange('drainageDetails', e.target.value)}
                    placeholder="Specify drainage type and location"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  id="complications"
                  value={formData.complications}
                  onChange={(e) => handleInputChange('complications', e.target.value)}
                  placeholder="Note any complications during surgery"
                />
              </div>

              <div>
                <Label htmlFor="postOpInstructions">Post-operative Instructions</Label>
                <Textarea
                  id="postOpInstructions"
                  value={formData.postOpInstructions}
                  onChange={(e) => handleInputChange('postOpInstructions', e.target.value)}
                  placeholder="Detailed post-operative care instructions"
                />
              </div>

              <div>
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => handleInputChange('medications', e.target.value)}
                  placeholder="List prescribed medications and dosages"
                />
              </div>

              <div>
                <Label htmlFor="followUpPlan">Follow-up Plan</Label>
                <Textarea
                  id="followUpPlan"
                  value={formData.followUpPlan}
                  onChange={(e) => handleInputChange('followUpPlan', e.target.value)}
                  placeholder="Specify follow-up schedule and requirements"
                />
              </div>

              <div>
                <Label htmlFor="surgeonName">Surgeon Name *</Label>
                <Input
                  id="surgeonName"
                  value={formData.surgeonName}
                  onChange={(e) => handleInputChange('surgeonName', e.target.value)}
                  placeholder="Enter surgeon's name"
                />
              </div>

              <div>
                <Label htmlFor="assistantName">Assistant Name</Label>
                <Input
                  id="assistantName"
                  value={formData.assistantName}
                  onChange={(e) => handleInputChange('assistantName', e.target.value)}
                  placeholder="Enter assistant's name"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consentObtained"
                  checked={formData.consentObtained}
                  onCheckedChange={(checked) => handleInputChange('consentObtained', checked as boolean)}
                />
                <Label htmlFor="consentObtained" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Owner consent obtained for surgery *
                </Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
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
                  : "Save Documentation"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
} 