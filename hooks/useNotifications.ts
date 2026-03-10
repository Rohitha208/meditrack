import { useGetNotifications } from '@/queries/notifications/get-notifications';
import { useUnreadNotificationCount } from '@/queries/notifications/get-notifcation-unread-count';
import { useMarkNotificationRead } from '@/queries/notifications/mark-notification-read';

export type NotificationType =
  | 'info'
  | 'warning'
  | 'success'
  | 'error'
  | 'appointment_created'
  | 'appointment_cancelled'
  | 'appointment_updated'
  | 'appointment_completed'
  | 'appointment_checked_in'
  | 'video_call_appointment';

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: NotificationType;
  isRead: boolean;
  data?: any;
}

export const useNotifications = () => {
  const notificationsQuery = useGetNotifications();
  const unreadCountQuery = useUnreadNotificationCount();
  const markAsReadMutation = useMarkNotificationRead();

  const markAsRead = async (id: string) => {
    return markAsReadMutation.mutateAsync({ id });
  };

  return {
    notifications: notificationsQuery.data || [],
    unreadCount: unreadCountQuery.data || 0,
    isLoading:
      notificationsQuery.isLoading ||
      notificationsQuery.isFetching ||
      unreadCountQuery.isLoading,
    markAsRead,
    refetch: notificationsQuery.refetch,
  };
};
