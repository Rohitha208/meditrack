import { useQuery } from "@tanstack/react-query";
import { User } from "@/components/pawtrack/users";

const getUserById = async (id: string) => {
    const response = await fetch(`/api/user/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch user');
    }
    return response.json();
};

export const useGetUserById = (id: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ["users", id],
        queryFn: () => getUserById(id),
        enabled: !!id && enabled,
        refetchOnWindowFocus: false,
    });
};
