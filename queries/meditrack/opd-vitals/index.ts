import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { isGuid } from "@/queries/meditrack/opd-diagnostics";
import type { OpdVitalDetail, SaveOpdVitalsRequest } from "./types";

export * from "./types";

const BASE = "/api/meditrack/vitals";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, fallback));
  }
  return result as T;
}

export const opdVitalsKey = (visitId: string) => ["meditrack", "opd-vitals", visitId];

const fetchVitalsByVisit = async (visitId: string): Promise<OpdVitalDetail | null> => {
  const response = await fetch(`${BASE}/visit/${visitId}`);
  if (response.status === 404) return null;
  const data = await readJson<OpdVitalDetail | null>(response, "Failed to load vitals");
  return data && data.id ? data : null;
};

export const useOpdVitals = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: opdVitalsKey(visitId || ""),
    queryFn: () => fetchVitalsByVisit(visitId as string),
    enabled: Boolean(visitId) && isGuid(visitId) && enabled,
    retry: false,
  });

const createVitals = async (data: SaveOpdVitalsRequest): Promise<OpdVitalDetail> => {
  const response = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readJson<OpdVitalDetail>(response, "Failed to record vitals");
};

const updateVitals = async (id: string, data: SaveOpdVitalsRequest): Promise<OpdVitalDetail> => {
  const response = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, id }),
  });
  return readJson<OpdVitalDetail>(response, "Failed to update vitals");
};

export const useSaveOpdVitals = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: SaveOpdVitalsRequest & { id?: string | null }) => {
      if (id) return updateVitals(id, data);
      return createVitals(data);
    },
    retry: false,
    onSuccess: (saved) => {
      if (saved.visitId) {
        void queryClient.invalidateQueries({ queryKey: opdVitalsKey(saved.visitId) });
      }
    },
  });
};
