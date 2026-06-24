'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/** Establishes (or reuses) the global Socket.IO connection for the current session. */
export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !accessToken) return;
    if (socket?.connected) return;

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000', {
      auth: { token: accessToken },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    initialized.current = true;

    return () => {
      // Keep the connection alive across route changes; only torn down on logout (see authStore).
    };
  }, [user, accessToken]);

  useEffect(() => {
    if (!user && socket) {
      socket.disconnect();
      socket = null;
    }
  }, [user]);

  return socket;
}
