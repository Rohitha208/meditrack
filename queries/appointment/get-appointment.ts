import { appointmentSearchParamsParser, appointmentSearchParamsSerializer, AppointmentSearchParamsType } from "@/components/pawtrack/appointments/hooks/useAppointmentFilter";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getJwtToken } from "@/utils/clientCookie";

interface AppointmentResponse {
  items: any[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isRegistered?: boolean;
}

const EMPTY_APPOINTMENTS_RESULT: AppointmentResponse = {
  items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0,
  hasPreviousPage: false, hasNextPage: false,
};

const getAppointments = async (searchParams: AppointmentSearchParamsType) => {
  // If we're not authenticated (e.g. this query's observer is still
  // mounted right as logout clears the JWT cookie), skip the call
  // entirely instead of hitting the API and logging a spurious 401.
  if (typeof window !== 'undefined' && !getJwtToken()) {
    return EMPTY_APPOINTMENTS_RESULT;
  }
  try {
    // Directly build URLSearchParams object instead of relying on serialization
    const params = new URLSearchParams();
    
    // Add pagination parameters (using numbers or defaults)
    params.set('pageNumber', String(searchParams.pageNumber || 1));
    params.set('pageSize', String(searchParams.pageSize || 10));
    
    // Add UUID parameters if present
    if (searchParams.clinicId) {
      params.set('clinicId', searchParams.clinicId);
    }
    
    if (searchParams.patientId) {
      params.set('patientId', searchParams.patientId);
    }
    
    if (searchParams.clientId) {
      params.set('clientId', searchParams.clientId);
    }
    
    if (searchParams.veterinarianId) {
      params.set('veterinarianId', searchParams.veterinarianId);
    }
    
    if (searchParams.roomId) {
      params.set('roomId', searchParams.roomId);
    }
    
    // Add date parameters if present
    if (searchParams.dateFrom) {
      params.set('dateFrom', searchParams.dateFrom);
    }
    
    if (searchParams.dateTo) {
      params.set('dateTo', searchParams.dateTo);
    }
    
    // Add other parameters if present
    if (searchParams.status) {
      params.set('status', searchParams.status);
    }
    
    if (searchParams.provider) {
      params.set('provider', searchParams.provider);
    }
    
    if (searchParams.search) {
      params.set('search', searchParams.search);
    }
    
    // Add companyId if present
    if (searchParams.companyId) {
      params.set('companyId', searchParams.companyId);
    }

    // Always include the isRegistered parameter since it's important for filtering
    params.set('isRegistered', searchParams.isRegistered !== undefined ? String(searchParams.isRegistered) : 'false');
    // Construct URL with query string only if we have parameters
    const queryString = params.toString();
    const url = queryString ? `/api/appointment?${queryString}` : '/api/appointment';    
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw result;
    }
    
    
    // Check if the response data format is as expected
    if (result.data && typeof result.data === 'object') {
      // Return the data object (which should contain items, totalCount, etc.)
      return result.data;
    } else if (Array.isArray(result)) {
      // Handle case where API returns array directly
      return {
        items: result,
        totalCount: result.length,
        pageNumber: 1,
        pageSize: result.length,
        totalPages: 1
      };
    } else {
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0 };
    }
  } catch (error) {
    console.error('API Error fetching appointments:', error);
    throw error;
  }
}

export const useGetAppointments = (
  searchParams: AppointmentSearchParamsType,
  options?: {
    enabled?: boolean;
  }
) => {
  // Create a stable query key that includes all relevant search parameters
  // Break down into individual dependencies instead of using the whole searchParams object
  const queryKey = [
    'appointment',
    searchParams.clinicId || '', // Explicitly list clinicId first for visibility
    searchParams.veterinarianId || '',
    searchParams.dateFrom || '',
    searchParams.dateTo || '',
    searchParams.search || '',
    searchParams.status || '',
    searchParams.provider || '',
    searchParams.patientId || '',
    searchParams.clientId || '',
    searchParams.roomId || '',
    searchParams.pageNumber || 1,
    searchParams.pageSize || 10,
    searchParams.isRegistered !== undefined ? searchParams.isRegistered : false,
    searchParams.companyId || ''
  ];

  return useQuery({
    queryKey,
    queryFn: () => getAppointments(searchParams),
    // Ensure we refetch on window focus and don't cache too aggressively
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
    ...options,
  });
} 