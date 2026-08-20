import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export interface MediTrackScreenAccess {
  id: string;
  screenId: string;
  screenName: string;
  clinicId: string;
  roleId: string;
  roleName: string;
  isAccessEnable: boolean;
}

function normalizeAccess(payload: unknown): MediTrackScreenAccess[] {
  if (Array.isArray(payload)) return payload as MediTrackScreenAccess[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as MediTrackScreenAccess[];
    if (Array.isArray(obj.items)) return obj.items as MediTrackScreenAccess[];
  }
  return [];
}

const getScreenAccess = async (clinicId?: string, roleId?: string): Promise<MediTrackScreenAccess[]> => {
  const params = new URLSearchParams();
  if (clinicId) params.set("clinicId", clinicId);
  if (roleId) params.set("roleId", roleId);
  const response = await fetch(`/api/meditrack/screen/access?${params.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch screen access"));
  }
  return normalizeAccess(result);
};

export const useGetMediTrackScreenAccess = (clinicId?: string, roleId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["meditrack-screen-access", clinicId || "", roleId || ""],
    queryFn: () => getScreenAccess(clinicId, roleId),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};

export interface UpdateScreenAccessPayload {
  roleId: string;
  clinicId?: string | null;
  screenIds: string[];
  isAccessEnable: boolean;
}

const updateScreenAccess = async (payload: UpdateScreenAccessPayload): Promise<void> => {
  const response = await fetch("/api/meditrack/screen/access", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update screen access"));
  }
};

export const useUpdateScreenAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateScreenAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack-screen-access"] });
    },
  });
};
