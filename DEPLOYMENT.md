# ConnectHub — Deployment Guide

## Recommended stack

| Layer | Service | Free tier? |
|-------|---------|-----------|
| PostgreSQL | [Neon](https://neon.tech) or [Railway](https://railway.app) | ✅ |
| Server (Express) | [Render](https://render.com) or [Railway](https://railway.app) | ✅ |
| Client (Next.js) | [Vercel](https://vercel.com) | ✅ |
| Image storage | [Cloudinary](https://cloudinary.com) | ✅ |
| Email | [Resend](https://resend.com) or [SendGrid](https://sendgrid.com) | ✅ |

---

## Step 1: Database (Neon, recommended)

1. Create a free Neon project.
2. Copy the **connection string** (it looks like `postgresql://user:pass@host/db?sslmode=require`).
3. Add `?sslmode=require` if it's not already there.
4. Set this as `DATABASE_URL` in your server env.

Run migrations against the production DB:

```bash
DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
```

---

## Step 2: Server on Render

1. Push code to GitHub.
2. New Web Service → connect your repo → set **Root directory** to `server`.
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `node dist/index.js`
5. Add all env vars from `server/.env.example` under **Environment**.
6. Set `CLIENT_URL` to your Vercel client URL (from step 3).
7. Deploy — note the service URL (e.g. `https://connecthub-server.onrender.com`).

---

## Step 3: Client on Vercel

1. `vercel login && vercel` from the `client/` directory, or connect via the Vercel dashboard.
2. Set env vars:

```
NEXT_PUBLIC_API_URL=https://connecthub-server.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://connecthub-server.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
```

3. Deploy. Note your production URL and update `CLIENT_URL` on Render.

---

## Step 4: Seed production data (optional)

```bash
DATABASE_URL="<your-neon-url>" tsx server/prisma/seed/seed.ts
```

---

## Security checklist

- [ ] All JWT secrets are 32+ random characters, not the examples from `.env.example`
- [ ] `NODE_ENV=production` on the server
- [ ] `CLIENT_URL` is set to the exact Vercel deployment URL (no trailing slash)
- [ ] Cloudinary upload preset is set to **signed** (not unsigned)
- [ ] SMTP credentials are for a transactional provider, not Gmail
- [ ] Database password is not the seeded default `connecthub_password`
- [ ] `GOOGLE_CLIENT_ID` has your production domain in "Authorized JS origins"

---

## Scaling notes

- The Socket.IO server uses in-process state — for multi-instance deployments, add Redis adapter (`@socket.io/redis-adapter`).
- Add `prisma.$connect()` call in `index.ts` and a connection pool limit for production (`connection_limit` in `DATABASE_URL`).
- Add a CDN (Cloudflare) in front of Render for static assets and DDoS protection.
