import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";

export type AppNotification = {
  id: string;
  userId: string;
  clientId?: string;
  clinicId?: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: string;
  data?: string;
  createdAt: string;
  updatedAt: string;
};

const getNotifications = async (isRead?: boolean, clinicId?: string, clientId?: string) => {
  const params = new URLSearchParams();
  if (isRead !== undefined) params.append('isRead', String(isRead));
  if (clinicId) params.append('clinicId', clinicId);
  if (clientId) params.append('clientId', clientId);

  const response = await fetch(`/api/notification${params.toString() ? `?${params.toString()}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};


export const useGetNotifications = (
  isRead?: boolean,
  clinicId?: string,
  clientId?: string,
  enabled = true
) => {
 const query = useQuery<AppNotification[]>({
    queryKey: ["notifications", isRead, clinicId, clientId],
    queryFn: () => getNotifications(isRead, clinicId, clientId),
    enabled,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (query.error) {
      toast({
        title: "Error",
        description: query.error.message || "Failed to load notifications",
        variant: "destructive",
      });
    }
  }, [query.error]);

  return query;
};
