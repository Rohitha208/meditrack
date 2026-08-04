"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useGetProcedures } from "@/queries/procedure/get-procedures"
import { useCreateProcedure } from "@/queries/procedure/create-procedure"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, X, Mic, Search, FileText, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCreateProcedureDetail } from "@/queries/ProcedureDetails/create-procedure-detail"
import { useGetProcedureDetailByVisitId } from "@/queries/ProcedureDetails/get-procedure-detail-by-visit-id"
import { useUpdateProcedureDetail } from "@/queries/ProcedureDetails/update-procedure-detail"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useTabCompletion } from "@/context/TabCompletionContext"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber"
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import UrinalysisModal from "./modals/UrinalysisModal"
import EyeSurgeryModal from "./modals/EyeSurgeryModal"
import MicrochippingModal from "./modals/MicrochippingModal"
import FleaTickControlModal from "./modals/FleaTickControlModal"
import BreedModal from "./modals/BreedModal"
import QuarantineModal from "./modals/QuarantineModal"
import HealthCertificateModal from "./modals/HealthCertificateModal"
import RabiesTiterModal from "./modals/RabiesTiterModal"
import AllergyModal from "./modals/AllergyModal"
import ChemotherapyModal from "./modals/ChemotherapyModal"
import ArthritisModal from "./modals/ArthritisModal"
import DiabetesMonitoringModal from "./modals/DiabetesMonitoringModal"
import WeightManagementModal from "./modals/WeightManagementModal"
import AcupunctureModal from "./modals/AcupunctureModal"
import LaserTherapyModal from "./modals/LaserTherapyModal"
import MedicatedBathsModal from "./modals/MedicatedBathsModal"
import IVFluidTherapyModal from "./modals/IVFluidTherapyModal"
import EarSurgeryModal from "./modals/EarSurgeryModal"
import ForeignBodyRemovalModal from "./modals/ForeignBodyRemovalModal"
import BladderStoneRemovalModal from "./modals/BladderStoneRemovalModal"
import OrthopedicSurgeryModal from "./modals/OrthopedicSurgeryModal"
import WoundRepairModal from "./modals/WoundRepairModal"
import DentalExtractionsModal from "./modals/DentalExtractionsModal"
import SpayingNeuteringModal from "./modals/SpayingNeuteringModal"
import DentalCleaningModal from "./modals/DentalCleaningModal"
import AnalGlandModal from "./modals/AnalGlandModal"
import BloodTestModal from "./modals/BloodTestModal"
import FecalExamModal from "./modals/FecalExamModal"
import XRayModal from "./modals/XRayModal"
import UltrasoundModal from "./modals/UltrasoundModal"
import AllergyTestingModal from "./modals/AllergyTestingModal"
import SkinScrapingModal from "./modals/SkinScrapingModal"
import ECGModal from "./modals/ECGModal"
import BloodPressureModal from "./modals/BloodPressureModal"
import OphthalmicExamModal from "./modals/OphthalmicExamModal"
import FnaModal from "./modals/FnaModal"
import SpayModal from "./modals/SpayModa"
import NeuterModal from "./modals/NeuterModal"
import MassLumpRemovalModal from "./modals/MassLumpRemovalModal"
import NailTrimmingModal from "./modals/NailTrimmingModal"
interface ProcedureTabProps {
  patientId: string
  appointmentId: string
  onNext?: () => void
  onComplete?: (completed: boolean) => void;
}

export default function ProcedureTab({ patientId, appointmentId, onNext, onComplete }: ProcedureTabProps) {
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([])
  const { toast } = useToast()
  const [newProcedureName, setNewProcedureName] = useState("")
  const [notes, setNotes] = useState("")
  const [audioModalOpen, setAudioModalOpen] = useState(false)

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    selectedProcedures: [] as string[],
    notes: ""
  })
  const [urinalysisModalOpen, setUrinalysisModalOpen] = useState(false)
  const [eyeSurgeryModalOpen, setEyeSurgeryModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [removingProcedureId, setRemovingProcedureId] = useState<string | null>(null)
  const [addingProcedureId, setAddingProcedureId] = useState<string | null>(null)
  const [hasCreatedDetail, setHasCreatedDetail] = useState(false)
  const [microchippingModalOpen, setMicrochippingModalOpen] = useState(false)
  const [fleaTickControlModalOpen, setFleaTickControlModalOpen] = useState(false)
  const [breedModalOpen, setBreedModalOpen] = useState(false)
  const [quarantineModalOpen, setQuarantineModalOpen] = useState(false)
  const [healthCertificateModalOpen, setHealthCertificateModalOpen] = useState(false)
  const [rabiesTiterModalOpen, setRabiesTiterModalOpen] = useState(false)
  const [allergyModalOpen, setAllergyModalOpen] = useState(false)
  const [chemotherapyModalOpen, setChemotherapyModalOpen] = useState(false)
  const [arthritisModalOpen, setArthritisModalOpen] = useState(false)
  const [diabetesMonitoringModalOpen, setDiabetesMonitoringModalOpen] = useState(false)
  const [weightManagementModalOpen, setWeightManagementModalOpen] = useState(false)
  const [acupunctureModalOpen, setAcupunctureModalOpen] = useState(false)
  const [laserTherapyModalOpen, setLaserTherapyModalOpen] = useState(false)
  const [medicatedBathsModalOpen, setMedicatedBathsModalOpen] = useState(false)
  const [ivFluidTherapyModalOpen, setIVFluidTherapyModalOpen] = useState(false)
  const [earSurgeryModalOpen, setEarSurgeryModalOpen] = useState(false)
  const [foreignBodyRemovalModalOpen, setForeignBodyRemovalModalOpen] = useState(false)
  const [bladderStoneRemovalModalOpen, setBladderStoneRemovalModalOpen] = useState(false)
  const [orthopedicSurgeryModalOpen, setOrthopedicSurgeryModalOpen] = useState(false)
  const [woundRepairModalOpen, setWoundRepairModalOpen] = useState(false)
  const [dentalExtractionsModalOpen, setDentalExtractionsModalOpen] = useState(false)
  const [spayingNeuteringModalOpen, setSpayingNeuteringModalOpen] = useState(false)
  const [dentalCleaningModalOpen, setDentalCleaningModalOpen] = useState(false)
  const [analGlandModalOpen, setAnalGlandModalOpen] = useState(false)
  const [bloodTestModalOpen, setBloodTestModalOpen] = useState(false)
  const [fecalExamModalOpen, setFecalExamModalOpen] = useState(false)
  const [xrayModalOpen, setXrayModalOpen] = useState(false)
  const [ultrasoundModalOpen, setUltrasoundModalOpen] = useState(false)
  const [allergyTestingModalOpen, setAllergyTestingModalOpen] = useState(false)
  const [skinScrapingModalOpen, setSkinScrapingModalOpen] = useState(false)
  const [ecgModalOpen, setEcgModalOpen] = useState(false)
  const [bloodPressureModalOpen, setBloodPressureModalOpen] = useState(false)
  const [ophthalmicExamModalOpen, setOphthalmicExamModalOpen] = useState(false)
  const [fnaModalOpen, setFnaModalOpen] = useState(false)
  const [spayModalOpen, setSpayModalOpen] = useState(false)
  const [neuterModalOpen, setNeuterModalOpen] = useState(false)
  const [massLumpRemovalModalOpen, setMassLumpRemovalModalOpen] = useState(false)
  const [nailTrimmingModalOpen, setNailTrimmingModalOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const { markTabAsCompleted } = useTabCompletion()

  // Add state for selected procedure ID
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("")

  const transcriber = useTranscriber()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get visit data from appointment ID
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId)

  const { data: procedures = [], isLoading } = useGetProcedures()
  const { data: existingProcedureDetail, refetch: refetchProcedureDetail } = useGetProcedureDetailByVisitId(
    visitData?.id || ""
  )
  const { data: appointmentData } = useGetAppointmentById(appointmentId)

  // Fetch procedure documentation details when a procedure is selected
  const { data: procedureDocumentDetails } = useProcedureDocumentDetails(
    visitData?.id,
    selectedProcedureId,
    !!visitData?.id && !!selectedProcedureId
  )

  // Log when procedure documentation details are fetched
  useEffect(() => {
    if (procedureDocumentDetails) {
      console.log("Fetched procedure documentation details:", procedureDocumentDetails);
    }
  }, [procedureDocumentDetails]);

  // Filter procedures based on search query (excluding already selected ones)
  const filteredProcedures = procedures.filter(procedure => {
    // Only show procedures that are not already selected
    if (selectedProcedures.includes(procedure.id)) return false

    // If no search query, show all available procedures
    if (!searchQuery.trim()) return true

    // If there's a search query, filter by it
    const query = searchQuery.toLowerCase()
    return (
      procedure.name.toLowerCase().includes(query) ||
      procedure.procCode?.toLowerCase().includes(query) ||
      procedure.type?.toLowerCase().includes(query)
    )
  }) // Remove the slice limit to show all procedures

  // Get selected procedures data
  const selectedProceduresData = procedures.filter(procedure =>
    selectedProcedures.includes(procedure.id)
  )

  // Initialize selected procedures and notes from existing data
  useEffect(() => {
    if (existingProcedureDetail) {
      // Check if procedures array exists before accessing it
      if (existingProcedureDetail.procedures && Array.isArray(existingProcedureDetail.procedures)) {
        setSelectedProcedures(existingProcedureDetail.procedures.map(p => p.id));
      }

      if (existingProcedureDetail.notes) {
        setNotes(existingProcedureDetail.notes);
      }

      // Store original values for change detection
      setOriginalValues({
        selectedProcedures: existingProcedureDetail.procedures?.map(p => p.id) || [],
        notes: existingProcedureDetail.notes || ""
      });

      // Mark tab as completed if it was already completed or if it has procedures
      if (existingProcedureDetail.isCompleted ||
        (existingProcedureDetail.procedures &&
          existingProcedureDetail.procedures.length > 0)) {
        markTabAsCompleted("procedure");
      }

      // Set hasCreatedDetail to true since we have an existing record
      setHasCreatedDetail(true);
    }
  }, [existingProcedureDetail, markTabAsCompleted])

  // Handle transcription output
  useEffect(() => {
    const output = transcriber.output
    if (output && !output.isBusy && output.text) {
      setNotes(prev => prev ? prev + "\n" + output.text : output.text)
    }
    // eslint-disable-next-line
  }, [transcriber.output?.isBusy])


  const createProcedureMutation = useCreateProcedure({
    onSuccess: () => {
      setNewProcedureName("")
      toast({
        title: "Success",
        description: "Procedure added successfully",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add procedure: ${error.message}`,
        variant: "destructive"
      })
    }
  })

  // Use mutateAsync pattern like MedicalHistoryTab
  const { mutateAsync: createProcedureDetail, isPending: isCreating } = useCreateProcedureDetail()
  const { mutateAsync: updateProcedureDetail, isPending: isUpdating } = useUpdateProcedureDetail()

  // Combined loading state
  const isPending = isCreating || isUpdating || !!removingProcedureId

  const isReadOnly = appointmentData?.status === "completed"

  // Check if any changes have been made to existing data
  const hasChanges = () => {
    if (!existingProcedureDetail) return true // For new records, allow save if data exists

    const currentProcedures = [...selectedProcedures].sort()
    const originalProcedures = [...originalValues.selectedProcedures].sort()

    return (
      JSON.stringify(currentProcedures) !== JSON.stringify(originalProcedures) ||
      notes !== originalValues.notes
    )
  }

  // Check if we have procedures to save (either new or existing)
  const hasProceduresToSave = () => {
    return selectedProcedures.length > 0
  }

  const handleProcedureClick = async (id: string) => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      })
      return
    }

    try {
      // Add to local state first for immediate UI feedback
      setSelectedProcedures(prev => [...prev, id])

      setAddingProcedureId(id)


      // Make API call
      if (existingProcedureDetail) {
        // If we already have a record, update it (PUT)
        const updatedProcedures = [...selectedProcedures, id]
        await updateProcedureDetail({
          id: existingProcedureDetail.id,
          notes: notes || "",
          isCompleted: true,
          procedureIds: updatedProcedures
        })
        toast({
          title: "Success",
          description: "Procedure added successfully",
          variant: "success"
        })
      } else {
        // If this is the first procedure, create a new record (POST)
        const createdDetail = await createProcedureDetail({
          visitId: visitData.id,
          notes: notes || "",
          isCompleted: true,
          procedureIds: [id]
        })
        toast({
          title: "Success",
          description: "Procedure added successfully",
          variant: "success"
        })

        // Mark that we've created a procedure detail
        setHasCreatedDetail(true)

        // After creating, immediately get the procedure detail
        const updatedProcedureDetail = await refetchProcedureDetail()

        // If we got valid data back, use it immediately
        if (updatedProcedureDetail?.data) {
          // This will update the local state with the fetched data
          // No need to wait for a component re-render
        }
      }

      // Mark the tab as completed since we have at least one procedure
      markTabAsCompleted("procedure")

      // Clear search and close dropdown
      setSearchQuery("")
      //setShowDropdown(false)
      setFocusedIndex(-1)

    } catch (error) {
      // If API call fails, revert UI change
      setSelectedProcedures(prev => prev.filter(procId => procId !== id))
      toast({
        title: "Error",
        description: `Failed to add procedure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      // Add a small delay to ensure "Adding..." is visible to the user
      setTimeout(() => {
        setAddingProcedureId(null)
      }, 500)
    }
  }

  const handleRemoveProcedure = async (id: string) => {
    if (!visitData?.id || !existingProcedureDetail) {
      toast({
        title: "Error",
        description: "No saved procedure details found",
        variant: "destructive"
      })
      return
    }

    try {
      // Update UI first for immediate feedback
      setSelectedProcedures(prev => prev.filter(procId => procId !== id))

      setRemovingProcedureId(id)

      // Make API call to update (remove the procedure)
      const updatedProcedures = selectedProcedures.filter(procId => procId !== id)
      await updateProcedureDetail({
        id: existingProcedureDetail.id,
        notes: notes || "",
        isCompleted: true,
        procedureIds: updatedProcedures
      })

      toast({
        title: "Success",
        description: "Procedure removed successfully",
        variant: "success"
      })

      // If we removed the last procedure, we might want to un-mark the tab as completed
      if (updatedProcedures.length === 0) {
        // This depends on your business logic - you might want to keep it marked as completed
      }

    } catch (error) {
      // If API call fails, revert UI change
      setSelectedProcedures(prev => [...prev, id])
      toast({
        title: "Error",
        description: `Failed to remove procedure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setRemovingProcedureId(null)
    }
  }

  const handleDocumentClick = (id: string) => {
    // Set selected procedure ID
    setSelectedProcedureId(id);

    // Refetch procedure details to ensure we have the latest data
    if (visitData?.id) {
      refetchProcedureDetail().then((result) => {
        if (result.data) {
          console.log("Visit ID:", visitData.id);
          console.log("Selected procedure ID:", id);
          console.log("Ready to fetch procedure documentation details");
        }
      });
    }

    // Continue with original function to open the appropriate modal
    const procedure = procedures.find(p => p.id === id)
    if (procedure?.procCode === "DIAURI002") {
      setUrinalysisModalOpen(true)
      return
    }
    if (procedure?.procCode === "SUREYE007") {
      setEyeSurgeryModalOpen(true)
      return
    }
    // Rest of the existing modal opening logic
    if (procedure?.procCode === "PREMIC006") {
      setMicrochippingModalOpen(true)
      return
    }
    if (procedure?.procCode === "PREFLE003") {
      setFleaTickControlModalOpen(true)
      return
    }
    if (procedure?.procCode === "TRABRE004") {
      setBreedModalOpen(true)
      return
    }
    if (procedure?.procCode === "TRAEXP003") {
      setQuarantineModalOpen(true)
      return
    }
    if (procedure?.procCode === "TRAHEA002") {
      setHealthCertificateModalOpen(true)
      return
    }
    if (procedure?.procCode === "TRArab001") {
      setRabiesTiterModalOpen(true)
      return
    }
    if (procedure?.procCode === "THEALL009") {
      // Only open the modal if we have a procedure selected
      if (selectedProcedureId) {
        setAllergyModalOpen(true)
      } else {
        toast({
          title: "Error",
          description: "Please select a procedure first",
          variant: "destructive"
        })
      }
      return
    }
    if (procedure?.procCode === "THECHE008") {
      setChemotherapyModalOpen(true)
      return
    }
    if (procedure?.procCode === "THEART007") {
      setArthritisModalOpen(true)
      return
    }
    if (procedure?.procCode === "THEDIA006") {
      setDiabetesMonitoringModalOpen(true)
      return
    }
    if (procedure?.procCode === "THEWEI005") {
      setWeightManagementModalOpen(true)
      return
    }
    if (procedure?.procCode === "THEACU004") {
      // Only open the modal if we have a procedure selected
      if (selectedProcedureId) {
        setAcupunctureModalOpen(true)
      } else {
        toast({
          title: "Error",
          description: "Please select a procedure first",
          variant: "destructive"
        })
      }
      return
    }
    if (procedure?.procCode === "THELAS003") {
      setLaserTherapyModalOpen(true)
      return
    }
    if (procedure?.procCode === "THEMED002") {
      setMedicatedBathsModalOpen(true)
      return
    }
    if (procedure?.procCode === "THEIVF001") {
      setIVFluidTherapyModalOpen(true)
      return
    }
    if (procedure?.procCode === "SUREAR010") {
      setEarSurgeryModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURFOR009") {
      setForeignBodyRemovalModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURBLA008") {
      setBladderStoneRemovalModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURORT006") {
      setOrthopedicSurgeryModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURWOU005") {
      setWoundRepairModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURDEN004") {
      setDentalExtractionsModalOpen(true)
      return
    }
    if (procedure?.procCode === "PRESPA004") {
      setSpayingNeuteringModalOpen(true)
      return
    }
    if (procedure?.procCode === "PREDEN005") {
      setDentalCleaningModalOpen(true)
      return
    }
    if (procedure?.procCode === "PREANA008") {
      setAnalGlandModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIABLO001") {
      setBloodTestModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIAFEC003") {
      setFecalExamModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIAXRA004") {
      setXrayModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIAULT005") {
      setUltrasoundModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIAALL006") {
      setAllergyTestingModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIASKI007") {
      setSkinScrapingModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIAELE008") {
      setEcgModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIABLO009") {
      setBloodPressureModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIAOPH010") {
      setOphthalmicExamModalOpen(true)
      return
    }
    if (procedure?.procCode === "DIAFIN011") {
      setFnaModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURSPA001") {
      setSpayModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURNEU002") {
      setNeuterModalOpen(true)
      return
    }
    if (procedure?.procCode === "SURMAS003") {
      setMassLumpRemovalModalOpen(true)
      return
    }
    if (procedure?.procCode === "PRENAI007") {
      setNailTrimmingModalOpen(true)
      return
    }
  }

  const handleAddProcedure = () => {
    if (newProcedureName.trim()) {
      createProcedureMutation.mutate({
        name: newProcedureName.trim()
      })
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    //setShowDropdown(true) // Always show dropdown when typing
    setFocusedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(prev =>
        prev < filteredProcedures.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && filteredProcedures[focusedIndex]) {
        handleProcedureClick(filteredProcedures[focusedIndex].id)
      }
    } else if (e.key === 'Escape') {
      //setShowDropdown(false)
      setFocusedIndex(-1)
      searchInputRef.current?.blur()
    }
  }

  const handleSave = async () => {
    markTabAsCompleted("procedure")
    if (onComplete) {
      onComplete(true);
    }
    // After successful save, navigate to next tab
    if (onNext) {
      onNext()
    }
  }

  if (visitLoading || isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading data...</p>
        </CardContent>
      </Card>
    )
  }

  if (!visitData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">No visit found for this appointment. Please make sure a visit has been created.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
          {/* Typeahead Search Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Add Procedures</h3>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search procedures by name, code, or type..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className="pl-10"
                disabled={isReadOnly}
              />
            </div>

            {/* Permanent Procedures List */}
            <div className="border rounded-lg bg-white shadow-sm max-h-96 overflow-y-auto">
              {!searchQuery.trim() && (
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 sticky top-0">
                  Common Procedures
                </div>
              )}

              {filteredProcedures.length > 0 ? (
                <div>
                  {filteredProcedures.map((procedure, index) => (
                    <div
                      key={procedure.id}
                      className={`px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${index === focusedIndex ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                        }`}
                      onClick={() => handleProcedureClick(procedure.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{procedure.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <span className="font-mono">{procedure.procCode || "-"}</span>
                            <span>•</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {procedure.type || "General"}
                            </span>
                          </div>
                          {procedure.notes && (
                            <div className="text-xs text-gray-600 mt-1 truncate">
                              {procedure.notes}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProcedureClick(procedure.id)
                          }}
                          disabled={isReadOnly || addingProcedureId === procedure.id}
                          className="ml-2"
                        >
                          {addingProcedureId === procedure.id ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {searchQuery.trim()
                    ? `No procedures found matching "${searchQuery}"`
                    : "All procedures have been added"}
                </div>
              )}
            </div>
          </div>

          {/* Selected Procedures Table */}
          {selectedProceduresData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Selected Procedures</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Procedure Code</TableHead>
                      <TableHead>Procedure Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProceduresData.map(procedure => (
                      <TableRow key={procedure.id}>
                        <TableCell className="font-mono text-sm">
                          {procedure.procCode || "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{procedure.name}</div>
                            {procedure.notes && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {procedure.notes}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {procedure.type || "General"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDocumentClick(procedure.id)}
                              //disabled={isReadOnly}
                              title="View/Edit Documents"
                            >
                              Document
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveProcedure(procedure.id)}
                              disabled={isReadOnly || removingProcedureId === procedure.id}
                              title="Remove Procedure"
                            >
                              {removingProcedureId === procedure.id ? "..." : <X className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium">Additional Notes</h3>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setAudioModalOpen(true)}
                title="Record voice note"
                disabled={isReadOnly}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <textarea
              className="w-full border rounded-md p-2 min-h-[100px]"
              placeholder="Add any additional details about the procedures..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end mb-4 mx-4">
          <Button
            onClick={handleSave}
            disabled={
              isPending ||
              !hasProceduresToSave() ||
              isReadOnly
            }
            className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
          >
            {isPending
              ? "Saving..."
              : existingProcedureDetail ? "Update & Next" : "Save & Next"}
          </Button>
        </div>

        <AudioManager
          open={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
          transcriber={transcriber}
          onTranscriptionComplete={(transcript: string) => {
            setNotes(prev => prev ? prev + "\n" + transcript : transcript)
            setAudioModalOpen(false)
          }}
        />

        <UrinalysisModal
          open={urinalysisModalOpen}
          onClose={() => setUrinalysisModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <EyeSurgeryModal
          open={eyeSurgeryModalOpen}
          onClose={() => setEyeSurgeryModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <MicrochippingModal
          open={microchippingModalOpen}
          onClose={() => setMicrochippingModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <FleaTickControlModal
          open={fleaTickControlModalOpen}
          onClose={() => setFleaTickControlModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <BreedModal
          open={breedModalOpen}
          onClose={() => setBreedModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <QuarantineModal
          open={quarantineModalOpen}
          onClose={() => setQuarantineModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <HealthCertificateModal
          open={healthCertificateModalOpen}
          onClose={() => setHealthCertificateModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <RabiesTiterModal
          open={rabiesTiterModalOpen}
          onClose={() => setRabiesTiterModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <AllergyModal
          open={allergyModalOpen}
          onClose={() => setAllergyModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <ChemotherapyModal
          open={chemotherapyModalOpen}
          onClose={() => setChemotherapyModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <ArthritisModal
          open={arthritisModalOpen}
          onClose={() => setArthritisModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <DiabetesMonitoringModal
          open={diabetesMonitoringModalOpen}
          onClose={() => setDiabetesMonitoringModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <WeightManagementModal
          open={weightManagementModalOpen}
          onClose={() => setWeightManagementModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <AcupunctureModal
          open={acupunctureModalOpen}
          onClose={() => setAcupunctureModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <LaserTherapyModal
          open={laserTherapyModalOpen}
          onClose={() => setLaserTherapyModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <MedicatedBathsModal
          open={medicatedBathsModalOpen}
          onClose={() => setMedicatedBathsModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <IVFluidTherapyModal
          open={ivFluidTherapyModalOpen}
          onClose={() => setIVFluidTherapyModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <EarSurgeryModal
          open={earSurgeryModalOpen}
          onClose={() => setEarSurgeryModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <ForeignBodyRemovalModal
          open={foreignBodyRemovalModalOpen}
          onClose={() => setForeignBodyRemovalModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <BladderStoneRemovalModal
          open={bladderStoneRemovalModalOpen}
          onClose={() => setBladderStoneRemovalModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <OrthopedicSurgeryModal
          open={orthopedicSurgeryModalOpen}
          onClose={() => setOrthopedicSurgeryModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <WoundRepairModal
          open={woundRepairModalOpen}
          onClose={() => setWoundRepairModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />

        <DentalExtractionsModal
          open={dentalExtractionsModalOpen}
          onClose={() => setDentalExtractionsModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <SpayingNeuteringModal
          open={spayingNeuteringModalOpen}
          onClose={() => setSpayingNeuteringModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <DentalCleaningModal
          open={dentalCleaningModalOpen}
          onClose={() => setDentalCleaningModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <AnalGlandModal
          open={analGlandModalOpen}
          onClose={() => setAnalGlandModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <BloodTestModal
          open={bloodTestModalOpen}
          onClose={() => setBloodTestModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <FecalExamModal
          open={fecalExamModalOpen}
          onClose={() => setFecalExamModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <XRayModal
          open={xrayModalOpen}
          onClose={() => setXrayModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <UltrasoundModal
          open={ultrasoundModalOpen}
          onClose={() => setUltrasoundModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <AllergyTestingModal
          open={allergyTestingModalOpen}
          onClose={() => setAllergyTestingModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <SkinScrapingModal
          open={skinScrapingModalOpen}
          onClose={() => setSkinScrapingModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <ECGModal
          open={ecgModalOpen}
          onClose={() => setEcgModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <BloodPressureModal
          open={bloodPressureModalOpen}
          onClose={() => setBloodPressureModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <OphthalmicExamModal
          open={ophthalmicExamModalOpen}
          onClose={() => setOphthalmicExamModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <FnaModal
          open={fnaModalOpen}
          onClose={() => setFnaModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <SpayModal
          open={spayModalOpen}
          onClose={() => setSpayModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <NeuterModal
          open={neuterModalOpen}
          onClose={() => setNeuterModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <MassLumpRemovalModal
          open={massLumpRemovalModalOpen}
          onClose={() => setMassLumpRemovalModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
        <NailTrimmingModal
          open={nailTrimmingModalOpen}
          onClose={() => setNailTrimmingModalOpen(false)}
          patientId={patientId}
          appointmentId={appointmentId}
          procedureId={selectedProcedureId}
        />
      </CardContent>
    </Card>
  )
}
