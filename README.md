# Quiz Builder

A full-stack app for creating quizzes with multiple question types, browsing
them in a dashboard, and viewing any quiz's structure in detail.

- **Create** a quiz with any mix of True/False, short-answer, and
  multiple-choice questions, added/removed dynamically.
- **Browse** all quizzes with title + question count, and delete any of them.
- **View** a single quiz's full structure, read-only.

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Node.js, Express, TypeScript, PostgreSQL via Prisma |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, React Hook Form + Zod |

## Project structure

```text
quiz-builder/
├── backend/          # Express API — see backend/README.md
├── frontend/         # Next.js app — see frontend/README.md
├── docker-compose.yml # local PostgreSQL for development
└── README.md          # you are here
```

## Prerequisites

- **Node.js 20.9+** (developed against 22.x) and npm
- **Docker Desktop** (for the local PostgreSQL container) — or see
  [Using your own PostgreSQL](#using-your-own-postgresql) below if you'd
  rather not use Docker

## Quick start

### 1. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL in a container, exposed on **host port 5433** (not
the default 5432 — see [Why port 5433?](#why-port-5433)), with a database,
user, and password all set to `quiz_builder`.

### 2. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

- `cp .env.example .env` — the example file's defaults already match
  `docker-compose.yml`, so no editing is needed.
- `npm install` also generates the Prisma Client (via a `postinstall` hook).
- `npx prisma migrate dev` applies the database schema.
- The API is now running at **http://localhost:4000**.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

The app is now running at **http://localhost:3000** (redirects to
`/quizzes`).

## Environment variables

Each app has its own `.env`; see `backend/.env.example` and
`frontend/.env.local.example` for the exact files to copy.

| App | Variable | Purpose | Default |
|---|---|---|---|
| backend | `DATABASE_URL` | PostgreSQL connection string | matches `docker-compose.yml` |
| backend | `PORT` | Port the API listens on | `4000` |
| frontend | `NEXT_PUBLIC_API_URL` | Base URL the frontend calls for the API | `http://localhost:4000` |

Real `.env`/`.env.local` files are gitignored and were never committed —
only the `.example` templates are tracked.

## Creating a sample quiz

**Option A — through the UI:**

1. Open [http://localhost:3000/create](http://localhost:3000/create).
2. Enter a title, e.g. "Capitals Quiz".
3. Fill in the first question (defaults to a short-answer type) — e.g.
   "What is the capital of Japan?" with answer "Tokyo".
4. Click **+ Add question**, switch its type to "True / False", and fill it
   in — e.g. "Paris is the capital of France." → True.
5. Click **+ Add question** again, switch to "Multiple choice", and fill in
   at least two options, marking the correct one(s).
6. Click **Create quiz** — you'll land on the new quiz's detail page.

**Option B — via the API directly:**

```bash
curl -X POST http://localhost:4000/quizzes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Capitals Quiz",
    "questions": [
      { "type": "BOOLEAN", "text": "Paris is the capital of France.", "correctBoolean": true },
      { "type": "INPUT", "text": "What is the capital of Japan?", "correctText": "Tokyo" },
      {
        "type": "CHECKBOX",
        "text": "Which of these are EU capitals?",
        "options": [
          { "text": "Berlin", "isCorrect": true },
          { "text": "Oslo", "isCorrect": false },
          { "text": "Madrid", "isCorrect": true }
        ]
      }
    ]
  }'
```

Either way, the quiz then shows up at
[http://localhost:3000/quizzes](http://localhost:3000/quizzes).

Full endpoint reference (request/response shapes, validation rules): see
[`backend/README.md`](backend/README.md).

## Code quality

Both apps have ESLint + Prettier configured:

```bash
npm run lint            # in backend/ or frontend/
npm run format:check
```

## Using your own PostgreSQL

If you'd rather not use Docker, point `DATABASE_URL` in `backend/.env` at
any PostgreSQL 14+ instance you already have running, e.g.:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/quiz_builder?schema=public"
```

then continue from `npx prisma migrate dev` in the backend steps above —
Prisma will create the database and apply the schema.

## Why port 5433?

`docker-compose.yml` maps the container's PostgreSQL to **host port 5433**
instead of the default 5432. This avoids a real, easy-to-hit conflict: many
dev machines already have a native PostgreSQL install (or another project's
Docker container) bound to 5432, which silently intercepts connections
intended for this project's database and produces confusing "authentication
failed" errors even with correct credentials. If port 5433 is free on your
machine, this just works; if it's also taken, change the host-side port in
`docker-compose.yml` and the port in both `backend/.env` and
`backend/.env.example` to match.
