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

interface OrthopedicSurgeryModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface OrthopedicSurgeryFormData {
  surgeryType: string
  customSurgeryType: string
  location: string
  side: string
  preOpDiagnosis: string
  preOpImaging: string
  imagingFindings: string
  weightBearing: string
  implantType: string
  implantDetails: string
  anesthesiaType: string
  surgicalApproach: string
  closureTechnique: string
  boneFusion: boolean
  fusionMethod: string
  complications: string
  postOpCare: string
  medications: string
  rehabilitationPlan: string
  activityRestrictions: string
  followUpSchedule: string
  expectedRecovery: string
  painManagement: string
  bandageInstructions: string
  exerciseProtocol: string
  consentObtained: boolean
  surgeonName: string
  assistantName: string
}

export default function OrthopedicSurgeryModal({
  open,
  onClose,
  patientId,
  appointmentId,
  procedureId,
}: OrthopedicSurgeryModalProps) {
  // Form state
  const [formData, setFormData] = useState<OrthopedicSurgeryFormData>({
    surgeryType: "",
    customSurgeryType: "",
    location: "",
    side: "",
    preOpDiagnosis: "",
    preOpImaging: "",
    imagingFindings: "",
    weightBearing: "",
    implantType: "",
    implantDetails: "",
    anesthesiaType: "",
    surgicalApproach: "",
    closureTechnique: "",
    boneFusion: false,
    fusionMethod: "",
    complications: "",
    postOpCare: "",
    medications: "",
    rehabilitationPlan: "",
    activityRestrictions: "",
    followUpSchedule: "",
    expectedRecovery: "",
    painManagement: "",
    bandageInstructions: "",
    exerciseProtocol: "",
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
          customSurgeryType: parsedDetails.customSurgeryType || "",
          location: parsedDetails.location || "",
          side: parsedDetails.side || "",
          preOpDiagnosis: parsedDetails.preOpDiagnosis || "",
          preOpImaging: parsedDetails.preOpImaging || "",
          imagingFindings: parsedDetails.imagingFindings || "",
          weightBearing: parsedDetails.weightBearing || "",
          implantType: parsedDetails.implantType || "",
          implantDetails: parsedDetails.implantDetails || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          surgicalApproach: parsedDetails.surgicalApproach || "",
          closureTechnique: parsedDetails.closureTechnique || "",
          fusionMethod: parsedDetails.fusionMethod || "",
          complications: parsedDetails.complications || "",
          postOpCare: parsedDetails.postOpCare || "",
          medications: parsedDetails.medications || "",
          rehabilitationPlan: parsedDetails.rehabilitationPlan || "",
          activityRestrictions: parsedDetails.activityRestrictions || "",
          followUpSchedule: parsedDetails.followUpSchedule || "",
          expectedRecovery: parsedDetails.expectedRecovery || "",
          painManagement: parsedDetails.painManagement || "",
          bandageInstructions: parsedDetails.bandageInstructions || "",
          exerciseProtocol: parsedDetails.exerciseProtocol || "",
          surgeonName: parsedDetails.surgeonName || "",
          assistantName: parsedDetails.assistantName || "",
          
          // Ensure boolean values for checkboxes
          boneFusion: !!parsedDetails.boneFusion,
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
        surgeryType: "",
        customSurgeryType: "",
        location: "",
        side: "",
        preOpDiagnosis: "",
        preOpImaging: "",
        imagingFindings: "",
        weightBearing: "",
        implantType: "",
        implantDetails: "",
        anesthesiaType: "",
        surgicalApproach: "",
        closureTechnique: "",
        boneFusion: false,
        fusionMethod: "",
        complications: "",
        postOpCare: "",
        medications: "",
        rehabilitationPlan: "",
        activityRestrictions: "",
        followUpSchedule: "",
        expectedRecovery: "",
        painManagement: "",
        bandageInstructions: "",
        exerciseProtocol: "",
        consentObtained: false,
        surgeonName: "",
        assistantName: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  // Handle form field changes
  const handleInputChange = (field: keyof OrthopedicSurgeryFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Save documentation with validation
  const saveDocumentation = async () => {
    if (!formData.consentObtained) {
      toast.error("Owner consent is required before proceeding")
      return false
    }

    if (!formData.surgeryType || !formData.location || !formData.side || !formData.anesthesiaType || !formData.surgeonName) {
      toast.error("Please fill in all required fields")
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
      
      toast.success("Orthopedic surgery documentation updated successfully")
      return true
    } catch (error) {
      console.error("Error saving orthopedic surgery documentation:", error)
      // Check for Zod validation errors
      if (error instanceof Error && error.message.includes("Zod")) {
        toast.error(`Validation error: ${error.message}`)
      } else {
        toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          <SheetTitle>Orthopedic Surgery Documentation</SheetTitle>
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
                  onValueChange={(value) => handleInputChange("surgeryType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select surgery type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fracture">Fracture Repair</SelectItem>
                    <SelectItem value="acl">ACL/CCL Repair</SelectItem>
                    <SelectItem value="tplo">TPLO</SelectItem>
                    <SelectItem value="tto">TTO</SelectItem>
                    <SelectItem value="hipDysplasia">Hip Dysplasia Surgery</SelectItem>
                    <SelectItem value="fho">Femoral Head Ostectomy</SelectItem>
                    <SelectItem value="arthroscopy">Arthroscopy</SelectItem>
                    <SelectItem value="jointFusion">Joint Fusion</SelectItem>
                    <SelectItem value="pinning">Fracture Pinning</SelectItem>
                    <SelectItem value="plating">Plating</SelectItem>
                    <SelectItem value="externalFixation">External Fixation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.surgeryType === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Specify surgery type"
                    value={formData.customSurgeryType}
                    onChange={(e) => handleInputChange("customSurgeryType", e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="location">Anatomical Location *</Label>
                <Select 
                  value={formData.location} 
                  onValueChange={(value) => handleInputChange("location", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stifle">Stifle (Knee)</SelectItem>
                    <SelectItem value="hip">Hip</SelectItem>
                    <SelectItem value="shoulder">Shoulder</SelectItem>
                    <SelectItem value="elbow">Elbow</SelectItem>
                    <SelectItem value="carpus">Carpus (Wrist)</SelectItem>
                    <SelectItem value="tarsus">Tarsus (Ankle)</SelectItem>
                    <SelectItem value="spine">Spine</SelectItem>
                    <SelectItem value="femur">Femur</SelectItem>
                    <SelectItem value="tibia">Tibia</SelectItem>
                    <SelectItem value="radius">Radius/Ulna</SelectItem>
                    <SelectItem value="humerus">Humerus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="side">Side *</Label>
                <Select 
                  value={formData.side} 
                  onValueChange={(value) => handleInputChange("side", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="bilateral">Bilateral</SelectItem>
                    <SelectItem value="midline">Midline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="preOpDiagnosis">Pre-operative Diagnosis</Label>
                <Textarea
                  id="preOpDiagnosis"
                  value={formData.preOpDiagnosis}
                  onChange={(e) => handleInputChange("preOpDiagnosis", e.target.value)}
                  placeholder="Describe pre-operative diagnosis and findings"
                />
              </div>

              <div>
                <Label htmlFor="preOpImaging">Pre-operative Imaging *</Label>
                <Select 
                  value={formData.preOpImaging} 
                  onValueChange={(value) => handleInputChange("preOpImaging", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select imaging type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radiographs">Radiographs</SelectItem>
                    <SelectItem value="ct">CT Scan</SelectItem>
                    <SelectItem value="mri">MRI</SelectItem>
                    <SelectItem value="multiple">Multiple Methods</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="imagingFindings">Imaging Findings</Label>
                <Textarea
                  id="imagingFindings"
                  value={formData.imagingFindings}
                  onChange={(e) => handleInputChange("imagingFindings", e.target.value)}
                  placeholder="Describe imaging results and measurements"
                />
              </div>

              <div>
                <Label htmlFor="weightBearing">Weight Bearing Status</Label>
                <Select 
                  value={formData.weightBearing} 
                  onValueChange={(value) => handleInputChange("weightBearing", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select weight bearing status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non-Weight Bearing</SelectItem>
                    <SelectItem value="partial">Partial Weight Bearing</SelectItem>
                    <SelectItem value="progressive">Progressive Weight Bearing</SelectItem>
                    <SelectItem value="full">Full Weight Bearing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="implantType">Implant Type</Label>
                <Select 
                  value={formData.implantType} 
                  onValueChange={(value) => handleInputChange("implantType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select implant type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plate">Bone Plate</SelectItem>
                    <SelectItem value="screws">Screws</SelectItem>
                    <SelectItem value="pins">Pins</SelectItem>
                    <SelectItem value="wire">Cerclage Wire</SelectItem>
                    <SelectItem value="externalFixator">External Fixator</SelectItem>
                    <SelectItem value="prosthetic">Prosthetic Joint</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.implantType !== "none" && (
                <div>
                  <Label htmlFor="implantDetails">Implant Details</Label>
                  <Textarea
                    id="implantDetails"
                    value={formData.implantDetails}
                    onChange={(e) => handleInputChange("implantDetails", e.target.value)}
                    placeholder="Specify implant size, manufacturer, and other details"
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
                    <SelectItem value="regional">Regional Block</SelectItem>
                    <SelectItem value="combined">Combined Technique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="surgicalApproach">Surgical Approach</Label>
                <Textarea
                  id="surgicalApproach"
                  value={formData.surgicalApproach}
                  onChange={(e) => handleInputChange("surgicalApproach", e.target.value)}
                  placeholder="Describe surgical approach and technique"
                />
              </div>

              <div>
                <Label htmlFor="closureTechnique">Closure Technique</Label>
                <Textarea
                  id="closureTechnique"
                  value={formData.closureTechnique}
                  onChange={(e) => handleInputChange("closureTechnique", e.target.value)}
                  placeholder="Describe closure method and materials used"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="boneFusion"
                  checked={formData.boneFusion}
                  onCheckedChange={(checked) => handleInputChange("boneFusion", checked as boolean)}
                />
                <Label htmlFor="boneFusion">Bone Fusion Performed</Label>
              </div>

              {formData.boneFusion && (
                <div>
                  <Label htmlFor="fusionMethod">Fusion Method</Label>
                  <Textarea
                    id="fusionMethod"
                    value={formData.fusionMethod}
                    onChange={(e) => handleInputChange("fusionMethod", e.target.value)}
                    placeholder="Describe fusion technique and materials"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  id="complications"
                  value={formData.complications}
                  onChange={(e) => handleInputChange("complications", e.target.value)}
                  placeholder="Note any complications during surgery"
                />
              </div>

              <div>
                <Label htmlFor="postOpCare">Post-operative Care</Label>
                <Textarea
                  id="postOpCare"
                  value={formData.postOpCare}
                  onChange={(e) => handleInputChange("postOpCare", e.target.value)}
                  placeholder="Post-operative care instructions"
                />
              </div>

              <div>
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => handleInputChange("medications", e.target.value)}
                  placeholder="List prescribed medications and dosages"
                />
              </div>

              <div>
                <Label htmlFor="rehabilitationPlan">Rehabilitation Plan</Label>
                <Textarea
                  id="rehabilitationPlan"
                  value={formData.rehabilitationPlan}
                  onChange={(e) => handleInputChange("rehabilitationPlan", e.target.value)}
                  placeholder="Detailed rehabilitation protocol"
                />
              </div>

              <div>
                <Label htmlFor="activityRestrictions">Activity Restrictions</Label>
                <Textarea
                  id="activityRestrictions"
                  value={formData.activityRestrictions}
                  onChange={(e) => handleInputChange("activityRestrictions", e.target.value)}
                  placeholder="Specify activity restrictions and duration"
                />
              </div>

              <div>
                <Label htmlFor="followUpSchedule">Follow-up Schedule</Label>
                <Textarea
                  id="followUpSchedule"
                  value={formData.followUpSchedule}
                  onChange={(e) => handleInputChange("followUpSchedule", e.target.value)}
                  placeholder="Specify follow-up appointments and milestones"
                />
              </div>

              <div>
                <Label htmlFor="expectedRecovery">Expected Recovery Timeline</Label>
                <Textarea
                  id="expectedRecovery"
                  value={formData.expectedRecovery}
                  onChange={(e) => handleInputChange("expectedRecovery", e.target.value)}
                  placeholder="Outline expected recovery milestones"
                />
              </div>

              <div>
                <Label htmlFor="painManagement">Pain Management Protocol</Label>
                <Textarea
                  id="painManagement"
                  value={formData.painManagement}
                  onChange={(e) => handleInputChange("painManagement", e.target.value)}
                  placeholder="Detail pain management strategy"
                />
              </div>

              <div>
                <Label htmlFor="bandageInstructions">Bandage Care Instructions</Label>
                <Textarea
                  id="bandageInstructions"
                  value={formData.bandageInstructions}
                  onChange={(e) => handleInputChange("bandageInstructions", e.target.value)}
                  placeholder="Bandage change schedule and care instructions"
                />
              </div>

              <div>
                <Label htmlFor="exerciseProtocol">Exercise Protocol</Label>
                <Textarea
                  id="exerciseProtocol"
                  value={formData.exerciseProtocol}
                  onChange={(e) => handleInputChange("exerciseProtocol", e.target.value)}
                  placeholder="Detailed exercise and physical therapy instructions"
                />
              </div>

              <div>
                <Label htmlFor="surgeonName">Surgeon Name *</Label>
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