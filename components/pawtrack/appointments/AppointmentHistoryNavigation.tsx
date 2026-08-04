import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface AppointmentHistoryNavigationProps {
  patientHistory: any[]; 
  currentAppointmentId: string;
  onAppointmentSelect: (newAppointmentId: string) => void;
  selectedAppointmentType?: string; 
}

const AppointmentHistoryNavigation: React.FC<AppointmentHistoryNavigationProps> = ({
  patientHistory,
  currentAppointmentId,
  onAppointmentSelect,
  selectedAppointmentType,
}) => {
  const sortedItems = useMemo(() => {
    return (patientHistory || []).sort((a, b) => {
      const dateA = new Date(a.appointmentDate).getTime();
      const dateB = new Date(b.appointmentDate).getTime();

      if (dateA === dateB) {
        const timeA = a.appointmentTimeFrom;
        const timeB = b.appointmentTimeFrom;
        return timeA.localeCompare(timeB);
      }
      return dateA - dateB;
    });
  }, [patientHistory]);

  const currentIndex = useMemo(() => {
    return sortedItems.findIndex((a) => a.appointmentId === currentAppointmentId);
  }, [sortedItems, currentAppointmentId]);

  const canPrev = useMemo(() => currentIndex > 0, [currentIndex]);
  const canNext = useMemo(() => currentIndex < sortedItems.length - 1, [currentIndex, sortedItems.length]);

  const selectedItem = currentIndex >= 0 ? sortedItems[currentIndex] : undefined;
  const displayDate = selectedItem?.appointmentDate
    ? new Date(selectedItem.appointmentDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : undefined;

  return (
    <>
      {sortedItems.length > 0 && (
        <div className="mb-4 px-1 flex items-center justify-between border-b pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{displayDate || "Current appointment"}</span>
            </div>
            {selectedItem && (
              <div className="text-xs text-gray-500 dark:text-gray-500 ml-6">
                {selectedItem.appointmentType}
                {selectedItem.appointmentTimeFrom && selectedItem.appointmentTimeTo && (
                  <span className="ml-2">
                    {selectedItem.appointmentTimeFrom.slice(0, 5)} - {selectedItem.appointmentTimeTo.slice(0, 5)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={!canPrev}
              onClick={() => {
                if (!canPrev) return;
                const prevItem = sortedItems[currentIndex - 1];
                onAppointmentSelect(prevItem.appointmentId);
              }}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!canNext}
              onClick={() => {
                if (!canNext) return;
                const nextItem = sortedItems[currentIndex + 1];
                onAppointmentSelect(nextItem.appointmentId);
              }}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentHistoryNavigation;
