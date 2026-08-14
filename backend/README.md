# backend

Express + TypeScript + Prisma (PostgreSQL) API for the Quiz Builder.

> Full setup instructions (Docker, migrations, running both apps) live in the
> root [`../README.md`](../README.md). This file is the API reference.

## Running locally

```bash
docker compose -f ../docker-compose.yml up -d   # starts Postgres on localhost:5433
cp .env.example .env                             # if you haven't already
npm install
npx prisma migrate dev
npm run dev                                      # http://localhost:4000
```

## Data model

Three question types share one `Question` table (nullable per-type answer
columns) plus a separate `Option` table for `CHECKBOX` choices — this keeps
every field strongly typed instead of using a JSON blob, at the cost of a
few always-null columns depending on question type.

```
QuestionType = "BOOLEAN" | "INPUT" | "CHECKBOX"

Option    { id, text, isCorrect, order }
Question  { id, type, text, order, correctBoolean?, correctText?, options: Option[] }
Quiz      { id, title, createdAt, questions: Question[] }
```

## Endpoints

### `POST /quizzes`

Create a quiz with one or more questions. `order` is assigned server-side
from array position — don't send it.

Request body:

```json
{
  "title": "Capitals Quiz",
  "questions": [
    {
      "type": "BOOLEAN",
      "text": "Paris is the capital of France.",
      "correctBoolean": true
    },
    {
      "type": "INPUT",
      "text": "What is the capital of Japan?",
      "correctText": "Tokyo"
    },
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
}
```

Validation (400 on failure, one message per violated rule):

- `title`: non-empty string
- `questions`: at least 1
- every question: non-empty `text`, `type` must be `BOOLEAN` | `INPUT` | `CHECKBOX`
- `BOOLEAN` requires `correctBoolean` (boolean)
- `INPUT` requires `correctText` (non-empty string)
- `CHECKBOX` requires `options` (≥ 2 items, at least one `isCorrect: true`)

**201** → the created quiz, same shape as `GET /quizzes/:id`.

### `GET /quizzes`

**200** → every quiz, summarized:

```json
[
  {
    "id": "uuid",
    "title": "Capitals Quiz",
    "questionCount": 3,
    "createdAt": "2026-08-14T16:29:29.133Z"
  }
]
```

### `GET /quizzes/:id`

**200** → full quiz with questions (and options, for `CHECKBOX`), ordered.
**404** → `{ "message": "Quiz not found" }` if the id doesn't exist.

### `DELETE /quizzes/:id`

**204** → no body, quiz and all its questions/options are gone (DB-level
cascade). **404** → `{ "message": "Quiz not found" }` if the id doesn't exist.

## Error shape

Every error response, regardless of cause, is `{ "message": string }` with an
appropriate status code (400 validation, 404 not found, 500 unexpected).
