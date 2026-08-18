import { useQuery } from "@tanstack/react-query";
import type { ProductType } from "@/utils/appMode";

export type { ProductType };

export interface Company {
  id: string;
  name: string;
  description: string;
  logoUrl?: string | null;
  registrationNumber: string;
  email: string;
  phone: string;
  domainName: string; // Added domain field
  productType?: ProductType; // veterinary (PawTrack) or human (MediTrack) mode
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: string;

  privacyPolicy?: string; // Base64 encoded PDF
  termsOfUse?: string; // Base64 encoded PDF
  createdAt: string;
  updatedAt: string;
}



export interface CompanyListResponse {
  items: Company[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

const getCompanies = async (
  pageNumber = 1,
  pageSize = 10,
  search = ''
) => {
  const params = new URLSearchParams();
  params.set('pageNumber', String(pageNumber));
  params.set('pageSize', String(pageSize));
  // Always request paginated data
  params.set('paginationRequired', 'true');
  if (search) params.set('search', search);
  const qs = params.toString();
  const response = await fetch(`/api/companies${qs ? `?${qs}` : ''}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch companies data');
  }

  const data = await response.json();

  // If backend returns simple array
  if (Array.isArray(data)) {
    return { items: data, totalCount: data.length, pageNumber: 1, pageSize: data.length, totalPages: 1 } as CompanyListResponse;
  }
  // If backend returns paginated object
  if (data && Array.isArray(data.items)) {
    return data as CompanyListResponse;
  }
  // Fallback to single object
  return { items: [data as Company], totalCount: 1, pageNumber: 1, pageSize: 1, totalPages: 1 } as CompanyListResponse;
};

export function useGetCompanies(
  enabled = true,
  pageNumber = 1,
  pageSize = 10,
  search = ''
) {
  return useQuery({
    queryKey: ['companies', pageNumber, pageSize, search],
    queryFn: () => getCompanies(pageNumber, pageSize, search),
    enabled: !!enabled,
    retry: 1,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

interface GetCompanyParams {
  id?: string;
  name?: string;
}

export const getCompany = async ({ id, name }: GetCompanyParams) => {
  if (!id && !name) {
    throw new Error('Either company ID or name is required');
  }

  const url = id 
    ? `/api/companies/${id}`
    : `/api/companies/name/${encodeURIComponent(name!)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch company data');
  }

  const data = await response.json();
  return data as Company;
};

export const getCompanyById = async (id: string) => {
  return getCompany({ id });
};

export const getCompanyByName = async (name: string,search = '') => {
  return getCompany({ name });
};

export function useGetCompanyById(id: string) {
  return useQuery({
    queryKey: ['company', 'id', id],
    queryFn: () => getCompanyById(id),
    enabled: !!id,
    retry: 1,
  });
}

export function useGetCompanyByName(name: string,search = '') {
  return useQuery({
    queryKey: ['company', 'name', name,search],
    queryFn: () => getCompanyByName(name,search),
    enabled: !!name,
    retry: 1,
  });
}