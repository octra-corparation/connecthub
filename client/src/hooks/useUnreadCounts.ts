'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';

export function useUnreadCounts() {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const socket = useSocket();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    api
      .get('/notifications/unread-count')
      .then((res) => setUnreadNotifications(res.data.count))
      .catch(() => {});
    api
      .get('/messages/conversations')
      .then((res) => setUnreadMessages(res.data.conversations.filter((c: { unread: boolean }) => c.unread).length))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const onNotification = () => setUnreadNotifications((n) => n + 1);
    const onMessage = () => setUnreadMessages((n) => n + 1);
    socket.on('notification:new', onNotification);
    socket.on('message:new', onMessage);
    return () => {
      socket.off('notification:new', onNotification);
      socket.off('message:new', onMessage);
    };
  }, [socket]);

  return { unreadNotifications, unreadMessages, setUnreadNotifications, setUnreadMessages };
}
