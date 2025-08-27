# Backend (Express + Socket.io + Prisma)

## Structure
```
src/
  config/          # env, db, prisma client
  controllers/     # HTTP handlers (thin)
  middlewares/     # auth, validation, error handler
  models/          # domain types, prisma mappings if needed
  repositories/    # DB access (User/Conversation/Message)
  routes/          # route definitions
  services/        # business logic (auth, chat, upload, tokens)
  sockets/         # Socket.io server and event handlers
  utils/           # helpers (password, response)
  app.ts           # express app bootstrap
  server.ts        # http + socket.io server
prisma/
  schema.prisma
```

## Env
Copy `.env.example` to `.env` and fill values.

## Common Endpoints
- POST `/api/auth/register` — create account
- POST `/api/auth/login` — get JWT
- GET `/api/users/me` — current user
- GET `/api/conversations` — list inbox
- POST `/api/conversations` — start 1:1
- GET `/api/conversations/:id/messages` — list messages
- POST `/api/messages` — send message (text)
- POST `/api/uploads/image` — upload image (returns URL)

Socket.io namespace: `/chat` with events like `message:send`, `message:received`, `conversation:join`. 