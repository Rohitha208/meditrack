'use client';

import { Bell } from 'lucide-react';
import { useUnreadNotificationCount } from '@/queries/notifications/get-notifcation-unread-count';
import { Button } from '@/components/ui/button';
import { useQueryStates, parseAsString } from 'nuqs';
import { Suspense } from 'react';
import { useRootContext } from '@/context/RootContext';
import { getClientId } from '@/utils/clientCookie';

const searchParamsParser = {
  notificationState: parseAsString,
} as const;

function NotificationBellContent() {
  const { clinic, userType } = useRootContext();
  const clientId = getClientId();
  
  if (userType?.isAdmin) {
    return null;
  }
  
  // Use clientId for clients, clinicId for veterinarians/staff
  const isClient = userType?.isClient;
  // Fetch unread count from API with appropriate parameters
  const { data: unreadCount = 0, isLoading } = useUnreadNotificationCount(
    isClient ? undefined : (clinic?.id || undefined), // clinicId only for non-clients
    isClient ? clientId : undefined // clientId only for clients
  );
  const [, setNotificationState] = useQueryStates(searchParamsParser);

  const handleOpenNotifications = () => {
    setNotificationState({
      notificationState: "open",
    });
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleOpenNotifications}
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {!isLoading && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
};

export const NotificationBell = () => {
  return (
    <Suspense fallback={<div className="relative"><Button variant="ghost" size="icon" aria-label="Open notifications"><Bell className="h-5 w-5" /></Button></div>}>
      <NotificationBellContent />
    </Suspense>
  );
};