import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { MediTrackUser } from "./get-users";

function asNullableString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function asRate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeUser(payload: unknown): MediTrackUser {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const src = (root.data && typeof root.data === "object"
    ? (root.data as Record<string, unknown>)
    : root) as Record<string, unknown>;

  return {
    id: String(src.id ?? src.Id ?? ""),
    email: String(src.email ?? src.Email ?? ""),
    firstName: String(src.firstName ?? src.FirstName ?? ""),
    lastName: String(src.lastName ?? src.LastName ?? ""),
    role: String(src.role ?? src.Role ?? ""),
    roleId: String(src.roleId ?? src.RoleId ?? ""),
    roleName: String(src.roleName ?? src.RoleName ?? ""),
    companyId: asNullableString(src.companyId ?? src.CompanyId) ?? undefined,
    departmentId: asNullableString(src.departmentId ?? src.DepartmentId),
    specialtyId: asNullableString(src.specialtyId ?? src.SpecialtyId),
    medicalRegistrationNumber: asNullableString(
      src.medicalRegistrationNumber ?? src.MedicalRegistrationNumber
    ),
    rate: asRate(src.rate ?? src.Rate),
    isActive: Boolean(src.isActive ?? src.IsActive ?? true),
    lastLogin: asNullableString(src.lastLogin ?? src.LastLogin),
    createdAt: asNullableString(src.createdAt ?? src.CreatedAt),
    updatedAt: asNullableString(src.updatedAt ?? src.UpdatedAt),
  };
}

const getUserById = async (id: string): Promise<MediTrackUser> => {
  const response = await fetch(`/api/user/${id}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch user"));
  }
  return normalizeUser(result);
};

export const useGetMediTrackUserById = (id?: string, enabled = true) =>
  useQuery({
    queryKey: ["meditrack-user", id || ""],
    queryFn: () => getUserById(id as string),
    enabled: !!id && enabled,
    retry: false,
  });
