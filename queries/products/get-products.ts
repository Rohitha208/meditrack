import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Product } from "@/components/pawtrack/products";
import { ProductSearchParamsType, proudctSearchParser } from "@/components/pawtrack/products/hooks/useFilter";

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

const getProducts = async (pageNumber = 1, pageSize = 10, search: string, companyId?: string) => {

    const response = await fetch(`/api/products${search ? `${search}&` : '?'}pageNumber=${pageNumber}&pageSize=${pageSize}${companyId ? `&companyId=${companyId}` : ''}`);
    if (!response.ok) {
        throw new Error('Failed to fetch product data');
    }
    return response.json() as Promise<PaginatedResponse<Product>>;
};

export const useGetProducts = (pageNumber = 1, pageSize = 10, search: ProductSearchParamsType, companyId?: string, enabled = true) => {
    return useQuery({
        queryKey: ["products", pageNumber, pageSize, search, companyId],
        queryFn: async () => {
            const searchParams = proudctSearchParser({...search});
            return getProducts(pageNumber, pageSize, searchParams, companyId);
        },
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        enabled
    });
};
