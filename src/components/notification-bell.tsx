
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type AppNotification } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Ticket } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

export function NotificationBell() {
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('notifications', []);
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const unreadCount = isClient ? notifications.filter((n) => !n.read).length : 0;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Mark all as read when popover is closed
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    }
  };

  const handleNotificationClick = () => {
    setIsOpen(false);
  };
  
  if (!isClient) return null;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
        <div className="p-4 border-b">
          <h4 className="font-medium text-sm">Notifications</h4>
        </div>
        <ScrollArea className="h-[300px]">
        {notifications.length > 0 ? (
          <div className="flex flex-col">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={`/tickets/${notification.ticketId}`}
                className="flex items-start gap-4 p-4 hover:bg-muted/50"
                onClick={handleNotificationClick}
              >
                <div className="flex-shrink-0 pt-1">
                    <Ticket className="h-5 w-5 text-muted-foreground" />
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
            You have no new notifications.
          </div>
        )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

