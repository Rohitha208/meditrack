import { useQuery } from "@tanstack/react-query";
import { IntakeDetail } from "@/components/pawtrack/appointments/Patient-Information/types/intake";

const getIntakeById = async (id: string): Promise<IntakeDetail> => {
  try {
    if (!id) {
      throw new Error("Intake ID is required");
    }
    
    const response = await fetch(`/api/intake/${id}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch intake detail");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching intake detail by ID:", error);
    throw error;
  }
};

export function useGetIntakeById(id: string) {
  return useQuery({
    queryKey: ['intake', 'detail', id],
    queryFn: () => getIntakeById(id),
    enabled: !!id, // Only run query if id exists
  });
} 