'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User as UserIcon,
  Settings,
  PlusSquare,
  Shield,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useState } from 'react';
import { ComposeModal } from '@/components/post/ComposeModal';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '/notifications', label: 'Notifications', icon: Bell, key: 'notifications' as const },
  { href: '/messages', label: 'Messages', icon: Mail, key: 'messages' as const },
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { unreadNotifications, unreadMessages } = useUnreadCounts();
  const [composeOpen, setComposeOpen] = useState(false);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } finally {
      logout();
      router.replace('/login');
      toast.success('Logged out');
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      {/* ── Desktop left sidebar ── */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col justify-between border-r border-zinc-200 px-3 py-5 dark:border-surface-dark-border lg:flex">
        <div>
          <Link href="/" className="mb-6 flex items-center gap-2 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 font-display text-lg font-bold text-white">
              C
            </div>
            <span className="text-lg font-bold tracking-tight">ConnectHub</span>
          </Link>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const badge =
                item.key === 'notifications' ? unreadNotifications : item.key === 'messages' ? unreadMessages : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'group relative flex items-center gap-4 rounded-full px-3 py-2.5 text-base transition-colors',
                    active
                      ? 'font-semibold text-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-dark-raised'
                  )}
                >
                  <span className="relative">
                    <item.icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
                    {badge > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-rose px-1 text-[10px] font-bold text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`/profile/${user?.username}`}
              className={clsx(
                'flex items-center gap-4 rounded-full px-3 py-2.5 text-base transition-colors',
                pathname === `/profile/${user?.username}`
                  ? 'font-semibold text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-dark-raised'
              )}
            >
              <UserIcon className="h-6 w-6" strokeWidth={1.8} />
              Profile
            </Link>
            {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <Link
                href="/admin"
                className="flex items-center gap-4 rounded-full px-3 py-2.5 text-base text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-dark-raised"
              >
                <Shield className="h-6 w-6" strokeWidth={1.8} />
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              className="flex items-center gap-4 rounded-full px-3 py-2.5 text-base text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-dark-raised"
            >
              <Settings className="h-6 w-6" strokeWidth={1.8} />
              Settings
            </Link>
          </nav>

          <button onClick={() => setComposeOpen(true)} className="btn-primary mt-5 w-full">
            <PlusSquare className="h-5 w-5" />
            Post
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-full px-3 py-2.5 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-dark-raised"
        >
          <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.displayName ?? user?.username} size="sm" />
          <span className="flex-1 truncate">
            <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
              {user?.profile?.displayName ?? user?.username}
            </span>
            <span className="block truncate text-xs">@{user?.username}</span>
          </span>
          <LogOut className="h-4 w-4 flex-shrink-0" />
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="min-h-screen w-full flex-1 border-r border-zinc-200 dark:border-surface-dark-border lg:max-w-[600px]">
        {children}
      </main>

      {/* ── Right rail reserved for page-specific widgets (trending, suggestions) ── */}
      <aside className="sticky top-0 hidden h-screen w-80 flex-shrink-0 overflow-y-auto px-4 py-5 xl:block" id="right-rail" />

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-zinc-200 bg-white/95 py-2 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/95 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const badge =
            item.key === 'notifications' ? unreadNotifications : item.key === 'messages' ? unreadMessages : 0;
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center p-2">
              <item.icon
                className={clsx('h-6 w-6', active ? 'text-brand-500' : 'text-zinc-500 dark:text-zinc-400')}
                strokeWidth={active ? 2.4 : 1.8}
              />
              {badge > 0 && (
                <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-rose text-[9px] font-bold text-white">
                  {badge > 9 ? '9' : badge}
                </span>
              )}
            </Link>
          );
        })}
        <button onClick={() => setComposeOpen(true)} className="flex flex-col items-center p-2">
          <PlusSquare className="h-6 w-6 text-zinc-500 dark:text-zinc-400" strokeWidth={1.8} />
        </button>
        <Link href={`/profile/${user?.username}`} className="flex flex-col items-center p-2">
          <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.displayName ?? user?.username} size="xs" />
        </Link>
      </nav>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
    </div>
  );
}
