import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeRoom, type MediTrackRoom } from "./types";

const getRoomById = async (id: string): Promise<MediTrackRoom> => {
  const response = await fetch(`/api/room/${id}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch room"));
  }
  const payload = result?.data ?? result;
  return normalizeRoom(payload as Record<string, unknown>);
};

export const useGetRoomById = (id: string, enabled = true) =>
  useQuery({
    queryKey: ["meditrack", "rooms", id],
    queryFn: () => getRoomById(id),
    enabled: enabled && !!id,
    retry: false,
  });
