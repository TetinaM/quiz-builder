# frontend

Next.js (App Router) + TypeScript + Tailwind CSS app for the Quiz Builder.

> Full setup instructions (Docker, migrations, running both apps) live in the
> root [`../README.md`](../README.md). This file covers the frontend's own
> structure: the scaffold, the typed API client, and shared types.

## Running locally

Requires the backend running first (see
[`../backend/README.md`](../backend/README.md)).

```bash
cp .env.local.example .env.local
npm install
npm run dev   # http://localhost:3000
```

## Layout

```
app/            # routes (App Router)
services/api.ts # typed fetch wrapper — the only place that calls fetch()
types/quiz.ts   # types mirroring the backend's request/response shapes
```

`services/api.ts` exports one function per backend endpoint (`getQuizzes`,
`getQuiz`, `createQuiz`, `deleteQuiz`), reads the API base URL from
`NEXT_PUBLIC_API_URL`, and throws on non-2xx responses using the backend's
`{ message }` error shape.
