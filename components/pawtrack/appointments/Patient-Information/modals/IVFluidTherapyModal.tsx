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

interface IVFluidTherapyModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface IVFluidTherapyFormData {
  fluidType: string
  fluidVolume: string
  administrationRate: string
  duration: string
  catheterType: string
  catheterSize: string
  catheterLocation: string
  primaryIndication: string
  secondaryIndications: string[]
  hydrationStatus: string
  bloodPressure: string
  heartRate: string
  respiratoryRate: string
  temperature: string
  weight: string
  electrolytesAdded: string[]
  additionalMedications: string
  fluidLotNumber: string
  fluidExpiryDate: string
  catheterPlacementTime: string
  startTime: string
  endTime: string
  monitoringFrequency: string
  vitalSigns: string
  complications: string
  patientResponse: string
  fluidBalanceIn: string
  fluidBalanceOut: string
  catheterCare: string
  homeMonitoring: string
  asepticTechnique: boolean
  linePatency: boolean
  complicationChecks: boolean
  catheterSiteChecked: boolean
  ownerConsent: boolean
  treatingVet: string
  treatingNurse: string
  treatmentDate: string
  nextAssessment: string
  notes: string
}

export default function IVFluidTherapyModal({ open, onClose, patientId, appointmentId, procedureId }: IVFluidTherapyModalProps) {
  const [formData, setFormData] = useState<IVFluidTherapyFormData>({
    fluidType: "",
    fluidVolume: "",
    administrationRate: "",
    duration: "",
    catheterType: "",
    catheterSize: "",
    catheterLocation: "",
    primaryIndication: "",
    secondaryIndications: [],
    hydrationStatus: "",
    bloodPressure: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    weight: "",
    electrolytesAdded: [],
    additionalMedications: "",
    fluidLotNumber: "",
    fluidExpiryDate: "",
    catheterPlacementTime: "",
    startTime: "",
    endTime: "",
    monitoringFrequency: "",
    vitalSigns: "",
    complications: "",
    patientResponse: "",
    fluidBalanceIn: "",
    fluidBalanceOut: "",
    catheterCare: "",
    homeMonitoring: "",
    asepticTechnique: false,
    linePatency: false,
    complicationChecks: false,
    catheterSiteChecked: false,
    ownerConsent: false,
    treatingVet: "",
    treatingNurse: "",
    treatmentDate: new Date().toISOString().slice(0, 16),
    nextAssessment: "",
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
          fluidType: parsedDetails.fluidType || "",
          fluidVolume: parsedDetails.fluidVolume || "",
          administrationRate: parsedDetails.administrationRate || "",
          duration: parsedDetails.duration || "",
          catheterType: parsedDetails.catheterType || "",
          catheterSize: parsedDetails.catheterSize || "",
          catheterLocation: parsedDetails.catheterLocation || "",
          primaryIndication: parsedDetails.primaryIndication || "",
          hydrationStatus: parsedDetails.hydrationStatus || "",
          bloodPressure: parsedDetails.bloodPressure || "",
          heartRate: parsedDetails.heartRate || "",
          respiratoryRate: parsedDetails.respiratoryRate || "",
          temperature: parsedDetails.temperature || "",
          weight: parsedDetails.weight || "",
          additionalMedications: parsedDetails.additionalMedications || "",
          fluidLotNumber: parsedDetails.fluidLotNumber || "",
          fluidExpiryDate: parsedDetails.fluidExpiryDate || "",
          catheterPlacementTime: parsedDetails.catheterPlacementTime || "",
          startTime: parsedDetails.startTime || "",
          endTime: parsedDetails.endTime || "",
          monitoringFrequency: parsedDetails.monitoringFrequency || "",
          vitalSigns: parsedDetails.vitalSigns || "",
          complications: parsedDetails.complications || "",
          patientResponse: parsedDetails.patientResponse || "",
          fluidBalanceIn: parsedDetails.fluidBalanceIn || "",
          fluidBalanceOut: parsedDetails.fluidBalanceOut || "",
          catheterCare: parsedDetails.catheterCare || "",
          homeMonitoring: parsedDetails.homeMonitoring || "",
          treatingVet: parsedDetails.treatingVet || "",
          treatingNurse: parsedDetails.treatingNurse || "",
          treatmentDate: parsedDetails.treatmentDate || new Date().toISOString().slice(0, 16),
          nextAssessment: parsedDetails.nextAssessment || "",
          notes: parsedDetails.notes || "",
          
          // Ensure boolean values for checkboxes
          asepticTechnique: !!parsedDetails.asepticTechnique,
          linePatency: !!parsedDetails.linePatency,
          complicationChecks: !!parsedDetails.complicationChecks,
          catheterSiteChecked: !!parsedDetails.catheterSiteChecked,
          ownerConsent: !!parsedDetails.ownerConsent,
          
          // Ensure array values
          secondaryIndications: Array.isArray(parsedDetails.secondaryIndications) 
            ? parsedDetails.secondaryIndications 
            : [],
          electrolytesAdded: Array.isArray(parsedDetails.electrolytesAdded) 
            ? parsedDetails.electrolytesAdded 
            : []
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
        fluidType: "",
        fluidVolume: "",
        administrationRate: "",
        duration: "",
        catheterType: "",
        catheterSize: "",
        catheterLocation: "",
        primaryIndication: "",
        secondaryIndications: [],
        hydrationStatus: "",
        bloodPressure: "",
        heartRate: "",
        respiratoryRate: "",
        temperature: "",
        weight: "",
        electrolytesAdded: [],
        additionalMedications: "",
        fluidLotNumber: "",
        fluidExpiryDate: "",
        catheterPlacementTime: "",
        startTime: "",
        endTime: "",
        monitoringFrequency: "",
        vitalSigns: "",
        complications: "",
        patientResponse: "",
        fluidBalanceIn: "",
        fluidBalanceOut: "",
        catheterCare: "",
        homeMonitoring: "",
        asepticTechnique: false,
        linePatency: false,
        complicationChecks: false,
        catheterSiteChecked: false,
        ownerConsent: false,
        treatingVet: "",
        treatingNurse: "",
        treatmentDate: new Date().toISOString().slice(0, 16),
        nextAssessment: "",
        notes: ""
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [procedureDocumentDetails])

  const fluidTypes = [
    { value: "lactated-ringers", label: "Lactated Ringer's Solution" },
    { value: "normal-saline", label: "0.9% Normal Saline" },
    { value: "dextrose", label: "5% Dextrose" },
    { value: "plasma-lyte", label: "Plasma-Lyte" },
    { value: "normosol", label: "Normosol-R" }
  ]

  const catheterTypes = [
    { value: "peripheral", label: "Peripheral IV" },
    { value: "central", label: "Central Line" },
    { value: "butterfly", label: "Butterfly Needle" },
    { value: "jugular", label: "Jugular Catheter" }
  ]

  const indications = [
    { value: "dehydration", label: "Dehydration" },
    { value: "shock", label: "Shock" },
    { value: "pre-surgical", label: "Pre-surgical Support" },
    { value: "post-surgical", label: "Post-surgical Support" },
    { value: "electrolyte", label: "Electrolyte Imbalance" },
    { value: "maintenance", label: "Maintenance" }
  ]

  const electrolytes = [
    { value: "potassium", label: "Potassium Chloride (KCl)" },
    { value: "calcium", label: "Calcium Gluconate" },
    { value: "magnesium", label: "Magnesium Sulfate" },
    { value: "sodium", label: "Sodium Bicarbonate" },
    { value: "b-complex", label: "B-Complex" }
  ]

  const hydrationStatuses = [
    { value: "adequate", label: "Adequate" },
    { value: "mild", label: "Mild Dehydration (5%)" },
    { value: "moderate", label: "Moderate Dehydration (7-9%)" },
    { value: "severe", label: "Severe Dehydration (>10%)" }
  ]

  const handleInputChange = (field: keyof IVFluidTherapyFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = [
      'fluidType',
      'fluidVolume',
      'administrationRate',
      'duration',
      'catheterType',
      'catheterSize',
      'catheterLocation',
      'primaryIndication',
      'hydrationStatus',
      'bloodPressure',
      'heartRate',
      'weight',
      'startTime',
      'monitoringFrequency',
      'treatingVet',
      'treatingNurse',
      'treatmentDate'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof IVFluidTherapyFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (!formData.asepticTechnique || !formData.catheterSiteChecked) {
      toast.error("Safety checks must be completed")
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
      
      toast.success("IV fluid therapy documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving IV fluid therapy documentation:", error)
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
            💧 IV Fluid Therapy Documentation
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> Pet and client information will be automatically linked from the existing appointment record.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fluidType">
                    Fluid Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.fluidType} onValueChange={(value) => handleInputChange('fluidType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fluid type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fluidTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryIndication">
                    Primary Indication <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.primaryIndication} onValueChange={(value) => handleInputChange('primaryIndication', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select indication..." />
                    </SelectTrigger>
                    <SelectContent>
                      {indications.map(indication => (
                        <SelectItem key={indication.value} value={indication.value}>{indication.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary Indications</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {indications.map(indication => (
                    <div key={indication.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`indication-${indication.value}`}
                        checked={formData.secondaryIndications.includes(indication.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('secondaryIndications', [...formData.secondaryIndications, indication.value])
                          } else {
                            handleInputChange('secondaryIndications', formData.secondaryIndications.filter(i => i !== indication.value))
                          }
                        }}
                      />
                      <Label htmlFor={`indication-${indication.value}`}>{indication.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fluidVolume">
                    Total Fluid Volume (mL) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.fluidVolume}
                    onChange={(e) => handleInputChange('fluidVolume', e.target.value)}
                    placeholder="Enter volume"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="administrationRate">
                    Administration Rate (mL/hr) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.administrationRate}
                    onChange={(e) => handleInputChange('administrationRate', e.target.value)}
                    placeholder="Enter rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration (hours) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="Enter duration"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="catheterType">
                    Catheter Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.catheterType} onValueChange={(value) => handleInputChange('catheterType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catheterTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catheterSize">
                    Catheter Size <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.catheterSize}
                    onChange={(e) => handleInputChange('catheterSize', e.target.value)}
                    placeholder="e.g., 22G"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catheterLocation">
                    Catheter Location <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.catheterLocation}
                    onChange={(e) => handleInputChange('catheterLocation', e.target.value)}
                    placeholder="Enter location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hydrationStatus">
                    Hydration Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.hydrationStatus} onValueChange={(value) => handleInputChange('hydrationStatus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {hydrationStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">
                    Patient Weight (kg) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="Enter weight"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bloodPressure">
                    Blood Pressure <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.bloodPressure}
                    onChange={(e) => handleInputChange('bloodPressure', e.target.value)}
                    placeholder="e.g., 120/80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heartRate">
                    Heart Rate <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.heartRate}
                    onChange={(e) => handleInputChange('heartRate', e.target.value)}
                    placeholder="Enter heart rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                  <Input
                    type="text"
                    value={formData.respiratoryRate}
                    onChange={(e) => handleInputChange('respiratoryRate', e.target.value)}
                    placeholder="Enter resp rate"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Electrolytes Added</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {electrolytes.map(electrolyte => (
                    <div key={electrolyte.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`electrolyte-${electrolyte.value}`}
                        checked={formData.electrolytesAdded.includes(electrolyte.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('electrolytesAdded', [...formData.electrolytesAdded, electrolyte.value])
                          } else {
                            handleInputChange('electrolytesAdded', formData.electrolytesAdded.filter(e => e !== electrolyte.value))
                          }
                        }}
                      />
                      <Label htmlFor={`electrolyte-${electrolyte.value}`}>{electrolyte.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalMedications">Additional Medications</Label>
                <Textarea
                  value={formData.additionalMedications}
                  onChange={(e) => handleInputChange('additionalMedications', e.target.value)}
                  placeholder="List any additional medications added to fluids..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fluidLotNumber">Fluid Lot Number</Label>
                  <Input
                    type="text"
                    value={formData.fluidLotNumber}
                    onChange={(e) => handleInputChange('fluidLotNumber', e.target.value)}
                    placeholder="Enter lot number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fluidExpiryDate">Fluid Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData.fluidExpiryDate}
                    onChange={(e) => handleInputChange('fluidExpiryDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monitoringFrequency">
                    Monitoring Frequency <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.monitoringFrequency}
                    onChange={(e) => handleInputChange('monitoringFrequency', e.target.value)}
                    placeholder="e.g., Every 2 hours"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fluidBalanceIn">Fluid Balance In</Label>
                  <Input
                    type="text"
                    value={formData.fluidBalanceIn}
                    onChange={(e) => handleInputChange('fluidBalanceIn', e.target.value)}
                    placeholder="Enter fluid in"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fluidBalanceOut">Fluid Balance Out</Label>
                  <Input
                    type="text"
                    value={formData.fluidBalanceOut}
                    onChange={(e) => handleInputChange('fluidBalanceOut', e.target.value)}
                    placeholder="Enter fluid out"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  value={formData.complications}
                  onChange={(e) => handleInputChange('complications', e.target.value)}
                  placeholder="Document any complications..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientResponse">Patient Response</Label>
                <Textarea
                  value={formData.patientResponse}
                  onChange={(e) => handleInputChange('patientResponse', e.target.value)}
                  placeholder="Document patient's response to treatment..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="catheterCare">Catheter Care Instructions</Label>
                <Textarea
                  value={formData.catheterCare}
                  onChange={(e) => handleInputChange('catheterCare', e.target.value)}
                  placeholder="Document catheter care instructions..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeMonitoring">Home Monitoring Instructions</Label>
                <Textarea
                  value={formData.homeMonitoring}
                  onChange={(e) => handleInputChange('homeMonitoring', e.target.value)}
                  placeholder="Document home monitoring instructions..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="treatingVet">
                    Treating Veterinarian <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.treatingVet}
                    onChange={(e) => handleInputChange('treatingVet', e.target.value)}
                    placeholder="Enter veterinarian name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatingNurse">
                    Treating Nurse <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.treatingNurse}
                    onChange={(e) => handleInputChange('treatingNurse', e.target.value)}
                    placeholder="Enter nurse name"
                  />
                </div>
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
                  <Label htmlFor="nextAssessment">Next Assessment</Label>
                  <Input
                    type="datetime-local"
                    value={formData.nextAssessment}
                    onChange={(e) => handleInputChange('nextAssessment', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any other relevant notes about the treatment..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="asepticTechnique"
                    checked={formData.asepticTechnique}
                    onCheckedChange={(checked) => handleInputChange('asepticTechnique', checked as boolean)}
                  />
                  <Label htmlFor="asepticTechnique">
                    Aseptic technique maintained <span className="text-red-500">*</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="linePatency"
                    checked={formData.linePatency}
                    onCheckedChange={(checked) => handleInputChange('linePatency', checked as boolean)}
                  />
                  <Label htmlFor="linePatency">IV line patency verified</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="catheterSiteChecked"
                    checked={formData.catheterSiteChecked}
                    onCheckedChange={(checked) => handleInputChange('catheterSiteChecked', checked as boolean)}
                  />
                  <Label htmlFor="catheterSiteChecked">
                    Catheter site checked for complications <span className="text-red-500">*</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ownerConsent"
                    checked={formData.ownerConsent}
                    onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
                  />
                  <Label htmlFor="ownerConsent">
                    Owner consent obtained for treatment <span className="text-red-500">*</span>
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
} 