import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export interface MediTrackUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: string;
  roleName: string;
  companyId?: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MediTrackUserResponse {
  items: MediTrackUser[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface GetMediTrackUsersParams {
  pageNumber?: number;
  pageSize?: number;
  companyId?: string;
  roleIds?: string[];
  clinicIds?: string[];
  search?: string;
}

function normalizeUsers(payload: unknown): MediTrackUserResponse {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const items = Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.data)
        ? obj.data
        : Array.isArray(payload)
          ? payload
          : [];
    return {
      items: items as MediTrackUser[],
      totalCount: Number(obj.totalCount ?? items.length),
      pageNumber: Number(obj.pageNumber ?? 1),
      pageSize: Number(obj.pageSize ?? items.length),
      totalPages: Number(obj.totalPages ?? 1),
    };
  }
  return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0 };
}

const getUsers = async (params: GetMediTrackUsersParams): Promise<MediTrackUserResponse> => {
  const query = new URLSearchParams({
    pageNumber: String(params.pageNumber ?? 1),
    pageSize: String(params.pageSize ?? 100),
    paginationRequired: "true",
  });
  if (params.companyId) query.set("companyId", params.companyId);
  if (params.search) query.set("search", params.search);
  (params.roleIds ?? []).forEach((id) => query.append("roleIds", id));
  (params.clinicIds ?? []).forEach((id) => query.append("clinicIds", id));

  const response = await fetch(`/api/meditrack/user?${query.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch users"));
  }
  return normalizeUsers(result);
};

export const useGetMediTrackUsers = (params: GetMediTrackUsersParams, enabled = true) => {
  const roleIds = params.roleIds ?? [];
  const clinicIds = params.clinicIds ?? [];
  return useQuery({
    queryKey: [
      "meditrack-users",
      params.pageNumber ?? 1,
      params.pageSize ?? 100,
      params.companyId || "",
      params.search || "",
      roleIds,
      clinicIds,
    ],
    queryFn: () => getUsers(params),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
