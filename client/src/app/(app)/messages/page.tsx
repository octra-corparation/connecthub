'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Search, Loader2, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/timeAgo';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import clsx from 'clsx';
import type { Conversation, Message } from '@/types';

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/messages/conversations');
      return res.data.conversations as Conversation[];
    },
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: async () => {
      const res = await api.get(`/messages/conversations/${activeConvId}/messages`);
      return res.data.messages as Message[];
    },
    enabled: !!activeConvId,
    refetchOnWindowFocus: false,
  });

  // Real-time message delivery
  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg: Message) => {
      if (msg.conversationId === activeConvId) {
        queryClient.setQueryData(['messages', activeConvId], (old: Message[] | undefined) =>
          old ? [...old, msg] : [msg]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };
    const onTyping = ({ conversationId, userId: uid, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (conversationId !== activeConvId || uid === user?.id) return;
      setRemoteTyping((prev) => isTyping ? [...new Set([...prev, uid])] : prev.filter((id) => id !== uid));
    };
    socket.on('message:new', onMessage);
    socket.on('typing:update', onTyping);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing:update', onTyping);
    };
  }, [socket, activeConvId, user?.id, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark read on open
  useEffect(() => {
    if (activeConvId) {
      api.post(`/messages/conversations/${activeConvId}/read`).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [activeConvId, queryClient]);

  function handleTyping() {
    if (!socket || !activeConvId) return;
    if (!typing) {
      setTyping(true);
      socket.emit('typing:start', { conversationId: activeConvId });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(false);
      socket.emit('typing:stop', { conversationId: activeConvId });
    }, 2000);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgInput.trim() || !activeConvId) return;
    const content = msgInput.trim();
    setMsgInput('');
    if (socket) socket.emit('typing:stop', { conversationId: activeConvId });
    await api.post(`/messages/conversations/${activeConvId}/messages`, { content });
  }

  const activeConversation = conversations?.find((c) => c.id === activeConvId);
  const otherParticipant = activeConversation?.participants.find((p) => p.id !== user?.id);

  return (
    <div className="flex h-screen">
      {/* ── Conversation list ── */}
      <div className={clsx('flex w-full flex-col border-r border-zinc-200 dark:border-surface-dark-border sm:w-72', activeConvId && 'hidden sm:flex')}>
        <div className="border-b border-zinc-200 p-4 dark:border-surface-dark-border">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-surface-dark-border dark:bg-surface-dark-raised">
            <Search className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Search conversations</span>
          </div>
        </div>

        {!conversations || conversations.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No messages yet" description="Start a conversation from someone's profile." />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              const other = conv.participants.find((p) => p.id !== user?.id);
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={clsx(
                    'flex w-full items-center gap-3 border-b border-zinc-100 p-4 text-left transition-colors dark:border-surface-dark-border',
                    conv.id === activeConvId ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                  )}
                >
                  <Avatar src={other?.profile?.avatarUrl} name={other?.profile?.displayName ?? other?.username} size="md" online={other?.isOnline} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={clsx('truncate text-sm', conv.unread ? 'font-semibold' : 'font-medium')}>
                        {other?.profile?.displayName ?? other?.username}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-xs text-zinc-400">{timeAgo(conv.updatedAt)}</span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className={clsx('truncate text-xs', conv.unread ? 'font-medium text-zinc-800 dark:text-zinc-200' : 'text-zinc-500')}>
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.unread && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-brand-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Chat panel ── */}
      <div className={clsx('flex flex-1 flex-col', !activeConvId && 'hidden sm:flex')}>
        {!activeConvId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose from the list to start chatting." />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-zinc-200 p-4 dark:border-surface-dark-border">
              <button onClick={() => setActiveConvId(null)} className="sm:hidden text-brand-500 font-medium text-sm">←</button>
              <Avatar src={otherParticipant?.profile?.avatarUrl} name={otherParticipant?.profile?.displayName ?? otherParticipant?.username} size="sm" online={otherParticipant?.isOnline} />
              <div>
                <p className="font-semibold text-sm">{otherParticipant?.profile?.displayName ?? otherParticipant?.username}</p>
                <p className="text-xs text-zinc-400">
                  {otherParticipant?.isOnline ? 'Online' : otherParticipant?.lastSeenAt ? `Last seen ${timeAgo(otherParticipant.lastSeenAt)}` : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : (
                messages?.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={clsx('flex', isMine ? 'justify-end' : 'justify-start')}>
                      {!isMine && (
                        <Avatar src={msg.sender.profile?.avatarUrl} name={msg.sender.profile?.displayName ?? msg.sender.username} size="xs" className="mr-2 mt-1 flex-shrink-0" />
                      )}
                      <div className={clsx('max-w-xs rounded-2xl px-4 py-2.5 text-sm lg:max-w-sm', isMine ? 'rounded-br-sm bg-brand-500 text-white' : 'rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-surface-dark-raised dark:text-zinc-100')}>
                        {msg.content}
                        <p className={clsx('mt-0.5 text-[10px]', isMine ? 'text-white/70' : 'text-zinc-400')}>
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {remoteTyping.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 rounded-2xl bg-zinc-100 px-4 py-2.5 dark:bg-surface-dark-raised">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-zinc-200 p-4 dark:border-surface-dark-border">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => { setMsgInput(e.target.value); handleTyping(); }}
                placeholder="Send a message…"
                className="input-field flex-1"
                autoComplete="off"
              />
              <button type="submit" disabled={!msgInput.trim()} className="btn-primary !px-4 !py-2.5">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
