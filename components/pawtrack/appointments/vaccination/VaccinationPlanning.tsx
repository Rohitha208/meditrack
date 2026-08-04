"use client"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, History } from "lucide-react"
import { useGetVaccinationMasters } from "@/queries/vaccinationMaster/get-vaccinationMaster"
import VaccinationDocumentationModal from "./modals/VaccinationDocumentationModal";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useUpdateAppointment } from "@/queries/appointment/update-appointment";
import { useCreateVaccinationDetail } from "@/queries/vaccinationDetail/create-vaccinationDetail";
import { useUpdateVaccinationDetail } from "@/queries/vaccinationDetail/update-vaccinationDetail";
import { useToast } from "@/hooks/use-toast"
import { useGetVaccinationDetailsByVisitId } from "@/queries/vaccinationDetail/get-vaccinationDetail-by-visitId";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import MedicalHistoryTab from "../MedicalHistoryTab";
import { TabCompletionProvider } from "@/context/TabCompletionContext";
import VaccineItemCertificate from "../certification/vaccine-item-certificate";
import { useQueryClient } from "@tanstack/react-query";
import { useGetVaccinationJsonByIds } from "@/queries/vaccinationDetail/get-vaccination-json-by-ids"

interface Vaccination {
  id: string;
  species: string;
  isCore: boolean;
  disease: string;
  vaccineType: string;
  initialDose: string;
  booster: string;
  revaccinationInterval: string;
  notes: string;
  vacCode?: string;
}

interface VaccinationPlanningProps {
  patientId: string;
  appointmentId: string;
  species: string;
  onNext: (selectedVaccines: string[]) => void;
  onClose: () => void;
  clinicId?: string;
  isReadOnly?: boolean;
  embedded?: boolean;
  hideMedicalHistoryButton?: boolean;
}

function VaccineGenerateButton({
  visitId,
  vaccinationMasterId,
  onClick,
  selected,
}: {
  visitId: string;
  vaccinationMasterId: string;
  onClick: () => void;
  selected: boolean;
}) {
  // Only check when vaccine is selected
  const { data, isLoading } = useGetVaccinationJsonByIds(
    visitId,
    vaccinationMasterId
  );

  if (!selected) return null;
  if (isLoading) return null;

  // 🔥 This is the key condition
  if (!data || !data.vaccinationJson) return null;

  return (
    <Button
      size="sm"
      variant="default"
      onClick={onClick}
    >
      Generate / Print
    </Button>
  );
}

export default function VaccinationPlanning({
  patientId,
  appointmentId,
  species,
  onNext,
  onClose,
  clinicId,
  isReadOnly,
  embedded = false,
  hideMedicalHistoryButton = false,
}: VaccinationPlanningProps) {
  const [selectedVaccines, setSelectedVaccines] = useState<string[]>([]);
  const [documentVaccineId, setDocumentVaccineId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [vaccinationDetailId, setVaccinationDetailId] = useState<string | null>(null);
  const [showMedicalHistory, setShowMedicalHistory] = useState(false);
  const [certificateVaccineId, setCertificateVaccineId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use ref to track if initial data has been loaded
  const initialLoadComplete = useRef(false);
  
  // Convert species to lowercase for API call
  const speciesLowerCase = species.toLowerCase();

  // Fetch vaccination data from API
  const { data: vaccinations = [], isLoading, error } = useGetVaccinationMasters({
    species: speciesLowerCase
  });
  const typedVaccinations: Vaccination[] = vaccinations;

  // Fetch visit data for this appointment
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId);

  // Fetch existing vaccination details to initialize documented vaccines
  const { data: vaccinationDetails } = useGetVaccinationDetailsByVisitId(visitData?.id || "");

  // Fetch full appointment data for update
  const { data: appointmentData, isLoading: appointmentLoading } = useGetAppointmentById(appointmentId);

  // Initialize state from existing data when component loads (only once)
  useEffect(() => {
  if (!vaccinationDetails || initialLoadComplete.current) return;

  // 🔥 Merge ALL vaccination details for this visit
  const mergedMasterIds = new Set<string>();
  let detailId: string | null = null;

  vaccinationDetails.forEach((detail: any) => {
    detailId ??= detail.id;

    if (detail.vaccinationMasterIds?.length) {
      detail.vaccinationMasterIds.forEach((id: string) =>
        mergedMasterIds.add(id)
      );
    }

    if (detail.vaccinationMasterIdsDetails?.length) {
      detail.vaccinationMasterIdsDetails.forEach((item: any) =>
        mergedMasterIds.add(item.id || item.vaccinationMasterId)
      );
    }
  });

  setVaccinationDetailId(detailId);
  setSelectedVaccines(Array.from(mergedMasterIds));

  initialLoadComplete.current = true;
}, [vaccinationDetails]);


  // Mutations
  const createVaccinationDetail = useCreateVaccinationDetail();
  const updateVaccinationDetail = useUpdateVaccinationDetail();
  const updateAppointment = useUpdateAppointment({
    onSuccess: () => {
      setIsProcessing(false);
      toast({
        title: "Success",
        description: "Vaccination checkout completed",
        variant: "success"
      });
      onClose();
    },
    onError: (error) => {
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  });

  const handleVaccineSelection = async (id: string) => {
    if (isReadOnly) return;
    
    if (!visitData || !visitData.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      });
      return;
    }

    // Calculate new selection
    const newSelected = selectedVaccines.includes(id)
      ? selectedVaccines.filter(vaccineId => vaccineId !== id)
      : [...selectedVaccines, id];

    // Optimistically update the UI
    setSelectedVaccines(newSelected);

    try {
      // Always try to create or update, even if vaccinationDetailId is not set yet
      if (!vaccinationDetailId) {
        // First selection: create
        const result = await createVaccinationDetail.mutateAsync({
          visitId: visitData.id,
          notes: "",
          isCompleted: false,
          vaccinationMasterIds: newSelected,
        });
        
        if (result?.id) {
          setVaccinationDetailId(result.id);
        }
      } else {
        // Update existing record
        await updateVaccinationDetail.mutateAsync({
          id: vaccinationDetailId,
          data: {
            id: vaccinationDetailId,
            notes: "",
            isCompleted: false,
            vaccinationMasterIds: newSelected,
          },
        });
      }
    } catch (error) {
      // Revert on error
      setSelectedVaccines(selectedVaccines.includes(id) 
        ? selectedVaccines 
        : selectedVaccines.filter(vaccineId => vaccineId !== id)
      );
      toast({
        title: "Error",
        description: "Failed to update vaccination selection",
        variant: "destructive"
      });
          }
  };

  const handleDocumentClick = (vaccineId: string) => {
    if (!vaccinationDetailId) {
      toast({
        title: "Error",
        description: "Please select a vaccine first",
        variant: "destructive"
      });
      return;
    }
    setDocumentVaccineId(vaccineId);
  };

  const handleDocumentModalClose = (vaccineId?: string) => {
  setDocumentVaccineId(null);

  if (vaccineId && visitData?.id) {
    queryClient.invalidateQueries({
      queryKey: ["vaccinationJson", visitData.id, vaccineId],
    });
  }
};


  // Get frequency from revaccinationInterval field
  const getFrequency = (vaccine: Vaccination) => {
    if (vaccine.revaccinationInterval.toLowerCase().includes("year")) {
      return vaccine.revaccinationInterval.split(" ").slice(0, 2).join(" ");
    }
    return "As needed";
  };

  // Format species name for display (capitalize first letter)
  const displaySpecies = species.charAt(0).toUpperCase() + species.slice(1).toLowerCase();

  // Find the vaccine object for the currently documented vaccine
  const documentVaccine = typedVaccinations.find((v) => v.id === documentVaccineId);

  // Checkout handler
  const handleCheckout = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      });
      return;
    }
    if (selectedVaccines.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one vaccine before checking out",
        variant: "destructive"
      });
      return;
    }
    if (!appointmentData) {
      toast({
        title: "Error",
        description: "No appointment data found",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Mark vaccination detail as completed
      if (vaccinationDetailId) {
        await updateVaccinationDetail.mutateAsync({
          id: vaccinationDetailId,
          data: {
            id: vaccinationDetailId,
            notes: "",
            isCompleted: true,
            vaccinationMasterIds: selectedVaccines,
          },
        });
      } else {
        // If for some reason no vaccination detail exists, create it as completed
        await createVaccinationDetail.mutateAsync({
          visitId: visitData.id,
          notes: "",
          isCompleted: true,
          vaccinationMasterIds: selectedVaccines,
        });
      }
      
      // Update appointment status to completed
      await updateAppointment.mutateAsync({
        id: appointmentId,
        data: {
          ...appointmentData,
          status: "completed"
        }
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Error during vaccination checkout",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  if (isLoading || visitLoading) {
    return <div>Loading...</div>;
  }

  // Content to render (shared between embedded and non-embedded modes)
  const content = (
    <div className="w-full">
      <div className="">
        {error ? (
          <div className="text-center py-10 text-red-500">Error loading vaccination data</div>
        ) : (
          <div className="space-y-6 border p-4 rounded-md">
            {/* Unified Vaccines Section */}
            {typedVaccinations.length > 0 && (
              <div>
                <h3 className="flex items-center text-lg font-medium mb-2">
                  Available Vaccines
                </h3>
                <div className="space-y-2">
                  {typedVaccinations.map((vaccine: Vaccination) => (
                    <div
                      key={vaccine.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center">
                        <Checkbox
                          id={vaccine.id}
                          checked={selectedVaccines.includes(vaccine.id)}
                          onCheckedChange={() => handleVaccineSelection(vaccine.id)}
                          className="mr-3"
                          disabled={isReadOnly}
                        />

                        <div>
                          <label htmlFor={vaccine.id} className="font-medium cursor-pointer">
                            {vaccine.disease}
                          </label>
                          <p className="text-sm text-gray-600">
                            Type: {vaccine.vaccineType}
                          </p>
                          <p className="text-sm text-gray-600">
                            Frequency: {getFrequency(vaccine)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedVaccines.includes(vaccine.id) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDocumentClick(vaccine.id)}
                            >
                              Document
                            </Button>
                            <VaccineGenerateButton
                              visitId={visitData?.id || ""}
                              vaccinationMasterId={vaccine.id}
                              selected={selectedVaccines.includes(vaccine.id)}
                              onClick={() => setCertificateVaccineId(vaccine.id)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {typedVaccinations.length === 0 && (
              <div className="text-center py-10">
                No vaccination data available for {displaySpecies}
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          {selectedVaccines.length === 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Please select at least one vaccine to continue.</span>
            </div>
          )}

          <div className="flex justify-end">
            <div className="flex gap-2">
              <Button
                onClick={handleCheckout}
                className="text-white px-5 bg-[#1E3D3D] hover:bg-[#1E3D3D] hover:text-white"
                disabled={isLoading || visitLoading || selectedVaccines.length === 0 || isProcessing || isReadOnly}
              >
                {isProcessing ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Vaccine-specific documentation modals */}
      {documentVaccineId && documentVaccine && visitData?.id && (
        <VaccinationDocumentationModal
          open={true}
          onClose={(vaccineId) => handleDocumentModalClose(vaccineId)}
          vaccine={documentVaccine}
          patientId={patientId}
          appointmentId={appointmentId}
          species={species}
          clinicId={clinicId}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );

  // When embedded, render content directly without Sheet wrapper
  if (embedded) {
    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vaccination Planning</h2>
          {!hideMedicalHistoryButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMedicalHistory(true)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Medical History
            </Button>
          )}
        </div>
        {content}
        {/* Medical History Sheet */}
        <Sheet open={showMedicalHistory} onOpenChange={setShowMedicalHistory}>
          <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Medical History</SheetTitle>
            </SheetHeader>
            <TabCompletionProvider>
              <MedicalHistoryTab
                patientId={patientId}
                appointmentId={appointmentId}
                onNext={() => setShowMedicalHistory(false)}
              />
            </TabCompletionProvider>
          </SheetContent>
        </Sheet>
        {certificateVaccineId && (
          <VaccineItemCertificate
            appointmentId={appointmentId}
            patientId={patientId}
            vaccinationMasterId={certificateVaccineId}
            onClose={() => setCertificateVaccineId(null)}
          />
        )}
      </>
    );
  }

  // Non-embedded mode: wrap in Sheet
  return (
    <>
      <Sheet open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[80%] lg:!max-w-[80%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="mb-6 mr-10">
            <div className="flex items-center justify-between">
              <SheetTitle>Vaccination Planning</SheetTitle>
              {!hideMedicalHistoryButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMedicalHistory(true)}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Medical History
                </Button>
              )}
            </div>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>

      {/* Medical History Sheet */}
      <Sheet open={showMedicalHistory} onOpenChange={setShowMedicalHistory}>
        <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Medical History</SheetTitle>
          </SheetHeader>
          <TabCompletionProvider>
            <MedicalHistoryTab
              patientId={patientId}
              appointmentId={appointmentId}
              onNext={() => setShowMedicalHistory(false)}
            />
          </TabCompletionProvider>
        </SheetContent>
      </Sheet>
      {certificateVaccineId && (
        <VaccineItemCertificate
          appointmentId={appointmentId}
          patientId={patientId}
          vaccinationMasterId={certificateVaccineId}
          onClose={() => setCertificateVaccineId(null)}
        />
      )}
    </>
  );
}