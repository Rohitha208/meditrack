import { useQuery } from "@tanstack/react-query";
import { Product } from "@/components/pawtrack/products";

const getProductById = async (id: string) => {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch product');
        
    }
    return response.json();
};

export const useGetProductById = (id: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ["products", id],
        queryFn: () => getProductById(id),
        enabled: !!id && enabled,
        refetchOnWindowFocus: false,
    });
};
