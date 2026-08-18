import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export interface MediTrackRole {
  id: string;
  name: string;
  value: string;
  isPrivileged: boolean;
  metadata?: string;
  colourName?: string;
  isClinicRequired?: boolean;
  priority?: number;
}

export function normalizeRoles(payload: unknown): MediTrackRole[] {
  if (Array.isArray(payload)) return payload as MediTrackRole[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as MediTrackRole[];
    if (Array.isArray(obj.items)) return obj.items as MediTrackRole[];
    if (obj.value && Array.isArray(obj.value)) return obj.value as MediTrackRole[];
  }
  return [];
}

const getRoles = async (): Promise<MediTrackRole[]> => {
  const response = await fetch("/api/meditrack/role");
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch roles"));
  }
  return normalizeRoles(result);
};

export const useGetMediTrackRoles = (enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-roles"],
    queryFn: getRoles,
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
