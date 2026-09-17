import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeRoom, type MediTrackRoom, type UpdateRoomRequest } from "./types";

const updateRoom = async (data: UpdateRoomRequest): Promise<MediTrackRoom> => {
  const response = await fetch(`/api/room/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to update room"));
  }
  const payload = result?.data ?? result;
  return normalizeRoom((payload && typeof payload === "object" ? payload : data) as Record<string, unknown>);
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRoom,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack", "rooms"] });
    },
  });
};
