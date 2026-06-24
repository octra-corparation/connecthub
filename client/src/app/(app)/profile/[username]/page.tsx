'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MapPin, Link2, Calendar, Camera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { api, getApiErrorMessage } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { PostFeed } from '@/components/post/PostFeed';
import { ProfileHeaderSkeleton } from '@/components/ui/Skeletons';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { User } from '@/types';
import { EditProfileModal } from '@/components/profile/EditProfileModal';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}`);
      return res.data as { user: User; isFollowing: boolean; isFollowedBy: boolean };
    },
  });

  const isOwner = currentUser?.username === username;
  const profileUser = data?.user;

  async function toggleFollow() {
    if (!profileUser) return;
    setFollowLoading(true);
    try {
      if (data?.isFollowing) {
        await api.delete(`/users/${profileUser.id}/follow`);
        toast.success(`Unfollowed @${profileUser.username}`);
      } else {
        await api.post(`/users/${profileUser.id}/follow`);
        toast.success(`Following @${profileUser.username}`);
      }
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setFollowLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <ProfileHeaderSkeleton />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-zinc-500">User not found.</p>
        <Link href="/explore" className="text-brand-500 hover:underline text-sm">
          Explore ConnectHub
        </Link>
      </div>
    );
  }

  const joinDate = new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <button onClick={() => router.back()} className="btn-ghost rounded-full p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">{profileUser.profile?.displayName ?? profileUser.username}</h1>
          <p className="text-xs text-zinc-500">{profileUser.profile?.postsCount ?? 0} posts</p>
        </div>
      </div>

      {/* Cover photo */}
      <div className="relative h-48 bg-gradient-to-br from-brand-400 to-brand-700">
        {profileUser.profile?.coverUrl && (
          <Image src={profileUser.profile.coverUrl} alt="Cover" fill className="object-cover" />
        )}
        {isOwner && (
          <label className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
            <Camera className="h-4 w-4" />
            <input type="file" accept="image/*" hidden onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.append('image', file);
              try {
                await api.post('/users/me/cover', form);
                queryClient.invalidateQueries({ queryKey: ['profile', username] });
                toast.success('Cover updated');
              } catch (err) {
                toast.error(getApiErrorMessage(err));
              }
            }} />
          </label>
        )}
      </div>

      {/* Avatar + actions */}
      <div className="px-4 pb-4">
        <div className="-mt-12 flex items-end justify-between">
          <div className="relative">
            <Avatar src={profileUser.profile?.avatarUrl} name={profileUser.profile?.displayName ?? profileUser.username} size="xl" className="ring-4 ring-surface dark:ring-surface-dark" />
            {isOwner && (
              <label className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" hidden onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('image', file);
                  try {
                    const res = await api.post('/users/me/avatar', form);
                    queryClient.invalidateQueries({ queryKey: ['profile', username] });
                    if (currentUser) setUser({ ...currentUser, profile: res.data.profile });
                    toast.success('Avatar updated');
                  } catch (err) {
                    toast.error(getApiErrorMessage(err));
                  }
                }} />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            {isOwner ? (
              <button onClick={() => setEditOpen(true)} className="btn-secondary">
                Edit profile
              </button>
            ) : (
              <>
                <Link href={`/messages`} onClick={async () => {
                  await api.get(`/messages/conversations/with/${profileUser.id}`);
                }} className="btn-secondary">
                  Message
                </Link>
                <button onClick={toggleFollow} disabled={followLoading} className={data?.isFollowing ? 'btn-secondary' : 'btn-primary'}>
                  {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : data?.isFollowing ? 'Following' : 'Follow'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio block */}
        <div className="mt-3">
          <h2 className="text-xl font-bold">{profileUser.profile?.displayName ?? profileUser.username}</h2>
          <p className="text-zinc-500">@{profileUser.username}</p>
          {data?.isFollowedBy && !isOwner && (
            <span className="mt-1 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-surface-dark-raised">
              Follows you
            </span>
          )}
          {profileUser.profile?.bio && <p className="mt-2 text-sm whitespace-pre-wrap">{profileUser.profile.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
            {profileUser.profile?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />{profileUser.profile.location}
              </span>
            )}
            {profileUser.profile?.website && (
              <a href={profileUser.profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-500 hover:underline">
                <Link2 className="h-3.5 w-3.5" />{profileUser.profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />Joined {joinDate}
            </span>
          </div>
          <div className="mt-3 flex gap-5 text-sm">
            <Link href={`/profile/${username}/following`} className="hover:underline">
              <span className="font-bold">{profileUser.profile?.followingCount ?? 0}</span>
              <span className="text-zinc-500"> Following</span>
            </Link>
            <Link href={`/profile/${username}/followers`} className="hover:underline">
              <span className="font-bold">{profileUser.profile?.followersCount ?? 0}</span>
              <span className="text-zinc-500"> Followers</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="border-t border-zinc-200 dark:border-surface-dark-border">
        <PostFeed
          queryKey={['userPosts', username]}
          endpoint={`/posts/user/${username}`}
          emptyTitle="No posts yet"
          emptyDescription={isOwner ? "Share something to get started." : `@${username} hasn't posted yet.`}
        />
      </div>

      {editOpen && (
        <EditProfileModal
          user={profileUser}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['profile', username] });
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
