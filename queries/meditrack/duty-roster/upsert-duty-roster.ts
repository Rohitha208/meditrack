import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { DutyRosterEntry, ShiftType } from "./types";

export interface UpsertDutyRosterRequest {
  userId: string;
  clinicId: string;
  shiftDate: string;
  shiftType: ShiftType;
}

const upsertDutyRoster = async (data: UpsertDutyRosterRequest): Promise<DutyRosterEntry> => {
  const response = await fetch("/api/meditrack/duty-roster", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to save shift"));
  }
  return result as DutyRosterEntry;
};

export const useUpsertDutyRoster = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertDutyRoster,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-duty-roster"] });
    },
  });
};
