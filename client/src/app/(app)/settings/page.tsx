'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor, Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password changed');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  }

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {});
    logout();
    router.replace('/login');
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-surface-dark-border">
        {/* Theme */}
        <section className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Appearance</h2>
          <div className="flex gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={clsx(
                  'flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-colors',
                  theme === value
                    ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'border-zinc-200 dark:border-surface-dark-border hover:border-zinc-300'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Change password */}
        <section className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Security</h2>
          <form onSubmit={changePassword} className="space-y-3 max-w-sm">
            <div>
              <label className="mb-1 block text-sm font-medium">Current password</label>
              <input type="password" value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">New password</label>
              <input type="password" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} className="input-field" minLength={8} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirm new password</label>
              <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} className="input-field" required />
            </div>
            <button type="submit" disabled={pwLoading} className="btn-primary">
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
            </button>
          </form>
        </section>

        {/* Danger zone */}
        <section className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Account</h2>
          <button onClick={handleLogout} className="btn-secondary text-accent-rose border-accent-rose hover:bg-rose-50 dark:hover:bg-rose-900/20">
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
