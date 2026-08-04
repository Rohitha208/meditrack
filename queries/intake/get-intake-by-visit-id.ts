import { useQuery } from "@tanstack/react-query";
import { IntakeDetail } from "@/components/pawtrack/appointments/Patient-Information/types/intake";

const getIntakeByVisitId = async (visitId: string): Promise<IntakeDetail | null> => {
  try {
    if (!visitId) {
      throw new Error("Visit ID is required");
    }
    
    const response = await fetch(`/api/IntakeDetail/visit/${visitId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // No intake found for this visit - return null instead of throwing
        return null;
      }
      throw new Error("Failed to fetch intake detail by visit ID");
    }
    
    const data = await response.json();
    
    if (!data) {
      return null;
    }
    
    // Transform the response to match our interface if needed
    const transformedData: IntakeDetail = {
      ...data,
      images: data.images || [],
      files: data.files || []
    };
    
    return transformedData;
  } catch (error) {
    console.error("Error fetching intake detail by visit ID:", error);
    throw error;
  }
};

export function useGetIntakeByVisitId(visitId: string) {
  return useQuery({
    queryKey: ['intake', 'visit', visitId],
    queryFn: () => getIntakeByVisitId(visitId),
    enabled: !!visitId, // Only run query if visitId exists
  });
} 