'use client';

import { useRef, useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { api, getApiErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

const MAX_IMAGES = 4;
const MAX_CHARS = 2000;

interface ComposeModalProps {
  onClose: () => void;
  onPosted?: () => void;
}

export function ComposeModal({ onClose, onPosted }: ComposeModalProps) {
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_IMAGES} images`);
      return;
    }
    const toAdd = incoming.slice(0, room);
    setImages((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit() {
    if (!content.trim() && images.length === 0) {
      toast.error('Write something or add an image');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      images.forEach((img) => formData.append('images', img));

      await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      toast.success('Posted!');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      onPosted?.();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create post'));
    } finally {
      setSubmitting(false);
    }
  }

  const charsLeft = MAX_CHARS - content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card-surface flex max-h-screen w-full flex-col rounded-none sm:max-h-[85vh] sm:max-w-xl sm:rounded-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-surface-dark-border">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-surface-dark-raised">
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">New post</span>
          <div className="w-8" />
        </div>

        <div
          className="flex-1 overflow-y-auto p-4"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex gap-3">
            <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.displayName ?? user?.username} size="md" />
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What's happening?"
              rows={4}
              className="flex-1 resize-none bg-transparent text-lg outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>

          {previews.length > 0 && (
            <div className={`mt-3 grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {previews.map((src, i) => (
                <div key={src} className="group relative aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Upload preview ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isDragging && (
            <div className="mt-3 flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-brand-400 bg-brand-50 text-sm text-brand-600 dark:bg-brand-900/20">
              Drop images to attach
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 p-4 dark:border-surface-dark-border">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="btn-ghost"
          >
            <ImageIcon className="h-5 w-5 text-brand-500" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          <div className="flex items-center gap-3">
            <span className={`text-xs ${charsLeft < 0 ? 'text-accent-rose' : 'text-zinc-400'}`}>{charsLeft}</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || charsLeft < 0 || (!content.trim() && images.length === 0)}
              className="btn-primary"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
