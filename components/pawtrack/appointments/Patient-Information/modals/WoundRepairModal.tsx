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

interface WoundRepairModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface WoundRepairFormData {
  woundType: string
  customWoundType: string
  woundLocation: string
  woundSize: string
  woundDepth: string
  woundAge: string
  causeOfInjury: string
  contaminationLevel: string
  tissueViability: string
  cleaningMethod: string
  cleaningSolution: string
  debrided: boolean
  debridementMethod: string
  anesthesiaType: string
  sutureType: string
  sutureMaterial: string
  layersClosed: string
  drainPlaced: boolean
  drainType: string
  bandageType: string
  medications: string
  antibiotics: string
  painControl: string
  complications: string
  homeInstructions: string
  activityRestrictions: string
  bandageChangeSchedule: string
  followUpPlan: string
  sutureRemovalDate: string
  healingProgress: string
  consentObtained: boolean
  surgeonName: string
  assistantName: string
}

export default function WoundRepairModal({
  open,
  onClose,
  patientId,
  appointmentId,
  procedureId,
}: WoundRepairModalProps) {
  // Form state
  const [formData, setFormData] = useState<WoundRepairFormData>({
    woundType: "",
    customWoundType: "",
    woundLocation: "",
    woundSize: "",
    woundDepth: "",
    woundAge: "",
    causeOfInjury: "",
    contaminationLevel: "",
    tissueViability: "",
    cleaningMethod: "",
    cleaningSolution: "",
    debrided: false,
    debridementMethod: "",
    anesthesiaType: "",
    sutureType: "",
    sutureMaterial: "",
    layersClosed: "",
    drainPlaced: false,
    drainType: "",
    bandageType: "",
    medications: "",
    antibiotics: "",
    painControl: "",
    complications: "",
    homeInstructions: "",
    activityRestrictions: "",
    bandageChangeSchedule: "",
    followUpPlan: "",
    sutureRemovalDate: "",
    healingProgress: "",
    consentObtained: false,
    surgeonName: "",
    assistantName: "",
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
          woundType: parsedDetails.woundType || "",
          customWoundType: parsedDetails.customWoundType || "",
          woundLocation: parsedDetails.woundLocation || "",
          woundSize: parsedDetails.woundSize || "",
          woundDepth: parsedDetails.woundDepth || "",
          woundAge: parsedDetails.woundAge || "",
          causeOfInjury: parsedDetails.causeOfInjury || "",
          contaminationLevel: parsedDetails.contaminationLevel || "",
          tissueViability: parsedDetails.tissueViability || "",
          cleaningMethod: parsedDetails.cleaningMethod || "",
          cleaningSolution: parsedDetails.cleaningSolution || "",
          debridementMethod: parsedDetails.debridementMethod || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          sutureType: parsedDetails.sutureType || "",
          sutureMaterial: parsedDetails.sutureMaterial || "",
          layersClosed: parsedDetails.layersClosed || "",
          drainType: parsedDetails.drainType || "",
          bandageType: parsedDetails.bandageType || "",
          medications: parsedDetails.medications || "",
          antibiotics: parsedDetails.antibiotics || "",
          painControl: parsedDetails.painControl || "",
          complications: parsedDetails.complications || "",
          homeInstructions: parsedDetails.homeInstructions || "",
          activityRestrictions: parsedDetails.activityRestrictions || "",
          bandageChangeSchedule: parsedDetails.bandageChangeSchedule || "",
          followUpPlan: parsedDetails.followUpPlan || "",
          sutureRemovalDate: parsedDetails.sutureRemovalDate || "",
          healingProgress: parsedDetails.healingProgress || "",
          surgeonName: parsedDetails.surgeonName || "",
          assistantName: parsedDetails.assistantName || "",
          
          // Ensure boolean values for checkboxes
          debrided: !!parsedDetails.debrided,
          drainPlaced: !!parsedDetails.drainPlaced,
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
        woundType: "",
        customWoundType: "",
        woundLocation: "",
        woundSize: "",
        woundDepth: "",
        woundAge: "",
        causeOfInjury: "",
        contaminationLevel: "",
        tissueViability: "",
        cleaningMethod: "",
        cleaningSolution: "",
        debrided: false,
        debridementMethod: "",
        anesthesiaType: "",
        sutureType: "",
        sutureMaterial: "",
        layersClosed: "",
        drainPlaced: false,
        drainType: "",
        bandageType: "",
        medications: "",
        antibiotics: "",
        painControl: "",
        complications: "",
        homeInstructions: "",
        activityRestrictions: "",
        bandageChangeSchedule: "",
        followUpPlan: "",
        sutureRemovalDate: "",
        healingProgress: "",
        consentObtained: false,
        surgeonName: "",
        assistantName: "",
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  // Handle form field changes
  const handleInputChange = (field: keyof WoundRepairFormData, value: string | boolean) => {
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

    if (!formData.woundType || !formData.woundLocation || !formData.anesthesiaType || !formData.surgeonName) {
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
      
      toast.success("Wound repair documentation updated successfully")
      return true
    } catch (error) {
      console.error("Error saving wound repair documentation:", error)
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
          <SheetTitle>Wound Repair Documentation</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="woundType">Wound Type *</Label>
                <Select 
                  value={formData.woundType} 
                  onValueChange={(value) => handleInputChange("woundType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select wound type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laceration">Laceration</SelectItem>
                    <SelectItem value="puncture">Puncture Wound</SelectItem>
                    <SelectItem value="abrasion">Abrasion</SelectItem>
                    <SelectItem value="avulsion">Avulsion</SelectItem>
                    <SelectItem value="bite">Bite Wound</SelectItem>
                    <SelectItem value="surgical">Surgical Wound</SelectItem>
                    <SelectItem value="burn">Burn</SelectItem>
                    <SelectItem value="degloving">Degloving Injury</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.woundType === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Specify wound type"
                    value={formData.customWoundType}
                    onChange={(e) => handleInputChange("customWoundType", e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="woundLocation">Wound Location *</Label>
                <Input
                  id="woundLocation"
                  value={formData.woundLocation}
                  onChange={(e) => handleInputChange("woundLocation", e.target.value)}
                  placeholder="Anatomical location of wound"
                />
              </div>

              <div>
                <Label htmlFor="woundSize">Wound Size</Label>
                <Input
                  id="woundSize"
                  value={formData.woundSize}
                  onChange={(e) => handleInputChange("woundSize", e.target.value)}
                  placeholder="Length x width x depth in cm"
                />
              </div>

              <div>
                <Label htmlFor="woundDepth">Wound Depth</Label>
                <Select 
                  value={formData.woundDepth} 
                  onValueChange={(value) => handleInputChange("woundDepth", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select wound depth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superficial">Superficial</SelectItem>
                    <SelectItem value="partial">Partial Thickness</SelectItem>
                    <SelectItem value="full">Full Thickness</SelectItem>
                    <SelectItem value="deep">Deep Tissue Involvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="woundAge">Wound Age/Duration</Label>
                <Input
                  id="woundAge"
                  value={formData.woundAge}
                  onChange={(e) => handleInputChange("woundAge", e.target.value)}
                  placeholder="Time since injury occurred"
                />
              </div>

              <div>
                <Label htmlFor="causeOfInjury">Cause of Injury</Label>
                <Textarea
                  id="causeOfInjury"
                  value={formData.causeOfInjury}
                  onChange={(e) => handleInputChange("causeOfInjury", e.target.value)}
                  placeholder="Describe how the injury occurred"
                />
              </div>

              <div>
                <Label htmlFor="contaminationLevel">Contamination Level</Label>
                <Select 
                  value={formData.contaminationLevel} 
                  onValueChange={(value) => handleInputChange("contaminationLevel", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contamination level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">Clean</SelectItem>
                    <SelectItem value="clean-contaminated">Clean-Contaminated</SelectItem>
                    <SelectItem value="contaminated">Contaminated</SelectItem>
                    <SelectItem value="dirty">Dirty/Infected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tissueViability">Tissue Viability</Label>
                <Textarea
                  id="tissueViability"
                  value={formData.tissueViability}
                  onChange={(e) => handleInputChange("tissueViability", e.target.value)}
                  placeholder="Describe tissue condition and viability"
                />
              </div>

              <div>
                <Label htmlFor="cleaningMethod">Cleaning Method</Label>
                <Select 
                  value={formData.cleaningMethod} 
                  onValueChange={(value) => handleInputChange("cleaningMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cleaning method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="irrigation">Irrigation</SelectItem>
                    <SelectItem value="scrubbing">Surgical Scrub</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cleaningSolution">Cleaning Solution</Label>
                <Input
                  id="cleaningSolution"
                  value={formData.cleaningSolution}
                  onChange={(e) => handleInputChange("cleaningSolution", e.target.value)}
                  placeholder="Solution used for cleaning"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="debrided"
                  checked={formData.debrided}
                  onCheckedChange={(checked) => handleInputChange("debrided", checked as boolean)}
                />
                <Label htmlFor="debrided">Debridement Performed</Label>
              </div>

              {formData.debrided && (
                <div>
                  <Label htmlFor="debridementMethod">Debridement Method</Label>
                  <Select 
                    value={formData.debridementMethod} 
                    onValueChange={(value) => handleInputChange("debridementMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select debridement method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sharp">Sharp/Surgical</SelectItem>
                      <SelectItem value="mechanical">Mechanical</SelectItem>
                      <SelectItem value="enzymatic">Enzymatic</SelectItem>
                      <SelectItem value="autolytic">Autolytic</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="regional">Regional Block</SelectItem>
                    <SelectItem value="sedation">Sedation</SelectItem>
                    <SelectItem value="general">General Anesthesia</SelectItem>
                    <SelectItem value="none">None Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sutureType">Suture Pattern</Label>
                <Input
                  id="sutureType"
                  value={formData.sutureType}
                  onChange={(e) => handleInputChange("sutureType", e.target.value)}
                  placeholder="Type of suture pattern used"
                />
              </div>

              <div>
                <Label htmlFor="sutureMaterial">Suture Material</Label>
                <Input
                  id="sutureMaterial"
                  value={formData.sutureMaterial}
                  onChange={(e) => handleInputChange("sutureMaterial", e.target.value)}
                  placeholder="Type and size of suture material"
                />
              </div>

              <div>
                <Label htmlFor="layersClosed">Layers Closed</Label>
                <Textarea
                  id="layersClosed"
                  value={formData.layersClosed}
                  onChange={(e) => handleInputChange("layersClosed", e.target.value)}
                  placeholder="Description of tissue layers closed"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="drainPlaced"
                  checked={formData.drainPlaced}
                  onCheckedChange={(checked) => handleInputChange("drainPlaced", checked as boolean)}
                />
                <Label htmlFor="drainPlaced">Drain Placed</Label>
              </div>

              {formData.drainPlaced && (
                <div>
                  <Label htmlFor="drainType">Drain Type</Label>
                  <Input
                    id="drainType"
                    value={formData.drainType}
                    onChange={(e) => handleInputChange("drainType", e.target.value)}
                    placeholder="Type of drain used"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="bandageType">Bandage Type</Label>
                <Input
                  id="bandageType"
                  value={formData.bandageType}
                  onChange={(e) => handleInputChange("bandageType", e.target.value)}
                  placeholder="Type of bandage applied"
                />
              </div>

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
                <Label htmlFor="antibiotics">Antibiotics</Label>
                <Textarea
                  id="antibiotics"
                  value={formData.antibiotics}
                  onChange={(e) => handleInputChange("antibiotics", e.target.value)}
                  placeholder="Antibiotic selection and duration"
                />
              </div>

              <div>
                <Label htmlFor="painControl">Pain Control</Label>
                <Textarea
                  id="painControl"
                  value={formData.painControl}
                  onChange={(e) => handleInputChange("painControl", e.target.value)}
                  placeholder="Pain management protocol"
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
                <Label htmlFor="activityRestrictions">Activity Restrictions</Label>
                <Textarea
                  id="activityRestrictions"
                  value={formData.activityRestrictions}
                  onChange={(e) => handleInputChange("activityRestrictions", e.target.value)}
                  placeholder="Specify activity restrictions"
                />
              </div>

              <div>
                <Label htmlFor="bandageChangeSchedule">Bandage Change Schedule</Label>
                <Textarea
                  id="bandageChangeSchedule"
                  value={formData.bandageChangeSchedule}
                  onChange={(e) => handleInputChange("bandageChangeSchedule", e.target.value)}
                  placeholder="Schedule for bandage changes"
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
                <Label htmlFor="sutureRemovalDate">Suture Removal Date</Label>
                <Input
                  id="sutureRemovalDate"
                  value={formData.sutureRemovalDate}
                  onChange={(e) => handleInputChange("sutureRemovalDate", e.target.value)}
                  placeholder="Planned date for suture removal"
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
                <Label htmlFor="surgeonName">Surgeon/Clinician Name *</Label>
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
                  Owner consent obtained for procedure *
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