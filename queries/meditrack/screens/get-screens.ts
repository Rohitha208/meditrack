import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export interface MediTrackScreen {
  id: string;
  name: string;
  description?: string;
}

function normalizeScreens(payload: unknown): MediTrackScreen[] {
  if (Array.isArray(payload)) return payload as MediTrackScreen[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as MediTrackScreen[];
    if (Array.isArray(obj.items)) return obj.items as MediTrackScreen[];
  }
  return [];
}

const getScreens = async (): Promise<MediTrackScreen[]> => {
  const response = await fetch("/api/meditrack/screen");
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch screens"));
  }
  return normalizeScreens(result);
};

export const useGetMediTrackScreens = (enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-screens"],
    queryFn: getScreens,
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
