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

interface WeightManagementModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface WeightManagementFormData {
  currentWeight: string
  targetWeight: string
  bodyConditionScore: string
  muscleConditionScore: string
  weightHistory: string
  dietType: string
  currentDiet: string
  recommendedDiet: string
  feedingFrequency: string
  portionSize: string
  calorieIntake: string
  treatAllowance: string
  exerciseType: string[]
  exerciseDuration: string
  exerciseFrequency: string
  exerciseRestrictions: string
  medicalConditions: string[]
  medications: string
  metabolicRate: string
  weightLossRate: string
  behavioralModification: string
  environmentalEnrichment: string
  familyInvolvement: string
  progressMonitoring: string
  treatmentDate: string
  nextCheckupDate: string
  treatingVet: string
  ownerConsent: boolean
  notes: string
}

export default function WeightManagementModal({ open, onClose, patientId, appointmentId, procedureId }: WeightManagementModalProps) {
  const [formData, setFormData] = useState<WeightManagementFormData>({
    currentWeight: "",
    targetWeight: "",
    bodyConditionScore: "",
    muscleConditionScore: "",
    weightHistory: "",
    dietType: "",
    currentDiet: "",
    recommendedDiet: "",
    feedingFrequency: "",
    portionSize: "",
    calorieIntake: "",
    treatAllowance: "",
    exerciseType: [],
    exerciseDuration: "",
    exerciseFrequency: "",
    exerciseRestrictions: "",
    medicalConditions: [],
    medications: "",
    metabolicRate: "",
    weightLossRate: "",
    behavioralModification: "",
    environmentalEnrichment: "",
    familyInvolvement: "",
    progressMonitoring: "",
    treatmentDate: new Date().toISOString().slice(0, 16),
    nextCheckupDate: "",
    treatingVet: "",
    ownerConsent: false,
    notes: ""
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
          currentWeight: parsedDetails.currentWeight || "",
          targetWeight: parsedDetails.targetWeight || "",
          bodyConditionScore: parsedDetails.bodyConditionScore || "",
          muscleConditionScore: parsedDetails.muscleConditionScore || "",
          weightHistory: parsedDetails.weightHistory || "",
          dietType: parsedDetails.dietType || "",
          currentDiet: parsedDetails.currentDiet || "",
          recommendedDiet: parsedDetails.recommendedDiet || "",
          feedingFrequency: parsedDetails.feedingFrequency || "",
          portionSize: parsedDetails.portionSize || "",
          calorieIntake: parsedDetails.calorieIntake || "",
          treatAllowance: parsedDetails.treatAllowance || "",
          exerciseDuration: parsedDetails.exerciseDuration || "",
          exerciseFrequency: parsedDetails.exerciseFrequency || "",
          exerciseRestrictions: parsedDetails.exerciseRestrictions || "",
          medications: parsedDetails.medications || "",
          metabolicRate: parsedDetails.metabolicRate || "",
          weightLossRate: parsedDetails.weightLossRate || "",
          behavioralModification: parsedDetails.behavioralModification || "",
          environmentalEnrichment: parsedDetails.environmentalEnrichment || "",
          familyInvolvement: parsedDetails.familyInvolvement || "",
          progressMonitoring: parsedDetails.progressMonitoring || "",
          treatmentDate: parsedDetails.treatmentDate || new Date().toISOString().slice(0, 16),
          nextCheckupDate: parsedDetails.nextCheckupDate || "",
          treatingVet: parsedDetails.treatingVet || "",
          notes: parsedDetails.notes || "",
          
          // Ensure array values for fields
          exerciseType: Array.isArray(parsedDetails.exerciseType) ? parsedDetails.exerciseType : [],
          medicalConditions: Array.isArray(parsedDetails.medicalConditions) ? parsedDetails.medicalConditions : [],
          
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
        currentWeight: "",
        targetWeight: "",
        bodyConditionScore: "",
        muscleConditionScore: "",
        weightHistory: "",
        dietType: "",
        currentDiet: "",
        recommendedDiet: "",
        feedingFrequency: "",
        portionSize: "",
        calorieIntake: "",
        treatAllowance: "",
        exerciseType: [],
        exerciseDuration: "",
        exerciseFrequency: "",
        exerciseRestrictions: "",
        medicalConditions: [],
        medications: "",
        metabolicRate: "",
        weightLossRate: "",
        behavioralModification: "",
        environmentalEnrichment: "",
        familyInvolvement: "",
        progressMonitoring: "",
        treatmentDate: new Date().toISOString().slice(0, 16),
        nextCheckupDate: "",
        treatingVet: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const bodyScores = [
    { value: "1", label: "1 - Emaciated" },
    { value: "2", label: "2 - Very Thin" },
    { value: "3", label: "3 - Thin" },
    { value: "4", label: "4 - Underweight" },
    { value: "5", label: "5 - Ideal" },
    { value: "6", label: "6 - Overweight" },
    { value: "7", label: "7 - Heavy" },
    { value: "8", label: "8 - Obese" },
    { value: "9", label: "9 - Severely Obese" }
  ]

  const muscleScores = [
    { value: "normal", label: "Normal" },
    { value: "mild", label: "Mild Loss" },
    { value: "moderate", label: "Moderate Loss" },
    { value: "severe", label: "Severe Loss" }
  ]

  const dietTypes = [
    { value: "weight-loss", label: "Weight Loss Diet" },
    { value: "weight-gain", label: "Weight Gain Diet" },
    { value: "maintenance", label: "Maintenance Diet" },
    { value: "prescription", label: "Prescription Diet" },
    { value: "custom", label: "Custom Diet Plan" }
  ]

  const exerciseTypes = [
    { value: "walking", label: "Walking" },
    { value: "swimming", label: "Swimming" },
    { value: "fetch", label: "Fetch/Play" },
    { value: "agility", label: "Agility Training" },
    { value: "treadmill", label: "Treadmill" },
    { value: "hydrotherapy", label: "Hydrotherapy" }
  ]

  const medicalConditionsList = [
    { value: "arthritis", label: "Arthritis" },
    { value: "diabetes", label: "Diabetes" },
    { value: "heart-disease", label: "Heart Disease" },
    { value: "thyroid", label: "Thyroid Disease" },
    { value: "kidney-disease", label: "Kidney Disease" },
    { value: "joint-problems", label: "Joint Problems" }
  ]

  const handleInputChange = (field: keyof WeightManagementFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = [
      'currentWeight',
      'targetWeight',
      'bodyConditionScore',
      'dietType',
      'recommendedDiet',
      'feedingFrequency',
      'portionSize',
      'treatmentDate',
      'nextCheckupDate',
      'treatingVet'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof WeightManagementFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (formData.exerciseType.length === 0) {
      toast.error("At least one exercise type must be selected")
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
      
      toast.success("Weight management plan updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving weight management plan:", error)
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
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            ⚖️ Weight Management Plan Documentation
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentWeight">
                  Current Weight (kg) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.currentWeight}
                  onChange={(e) => handleInputChange('currentWeight', e.target.value)}
                  placeholder="Enter current weight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetWeight">
                  Target Weight (kg) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.targetWeight}
                  onChange={(e) => handleInputChange('targetWeight', e.target.value)}
                  placeholder="Enter target weight"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bodyConditionScore">
                  Body Condition Score <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.bodyConditionScore} onValueChange={(value) => handleInputChange('bodyConditionScore', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select score..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyScores.map(score => (
                      <SelectItem key={score.value} value={score.value}>{score.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="muscleConditionScore">Muscle Condition Score</Label>
                <Select value={formData.muscleConditionScore} onValueChange={(value) => handleInputChange('muscleConditionScore', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select score..." />
                  </SelectTrigger>
                  <SelectContent>
                    {muscleScores.map(score => (
                      <SelectItem key={score.value} value={score.value}>{score.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightHistory">Weight History</Label>
              <Textarea
                value={formData.weightHistory}
                onChange={(e) => handleInputChange('weightHistory', e.target.value)}
                placeholder="Document previous weight measurements and changes..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dietType">
                  Diet Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.dietType} onValueChange={(value) => handleInputChange('dietType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select diet type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dietTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentDiet">Current Diet</Label>
                <Input
                  type="text"
                  value={formData.currentDiet}
                  onChange={(e) => handleInputChange('currentDiet', e.target.value)}
                  placeholder="Enter current diet details"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recommendedDiet">
                  Recommended Diet <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.recommendedDiet}
                  onChange={(e) => handleInputChange('recommendedDiet', e.target.value)}
                  placeholder="Enter recommended diet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calorieIntake">Daily Calorie Intake</Label>
                <Input
                  type="text"
                  value={formData.calorieIntake}
                  onChange={(e) => handleInputChange('calorieIntake', e.target.value)}
                  placeholder="Enter daily calories"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feedingFrequency">
                  Feeding Frequency <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.feedingFrequency}
                  onChange={(e) => handleInputChange('feedingFrequency', e.target.value)}
                  placeholder="Enter feeding frequency"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portionSize">
                  Portion Size <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.portionSize}
                  onChange={(e) => handleInputChange('portionSize', e.target.value)}
                  placeholder="Enter portion size"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatAllowance">Treat Allowance</Label>
              <Input
                type="text"
                value={formData.treatAllowance}
                onChange={(e) => handleInputChange('treatAllowance', e.target.value)}
                placeholder="Enter treat allowance"
              />
            </div>

            <div className="space-y-2">
              <Label>Exercise Types <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {exerciseTypes.map(type => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exercise-${type.value}`}
                      checked={formData.exerciseType.includes(type.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('exerciseType', [...formData.exerciseType, type.value])
                        } else {
                          handleInputChange('exerciseType', formData.exerciseType.filter(t => t !== type.value))
                        }
                      }}
                    />
                    <Label htmlFor={`exercise-${type.value}`}>{type.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exerciseDuration">Exercise Duration</Label>
                <Input
                  type="text"
                  value={formData.exerciseDuration}
                  onChange={(e) => handleInputChange('exerciseDuration', e.target.value)}
                  placeholder="Enter exercise duration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exerciseFrequency">Exercise Frequency</Label>
                <Input
                  type="text"
                  value={formData.exerciseFrequency}
                  onChange={(e) => handleInputChange('exerciseFrequency', e.target.value)}
                  placeholder="Enter exercise frequency"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {medicalConditionsList.map(condition => (
                  <div key={condition.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`condition-${condition.value}`}
                      checked={formData.medicalConditions.includes(condition.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('medicalConditions', [...formData.medicalConditions, condition.value])
                        } else {
                          handleInputChange('medicalConditions', formData.medicalConditions.filter(c => c !== condition.value))
                        }
                      }}
                    />
                    <Label htmlFor={`condition-${condition.value}`}>{condition.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">Current Medications</Label>
              <Textarea
                value={formData.medications}
                onChange={(e) => handleInputChange('medications', e.target.value)}
                placeholder="List current medications..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exerciseRestrictions">Exercise Restrictions</Label>
              <Textarea
                value={formData.exerciseRestrictions}
                onChange={(e) => handleInputChange('exerciseRestrictions', e.target.value)}
                placeholder="Document any exercise restrictions..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metabolicRate">Metabolic Rate</Label>
                <Input
                  type="text"
                  value={formData.metabolicRate}
                  onChange={(e) => handleInputChange('metabolicRate', e.target.value)}
                  placeholder="Enter metabolic rate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightLossRate">Target Weight Loss Rate</Label>
                <Input
                  type="text"
                  value={formData.weightLossRate}
                  onChange={(e) => handleInputChange('weightLossRate', e.target.value)}
                  placeholder="Enter target rate"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="behavioralModification">Behavioral Modification</Label>
              <Textarea
                value={formData.behavioralModification}
                onChange={(e) => handleInputChange('behavioralModification', e.target.value)}
                placeholder="Document behavioral modification strategies..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environmentalEnrichment">Environmental Enrichment</Label>
              <Textarea
                value={formData.environmentalEnrichment}
                onChange={(e) => handleInputChange('environmentalEnrichment', e.target.value)}
                placeholder="Document environmental enrichment plans..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyInvolvement">Family Involvement</Label>
              <Textarea
                value={formData.familyInvolvement}
                onChange={(e) => handleInputChange('familyInvolvement', e.target.value)}
                placeholder="Document family involvement plan..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="progressMonitoring">Progress Monitoring Plan</Label>
              <Textarea
                value={formData.progressMonitoring}
                onChange={(e) => handleInputChange('progressMonitoring', e.target.value)}
                placeholder="Document how progress will be monitored..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="treatmentDate">
                  Treatment Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.treatmentDate}
                  onChange={(e) => handleInputChange('treatmentDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextCheckupDate">
                  Next Checkup Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.nextCheckupDate}
                  onChange={(e) => handleInputChange('nextCheckupDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatingVet">
                Treating Veterinarian <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={formData.treatingVet}
                onChange={(e) => handleInputChange('treatingVet', e.target.value)}
                placeholder="Name of treating vet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes about the weight management plan..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerConsent"
                  checked={formData.ownerConsent}
                  onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
                />
                <Label htmlFor="ownerConsent">
                  Owner consent obtained for treatment plan <span className="text-red-500">*</span>
                </Label>
              </div>
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