'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, FileText, AlertTriangle, Activity, Ban, ShieldCheck, Search, Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/timeAgo';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type Tab = 'overview' | 'users' | 'reports';

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userQuery, setUserQuery] = useState('');

  useEffect(() => {
    if (user && user.role === 'USER') router.replace('/');
  }, [user, router]);

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data;
    },
    enabled: tab === 'overview',
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', userQuery],
    queryFn: async () => {
      const res = await api.get('/admin/users', { params: userQuery ? { q: userQuery } : {} });
      return res.data;
    },
    enabled: tab === 'users',
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const res = await api.get('/admin/reports', { params: { status: 'PENDING' } });
      return res.data;
    },
    enabled: tab === 'reports',
  });

  async function toggleSuspend(userId: string, isActive: boolean) {
    try {
      await api.put(`/admin/users/${userId}/${isActive ? 'suspend' : 'reinstate'}`);
      toast.success(isActive ? 'User suspended' : 'User reinstated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function resolveReport(reportId: string, status: string, removeContent = false) {
    try {
      await api.put(`/admin/reports/${reportId}/resolve`, { status, removeContent });
      toast.success('Report resolved');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'reports', label: 'Reports', icon: AlertTriangle },
  ];

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <h1 className="mb-3 text-xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                tab === key ? 'bg-brand-500 text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-dark-raised'
              )}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && analytics && (
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total users', value: analytics.totalUsers, icon: Users, color: 'text-brand-500' },
              { label: 'Total posts', value: analytics.totalPosts, icon: FileText, color: 'text-emerald-500' },
              { label: 'Pending reports', value: analytics.pendingReports, icon: AlertTriangle, color: 'text-amber-500' },
              { label: 'Suspended', value: analytics.suspendedUsers, icon: Ban, color: 'text-rose-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-surface rounded-2xl p-4">
                <Icon className={clsx('h-5 w-5 mb-2', color)} />
                <p className="text-2xl font-bold">{value?.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="card-surface rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">Last 7 days</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xl font-bold text-brand-500">{analytics.newUsers7d}</p>
                <p className="text-xs text-zinc-500">New users</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-500">{analytics.newPosts7d}</p>
                <p className="text-xs text-zinc-500">New posts</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-500">{analytics.activeToday}</p>
                <p className="text-xs text-zinc-500">Active today</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setUserQuery(userSearch)}
                placeholder="Search by username or email…"
                className="input-field pl-10"
              />
            </div>
          </div>
          {usersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-surface-dark-border">
              {usersData?.users?.map((u: { id: string; username: string; email: string; role: string; isActive: boolean; createdAt: string; profile?: { avatarUrl?: string; displayName?: string } }) => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <Avatar src={u.profile?.avatarUrl} name={u.profile?.displayName ?? u.username} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{u.profile?.displayName ?? u.username}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className={clsx('text-xs rounded-full px-2 py-0.5 font-medium', u.role === 'ADMIN' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'bg-zinc-100 text-zinc-600 dark:bg-surface-dark-raised dark:text-zinc-400')}>
                        {u.role}
                      </span>
                      {!u.isActive && <span className="text-xs rounded-full px-2 py-0.5 bg-rose-100 text-rose-600 font-medium">Suspended</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => toggleSuspend(u.id, u.isActive)}
                      className={clsx('text-xs rounded-full px-3 py-1 font-medium', u.isActive ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                    >
                      {u.isActive ? 'Suspend' : 'Reinstate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'reports' && (
        <div>
          {reportsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
          ) : reportsData?.reports?.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-emerald-500" />
              <p className="font-medium">No pending reports</p>
              <p className="text-sm text-zinc-500">The platform is clean — nice work.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-surface-dark-border">
              {reportsData?.reports?.map((report: { id: string; reason: string; targetType: string; createdAt: string; reporter: { username: string; profile?: { avatarUrl?: string } }; post?: { content: string } }) => (
                <div key={report.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar src={report.reporter.profile?.avatarUrl} name={report.reporter.username} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">@{report.reporter.username}</span>
                        {' reported a '}
                        <span className="font-medium">{report.targetType.toLowerCase()}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">{report.reason}</p>
                      {report.post && (
                        <p className="mt-1 rounded-lg bg-zinc-100 p-2 text-xs dark:bg-surface-dark-raised truncate">
                          "{report.post.content}"
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">{timeAgo(report.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-10">
                    <button onClick={() => resolveReport(report.id, 'ACTION_TAKEN', true)} className="text-xs rounded-full bg-rose-50 px-3 py-1 text-rose-600 hover:bg-rose-100 font-medium">
                      Remove content
                    </button>
                    <button onClick={() => resolveReport(report.id, 'DISMISSED')} className="text-xs rounded-full bg-zinc-100 px-3 py-1 text-zinc-600 hover:bg-zinc-200 font-medium dark:bg-surface-dark-raised dark:text-zinc-400">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
