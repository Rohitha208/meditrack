import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { DutyRosterEntry, ShiftType } from "./types";
import { normalizeDutyRoster, toShiftDateKey } from "./types";

export interface UpsertDutyRosterRequest {
  userId: string;
  clinicId: string;
  companyId?: string | null;
  shiftDate: string;
  shiftType: ShiftType;
}

const upsertDutyRoster = async (data: UpsertDutyRosterRequest): Promise<DutyRosterEntry> => {
  const response = await fetch("/api/meditrack/duty-roster", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: data.userId,
      clinicId: data.clinicId,
      companyId: data.companyId || null,
      shiftDate: data.shiftDate,
      shiftType: data.shiftType,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to save shift"));
  }
  const normalized = normalizeDutyRoster(result);
  return (
    normalized[0] || {
      userId: data.userId,
      clinicId: data.clinicId,
      shiftDate: data.shiftDate,
      shiftType: data.shiftType,
    }
  );
};

export const useUpsertDutyRoster = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertDutyRoster,
    retry: false,
    onSuccess: (saved, variables) => {
      const dateKey = toShiftDateKey(saved.shiftDate || variables.shiftDate);
      const shiftType = (isShift(saved.shiftType) ? saved.shiftType : variables.shiftType) as ShiftType;
      const userId = String(saved.userId || variables.userId);
      const clinicId = String(saved.clinicId || variables.clinicId);

      queryClient.setQueriesData<DutyRosterEntry[]>(
        { queryKey: ["meditrack-duty-roster"] },
        (old) => {
          const list = Array.isArray(old) ? [...old] : [];
          const idx = list.findIndex(
            (e) =>
              String(e.userId).toLowerCase() === userId.toLowerCase() &&
              toShiftDateKey(e.shiftDate) === dateKey
          );
          const nextEntry: DutyRosterEntry = {
            ...(idx >= 0 ? list[idx] : {}),
            id: saved.id ?? (idx >= 0 ? list[idx].id : null),
            userId,
            userName: saved.userName ?? (idx >= 0 ? list[idx].userName : null),
            clinicId,
            shiftDate: dateKey,
            shiftType,
          };
          if (idx >= 0) list[idx] = nextEntry;
          else list.push(nextEntry);
          return list;
        }
      );

      // Soft refetch — do not clear UI if GET is empty/stale
      void queryClient.invalidateQueries({
        queryKey: ["meditrack-duty-roster"],
        refetchType: "active",
      });
    },
  });
};

function isShift(value: unknown): value is ShiftType {
  return value === "M" || value === "E" || value === "N" || value === "OFF";
}
