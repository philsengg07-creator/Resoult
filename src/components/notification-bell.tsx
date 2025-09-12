
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type AppNotification } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Ticket, CalendarClock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

export function NotificationBell() {
  const { data: notifications, update: updateNotification, loading } = useDatabaseList<AppNotification>('notifications');
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const unreadCount = useMemo(() => {
    if (!isClient || loading) return 0;
    return notifications.filter((n) => !n.read).length;
  }, [notifications, isClient, loading]);

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
        updateNotification(notification.id, { ...notification, read: true });
    }
  };
  
  const sortedNotifications = useMemo(() => {
      if (!isClient || loading) return [];
      return [...notifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, isClient, loading]);
  
  const unreadNotifications = useMemo(() => {
      return sortedNotifications.filter(n => !n.read);
  }, [sortedNotifications]);
  
  if (!isClient || loading) {
     return (
        <Button variant="ghost" size="icon" className="relative" disabled>
            <Bell className="h-5 w-5" />
        </Button>
     );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b flex justify-between items-center">
          <h4 className="font-medium text-sm">Notifications</h4>
          {unreadCount > 0 && <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{unreadCount} unread</span>}
        </div>
        <ScrollArea className="h-[300px]">
        {sortedNotifications.length > 0 ? (
          <div className="flex flex-col">
            {sortedNotifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.type === 'renewal' ? `/renewals` : `/tickets/${notification.refId}`}
                className="flex items-start gap-4 p-4 hover:bg-muted/50"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-shrink-0 pt-1">
                    {notification.type === 'renewal' ? (
                      <CalendarClock className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Ticket className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground p-8">
            You have no notifications.
          </div>
        )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
