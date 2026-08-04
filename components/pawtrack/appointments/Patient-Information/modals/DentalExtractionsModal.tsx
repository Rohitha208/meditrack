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

interface DentalExtractionsModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface DentalExtractionsFormData {
  teethExtracted: string
  extractionReason: string
  preOpXrays: boolean
  xrayFindings: string
  anesthesiaType: string
  localAnesthetic: string
  extractionTechnique: string
  flapsCreated: boolean
  flapDetails: string
  boneLoss: boolean
  boneLossDetails: string
  rootFracture: boolean
  rootFragmentDetails: string
  closureTechnique: string
  sutureMaterial: string
  hemorrhageControl: string
  complications: string
  postOpXrays: boolean
  postOpXrayFindings: string
  medications: string
  painControl: string
  antibiotics: string
  homeInstructions: string
  dietaryRestrictions: string
  followUpPlan: string
  healingProgress: string
  dentalChartNotes: string
  consentObtained: boolean
  surgeonName: string
  assistantName: string
}

export default function DentalExtractionsModal({
  open,
  onClose,
  patientId,
  appointmentId,
  procedureId
}: DentalExtractionsModalProps) {
  // Form state
  const [formData, setFormData] = useState<DentalExtractionsFormData>({
    teethExtracted: "",
    extractionReason: "",
    preOpXrays: false,
    xrayFindings: "",
    anesthesiaType: "",
    localAnesthetic: "",
    extractionTechnique: "",
    flapsCreated: false,
    flapDetails: "",
    boneLoss: false,
    boneLossDetails: "",
    rootFracture: false,
    rootFragmentDetails: "",
    closureTechnique: "",
    sutureMaterial: "",
    hemorrhageControl: "",
    complications: "",
    postOpXrays: false,
    postOpXrayFindings: "",
    medications: "",
    painControl: "",
    antibiotics: "",
    homeInstructions: "",
    dietaryRestrictions: "",
    followUpPlan: "",
    healingProgress: "",
    dentalChartNotes: "",
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

  const handleInputChange = (field: keyof DentalExtractionsFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Populate form with existing data when available
  useEffect(() => {
    if (procedureDocumentDetails && procedureDocumentDetails.documentDetails) {
      try {
        const parsedDetails = JSON.parse(procedureDocumentDetails.documentDetails)
        console.log("Loaded procedure documentation details:", parsedDetails)
        
        // Create a new form data object with the parsed details
        const newFormData = {
          teethExtracted: parsedDetails.teethExtracted || "",
          extractionReason: parsedDetails.extractionReason || "",
          xrayFindings: parsedDetails.xrayFindings || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          localAnesthetic: parsedDetails.localAnesthetic || "",
          extractionTechnique: parsedDetails.extractionTechnique || "",
          flapDetails: parsedDetails.flapDetails || "",
          boneLossDetails: parsedDetails.boneLossDetails || "",
          rootFragmentDetails: parsedDetails.rootFragmentDetails || "",
          closureTechnique: parsedDetails.closureTechnique || "",
          sutureMaterial: parsedDetails.sutureMaterial || "",
          hemorrhageControl: parsedDetails.hemorrhageControl || "",
          complications: parsedDetails.complications || "",
          postOpXrayFindings: parsedDetails.postOpXrayFindings || "",
          medications: parsedDetails.medications || "",
          painControl: parsedDetails.painControl || "",
          antibiotics: parsedDetails.antibiotics || "",
          homeInstructions: parsedDetails.homeInstructions || "",
          dietaryRestrictions: parsedDetails.dietaryRestrictions || "",
          followUpPlan: parsedDetails.followUpPlan || "",
          healingProgress: parsedDetails.healingProgress || "",
          dentalChartNotes: parsedDetails.dentalChartNotes || "",
          surgeonName: parsedDetails.surgeonName || "",
          assistantName: parsedDetails.assistantName || "",
          
          // Ensure boolean values
          preOpXrays: !!parsedDetails.preOpXrays,
          flapsCreated: !!parsedDetails.flapsCreated,
          boneLoss: !!parsedDetails.boneLoss,
          rootFracture: !!parsedDetails.rootFracture,
          postOpXrays: !!parsedDetails.postOpXrays,
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
      // Only reset if not already reset
      setFormData({
        teethExtracted: "",
        extractionReason: "",
        preOpXrays: false,
        xrayFindings: "",
        anesthesiaType: "",
        localAnesthetic: "",
        extractionTechnique: "",
        flapsCreated: false,
        flapDetails: "",
        boneLoss: false,
        boneLossDetails: "",
        rootFracture: false,
        rootFragmentDetails: "",
        closureTechnique: "",
        sutureMaterial: "",
        hemorrhageControl: "",
        complications: "",
        postOpXrays: false,
        postOpXrayFindings: "",
        medications: "",
        painControl: "",
        antibiotics: "",
        homeInstructions: "",
        dietaryRestrictions: "",
        followUpPlan: "",
        healingProgress: "",
        dentalChartNotes: "",
        consentObtained: false,
        surgeonName: "",
        assistantName: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const saveDocumentation = async () => {
    if (!formData.consentObtained) {
      toast.error("Owner consent is required before proceeding")
      return false
    }

    if (!formData.teethExtracted || !formData.anesthesiaType || !formData.surgeonName) {
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
        
        toast.success("Dental extraction documentation updated successfully!")
        return true
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return false
      }
    } catch (error) {
      console.error("Error saving dental extraction documentation:", error)
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
          <SheetTitle>Dental Extraction Documentation</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="teethExtracted">Teeth Extracted *</Label>
                <Textarea
                  id="teethExtracted"
                  value={formData.teethExtracted}
                  onChange={(e) => handleInputChange("teethExtracted", e.target.value)}
                  placeholder="List teeth numbers extracted"
                />
              </div>

              <div>
                <Label htmlFor="extractionReason">Reason for Extraction</Label>
                <Select 
                  value={formData.extractionReason} 
                  onValueChange={(value) => handleInputChange("extractionReason", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="periodontal">Periodontal Disease</SelectItem>
                    <SelectItem value="fracture">Tooth Fracture</SelectItem>
                    <SelectItem value="abscess">Dental Abscess</SelectItem>
                    <SelectItem value="resorption">Tooth Resorption</SelectItem>
                    <SelectItem value="malposition">Malpositioned Tooth</SelectItem>
                    <SelectItem value="overcrowding">Overcrowding</SelectItem>
                    <SelectItem value="neoplasia">Oral Neoplasia</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preOpXrays"
                  checked={formData.preOpXrays}
                  onCheckedChange={(checked) => handleInputChange("preOpXrays", checked as boolean)}
                />
                <Label htmlFor="preOpXrays">Pre-operative X-rays Taken</Label>
              </div>

              {formData.preOpXrays && (
                <div>
                  <Label htmlFor="xrayFindings">X-ray Findings</Label>
                  <Textarea
                    id="xrayFindings"
                    value={formData.xrayFindings}
                    onChange={(e) => handleInputChange("xrayFindings", e.target.value)}
                    placeholder="Describe radiographic findings"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="anesthesiaType">Anesthesia Type *</Label>
                <Select 
                  value={formData.anesthesiaType} 
                  onValueChange={(value) => handleInputChange("anesthesiaType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select anesthesia type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Anesthesia</SelectItem>
                    <SelectItem value="sedation">Heavy Sedation</SelectItem>
                    <SelectItem value="local">Local Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="localAnesthetic">Local Anesthetic Used</Label>
                <Input
                  id="localAnesthetic"
                  value={formData.localAnesthetic}
                  onChange={(e) => handleInputChange("localAnesthetic", e.target.value)}
                  placeholder="Type and location of local anesthetic"
                />
              </div>

              <div>
                <Label htmlFor="extractionTechnique">Extraction Technique</Label>
                <Select 
                  value={formData.extractionTechnique} 
                  onValueChange={(value) => handleInputChange("extractionTechnique", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Extraction</SelectItem>
                    <SelectItem value="surgical">Surgical Extraction</SelectItem>
                    <SelectItem value="sectioning">Crown Sectioning</SelectItem>
                    <SelectItem value="flap">Flap and Extraction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="flapsCreated"
                  checked={formData.flapsCreated}
                  onCheckedChange={(checked) => handleInputChange("flapsCreated", checked as boolean)}
                />
                <Label htmlFor="flapsCreated">Gingival Flaps Created</Label>
              </div>

              {formData.flapsCreated && (
                <div>
                  <Label htmlFor="flapDetails">Flap Details</Label>
                  <Textarea
                    id="flapDetails"
                    value={formData.flapDetails}
                    onChange={(e) => handleInputChange("flapDetails", e.target.value)}
                    placeholder="Describe flap design and technique"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="boneLoss"
                  checked={formData.boneLoss}
                  onCheckedChange={(checked) => handleInputChange("boneLoss", checked as boolean)}
                />
                <Label htmlFor="boneLoss">Significant Bone Loss Present</Label>
              </div>

              {formData.boneLoss && (
                <div>
                  <Label htmlFor="boneLossDetails">Bone Loss Details</Label>
                  <Textarea
                    id="boneLossDetails"
                    value={formData.boneLossDetails}
                    onChange={(e) => handleInputChange("boneLossDetails", e.target.value)}
                    placeholder="Describe extent and location of bone loss"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rootFracture"
                  checked={formData.rootFracture}
                  onCheckedChange={(checked) => handleInputChange("rootFracture", checked as boolean)}
                />
                <Label htmlFor="rootFracture">Root Fracture Occurred</Label>
              </div>

              {formData.rootFracture && (
                <div>
                  <Label htmlFor="rootFragmentDetails">Root Fragment Details</Label>
                  <Textarea
                    id="rootFragmentDetails"
                    value={formData.rootFragmentDetails}
                    onChange={(e) => handleInputChange("rootFragmentDetails", e.target.value)}
                    placeholder="Describe management of root fragments"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="closureTechnique">Closure Technique</Label>
                <Input
                  id="closureTechnique"
                  value={formData.closureTechnique}
                  onChange={(e) => handleInputChange("closureTechnique", e.target.value)}
                  placeholder="Describe closure method"
                />
              </div>

              <div>
                <Label htmlFor="sutureMaterial">Suture Material</Label>
                <Input
                  id="sutureMaterial"
                  value={formData.sutureMaterial}
                  onChange={(e) => handleInputChange("sutureMaterial", e.target.value)}
                  placeholder="Type and size of suture used"
                />
              </div>

              <div>
                <Label htmlFor="hemorrhageControl">Hemorrhage Control</Label>
                <Textarea
                  id="hemorrhageControl"
                  value={formData.hemorrhageControl}
                  onChange={(e) => handleInputChange("hemorrhageControl", e.target.value)}
                  placeholder="Methods used for hemostasis"
                />
              </div>

              <div>
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  id="complications"
                  value={formData.complications}
                  onChange={(e) => handleInputChange("complications", e.target.value)}
                  placeholder="Note any complications"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="postOpXrays"
                  checked={formData.postOpXrays}
                  onCheckedChange={(checked) => handleInputChange("postOpXrays", checked as boolean)}
                />
                <Label htmlFor="postOpXrays">Post-operative X-rays Taken</Label>
              </div>

              {formData.postOpXrays && (
                <div>
                  <Label htmlFor="postOpXrayFindings">Post-op X-ray Findings</Label>
                  <Textarea
                    id="postOpXrayFindings"
                    value={formData.postOpXrayFindings}
                    onChange={(e) => handleInputChange("postOpXrayFindings", e.target.value)}
                    placeholder="Describe post-extraction radiographic findings"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => handleInputChange("medications", e.target.value)}
                  placeholder="List medications administered"
                />
              </div>

              <div>
                <Label htmlFor="painControl">Pain Control Protocol</Label>
                <Textarea
                  id="painControl"
                  value={formData.painControl}
                  onChange={(e) => handleInputChange("painControl", e.target.value)}
                  placeholder="Detail pain management plan"
                />
              </div>

              <div>
                <Label htmlFor="antibiotics">Antibiotics</Label>
                <Textarea
                  id="antibiotics"
                  value={formData.antibiotics}
                  onChange={(e) => handleInputChange("antibiotics", e.target.value)}
                  placeholder="Antibiotic selection and duration"
                />
              </div>

              <div>
                <Label htmlFor="homeInstructions">Home Care Instructions</Label>
                <Textarea
                  id="homeInstructions"
                  value={formData.homeInstructions}
                  onChange={(e) => handleInputChange("homeInstructions", e.target.value)}
                  placeholder="Detailed home care instructions"
                />
              </div>

              <div>
                <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                <Textarea
                  id="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={(e) => handleInputChange("dietaryRestrictions", e.target.value)}
                  placeholder="Specify dietary restrictions and duration"
                />
              </div>

              <div>
                <Label htmlFor="followUpPlan">Follow-up Plan</Label>
                <Textarea
                  id="followUpPlan"
                  value={formData.followUpPlan}
                  onChange={(e) => handleInputChange("followUpPlan", e.target.value)}
                  placeholder="Specify follow-up schedule"
                />
              </div>

              <div>
                <Label htmlFor="healingProgress">Healing Progress</Label>
                <Textarea
                  id="healingProgress"
                  value={formData.healingProgress}
                  onChange={(e) => handleInputChange("healingProgress", e.target.value)}
                  placeholder="Document healing progress"
                />
              </div>

              <div>
                <Label htmlFor="dentalChartNotes">Dental Chart Notes</Label>
                <Textarea
                  id="dentalChartNotes"
                  value={formData.dentalChartNotes}
                  onChange={(e) => handleInputChange("dentalChartNotes", e.target.value)}
                  placeholder="Additional dental chart notes"
                />
              </div>

              <div>
                <Label htmlFor="surgeonName">Surgeon/Dentist Name *</Label>
                <Input
                  id="surgeonName"
                  value={formData.surgeonName}
                  onChange={(e) => handleInputChange("surgeonName", e.target.value)}
                  placeholder="Enter surgeon's name"
                />
              </div>

              <div>
                <Label htmlFor="assistantName">Assistant Name</Label>
                <Input
                  id="assistantName"
                  value={formData.assistantName}
                  onChange={(e) => handleInputChange("assistantName", e.target.value)}
                  placeholder="Enter assistant's name"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consentObtained"
                  checked={formData.consentObtained}
                  onCheckedChange={(checked) => handleInputChange("consentObtained", checked as boolean)}
                />
                <Label htmlFor="consentObtained" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Owner consent obtained for extractions *
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