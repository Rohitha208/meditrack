import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeRoom, type CreateRoomRequest, type MediTrackRoom } from "./types";

const createRoom = async (data: CreateRoomRequest): Promise<MediTrackRoom> => {
  const response = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to create room"));
  }
  const payload = result?.data ?? result;
  return normalizeRoom(payload as Record<string, unknown>);
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoom,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack", "rooms"] });
    },
  });
};
