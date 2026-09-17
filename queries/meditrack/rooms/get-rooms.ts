import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { normalizeRoom, type MediTrackRoom } from "./types";

export interface GetRoomsParams {
  clinicId?: string;
  pageNumber?: number;
  pageSize?: number;
}

const getRooms = async (params: GetRoomsParams = {}): Promise<MediTrackRoom[]> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.clinicId) query.set("clinicId", params.clinicId);

  const response = await fetch(`/api/room?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch rooms"));
  }

  const payload = result?.data ?? result;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.Items)
        ? payload.Items
        : [];

  return items.map((item: Record<string, unknown>) => normalizeRoom(item));
};

export const useGetRooms = (params: GetRoomsParams = {}, enabled = true) =>
  useQuery({
    queryKey: ["meditrack", "rooms", params],
    queryFn: () => getRooms(params),
    enabled,
    retry: false,
  });
