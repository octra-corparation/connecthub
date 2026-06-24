export type Role = 'USER' | 'ADMIN' | 'MODERATOR';

export interface Profile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  isVerified: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  profile: Profile | null;
  createdAt: string;
}

export interface PostImage {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  order: number;
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  content: string;
  images: PostImage[];
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { likes: number; comments: number; reposts: number; bookmarks: number };
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  content: string;
  parentId: string | null;
  isEdited: boolean;
  createdAt: string;
  _count: { likes: number; replies: number };
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  participants: User[];
  lastMessage: Message | null;
  unread: boolean;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string;
  createdAt: string;
  isEdited: boolean;
}

export type NotificationType = 'FOLLOW' | 'LIKE' | 'COMMENT' | 'REPLY' | 'MENTION' | 'MESSAGE' | 'REPOST';

export interface AppNotification {
  id: string;
  type: NotificationType;
  recipientId: string;
  actorId: string | null;
  actor: User | null;
  postId: string | null;
  commentId: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Hashtag {
  id: string;
  tag: string;
  useCount: number;
}

export interface PaginatedPosts {
  posts: Post[];
  nextCursor: string | null;
}
