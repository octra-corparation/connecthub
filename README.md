# ConnectHub

A full-stack social media application (Instagram/X/Threads-style) built as a monorepo:

```
connecthub/
├── server/      # Express.js + TypeScript API, Socket.IO, Prisma/PostgreSQL
├── client/      # Next.js 15 + React + TypeScript + Tailwind frontend
└── docker-compose.yml
```

See `SETUP.md` for full local setup, `DEPLOYMENT.md` for production deployment,
and `server/prisma/schema.prisma` for the data model.

Quick start:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
docker compose up -d postgres
cd server && npm install && npx prisma migrate dev && npm run seed && npm run dev
cd ../client && npm install && npm run dev
```

Backend: http://localhost:4000  ·  Frontend: http://localhost:3000
