import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Combobox } from "@/components/ui/combobox";
import { useGetUsers } from "@/queries/users/get-users";
import { useGetRole } from "@/queries/roles/get-role";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetVaccinationJsonByIds } from "@/queries/vaccinationDetail/get-vaccination-json-by-ids";
import { useUpdateVaccinationJson } from "@/queries/vaccinationDetail/update-vaccination-json";
import { useState, useEffect } from "react";
// import { useCreateVaccinationDetail } from "@/queries/vaccinationDetail/create-vaccinationDetail";
// import { useUpdateVaccinationDetail } from "@/queries/vaccinationDetail/update-vaccinationDetail";
// import { useGetVaccinationDetailsByVisitId } from "@/queries/vaccinationDetail/get-vaccinationDetail-by-visitId";
import { useToast } from "@/hooks/use-toast"

interface VaccinationDocumentationModalProps {
  open: boolean;
  onClose: (vaccineId?: string) => void;
  vaccine: {
    id: string;
    species: string;
    disease: string; // Changed from 'name' to 'disease'
    vaccineType: string; // Changed from 'type' to 'vaccineType'
    primarySchedule?: string;
    boosterSchedule?: string;
    annualReminder?: string;
    notes?: string;
  };
  patientId: string;
  appointmentId: string;
  species: string; // This prop seems redundant if vaccine.species is available. Consider removing or clarifying usage.
  clinicId?: string;
  isReadOnly?: boolean;
}

export default function VaccinationDocumentationModal({
  open,
  onClose,
  vaccine,
  appointmentId,
  clinicId,
  isReadOnly,
  }: VaccinationDocumentationModalProps) {
  const [dateGiven, setDateGiven] = useState<Date | null>(null);
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [veterinarianId, setVeterinarianId] = useState("");
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null);
  const [adverseReactions, setAdverseReactions] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [doseVolume, setDoseVolume] = useState("");
  const [route, setRoute] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const { toast } = useToast();

  const { data: rolesData } = useGetRole();

  useEffect(() => {
    if (rolesData?.data) {
      const vetRole = rolesData.data.find(
        (role: any) => role.name.toLowerCase() === 'veterinarian'
      );
      if (vetRole) {
        setVeterinarianRoleId(vetRole.id);
      }
    }
  }, [rolesData]);

  const { data: usersResponse = { items: [] } } = useGetUsers(
    1,
    100,
    '',
    !!clinicId && !!veterinarianRoleId, // enabled
    '', // companyId - not needed for individual clinic
    clinicId ? [clinicId] : [], // Pass clinicId as an array
    veterinarianRoleId ? [veterinarianRoleId] : [] // Pass veterinarianRoleId as an array
  );
  const veterinarianOptions = (usersResponse.items || [])
    .filter(user => user.roleName === "Veterinarian" && user?.clinics?.some(clinic => clinic.clinicId === clinicId))
    .map(vet => ({
      value: vet.id,
      label: `Dr. ${vet.firstName} ${vet.lastName}`
    }));

  const { data: visitData } = useGetVisitByAppointmentId(appointmentId);
  const visitId = visitData?.id;
  const vaccinationMasterId = vaccine?.id;
  const { data: vaccinationJsonData } = useGetVaccinationJsonByIds(visitId || "", vaccinationMasterId || "");
  const updateVaccinationJson = useUpdateVaccinationJson();
  // const createVaccinationDetail = useCreateVaccinationDetail();
  // const updateVaccinationDetail = useUpdateVaccinationDetail();
  // const { data: existingVaccinationDetails, refetch: refetchVaccinationDetails } = useGetVaccinationDetailsByVisitId(visitId || "");

  useEffect(() => {
    if (vaccinationJsonData?.vaccinationJson) {
      try {
        const parsed = JSON.parse(vaccinationJsonData.vaccinationJson);
        // Parse date-only strings safely as local dates to avoid timezone shifts
        const parseAsLocalDate = (val?: string | null) => {
          if (!val) return null;
          // If value is in YYYY-MM-DD format, construct Date via year, monthIndex, day (local time)
          const m = /^\d{4}-\d{2}-\d{2}$/.exec(val);
          if (m) {
            const [y, mo, d] = val.split('-').map(Number);
            return new Date(y, (mo || 1) - 1, d || 1);
          }
          // Fallback for ISO strings
          return new Date(val);
        };

        setDateGiven(parseAsLocalDate(parsed.dateGiven));
        setNextDueDate(parseAsLocalDate(parsed.nextDueDate));
        setBatchNumber(parsed.batchNumber || "");
        setVeterinarianId(parsed.veterinarianId || "");
        setAdverseReactions(parsed.adverseReactions || "");
        setManufacturer(parsed.manufacturer || "");
        setDoseVolume(parsed.doseVolume || "");
        setRoute(parsed.route || "");
        setAdditionalNotes(parsed.additionalNotes || "");
      } catch {}
    }
  }, [vaccinationJsonData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitId || !vaccinationMasterId) {
      toast({
        title: "Error",
        description: "Visit ID or Vaccination Master ID is missing.",
        variant: "destructive"
      });
      return;
    }

    // Step 1: Handle creation/update of VaccinationDetail record
    // const currentVaccineId = vaccine.id;
    // let targetVaccinationDetailId: string | undefined;
    // let existingMasterIds: string[] = [];

    // if (existingVaccinationDetails && existingVaccinationDetails.length > 0) {
    //   // Assuming there's only one VaccinationDetail per visit for simplicity, or we take the first one.
    //   const primaryDetail = existingVaccinationDetails[0];
    //   targetVaccinationDetailId = primaryDetail.id;
    //   existingMasterIds = primaryDetail.vaccinationMasterIds || [];

    //   // Ensure the current vaccine is in the list of master IDs
    //   if (!existingMasterIds.includes(currentVaccineId)) {
    //     existingMasterIds.push(currentVaccineId);
    //   }

    //   try {
    //     await updateVaccinationDetail.mutateAsync({
    //       id: targetVaccinationDetailId,
    //       data: {
    //         id: targetVaccinationDetailId,
    //         notes: primaryDetail.notes || "",
    //         isCompleted: true, // Mark as completed when documenting individual vaccine
    //         vaccinationMasterIds: existingMasterIds,
    //       },
    //     });
    //   } catch (error) {
    //     toast.error("Failed to update vaccination detail.");
    //     console.error("Update Vaccination Detail Error:", error);
    //     return;
    //   }
    // } else {
    //   // No existing VaccinationDetail, create a new one
    //   try {
    //     const newDetail = await createVaccinationDetail.mutateAsync({
    //       visitId: visitId,
    //       notes: "", // Default empty notes
    //       isCompleted: true, // Mark as completed when documenting individual vaccine
    //       vaccinationMasterIds: [currentVaccineId],
    //     });
    //     targetVaccinationDetailId = newDetail.id;
    //     // After creating, refetch to ensure local state is updated for subsequent operations
    //     await refetchVaccinationDetails();
    //   } catch (error) {
    //     toast.error("Failed to create vaccination detail.");
    //     console.error("Create Vaccination Detail Error:", error);
    //     return;
    //   }
    // }

    // Step 2: Save the specific vaccine documentation (vaccinationJson)
    // Format nextDueDate as local ISO with timezone offset to avoid UTC day shifts
    // Example: 2025-10-21T00:00:00+05:30
    const toLocalIsoWithOffset = (d: Date | null) => {
      if (!d) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = '00';
      const mm = '00';
      const ss = '00';
      const tzMin = -d.getTimezoneOffset(); // minutes east of UTC
      const sign = tzMin >= 0 ? '+' : '-';
      const tzAbs = Math.abs(tzMin);
      const tzH = String(Math.trunc(tzAbs / 60)).padStart(2, '0');
      const tzM = String(tzAbs % 60).padStart(2, '0');
      return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${tzH}:${tzM}`;
    };
    const formattedNextDueDate = toLocalIsoWithOffset(nextDueDate);

    const vaccinationJsonPayload = {
      visitId,
      vaccinationMasterId,
      vaccinationJson: JSON.stringify({
        nextDueDate: formattedNextDueDate,
        batchNumber: batchNumber || "",
        veterinarianId: veterinarianId || "",
        adverseReactions: adverseReactions || "",
        manufacturer: manufacturer || "",
        doseVolume: doseVolume || "",
        route: route || "",
        additionalNotes: additionalNotes || "",
      }),
    };

    try {
      JSON.parse(vaccinationJsonPayload.vaccinationJson);
      await updateVaccinationJson.mutateAsync(vaccinationJsonPayload);
      toast({
        title: "Success",
        description: "Vaccination record saved successfully!",
        variant: "success"
      });
      onClose(vaccine.id);
    } catch (error) {
      console.error("JSON Validation or Update Vaccination Json Error:", error);
      toast({
        title: "Error",
        description: "Error saving vaccination documentation. Please check the data and try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto"
      >
        <SheetTitle asChild>
          <h2 className="text-2xl font-bold">{vaccine?.disease} Vaccination Record</h2>
        </SheetTitle>
        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Vaccine</label>
              <Input value={vaccine?.disease || ""} disabled={isReadOnly} readOnly />
            </div>
            

            <div>
              <label className="block font-medium mb-1">Next Due Date</label>
              <DatePicker
                disabled={isReadOnly}
                selected={nextDueDate}
                onChange={(date) => setNextDueDate(date)}
                minDate={new Date()}
                placeholderText="dd/mm/yyyy"
                dateFormat="dd/MM/yyyy"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                autoFocus={false}
                preventOpenOnFocus={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Batch Number</label>
              <Input
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                placeholder="Enter batch number (optional)"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Manufacturer</label>
              <Input
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                placeholder="Enter manufacturer (optional)"
                disabled={isReadOnly}
                  />
            </div>
            <div>
              <label className="block font-medium mb-1">Dose Volume</label>
              <Input
                value={doseVolume}
                onChange={e => setDoseVolume(e.target.value)}
                placeholder="Enter dose volume (optional)"
                disabled={isReadOnly}
                />
            </div>
            <div className={isReadOnly ? "opacity-50 cursor-not-allowed" : ""}>
              <label className="block font-medium mb-1">Route</label>
              <Combobox
                options={[
                  { value: "Subcutaneous", label: "Subcutaneous" },
                  { value: "Intramuscular", label: "Intramuscular" },
                  { value: "Intranasal", label: "Intranasal" },
                  { value: "Oral", label: "Oral" },
                  { value: "Topical", label: "Topical" },
                  { value: "Other", label: "Other" },
                ]}
                value={route}
                onValueChange={setRoute}
                placeholder="Select route (optional)"
                
              />
            </div>
            <div className={isReadOnly ? "opacity-50 cursor-not-allowed" : "md:col-span-2"}>
              <label className="block font-medium mb-1">Veterinarian</label>
              <Combobox
                options={veterinarianOptions}
                value={veterinarianId}
                onValueChange={setVeterinarianId}
                placeholder="Select veterinarian (optional)"
                 
                />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium mb-1">Adverse Reactions (if any)</label>
              <Textarea
                value={adverseReactions}
                onChange={e => setAdverseReactions(e.target.value)}
                placeholder="Note any adverse reactions or side effects (optional)"
                rows={4}
                className="resize-none"
                disabled={isReadOnly}
                />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium mb-1">Additional Notes</label>
              <Textarea
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Add any additional notes (optional)"
                rows={4}
                className="resize-none"
                disabled={isReadOnly}
                />
            </div>
          </div>
          <Button type="submit" className="w-full bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white" disabled={isReadOnly}>
            Save Vaccination Documentation
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
