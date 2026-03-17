import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

export interface CreateNotificationRequest {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: string; // JSON string or object
    clinicId?: string; // Optional clinic ID for clinic-specific notifications
}

export async function createNotification(notification: CreateNotificationRequest) {
    try {
        const response = await fetch('/api/notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notification),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Notification API error response:", errorData);
            throw new Error(errorData.message || 'Failed to create notification');
        }

        return await response.json();
    } catch (error) {
        console.error("Error in createNotification function:", error);
        throw error;
    }
}

export function useCreateNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
        onError: (error: Error) => {
            console.error("Notification creation error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to send notification",
                variant: "destructive",
            });
        },
    });
}