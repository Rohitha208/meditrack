import { useQuery, keepPreviousData } from "@tanstack/react-query";

export interface Client {
  id: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phonePrimary: string;
  phoneSecondary?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  isActive: boolean;
  isPremium: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClientFilters {
  firstName?: string;
  lastName?: string;
  email?: string;
  phonePrimary?: string;
}

interface ClientResponse {
  items: Client[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

const getClients = async (
  pageNumber = 1,
  pageSize = 10,
  search = '',
  type = 'first_name',
  companyId?: string,
  filters: ClientFilters = {}
) => {
  const params = new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize)
  });

  // Only include generic search params when there's a search term
  if (search && search.trim().length > 0) {
    params.append('Type', type);
    params.append('Query', search);
  }

  if (companyId) params.append('CompanyId', companyId);

  // Append optional filters if present
  if (filters.firstName) params.append('FirstName', filters.firstName);
  if (filters.lastName) params.append('LastName', filters.lastName);
  if (filters.email) params.append('Email', filters.email);
  if (filters.phonePrimary) params.append('PhonePrimary', filters.phonePrimary);

  const url = `/api/clients?${params.toString()}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch clients data');
  }
  
  const data = await response.json();
  return data as ClientResponse;
};

export function useGetClients(
  pageNumber = 1,
  pageSize = 10,
  search = '',
  type = 'first_name',
  companyId?: string,
  enabled = true,
  filters: ClientFilters = {}
) {
  return useQuery({
    queryKey: ['clients', pageNumber, pageSize, search, type, companyId, filters],
    queryFn: () => getClients(pageNumber, pageSize, search, type, companyId, filters),
    enabled: !!enabled,
    retry: 1,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });
}

export const getClientById = async (id: string) => {
  if (!id) throw new Error('Client ID is required');
  
  const response = await fetch(`/api/clients/${id}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch client data');
  }
  
  const data = await response.json();
  return data as Client;
};

export function useGetClientById(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => getClientById(id),
    enabled: !!id,
    retry: 1,
  });
}

