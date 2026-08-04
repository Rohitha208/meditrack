"use client";

import { useContext, useEffect, useMemo, useState, Fragment, useRef, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
import { PatientDashboardContext } from "./PatientDashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetVaccinationDetailsByVisitId } from "@/queries/vaccinationDetail/get-vaccinationDetail-by-visitId";
import {
  useGetVaccinationJsonByIds,
  getVaccinationJsonByIds,
} from "@/queries/vaccinationDetail/get-vaccination-json-by-ids";
import { useGetVaccinationMasters } from "@/queries/vaccinationMaster/get-vaccinationMaster";
import { CalendarDays, Loader2, Syringe } from "lucide-react";
import PatientAppointmentForm from "@/components/pawtrack/patients/patient-appointment-form";
import { useGetAppointmentType } from "@/queries/appointmentType/get-appointmentType";

type AppointmentItem = {
  id: string;
  patientId: string;
  title: string;
};

// ---------- Utility Functions ----------
function formatDate(d?: string | Date | null) {
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    if (!date || isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  } catch {
    return "-";
  }
}

function getEarliestDate(dates: string[]): string | null {
  const valid = dates
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()));
  if (valid.length === 0) return null;
  const earliest = new Date(Math.min(...valid.map((d) => d.getTime())));
  return earliest.toISOString();
}

// ---------- Vaccination Item ----------
function VaccinationItem({
  visitId,
  vaccineId,
  label,
  highlightDate,
  patientId,
  onOpenAppointmentForm,
}: {
  visitId: string;
  vaccineId: string;
  label: string;
  highlightDate?: string | null;
  patientId: string;
  onOpenAppointmentForm: (nextDueDate: string, patientId: string) => void;
}) {
  const { data } = useGetVaccinationJsonByIds(visitId, vaccineId);
  let nextDue: string | null = null;
  try {
    if (data?.vaccinationJson) {
      const parsed = JSON.parse(data.vaccinationJson);
      nextDue = parsed?.nextDueDate || null;
    }
  } catch { }
  const isHighlighted = nextDue && highlightDate &&
    new Date(nextDue).toDateString() === new Date(highlightDate).toDateString();
    
  return (
    <div className={`flex items-center justify-between rounded-md border p-3 ${isHighlighted ? "bg-black border-yellow-400 shadow-md" : "bg-white"}`}>
      <div className="flex items-center gap-2">
        <Syringe className={`h-4 w-4 ${isHighlighted ? 'text-white' : 'text-blue-500'}`} />
        <span className={`font-medium ${isHighlighted ? 'text-white' : ''}`}>{label}</span>
      </div>
      {nextDue ? (
        <div className={`flex items-center gap-2 text-sm ${isHighlighted ? 'text-white' : 'text-gray-600'}`}>
          <CalendarDays className="h-4 w-4" />
          <button
            className={`underline ${isHighlighted ? "text-yellow-300" : "text-blue-700"} bg-transparent border-0 p-0 m-0 hover:opacity-90`}
            style={{ cursor: "pointer", background: "none" }}
            onClick={() => onOpenAppointmentForm(nextDue!, patientId)}
          >
            Next due: {formatDate(nextDue)}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Visit Vaccination Card ----------
function VisitVaccinationCard({
  appointmentId,
  title,
  onReportDates,
  highlightDate,
  patientId,
  onOpenAppointmentForm,
}: {
  appointmentId: string;
  title: string;
  onReportDates?: (dates: string[]) => void;
  highlightDate?: string | null;
  patientId: string;
  onOpenAppointmentForm: (nextDueDate: string, patientId: string) => void;
}) {
  const { data: visit } = useGetVisitByAppointmentId(appointmentId);
  const visitId = visit?.id || "";
  const { data: vaccDetails = [] } = useGetVaccinationDetailsByVisitId(visitId);
  const { data: masters } = useGetVaccinationMasters();
  
  // Collect all vaccination master IDs from all visit details
  const allVaccinationIds = useMemo(() => {
    const allIds = new Set<string>();
    (vaccDetails as any[])?.forEach((detail: { vaccinationMasterIds?: string[] }) => {
      if (detail?.vaccinationMasterIds?.length) {
        detail.vaccinationMasterIds.forEach((id: string) => allIds.add(id));
      }
    });
    return Array.from(allIds);
  }, [vaccDetails]);
  
  const selectedMasters = useMemo(
    () => allVaccinationIds.map((id) => masters?.find((m: any) => m.id === id)).filter(Boolean),
    [allVaccinationIds, masters]
  );
  const queries = useQueries({
    queries:
      (selectedMasters?.length
        ? selectedMasters.map((m: any) => ({
          queryKey: ["vaccinationJson", visitId, m.id],
          queryFn: () => getVaccinationJsonByIds(visitId, m.id),
          enabled: !!visitId && !!m?.id,
        }))
        : []),
  });
  const nextDueDates = useMemo(() => {
    return queries
      .map((q) => {
        try {
          if (q.data?.vaccinationJson) {
            const parsed = JSON.parse(q.data.vaccinationJson);
            return parsed?.nextDueDate || null;
          }
        } catch { }
        return null;
      })
      .filter(Boolean) as string[];
  }, [queries]);
  useEffect(() => {
    if (nextDueDates.length > 0) {
      onReportDates?.(nextDueDates);
    }
  }, [nextDueDates, onReportDates]);
  if (!visitId || selectedMasters.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {selectedMasters.map((m: any) => (
          <VaccinationItem
            key={`${visitId}_${m.id}`}
            visitId={visitId}
            vaccineId={m.id}
            label={m.disease}
            highlightDate={highlightDate}
            patientId={patientId}
            onOpenAppointmentForm={onOpenAppointmentForm}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ---------- Main Page ----------
export default function VaccinationPage() {
  const { appointments, pets, clientId, isLoading: isContextLoading } = useContext(PatientDashboardContext);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedNextDueDate, setSelectedNextDueDate] = useState<string | null>(null);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedAppointmentTypeId, setSelectedAppointmentTypeId] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const datesRef = useRef<Set<string>>(new Set());
  const { data: appointmentTypes = [], isLoading: isAppointmentTypesLoading } = useGetAppointmentType(1, 100, '', true);

  useEffect(() => {
    // Set loading to false when both context and appointment types are loaded
    if (!isContextLoading && !isAppointmentTypesLoading) {
      setIsLoading(false);
    }
  }, [isContextLoading, isAppointmentTypesLoading]);

  const handleReportDates = useCallback((newDates: string[]) => {
    let shouldUpdate = false;
    const currentSize = datesRef.current.size;
    newDates.forEach(date => {
      if (!datesRef.current.has(date)) {
        datesRef.current.add(date);
        shouldUpdate = true;
      }
    });
    if (shouldUpdate) {
      const datesArray = Array.from(datesRef.current);
      const earliest = getEarliestDate(datesArray);
      if (earliest) {
        setHighlightDate(earliest);
      }
    }
  }, []);

  const petsById = useMemo(() => {
    const map: Record<string, any> = {};
    (pets || []).forEach((p: any) => (map[p.id] = p));
    return map;
  }, [pets]);

  const items = useMemo(() => (appointments || []).map((a: any) => ({
    id: a.id,
    patientId: a.patientId,
    title: `${petsById[a.patientId]?.name || "Pet"} • ${new Date(a.appointmentDate || a.createdAt || Date.now()).toLocaleDateString()}`,
  })), [appointments, petsById]);

  // Handler to open the appointment form with prefilled data, including vaccination appt type and clinic
  const openAppointmentForm = (nextDueDate: string, patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedNextDueDate(nextDueDate);
  
    // Auto-select appointment type = "Vaccination"
    let vaccinationTypeId = null;
    if (appointmentTypes?.length) {
      const vaccType = appointmentTypes.find(
        (type: any) => type?.name && /vaccin/i.test(type.name)
      );
      vaccinationTypeId = vaccType ? vaccType.appointmentTypeId : null;
    }
    setSelectedAppointmentTypeId(vaccinationTypeId);
  
    // 🏥 Find last appointment clinic
    let lastAppointmentClinicId = null;
  
    if (appointments?.length) {
      const filtered = appointments.filter(
        (a: any) => a.patientId === patientId
      );
  
      const recentAppt = filtered
        .filter((a: any) => a.clinicId)
        .sort(
          (a: any, b: any) =>
            new Date(b.appointmentDate || b.createdAt).getTime() -
            new Date(a.appointmentDate || a.createdAt).getTime()
        )[0];
  
      if (recentAppt) {
        lastAppointmentClinicId = recentAppt.clinicId;
      }
    }
  
    setSelectedClinicId(lastAppointmentClinicId);
  
    setIsAppointmentFormOpen(true);
  };
  

  const handleClose = () => {
    setIsAppointmentFormOpen(false);
    setSelectedPatientId(null);
    setSelectedNextDueDate(null);
    setSelectedAppointmentTypeId(null);
    setSelectedClinicId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading vaccination data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] overflow-y-auto">
      <h1 className="text-2xl font-semibold">Vaccination</h1>
      <p className="text-gray-600">
        Upcoming and recorded vaccinations with their next due dates.
      </p>
      <div className="grid grid-cols-1 gap-4">
        {items.length > 0 ? (
          items.map((it: AppointmentItem) => (
            <Fragment key={it.id}>
              <VisitVaccinationCard
                appointmentId={it.id}
                title={it.title}
                highlightDate={highlightDate}
                onReportDates={handleReportDates}
                patientId={it.patientId}
                onOpenAppointmentForm={openAppointmentForm}
              />
            </Fragment>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No vaccination records found.
          </div>
        )}
      </div>
      <PatientAppointmentForm
        isOpen={isAppointmentFormOpen}
        onClose={handleClose}
        clientId={clientId}
        patients={pets}
        initialClinicId={selectedClinicId || undefined}
        initialPatientId={selectedPatientId || undefined}
        initialDate={selectedNextDueDate ? new Date(selectedNextDueDate) : undefined}
        initialAppointmentTypeId={selectedAppointmentTypeId || undefined}
      />
    </div>
  );
}
