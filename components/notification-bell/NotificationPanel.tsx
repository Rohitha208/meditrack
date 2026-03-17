'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useGetNotifications ,AppNotification} from '@/queries/notifications/get-notifications';
import { useMarkNotificationRead } from '@/queries/notifications/mark-notification-read';
import { useRootContext } from '@/context/RootContext';
import { getClientId } from '@/utils/clientCookie';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Check } from 'lucide-react';
import App from 'next/app';
import { Suspense } from 'react';

const searchParamsParser = {
  notificationState: parseAsString,
} as const;

export const NotificationPanel = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotificationPanelContent />
    </Suspense>
  );
};

const NotificationPanelContent = () => {
  const [{ notificationState }, setNotificationState] = useQueryStates(searchParamsParser);
  const { clinic, userType } = useRootContext();
  const clientId = getClientId();
  
  // Use clientId for clients, clinicId for veterinarians/staff
  const isClient = userType?.isClient;
  const { data: notificationsData, isLoading } = useGetNotifications(
    undefined, 
    isClient ? undefined : (clinic?.id || undefined), // clinicId only for non-clients
    isClient ? clientId : undefined // clientId only for clients
  );

  const markAsReadMutation = useMarkNotificationRead();

  const isOpen = notificationState === 'open';

  const handleClose = () => {
    setNotificationState({ notificationState: null });
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({ id: notificationId });

    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const notifications: AppNotification[] = notificationsData || [];
  const unreadCount = notifications.filter((n: AppNotification) => !n.isRead).length;


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_created':
        return '📅';
      case 'appointment_cancelled':
        return '❌';
      case 'appointment_checked_in':
        return '✅';
      case 'appointment_completed':
        return '✔️';
      case 'success':
        return '✅';
      case 'error':
        return '❗';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Notifications</SheetTitle>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  className={`p-3 mb-2 rounded-lg border transition-colors cursor-pointer ${
                    notification.isRead 
                      ? 'bg-background opacity-60' 
                      : 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <Badge variant="default" className="ml-auto shrink-0">New</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                        {!notification.isRead && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notifications</p>
            </div>
          )}
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};