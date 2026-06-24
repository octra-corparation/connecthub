'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { User } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ user: User; accessToken: string }>('/auth/register', form);
      setUser(res.data.user);
      setAccessToken(res.data.accessToken);
      router.replace('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 dark:bg-surface-dark">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white">
            C
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Already have one?{' '}
            <Link href="/login" className="text-brand-500 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="card-surface rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => update('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="input-field"
                placeholder="yourhandle"
                required
                minLength={3}
                maxLength={20}
              />
              <p className="mt-1 text-xs text-zinc-400">Letters, numbers, and underscores only</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="input-field"
                placeholder="Min 8 characters, include a number"
                required
                minLength={8}
              />
            </div>
            <p className="text-xs text-zinc-400">
              By signing up you agree to our{' '}
              <Link href="/terms" className="text-brand-500 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-brand-500 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
