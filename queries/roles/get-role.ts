import { useQuery } from "@tanstack/react-query";

export type Role = {
    id: string;
    name: string;
    value: string;
    isPrivileged: boolean;
    metadata: string;
    createdAt: string;
    updatedAt: string;
    isClinicRequired: boolean;
    colourName: string;
    priority: number;
};

export type RoleListResponse = {
    data: Role[];
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
};

const getRole = async (
    pageNumber = 1,
    pageSize = 10,
    search = ""
): Promise<RoleListResponse> => {
    const response = await fetch(
        `/api/role?pageNumber=${pageNumber}&pageSize=${pageSize}&search=${search}`
    );
    if (!response.ok) {
        throw new Error("Failed to fetch role data");
    }
    return response.json();
};

export const useGetRole = (
    pageNumber = 1,
    pageSize = 10,
    search = "",
    enabled = true
) => {
    return useQuery({
        queryKey: ["role", pageNumber, pageSize, search],
        queryFn: () => getRole(pageNumber, pageSize, search),
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
        enabled,
    });
};
