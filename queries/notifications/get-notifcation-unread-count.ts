import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";


const getUnreadNotificationCount = async (clinicId?: string, clientId?: string): Promise<number> => {
  const params = new URLSearchParams();
  if (clinicId) params.append('clinicId', clinicId);
  if (clientId) params.append('clientId', clientId);

  const url = params.toString() 
    ? `/api/notification/unread/count?${params.toString()}`
    : "/api/notification/unread/count";
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch unread count");
  }

  const data = await response.json();
  return data.count;
};

export const useUnreadNotificationCount = (clinicId?: string, clientId?: string, enabled = true) => {
  const query = useQuery({
    queryKey: ["notifications-unread-count", clinicId, clientId],
    queryFn: () => getUnreadNotificationCount(clinicId, clientId),
    enabled,
    refetchOnWindowFocus: false,
  });

  if (query.error) {
    toast({
      title: "Error",
      description: (query.error as Error).message || "Failed to load unread notifications count",
      variant: "destructive",
    });
  }

  return query;
};
