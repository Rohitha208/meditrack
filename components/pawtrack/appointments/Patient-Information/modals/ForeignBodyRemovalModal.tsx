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

interface ForeignBodyRemovalModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface ForeignBodyRemovalFormData {
  objectType: string
  customObjectType: string
  location: string
  customLocation: string
  detectionMethod: string
  objectSize: string
  objectMaterial: string
  extractionMethod: string
  anesthesiaType: string
  imagingUsed: boolean
  imagingType: string
  imagingFindings: string
  complications: string
  tissueTrauma: string
  postOpCare: string
  medications: string
  followUpPlan: string
  preventiveAdvice: string
  consentObtained: boolean
  surgeonName: string
  assistantName: string
}

export default function ForeignBodyRemovalModal({
  open,
  onClose,
  patientId,
  appointmentId,
  procedureId
}: ForeignBodyRemovalModalProps) {
  // Form state
  const [formData, setFormData] = useState<ForeignBodyRemovalFormData>({
    objectType: "",
    customObjectType: "",
    location: "",
    customLocation: "",
    detectionMethod: "",
    objectSize: "",
    objectMaterial: "",
    extractionMethod: "",
    anesthesiaType: "",
    imagingUsed: false,
    imagingType: "",
    imagingFindings: "",
    complications: "",
    tissueTrauma: "",
    postOpCare: "",
    medications: "",
    followUpPlan: "",
    preventiveAdvice: "",
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
          objectType: parsedDetails.objectType || "",
          customObjectType: parsedDetails.customObjectType || "",
          location: parsedDetails.location || "",
          customLocation: parsedDetails.customLocation || "",
          detectionMethod: parsedDetails.detectionMethod || "",
          objectSize: parsedDetails.objectSize || "",
          objectMaterial: parsedDetails.objectMaterial || "",
          extractionMethod: parsedDetails.extractionMethod || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          imagingType: parsedDetails.imagingType || "",
          imagingFindings: parsedDetails.imagingFindings || "",
          complications: parsedDetails.complications || "",
          tissueTrauma: parsedDetails.tissueTrauma || "",
          postOpCare: parsedDetails.postOpCare || "",
          medications: parsedDetails.medications || "",
          followUpPlan: parsedDetails.followUpPlan || "",
          preventiveAdvice: parsedDetails.preventiveAdvice || "",
          surgeonName: parsedDetails.surgeonName || "",
          assistantName: parsedDetails.assistantName || "",
          
          // Ensure boolean values for checkboxes
          imagingUsed: !!parsedDetails.imagingUsed,
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
        objectType: "",
        customObjectType: "",
        location: "",
        customLocation: "",
        detectionMethod: "",
        objectSize: "",
        objectMaterial: "",
        extractionMethod: "",
        anesthesiaType: "",
        imagingUsed: false,
        imagingType: "",
        imagingFindings: "",
        complications: "",
        tissueTrauma: "",
        postOpCare: "",
        medications: "",
        followUpPlan: "",
        preventiveAdvice: "",
        consentObtained: false,
        surgeonName: "",
        assistantName: ""
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof ForeignBodyRemovalFormData, value: string | boolean) => {
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

    if (!formData.objectType || !formData.location || !formData.extractionMethod || !formData.anesthesiaType || !formData.surgeonName) {
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
      
      toast.success("Foreign body removal documentation updated successfully")
      return true
    } catch (error) {
      console.error("Error saving foreign body removal documentation:", error)
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
          <SheetTitle>Foreign Body Removal Documentation</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="objectType">Foreign Body Type *</Label>
                <Select 
                  value={formData.objectType} 
                  onValueChange={(value) => handleInputChange("objectType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select object type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food Item</SelectItem>
                    <SelectItem value="toy">Toy/Play Item</SelectItem>
                    <SelectItem value="fabric">Fabric/Textile</SelectItem>
                    <SelectItem value="plant">Plant Material</SelectItem>
                    <SelectItem value="metal">Metal Object</SelectItem>
                    <SelectItem value="plastic">Plastic Object</SelectItem>
                    <SelectItem value="bone">Bone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.objectType === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Specify object type"
                    value={formData.customObjectType}
                    onChange={(e) => handleInputChange("customObjectType", e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="location">Location *</Label>
                <Select 
                  value={formData.location} 
                  onValueChange={(value) => handleInputChange("location", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esophagus">Esophagus</SelectItem>
                    <SelectItem value="stomach">Stomach</SelectItem>
                    <SelectItem value="intestine">Intestine</SelectItem>
                    <SelectItem value="skin">Skin/Subcutaneous</SelectItem>
                    <SelectItem value="paw">Paw/Foot</SelectItem>
                    <SelectItem value="ear">Ear Canal</SelectItem>
                    <SelectItem value="nose">Nasal Passage</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.location === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Specify location"
                    value={formData.customLocation}
                    onChange={(e) => handleInputChange("customLocation", e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="detectionMethod">Detection Method</Label>
                <Input
                  id="detectionMethod"
                  value={formData.detectionMethod}
                  onChange={(e) => handleInputChange("detectionMethod", e.target.value)}
                  placeholder="How was the foreign body detected?"
                />
              </div>

              <div>
                <Label htmlFor="objectSize">Object Size/Dimensions</Label>
                <Input
                  id="objectSize"
                  value={formData.objectSize}
                  onChange={(e) => handleInputChange("objectSize", e.target.value)}
                  placeholder="Approximate size or dimensions"
                />
              </div>

              <div>
                <Label htmlFor="objectMaterial">Object Material/Composition</Label>
                <Input
                  id="objectMaterial"
                  value={formData.objectMaterial}
                  onChange={(e) => handleInputChange("objectMaterial", e.target.value)}
                  placeholder="Material composition if known"
                />
              </div>

              <div>
                <Label htmlFor="extractionMethod">Extraction Method *</Label>
                <Select 
                  value={formData.extractionMethod} 
                  onValueChange={(value) => handleInputChange("extractionMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select extraction method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="endoscopic">Endoscopic Removal</SelectItem>
                    <SelectItem value="surgical">Surgical Extraction</SelectItem>
                    <SelectItem value="manual">Manual Extraction</SelectItem>
                    <SelectItem value="forceps">Forceps Removal</SelectItem>
                    <SelectItem value="flush">Flush/Irrigation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                    <SelectItem value="local">Local Anesthesia</SelectItem>
                    <SelectItem value="sedation">Sedation</SelectItem>
                    <SelectItem value="none">None Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="imagingUsed"
                  checked={formData.imagingUsed}
                  onCheckedChange={(checked) => handleInputChange("imagingUsed", checked as boolean)}
                />
                <Label htmlFor="imagingUsed">Imaging Used</Label>
              </div>

              {formData.imagingUsed && (
                <>
                  <div>
                    <Label htmlFor="imagingType">Imaging Type</Label>
                    <Select 
                      value={formData.imagingType} 
                      onValueChange={(value) => handleInputChange("imagingType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select imaging type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xray">X-Ray</SelectItem>
                        <SelectItem value="ultrasound">Ultrasound</SelectItem>
                        <SelectItem value="ct">CT Scan</SelectItem>
                        <SelectItem value="endoscopy">Endoscopy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="imagingFindings">Imaging Findings</Label>
                    <Textarea
                      id="imagingFindings"
                      value={formData.imagingFindings}
                      onChange={(e) => handleInputChange("imagingFindings", e.target.value)}
                      placeholder="Describe imaging findings"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  id="complications"
                  value={formData.complications}
                  onChange={(e) => handleInputChange("complications", e.target.value)}
                  placeholder="Note any complications during procedure"
                />
              </div>

              <div>
                <Label htmlFor="tissueTrauma">Tissue Trauma Assessment</Label>
                <Textarea
                  id="tissueTrauma"
                  value={formData.tissueTrauma}
                  onChange={(e) => handleInputChange("tissueTrauma", e.target.value)}
                  placeholder="Describe any tissue damage or trauma"
                />
              </div>

              <div>
                <Label htmlFor="postOpCare">Post-Procedure Care</Label>
                <Textarea
                  id="postOpCare"
                  value={formData.postOpCare}
                  onChange={(e) => handleInputChange("postOpCare", e.target.value)}
                  placeholder="Post-procedure care instructions"
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
                <Label htmlFor="followUpPlan">Follow-up Plan</Label>
                <Textarea
                  id="followUpPlan"
                  value={formData.followUpPlan}
                  onChange={(e) => handleInputChange("followUpPlan", e.target.value)}
                  placeholder="Specify follow-up schedule and requirements"
                />
              </div>

              <div>
                <Label htmlFor="preventiveAdvice">Preventive Advice</Label>
                <Textarea
                  id="preventiveAdvice"
                  value={formData.preventiveAdvice}
                  onChange={(e) => handleInputChange("preventiveAdvice", e.target.value)}
                  placeholder="Advice to prevent future incidents"
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