import { useQuery } from "@tanstack/react-query";
import { IntakeDetail } from "@/components/pawtrack/appointments/Patient-Information/types/intake";

const getAllIntakeDetails = async (): Promise<IntakeDetail[]> => {
  try {
    const response = await fetch('/api/IntakeDetail');
    
    if (!response.ok) {
      throw new Error("Failed to fetch intake details");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching all intake details:", error);
    throw error;
  }
};

export function useGetAllIntakeDetails(enabled = true) {
  return useQuery({
    queryKey: ['intake', 'all'],
    queryFn: getAllIntakeDetails,
    enabled,
  });
} 