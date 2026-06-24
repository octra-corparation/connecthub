'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import type { User } from '@/types';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProfileModal({ user, onClose, onSaved }: EditProfileModalProps) {
  const [form, setForm] = useState({
    username: user.username,
    displayName: user.profile?.displayName ?? '',
    bio: user.profile?.bio ?? '',
    website: user.profile?.website ?? '',
    location: user.profile?.location ?? '',
  });
  const [loading, setLoading] = useState(false);

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/users/me/profile', form);
      toast.success('Profile updated');
      onSaved();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card-surface w-full max-w-md rounded-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-surface-dark-border">
          <h3 className="text-base font-semibold">Edit profile</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Username</label>
            <input value={form.username} onChange={(e) => update('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className="input-field" minLength={3} maxLength={20} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Display name</label>
            <input value={form.displayName} onChange={(e) => update('displayName', e.target.value)} className="input-field" maxLength={50} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Bio</label>
            <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={3} className="input-field resize-none" maxLength={280} />
            <p className="mt-1 text-right text-xs text-zinc-400">{form.bio.length}/280</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Website</label>
            <input value={form.website} onChange={(e) => update('website', e.target.value)} className="input-field" type="url" placeholder="https://yoursite.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Location</label>
            <input value={form.location} onChange={(e) => update('location', e.target.value)} className="input-field" maxLength={100} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
