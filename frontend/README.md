# frontend

Next.js (App Router) + TypeScript + Tailwind CSS app for the Quiz Builder.

Pages (`/create`, `/quizzes`, `/quizzes/:id`) land in Phases 7–9 — see
[`../rules/02-workflow-phases.md`](../rules/02-workflow-phases.md) and
[`../rules/05-frontend-rules.md`](../rules/05-frontend-rules.md). This file
covers what exists so far: the scaffold, the typed API client, and shared types.

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
