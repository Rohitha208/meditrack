export interface MediTrackRoom {
  id: string;
  clinicId?: string | null;
  name: string;
  roomType?: string | null;
  floor?: string | null;
  isActive: boolean;
  createdAt?: string | null;
}

export function normalizeRoom(raw: Record<string, unknown>): MediTrackRoom {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    clinicId: (raw.clinicId as string | null | undefined) ?? (raw.ClinicId as string | null | undefined) ?? null,
    name: String(raw.name ?? raw.Name ?? ""),
    roomType: (raw.roomType as string | null | undefined) ?? (raw.RoomType as string | null | undefined) ?? null,
    floor: (raw.floor as string | null | undefined) ?? (raw.Floor as string | null | undefined) ?? null,
    isActive: raw.isActive !== false && raw.IsActive !== false,
    createdAt: (raw.createdAt as string | null | undefined) ?? (raw.CreatedAt as string | null | undefined) ?? null,
  };
}

export interface CreateRoomRequest {
  clinicId: string;
  name: string;
  roomType?: string | null;
  floor?: string | null;
  isActive?: boolean;
}

export interface UpdateRoomRequest extends CreateRoomRequest {
  id: string;
}
