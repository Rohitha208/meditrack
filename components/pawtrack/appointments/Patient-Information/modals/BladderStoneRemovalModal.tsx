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

interface BladderStoneRemovalModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface BladderStoneFormData {
  stoneLocation: string
  stoneSize: string
  stoneNumber: string
  stoneComposition: string
  preOpImaging: string
  imagingFindings: string
  urinalysisResults: string
  bloodworkResults: string
  surgicalApproach: string
  anesthesiaType: string
  bladderWallCondition: string
  closureTechnique: string
  bladderFlush: boolean
  flushSolution: string
  complications: string
  postOpCare: string
  medications: string
  dietaryRecommendations: string
  preventiveMeasures: string
  followUpPlan: string
  labSubmission: boolean
  labDetails: string
  consentObtained: boolean
  surgeonName: string
  assistantName: string
}

export default function BladderStoneRemovalModal({
  open,
  onClose,
  patientId,
  appointmentId,
  procedureId
}: BladderStoneRemovalModalProps) {
  // Form state
  const [formData, setFormData] = useState<BladderStoneFormData>({
    stoneLocation: "",
    stoneSize: "",
    stoneNumber: "",
    stoneComposition: "",
    preOpImaging: "",
    imagingFindings: "",
    urinalysisResults: "",
    bloodworkResults: "",
    surgicalApproach: "",
    anesthesiaType: "",
    bladderWallCondition: "",
    closureTechnique: "",
    bladderFlush: false,
    flushSolution: "",
    complications: "",
    postOpCare: "",
    medications: "",
    dietaryRecommendations: "",
    preventiveMeasures: "",
    followUpPlan: "",
    labSubmission: false,
    labDetails: "",
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
          stoneLocation: parsedDetails.stoneLocation || "",
          preOpImaging: parsedDetails.preOpImaging || "",
          surgicalApproach: parsedDetails.surgicalApproach || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          // Ensure boolean values for checkboxes
          bladderFlush: !!parsedDetails.bladderFlush,
          labSubmission: !!parsedDetails.labSubmission,
          consentObtained: !!parsedDetails.consentObtained,
          stoneSize: parsedDetails.stoneSize || "",
          stoneNumber: parsedDetails.stoneNumber || "",
          stoneComposition: parsedDetails.stoneComposition || "",
          imagingFindings: parsedDetails.imagingFindings || "",
          urinalysisResults: parsedDetails.urinalysisResults || "",
          bloodworkResults: parsedDetails.bloodworkResults || "",
          bladderWallCondition: parsedDetails.bladderWallCondition || "",
          closureTechnique: parsedDetails.closureTechnique || "",
          flushSolution: parsedDetails.flushSolution || "",
          complications: parsedDetails.complications || "",
          postOpCare: parsedDetails.postOpCare || "",
          medications: parsedDetails.medications || "",
          dietaryRecommendations: parsedDetails.dietaryRecommendations || "",
          preventiveMeasures: parsedDetails.preventiveMeasures || "",
          followUpPlan: parsedDetails.followUpPlan || "",
          labDetails: parsedDetails.labDetails || "",
          surgeonName: parsedDetails.surgeonName || "",
          assistantName: parsedDetails.assistantName || ""
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
        stoneLocation: "",
        stoneSize: "",
        stoneNumber: "",
        stoneComposition: "",
        preOpImaging: "",
        imagingFindings: "",
        urinalysisResults: "",
        bloodworkResults: "",
        surgicalApproach: "",
        anesthesiaType: "",
        bladderWallCondition: "",
        closureTechnique: "",
        bladderFlush: false,
        flushSolution: "",
        complications: "",
        postOpCare: "",
        medications: "",
        dietaryRecommendations: "",
        preventiveMeasures: "",
        followUpPlan: "",
        labSubmission: false,
        labDetails: "",
        consentObtained: false,
        surgeonName: "",
        assistantName: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  // Handle form field changes
  const handleInputChange = (field: keyof BladderStoneFormData, value: string | boolean) => {
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

    if (!formData.stoneLocation || !formData.surgicalApproach || !formData.anesthesiaType || !formData.surgeonName) {
      toast.error("Please fill in all required fields")
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
      
      toast.success("Bladder stone removal documentation updated successfully!")
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

  // Handle form submission
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
          <SheetTitle>Bladder Stone Removal Documentation</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="stoneLocation">Stone Location *</Label>
                <Select 
                  value={formData.stoneLocation} 
                  onValueChange={(value) => handleInputChange('stoneLocation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stone location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bladder">Bladder</SelectItem>
                    <SelectItem value="urethra">Urethra</SelectItem>
                    <SelectItem value="both">Both Bladder and Urethra</SelectItem>
                    <SelectItem value="other">Other Urinary Tract Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="stoneSize">Stone Size</Label>
                <Input
                  id="stoneSize"
                  value={formData.stoneSize}
                  onChange={(e) => handleInputChange('stoneSize', e.target.value)}
                  placeholder="Size in millimeters"
                />
              </div>

              <div>
                <Label htmlFor="stoneNumber">Number of Stones</Label>
                <Input
                  id="stoneNumber"
                  value={formData.stoneNumber}
                  onChange={(e) => handleInputChange('stoneNumber', e.target.value)}
                  placeholder="Number of stones removed"
                />
              </div>

              <div>
                <Label htmlFor="stoneComposition">Stone Composition (if known)</Label>
                <Input
                  id="stoneComposition"
                  value={formData.stoneComposition}
                  onChange={(e) => handleInputChange('stoneComposition', e.target.value)}
                  placeholder="Type of stone if identified"
                />
              </div>

              <div>
                <Label htmlFor="preOpImaging">Pre-operative Imaging *</Label>
                <Select 
                  value={formData.preOpImaging} 
                  onValueChange={(value) => handleInputChange('preOpImaging', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select imaging type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xray">X-Ray</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="ct">CT Scan</SelectItem>
                    <SelectItem value="multiple">Multiple Methods</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="imagingFindings">Imaging Findings</Label>
                <Textarea
                  id="imagingFindings"
                  value={formData.imagingFindings}
                  onChange={(e) => handleInputChange('imagingFindings', e.target.value)}
                  placeholder="Describe imaging results"
                />
              </div>

              {/* Other form fields remain the same but with updated onChange handlers */}
              <div>
                <Label htmlFor="urinalysisResults">Urinalysis Results</Label>
                <Textarea
                  id="urinalysisResults"
                  value={formData.urinalysisResults}
                  onChange={(e) => handleInputChange('urinalysisResults', e.target.value)}
                  placeholder="Summary of urinalysis findings"
                />
              </div>

              <div>
                <Label htmlFor="bloodworkResults">Bloodwork Results</Label>
                <Textarea
                  id="bloodworkResults"
                  value={formData.bloodworkResults}
                  onChange={(e) => handleInputChange('bloodworkResults', e.target.value)}
                  placeholder="Relevant blood test results"
                />
              </div>

              <div>
                <Label htmlFor="surgicalApproach">Surgical Approach *</Label>
                <Select 
                  value={formData.surgicalApproach} 
                  onValueChange={(value) => handleInputChange('surgicalApproach', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select surgical approach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ventral">Ventral Cystotomy</SelectItem>
                    <SelectItem value="laparoscopic">Laparoscopic Approach</SelectItem>
                    <SelectItem value="minimally">Minimally Invasive</SelectItem>
                    <SelectItem value="other">Other Approach</SelectItem>
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
                    <SelectItem value="regional">Regional Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional fields with updated handlers */}
              <div>
                <Label htmlFor="bladderWallCondition">Bladder Wall Condition</Label>
                <Textarea
                  id="bladderWallCondition"
                  value={formData.bladderWallCondition}
                  onChange={(e) => handleInputChange('bladderWallCondition', e.target.value)}
                  placeholder="Describe bladder wall condition and any abnormalities"
                />
              </div>

              <div>
                <Label htmlFor="closureTechnique">Closure Technique</Label>
                <Textarea
                  id="closureTechnique"
                  value={formData.closureTechnique}
                  onChange={(e) => handleInputChange('closureTechnique', e.target.value)}
                  placeholder="Describe closure method and materials used"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bladderFlush"
                  checked={formData.bladderFlush}
                  onCheckedChange={(checked) => handleInputChange('bladderFlush', checked as boolean)}
                />
                <Label htmlFor="bladderFlush">Bladder Flush Performed</Label>
              </div>

              {formData.bladderFlush && (
                <div>
                  <Label htmlFor="flushSolution">Flush Solution Details</Label>
                  <Input
                    id="flushSolution"
                    value={formData.flushSolution}
                    onChange={(e) => handleInputChange('flushSolution', e.target.value)}
                    placeholder="Type and volume of flush solution"
                  />
                </div>
              )}

              {/* Remaining fields with updated handlers */}
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
                <Label htmlFor="postOpCare">Post-operative Care</Label>
                <Textarea
                  id="postOpCare"
                  value={formData.postOpCare}
                  onChange={(e) => handleInputChange('postOpCare', e.target.value)}
                  placeholder="Post-operative care instructions"
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
                <Label htmlFor="dietaryRecommendations">Dietary Recommendations</Label>
                <Textarea
                  id="dietaryRecommendations"
                  value={formData.dietaryRecommendations}
                  onChange={(e) => handleInputChange('dietaryRecommendations', e.target.value)}
                  placeholder="Dietary recommendations to prevent recurrence"
                />
              </div>

              <div>
                <Label htmlFor="preventiveMeasures">Preventive Measures</Label>
                <Textarea
                  id="preventiveMeasures"
                  value={formData.preventiveMeasures}
                  onChange={(e) => handleInputChange('preventiveMeasures', e.target.value)}
                  placeholder="Recommended measures to prevent stone formation"
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="labSubmission"
                  checked={formData.labSubmission}
                  onCheckedChange={(checked) => handleInputChange('labSubmission', checked as boolean)}
                />
                <Label htmlFor="labSubmission">Stone Submitted for Analysis</Label>
              </div>

              {formData.labSubmission && (
                <div>
                  <Label htmlFor="labDetails">Laboratory Submission Details</Label>
                  <Input
                    id="labDetails"
                    value={formData.labDetails}
                    onChange={(e) => handleInputChange('labDetails', e.target.value)}
                    placeholder="Lab details and submission information"
                  />
                </div>
              )}

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