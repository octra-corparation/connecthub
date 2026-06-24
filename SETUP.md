# ConnectHub — Local Setup Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.x |
| npm | ≥ 10.x |
| Docker + Docker Compose | any recent |
| Git | any |

---

## 1. Clone and configure environment

```bash
git clone <your-repo-url> connecthub
cd connecthub

# Server env (copy and fill in your real values)
cp server/.env.example server/.env

# Client env
cp client/.env.example client/.env.local
```

**Mandatory values to set in `server/.env`:**

| Variable | Where to get it |
|----------|----------------|
| `JWT_ACCESS_SECRET` | Any 32+ char random string (`openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Another 32+ char random string |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `CLOUDINARY_CLOUD_NAME` | [cloudinary.com](https://cloudinary.com) → Dashboard |
| `CLOUDINARY_API_KEY` | Same as above |
| `CLOUDINARY_API_SECRET` | Same as above |
| `SMTP_*` | [Mailtrap](https://mailtrap.io) (free for dev) or your SMTP provider |

> **Note:** Cloudinary and SMTP are optional for initial local dev — the app works without them, avatar/cover uploads will error but all other features function normally. The app falls back to logging reset emails to the console when `SMTP_HOST` is not set.

---

## 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

Wait a few seconds for it to be healthy, then confirm:

```bash
docker compose ps   # postgres should show "healthy"
```

---

## 3. Set up the database

```bash
cd server
npm install
npx prisma migrate dev --name init    # runs migrations, creates tables
npm run seed                           # loads test users, posts, follows, messages
```

After seeding, you can log in with:

| Email | Password | Role |
|-------|----------|------|
| `admin@connecthub.app` | `Password123` | Admin |
| `sarah_dev@example.com` | `Password123` | User |
| `mike_design@example.com` | `Password123` | User |
| *(+ 3 more users from seed)* | `Password123` | User |

---

## 4. Start the server

```bash
# From /server
npm run dev
# → API listening on http://localhost:4000
```

Confirm it's up:

```bash
curl http://localhost:4000/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## 5. Start the Next.js client

```bash
cd ../client
npm install
npm run dev
# → App running on http://localhost:3000
```

Open http://localhost:3000 — you'll be redirected to the login page.

---

## 6. Running tests

```bash
# Server unit + integration tests
cd server
npm test

# Client (if you add component tests)
cd client
npm test
```

---

## 7. Optional: Prisma Studio (visual database browser)

```bash
cd server
npx prisma studio
# → Opens on http://localhost:5555
```

---

## Docker Compose (full stack in containers)

To run everything containerised instead of locally:

```bash
# Build + start all services
docker compose up --build

# Or just start the database (for local node dev)
docker compose up -d postgres
```

---

## Environment variables reference

### `server/.env`

See [`server/.env.example`](./server/.env.example) for the full list with descriptions.

### `client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Project structure

```
connecthub/
├── server/
│   ├── src/
│   │   ├── config/          # env, Prisma client, Cloudinary
│   │   ├── controllers/     # Request handlers (auth, users, posts, etc.)
│   │   ├── middleware/       # Auth, rate-limit, sanitize, CSRF, error handler
│   │   ├── routes/          # Express routers aggregated in routes/index.ts
│   │   ├── services/        # Business logic (auth, post, notification, email)
│   │   ├── sockets/         # Socket.IO server (presence, chat, typing, notifications)
│   │   ├── utils/           # JWT, ApiError, asyncHandler, textParsing
│   │   ├── validators/      # express-validator chains
│   │   ├── app.ts           # Express app factory (middleware composition)
│   │   └── index.ts         # Server entrypoint (HTTP + Socket.IO)
│   ├── prisma/
│   │   ├── schema.prisma    # All 12+ data models
│   │   └── seed/seed.ts     # Test data
│   └── tests/               # Vitest unit + integration tests
│
├── client/
│   └── src/
│       ├── app/             # Next.js 15 App Router pages
│       │   ├── (app)/       # Protected route group
│       │   │   ├── home/          # Personalized feed
│       │   │   ├── explore/       # Search + trending
│       │   │   ├── notifications/ # Notification center
│       │   │   ├── messages/      # Real-time DMs
│       │   │   ├── bookmarks/     # Saved posts
│       │   │   ├── post/[postId]/ # Post detail + comments
│       │   │   ├── profile/[username]/ # User profile
│       │   │   ├── settings/      # Theme + account settings
│       │   │   └── admin/         # Admin dashboard
│       │   ├── login/
│       │   ├── register/
│       │   ├── forgot-password/
│       │   └── reset-password/
│       ├── components/
│       │   ├── layout/      # AppShell (sidebar + mobile nav)
│       │   ├── post/        # PostCard, PostFeed, ComposeModal, ImageGallery
│       │   ├── profile/     # EditProfileModal
│       │   └── ui/          # Avatar, Skeletons, EmptyState, ThemeToggle
│       ├── context/         # AuthProvider, ThemeProvider, QueryProvider
│       ├── hooks/           # useInfinitePosts, useSocket, useUnreadCounts
│       ├── lib/             # api (axios), timeAgo
│       ├── store/           # Zustand authStore
│       └── types/           # Shared TypeScript types
│
├── docker-compose.yml
└── README.md
```

---

## Troubleshooting

**`DATABASE_URL` connection refused** — Make sure `docker compose up -d postgres` is running and healthy before migrating.

**401 Unauthorized on all requests** — Your `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` must match between restarts. If you change them, existing tokens are invalidated — log in again.

**Image uploads fail** — Check your Cloudinary credentials in `server/.env`. The three `CLOUDINARY_*` vars must all be set.

**Google login not working** — Make sure `GOOGLE_CLIENT_ID` matches in both `server/.env` and `client/.env.local`, and that `http://localhost:4000` is in your Google Cloud Console "Authorized JavaScript origins".

**Socket.IO connection fails** — Confirm `NEXT_PUBLIC_SOCKET_URL` in `client/.env.local` matches where the server is running. The server must be started before the client connects.
