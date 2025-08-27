# Real-Time Chat System (Node.js + Next.js + MySQL)

## Objective
Build a complete real-time chat system with authentication, 1:1 conversations, instant messaging via websockets, and image uploads.

## Tech Stack
- Backend: Node.js, Express, Socket.io, TypeScript, JWT
- Frontend: Next.js (App Router), React, TypeScript
- Database: MySQL (ORM: Prisma or Sequelize; this template assumes Prisma)
- Storage: Local FS by default (can be swapped for S3/GCS)

## Monorepo Layout
```
realtime_chat_task/
  backend/
    src/
      config/
      controllers/
      middlewares/
      models/
      repositories/
      routes/
      services/
      sockets/
      utils/
      app.ts
      server.ts
    prisma/
      schema.prisma
    .env.example
    package.json
    tsconfig.json
    README.md
  frontend/
    public/
    src/
      app/
        (routes)
      components/
      hooks/
      lib/
      styles/
    .env.local.example
    next.config.mjs
    package.json
    tsconfig.json
    README.md
  docker-compose.yml
```

## High-Level Flow
- Users register/login (JWT). Access token used for HTTP and Socket.io auth.
- Users can start a 1:1 conversation from the inbox.
- Messages (text/images) are sent over Socket.io and persisted in MySQL.
- Inbox shows latest message and timestamp per conversation.

## Database (Prisma) Schema Overview
- User(id, email, passwordHash, name, avatarUrl, createdAt)
- Conversation(id, createdAt)
- ConversationParticipant(id, conversationId, userId)
- Message(id, conversationId, senderId, type[text|image], body, imageUrl, createdAt)

## Setup (Local)
1) Prereqs: Node 18+, pnpm/npm, Docker (for MySQL), OpenSSL
2) Start MySQL via Docker
```
docker compose up -d
```
3) Backend
```
cd backend
cp .env.example .env
# fill in env vars
pnpm i # or npm i
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```
4) Frontend
```
cd ../frontend
cp .env.local.example .env.local
pnpm i # or npm i
pnpm dev
```

## Environment Variables
- Backend: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `UPLOAD_DIR`, `CORS_ORIGIN`
- Frontend: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SOCKET_URL`

## Scripts (suggested)
- Backend: dev (ts-node-dev), build (tsc), start (node dist/server.js)
- Frontend: dev (next dev), build (next build), start (next start)

## Notes
- Swap local uploads with S3 by updating `storageService`.
- Add rate-limiting and brute-force protection for production.
- Ensure HTTPS and secure cookie settings in deployment. 