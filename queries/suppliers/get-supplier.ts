import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type Supplier = {
  id: string;
  companyId?: string | null;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinicDetail?: {
    id: string;
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website?: string;
    taxId: string;
    licenseNumber: string;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: string;
    createdAt: string;
    updatedAt: string;
    location?: {
      lat: number;
      lng: number;
      address: string;
    };
  };
};

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type SupplierFilters = {
  name?: string
  contactPerson?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  clinicName?: string
  clinicId?: string | null
  companyId?: string | null
}

const getSupplier = async (
  pageNumber = 1,
  pageSize = 10,
  filters: Partial<SupplierFilters> = {}
) => {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })

  // Map the search parameter to name for the API
  const apiFilters = { ...filters };

  Object.entries(apiFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value))
    }
  })

  const response = await fetch(`/api/supplier?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch supplier data");
  }

  return response.json() as Promise<PaginatedResponse<Supplier>>;
}

// ✅ Flexible hook with object params
export const useGetSupplier = ({
  pageNumber = 1,
  pageSize = 10,
  filters = {},
  enabled = true,
}: {
  pageNumber?: number
  pageSize?: number
  filters?: Partial<SupplierFilters>
  enabled?: boolean
}) => {
  return useQuery<PaginatedResponse<Supplier>, Error>({
    queryKey: ["supplier", pageNumber, pageSize, filters],
    queryFn: () => getSupplier(pageNumber, pageSize, filters),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled,
  });
};
