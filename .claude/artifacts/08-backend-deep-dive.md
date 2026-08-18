# 8. Backend Deep Dive (Interview Prep)

Everything below describes the **actual code as it exists**, not the plan —
cross-check against `backend/src/**` and `backend/prisma/**` if anything here
ever looks stale. Written for explaining the backend from memory in a
technical interview: what each file does, why it's structured this way, how
the database migration system works, and how the whole thing gets built and
run.

---

## 1. The one-sentence architecture

A layered Express app — **routes → validation middleware → controller →
service → Prisma → PostgreSQL** — with one centralized error handler at the
bottom of the middleware chain. Every layer has exactly one job, so you can
point at any bug and say which file is responsible.

```
HTTP request
   │
   ▼
app.ts            — global middleware (cors, json body parsing), mounts routers, mounts error handler last
   │
   ▼
routes/quizzes.routes.ts     — maps HTTP verb+path → [validation middleware, controller fn]
   │
   ▼
middleware/validate.ts       — validateBody(schema): Zod-parses req.body, 400s early on bad input
   │
   ▼
controllers/quizzes.controller.ts  — translates HTTP ⇄ service calls (req/res only, no business logic, no SQL)
   │
   ▼
services/quizzes.service.ts  — business logic + Prisma queries (the only file that talks to the DB)
   │
   ▼
lib/prisma.ts     — single shared PrismaClient instance
   │
   ▼
PostgreSQL (via Docker Compose, port 5433 on host)

Errors thrown anywhere in that chain are caught by:
middleware/error-handler.ts  — last middleware, maps error → { message } + status code
```

This is a classic **MVC-ish / layered service architecture** — not a
framework convention, just applied Express best practice: controllers stay
"dumb" (HTTP-shape translation only), services own all business logic and
are the only files that import `prisma`, and validation is a middleware
concern that runs *before* a controller ever sees the request.

---

## 2. Request lifecycle, file by file

### `src/server.ts` — the entrypoint
```ts
import "dotenv/config";
import { app } from "./app";
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(...));
```
- `dotenv/config` is imported *first*, purely for its side effect: it reads
  `.env` and populates `process.env` before anything else runs.
- Deliberately split from `app.ts`: `app.ts` exports the configured Express
  app with no side effects (no `listen()` call), so it can be imported by a
  test file (supertest-style) without binding a real port. `server.ts` is
  the only file that actually starts listening. This is a standard
  Express testability pattern.

### `src/app.ts` — app assembly
```ts
export const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", ...);
app.use("/quizzes", quizzesRouter);
app.use(errorHandler);
```
- `cors()` — open CORS (no origin restriction) since this is a local
  take-home project talking to a frontend on a different port
  (`localhost:3000` → `localhost:4000`), not a public deployment.
- `express.json()` — parses `Content-Type: application/json` bodies into
  `req.body`. Throws a `SyntaxError` on malformed JSON, which is why
  `error-handler.ts` explicitly checks for `SyntaxError` + `"body" in err`.
- `/health` is a trivial `{ status: "ok" }` endpoint — no DB touch, just
  proves the process is alive. Existed since Phase 2 (scaffold), before any
  real routes, to validate the TypeScript build pipeline first.
- **Order matters critically here**: `errorHandler` must be registered
  *last*. Express identifies error-handling middleware purely by *arity* —
  a function with exactly 4 parameters `(err, req, res, next)` is treated
  as an error handler, and only errors from routes/middleware registered
  *before* it are caught. Any middleware after it would never run.

### `src/routes/quizzes.routes.ts` — the route table
```ts
quizzesRouter.post("/", validateBody(createQuizSchema), quizzesController.createQuiz);
quizzesRouter.get("/", quizzesController.listQuizzes);
quizzesRouter.get("/:id", quizzesController.getQuiz);
quizzesRouter.delete("/:id", quizzesController.deleteQuiz);
```
- A `Router()` instance mounted at `/quizzes` in `app.ts`, so these paths
  are relative (`/` here = `/quizzes` externally).
- Only `POST /` has validation middleware — it's the only endpoint that
  accepts a body. `GET`/`DELETE` just take a URL param, which is not
  Zod-validated (an empty/garbage `:id` simply won't match any row → 404,
  which is an acceptable, simpler outcome than a 400).
- This file is intentionally "boring" — it's the map from HTTP surface to
  code, nothing else. Reading it top-to-bottom tells you the entire public
  API surface.

### `src/middleware/validate.ts` — generic Zod-validation middleware
```ts
export function validateBody(schema: ZodType) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map(...).join("; ");
      next(new ApiError(400, message));
      return;
    }
    req.body = result.data;
    next();
  };
}
```
- A **higher-order middleware factory**: `validateBody(schema)` returns an
  actual Express middleware closed over that specific schema. This is what
  lets one generic function validate any endpoint's body shape.
- Uses Zod's `safeParse` (not `parse`) specifically so it never throws —
  errors are handled explicitly instead of relying on a try/catch.
- On failure: builds a single human-readable string from all Zod issues
  (`"questions.0.text: Question text is required; title: Title is
  required"` etc.), wraps it in an `ApiError(400, ...)`, and calls
  `next(err)` — which skips every remaining non-error middleware and jumps
  straight to `errorHandler`.
- On success: **replaces `req.body` with `result.data`**, not the original
  body. This matters — Zod's `.trim()` calls (e.g. `z.string().trim()`)
  mean the parsed data has whitespace stripped, so the controller/service
  layer downstream can trust the data is already clean without
  re-validating or re-trimming. This is the "parse, don't validate"
  pattern: after this middleware, `CreateQuizBody` is a guarantee, not a
  hope.

### `src/validation/quizzes.schema.ts` — the Zod schema (source of truth for the shape)
```ts
const questionSchema = z.discriminatedUnion("type", [
  booleanQuestionSchema, inputQuestionSchema, checkboxQuestionSchema,
]);
export const createQuizSchema = z.object({
  title: z.string().trim().min(1, ...),
  questions: z.array(questionSchema).min(1, ...),
});
export type CreateQuizBody = z.infer<typeof createQuizSchema>;
```
- The **discriminated union** is the key design choice here. Because each
  question type genuinely has different required fields (`BOOLEAN` needs
  `correctBoolean`, `INPUT` needs `correctText`, `CHECKBOX` needs
  `options`), a single flat schema with everything optional would let
  garbage through (e.g. a `BOOLEAN` question silently missing its answer).
  `z.discriminatedUnion("type", [...])` tells Zod to pick the exact
  sub-schema to validate against based on the `type` field, so:
  - An unknown/missing `type` is rejected outright with a clear message,
    instead of matching nothing and failing silently or matching a wrong
    branch.
  - Each branch enforces its own required fields precisely.
- `CreateQuizBody = z.infer<typeof createQuizSchema>` — the TypeScript type
  is *derived from* the runtime schema, not hand-written separately. This
  is the single most important Zod idiom in this codebase: the schema is
  the one source of truth for both compile-time types and runtime
  validation, so they can never drift out of sync.
- `CHECKBOX` also has a `.refine()` — a **cross-field validation** that
  can't be expressed as a simple per-field rule: "at least one option must
  be `isCorrect: true`". `.min(2, ...)` on the array handles the "at least
  2 options" rule; `.refine()` handles the "at least one correct" rule
  separately, each with its own error message.
- This exact schema is **duplicated by hand** on the frontend
  (`frontend/lib/validation.ts`) rather than shared via a package/codegen —
  a deliberate scope decision for a small, independently-deployable
  two-app project, documented in both files' comments.

### `src/controllers/quizzes.controller.ts` — HTTP translation layer
```ts
export async function createQuiz(req: Request, res: Response) {
  const body = req.body as CreateQuizBody;   // safe: validateBody ran first
  const quiz = await quizzesService.createQuiz(body);
  res.status(201).json(quiz);
}
```
- Every controller function has the same shape: pull what it needs off
  `req`, call exactly one service function, translate the result into a
  status code + JSON body. No business logic, no Prisma calls, no
  validation logic lives here.
- `paramId(req)` is a tiny local helper (`req.params.id as string`) that
  exists because **Express 5's typings** changed `req.params[key]` to
  `string | string[]` (to account for repeated route params in more
  complex patterns) — this route only ever has one `:id` segment, so the
  cast is safe and centralizing it in one helper avoids repeating the cast
  in all three id-based handlers.
- Not-found handling is explicit here, not thrown as an error: services
  return `null` (for `getQuizById`) or `boolean` (for `deleteQuiz`) rather
  than throwing, and the controller turns that into a 404 JSON response
  directly. This was a deliberate choice — 404 is an expected, normal
  outcome (not exceptional), so it doesn't need the `ApiError`-throw path
  that `errorHandler` exists for. Contrast with validation failures, which
  *are* routed through `next(new ApiError(...))` because they need to
  short-circuit *before* the controller runs at all.
- No `try/catch` anywhere in the controllers despite being `async`
  functions that call the DB. This works because of `express-async-errors`
  behavior built into **Express 5** itself — Express 5 natively catches
  rejected promises returned from async route handlers and forwards them to
  `next(err)`, so a Prisma error thrown deep in a service function
  automatically flows to `errorHandler` without manual try/catch at every
  call site. (This was a breaking, and welcome, change from Express 4,
  where you needed a wrapper or `express-async-errors` for this.)

### `src/services/quizzes.service.ts` — business logic + the only Prisma import
```ts
const quizWithQuestionsInclude = {
  questions: {
    orderBy: { order: "asc" as const },
    include: { options: { orderBy: { order: "asc" as const } } },
  },
} satisfies Prisma.QuizInclude;
```
- **Only file in the backend that imports `prisma`.** This is a
  deliberate boundary: if you need to know "does this touch the
  database", the answer is always "is it in `services/`?"
- `quizWithQuestionsInclude` is extracted as a shared constant because both
  `createQuiz` (to shape its return value) and `getQuizById` need the exact
  same nested `questions → options` shape, always ordered by the explicit
  `order` integer column — **not** insertion order. This matters: a
  relational database does *not* guarantee rows come back in insertion
  order without an `ORDER BY`, so `order` is a real stored column (assigned
  from array position at creation time), not something inferred from row
  id or timestamp.
- `satisfies Prisma.QuizInclude` — TypeScript's `satisfies` operator
  validates the object matches Prisma's generated `QuizInclude` type
  *without* widening/erasing the literal type the way an explicit type
  annotation (`: Prisma.QuizInclude`) would. This is what lets
  `quizWithQuestionsInclude` be passed to `include:` and have Prisma
  correctly infer the *exact* nested return shape (with `options` present)
  rather than the generic "any include" shape.

- `createQuiz(input)`:
  ```ts
  return prisma.quiz.create({
    data: {
      title: input.title,
      questions: {
        create: input.questions.map((q, i) => ({
          type: q.type, text: q.text, order: i,
          correctBoolean: q.type === "BOOLEAN" ? (q.correctBoolean ?? null) : null,
          correctText: q.type === "INPUT" ? (q.correctText ?? null) : null,
          options: q.type === "CHECKBOX" && q.options
            ? { create: q.options.map((o, j) => ({ text: o.text, isCorrect: o.isCorrect, order: j })) }
            : undefined,
        })),
      },
    },
    include: quizWithQuestionsInclude,
  });
  ```
  - This is a **single nested Prisma write** — one `quiz.create` call with
    nested `questions: { create: [...] }` and, within that, nested
    `options: { create: [...] }`. Prisma compiles this whole tree into one
    database transaction automatically (nested writes are transactional by
    default), so a quiz is never left half-created if, say, the 3rd
    question's options fail to insert.
  - `order` for both questions and options is the **array index**
    (`questionIndex`/`optionIndex`), not client-supplied — the API
    contract explicitly says "don't send `order`; it's assigned server-side
    from array position."
  - The type-narrowing logic (`q.type === "BOOLEAN" ? ... : null`) is what
    physically implements the "only one answer column populated per
    question type" design — see schema section below for why.

- `listQuizzes()`:
  ```ts
  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  return quizzes.map((q) => ({ id: q.id, title: q.title, questionCount: q._count.questions, createdAt: q.createdAt }));
  ```
  - Uses Prisma's `_count` aggregate instead of fetching every question and
    counting client-side — the DB does the counting, so `GET /quizzes`
    stays cheap even for a quiz with hundreds of questions. This is the
    difference between the "summary" shape (`QuizSummary` — just a count)
    and the "detail" shape (`QuizDetail` — full nested questions) used by
    `GET /quizzes/:id`.
  - Newest-first ordering (`createdAt: "desc"`).

- `getQuizById(id)` — a direct `findUnique` with the full nested include;
  returns `null` if not found (Prisma's normal behavior for `findUnique`),
  which the controller turns into 404.

- `deleteQuiz(id)`:
  ```ts
  try {
    await prisma.quiz.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return false;
    throw err;
  }
  ```
  - Prisma's `.delete()` **throws** (doesn't return null) if the row
    doesn't exist, using error code `P2025` ("An operation failed because
    it depends on one or more records that were required but not found").
    This function normalizes that into a clean `boolean` return so the
    controller doesn't need to know about Prisma error codes at all — it
    just checks `if (!deleted)`.
  - Any *other* Prisma error is re-thrown untouched, propagating up to
    `errorHandler`'s generic 500 path.
  - Cascading delete (removing a quiz's questions and options
    automatically) is **not** application logic at all — it's declared
    once in the schema (`onDelete: Cascade` on both relations) and enforced
    by PostgreSQL itself at the foreign-key level. `deleteQuiz` only ever
    issues one `DELETE` statement against `Quiz`; the database handles the
    rest.

### `src/middleware/error-handler.ts` — the single point that writes error responses
```ts
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) { res.status(err.statusCode).json({ message: err.message }); return; }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") { res.status(404)...; return; }
  if (err instanceof SyntaxError && "body" in err) { res.status(400)...; return; }
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
}
```
- Checked in order, most-specific first:
  1. **`ApiError`** — errors deliberately thrown by app code (currently
     only from `validateBody`) carry their own status + message.
  2. **Prisma `P2025` (not found)** — a defense-in-depth branch. The normal
     "not found" path for `deleteQuiz` is already handled at the service
     layer (returns `false`, controller sends 404) and never reaches here.
     This branch exists in case a *future* Prisma call throws `P2025`
     without a service-layer catch (e.g. someone adds a new endpoint and
     forgets to handle not-found) — it still degrades to 404, not a leaked
     500.
  3. **`SyntaxError` with `"body" in err`** — this is exactly the shape
     `express.json()` throws for malformed JSON in a request body (e.g. a
     client sends `Content-Type: application/json` with truncated/invalid
     JSON). Checking `"body" in err` (not just `instanceof SyntaxError`)
     narrows this to *that specific* case rather than catching unrelated
     syntax errors from elsewhere in the stack.
  4. **Everything else** — logged server-side via `console.error` (so the
     real cause is visible in dev/ops logs) but the client only ever gets
     a generic `{ message: "Something went wrong" }` with **no stack
     trace**, deliberately, so internal error details never leak to
     callers.
- Every single error path in the whole API — regardless of cause — ends up
  as `{ message: string }` with an appropriate status code. That
  consistency is a specific, explicit contract (documented in the backend
  README) that the frontend's `services/api.ts` relies on to build a
  typed `ApiError` on the client side too.

### `src/lib/api-error.ts` and `src/lib/prisma.ts` — the two smallest, most load-bearing files
```ts
export class ApiError extends Error {
  constructor(public statusCode: number, message: string) { super(message); this.name = "ApiError"; }
}
```
```ts
export const prisma = new PrismaClient();
```
- `ApiError` is a plain `Error` subclass carrying an HTTP status code —
  the vocabulary app code uses to say "stop, respond with this status and
  message" without knowing anything about Express's response object.
- `prisma` is instantiated **once** at module load and imported everywhere
  the app needs the DB (only `services/quizzes.service.ts`, currently).
  This is the standard Prisma singleton pattern — creating a new
  `PrismaClient` per request would each open (and never fully close) their
  own connection pool, exhausting Postgres's available connections under
  load. One shared client manages one connection pool for the whole
  process lifetime.

---

## 3. The database schema and *why* it's shaped this way

```prisma
enum QuestionType { BOOLEAN INPUT CHECKBOX }

model Quiz {
  id        String     @id @default(uuid())
  title     String
  createdAt DateTime   @default(now())
  questions Question[]
}

model Question {
  id             String       @id @default(uuid())
  quizId         String
  quiz           Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  type           QuestionType
  text           String
  order          Int
  correctBoolean Boolean?     // used only when type = BOOLEAN
  correctText    String?      // used only when type = INPUT
  options        Option[]     // used only when type = CHECKBOX
  @@index([quizId])
}

model Option {
  id         String   @id @default(uuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  text       String
  isCorrect  Boolean  @default(false)
  order      Int
  @@index([questionId])
}
```

- **Three question types, one `Question` table.** This is the "single
  table inheritance" / "nullable columns" pattern: `correctBoolean` and
  `correctText` are both nullable, and for any given row only the column
  matching its `type` is ever populated — the other stays `null` forever.
  `CHECKBOX` questions don't use either column; their answer data lives
  entirely in the related `Option` rows instead.
- **The alternative considered and rejected: a JSON/JSONB blob column**
  (e.g. one `answer Json` column holding whatever shape fits the question
  type). That would avoid the always-null columns, but loses compile-time
  and DB-level type safety — Prisma can't validate or type a JSON column's
  internal shape, so every read would need manual runtime narrowing/casting
  and the DB can't enforce a NOT NULL constraint on "the boolean answer
  when type=BOOLEAN". The nullable-columns approach trades a few wasted
  columns per row for full type safety on both ends (Prisma Client's
  generated types *and* the SQL schema itself) — a deliberate, documented
  tradeoff (see the header comment in `schema.prisma` and the inline
  comment in `services/quizzes.service.ts`'s `createQuiz`). For a project
  at this scale (three fixed question types, not an extensible plugin
  system), the wasted-columns cost is negligible and the type-safety win
  is worth more.
- **`Option` is a separate table**, not an embedded array, because it's
  the only question type with a variable-length, structurally rich answer
  (each option has its own `text` + `isCorrect` + `order`) — that doesn't
  fit a scalar column at all, nested or not.
- **`order` is an explicit `Int` column on both `Question` and `Option`**,
  not inferred from array position at read time or from row insertion
  order. Postgres does not guarantee `SELECT` row order without an
  explicit `ORDER BY`, and even insertion order is not a reliable proxy
  for "the order the client submitted these in" once you allow any future
  update/reorder operations. Storing `order` explicitly and always
  querying with `orderBy: { order: "asc" }` (see
  `quizWithQuestionsInclude`) is the only way to guarantee questions and
  options come back in the same order they were created.
- **`id` fields are `String @id @default(uuid())`** — UUIDs, not
  auto-incrementing integers. This means IDs are generated by Prisma
  client-side (or could be DB-side) as random, non-sequential, non-guessable
  values — nobody can enumerate quizzes by walking `/quizzes/1`,
  `/quizzes/2`, etc. Standard choice for any API where resource IDs are
  exposed in URLs.
- **`onDelete: Cascade`** on both relations (`Question → Quiz`,
  `Option → Question`) is declared in the schema and enforced by
  PostgreSQL's foreign-key constraints at the database engine level — see
  the generated SQL below. Deleting a `Quiz` row causes Postgres itself to
  delete all its `Question` rows, which in turn cascades to delete all
  their `Option` rows, all inside the database, with zero explicit
  cleanup code in the application. This is why `deleteQuiz()` in the
  service layer is a single `prisma.quiz.delete()` call and nothing more.
- **`@@index([quizId])` / `@@index([questionId])`** — explicit indexes on
  the foreign-key columns. Postgres does *not* automatically index foreign
  key columns (unlike some other databases), so without these, every
  `include: { questions: ... }` nested-fetch (`WHERE quizId = ...` under
  the hood) would be a full table scan on `Question` as the table grows.
  These indexes are what keep `GET /quizzes/:id` fast regardless of how
  many total questions exist across all quizzes.

---

## 4. Migrations — how the schema gets from `schema.prisma` into a real database

**Prisma Migrate** is the tool. It's a two-artifact system:

1. **`prisma/schema.prisma`** — the *desired* schema, hand-written, the
   single source of truth for what the database *should* look like.
2. **`prisma/migrations/`** — a timestamped, ordered history of the actual
   SQL statements that were run to get from an empty database to the
   current schema. Currently this project has exactly one migration:
   `20260814161314_init/migration.sql`.

### How a migration is created (dev workflow)
Running `npx prisma migrate dev --name init` (done once, in Phase 1 of the
build) does all of the following in one command:
1. Prisma **diffs** the current `schema.prisma` against the migration
   history's cumulative effect (on first run, against an empty schema).
2. It generates a **plain SQL file** capturing exactly that diff — visible,
   readable, hand-auditable SQL, not an opaque binary format. This is
   `20260814161314_init/migration.sql`, containing (in order):
   - `CREATE TYPE "QuestionType" AS ENUM (...)`
   - `CREATE TABLE "Quiz" (...)`, `CREATE TABLE "Question" (...)`,
     `CREATE TABLE "Option" (...)`
   - `CREATE INDEX` statements for the two `@@index(...)` declarations
   - `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE CASCADE`
     statements — this is the literal SQL implementing the cascade-delete
     behavior described above.
3. It **applies** that SQL directly against the configured `DATABASE_URL`
   database (the Dockerized Postgres on port 5433 here).
4. It records the migration as "applied" in a special
   `_prisma_migrations` table that Prisma creates and manages inside the
   target database itself — this table is Prisma's ledger of which
   migration files have already been run against *this specific*
   database, so re-running `migrate dev`/`migrate deploy` never re-applies
   a migration twice.
5. It regenerates **Prisma Client** (`prisma generate`) so the TypeScript
   types in `@prisma/client` match the new schema immediately.

### `migration_lock.toml`
A tiny generated file (`provider = "postgresql"`) that just pins which
database provider this migration history was created against. Its
explicit job is to prevent an accidental, silent provider switch (e.g.
someone changing `schema.prisma`'s `datasource` from `postgresql` to
`mysql` and running migrate without realizing the existing SQL migration
history is Postgres-specific dialect and wouldn't apply cleanly). The
file's own header comment says not to edit it by hand — it's meant to be
committed to git as-is.

### The two migration commands, and when each is used
- **`prisma migrate dev`** — the *development* command. Used locally while
  iterating on the schema. It can (a) create a new migration from schema
  changes, (b) apply any pending unapplied migrations, and (c) if it
  detects the local dev database has drifted in a way that can't be
  reconciled, it will offer to *reset* the dev database (drop everything,
  reapply all migrations from scratch) — acceptable in dev since dev data
  is disposable, never something you'd want in production.
- **`prisma migrate deploy`** — the *production/CI* command. Strictly
  applies any migration files not yet recorded in `_prisma_migrations`, in
  order, with no schema-diffing, no prompting, and no reset capability. This
  is what a real deployment pipeline would run — this project doesn't have
  a deploy pipeline (it's a local take-home), but this is the standard
  answer for "how would migrations run in production."

### Setup-from-scratch flow (what a fresh clone actually does)
This is exactly what `backend/README.md` and the root README document, and
what Phase 12's "fresh clone" exit check verified end-to-end:
```bash
docker compose -f ../docker-compose.yml up -d   # starts Postgres container on localhost:5433
cp .env.example .env                             # DATABASE_URL, PORT
npm install                                      # triggers postinstall → `prisma generate`
npx prisma migrate dev                           # applies the existing migration(s) to the fresh DB
npm run dev                                      # ts-node-dev starts the API on :4000
```
- The **`postinstall: "prisma generate"`** script in `package.json` exists
  specifically so `npm install` alone regenerates the Prisma Client's
  TypeScript types/runtime immediately — without it, a fresh `npm install`
  would leave `@prisma/client` un-generated and every Prisma-typed import
  in the codebase would fail to compile until someone manually ran
  `prisma generate`. This was a real bug caught and fixed during the
  build (see `06-code-quality-and-git.md`/build history) — "fresh install
  → build fails" was reproduced and confirmed fixed by literally deleting
  `node_modules` and `dist` and re-running the flow above.
- Since `npx prisma migrate dev` against a database that already has the
  migration applied (e.g. a developer re-running setup) is a no-op —
  Prisma checks `_prisma_migrations`, sees `20260814161314_init` already
  recorded, and does nothing. It's this ledger table that gives migrations
  their idempotency.

### Why Docker Compose + a non-default port
`docker-compose.yml` defines a single `postgres:16-alpine` service, named
volume for persistent data (`quiz-builder-pgdata`), and a healthcheck
(`pg_isready`) so orchestration tooling can know when Postgres is actually
ready to accept connections, not just that the container process started.
The host port is **5433**, not Postgres's default 5432, because the
development machine already had a native (non-Docker) Postgres service
bound to 5432 — mapping the container there too would mean `DATABASE_URL`
connections silently landed on the *wrong* database (the native one, not
the project's containerized one) with no error, which is a much worse
failure mode than a port conflict that fails loudly. This is called out
explicitly in a code comment in `docker-compose.yml` itself.

---

## 5. Error handling strategy, end to end

Three distinct kinds of "this request can't succeed," each handled at the
layer that actually knows about it:

| Failure                                   | Where it's detected                     | How it surfaces                                   |
|--------------------------------------------|------------------------------------------|----------------------------------------------------|
| Malformed request body (bad shape/types)   | `validateBody` middleware (Zod)          | `next(new ApiError(400, "<joined issues>"))`        |
| Malformed JSON syntax                      | `express.json()` body parser             | Caught in `error-handler.ts` as `SyntaxError`       |
| Resource doesn't exist (`GET`/`DELETE :id`)| Service returns `null`/`false`            | Controller sends `404` directly, no error thrown    |
| Resource vanished between check and write (race) | Prisma throws `P2025`             | Caught in `error-handler.ts` as defense-in-depth    |
| Anything unexpected (DB down, bug, etc.)   | Uncaught anywhere in the chain            | `error-handler.ts` generic `500`, logged server-side, generic message to client |

The unifying design principle: **the client never sees a stack trace or
internal detail**, and every error response has exactly the same shape
(`{ message: string }`), regardless of which of the five rows above
produced it. This makes the frontend's error handling trivial — one
`ApiError` type on the client, built directly from that one shape (see
`frontend/services/api.ts`).

---

## 6. Type-safety chain (how a bug becomes a compile error instead of a runtime one)

This is worth being able to narrate as a coherent story in an interview:

1. **`prisma/schema.prisma`** defines the DB shape. Running `prisma
   generate` produces fully-typed Prisma Client code (`@prisma/client`) —
   `prisma.quiz.create(...)`, `prisma.question.findMany(...)` etc. are all
   typed against the actual schema, so referencing a column that doesn't
   exist, or passing the wrong type to a field, fails at `tsc` time.
2. **`validation/quizzes.schema.ts`** defines the *request* shape with
   Zod, and `CreateQuizBody = z.infer<typeof createQuizSchema>` derives the
   TypeScript type from that same schema — so the validation rules and the
   TypeScript type can never drift apart (there's only one definition).
3. **`services/quizzes.service.ts`** takes `CreateQuizInput =
   CreateQuizBody` as its input type directly — the exact type Zod
   produced — so the service function's parameter type is provably in sync
   with what validation guarantees actually got past `validateBody`.
4. **`quizWithQuestionsInclude satisfies Prisma.QuizInclude`** means
   Prisma's generated types know precisely what shape `createQuiz`/
   `getQuizById` return (`Quiz` + nested `questions` + nested `options`),
   so callers get full autocomplete/type-checking on the result without
   any manual return-type annotation.
5. **`frontend/types/quiz.ts`** mirrors all of this by hand on the other
   side of the HTTP boundary — documented in that file's own header
   comment as a deliberate choice (no shared package/codegen, given the
   project's small size and two independently-deployable apps), but
   structurally identical field-for-field, including the same
   discriminated union shape for `CreateQuestionPayload`.

The net effect: a change to the Prisma schema that isn't reflected in the
Zod schema, or a Zod schema change not reflected in the frontend's
hand-mirrored types, is very likely to show up as a `tsc` compile error
somewhere in the chain rather than a silent runtime bug — even though
there's no automatic sharing of types across the network boundary.

---

## 7. Build & tooling summary (what actually runs, and when)

- **Dev**: `ts-node-dev --respawn --transpile-only src/server.ts` — runs
  TypeScript directly (no separate compile step) and restarts on file
  change. `--transpile-only` skips full type-checking on every restart for
  speed (types are still checked separately via `tsc --noEmit`/`npm run
  build`/editor tooling).
- **Build**: `tsc` — full type-checked compile from `src/` (per
  `tsconfig.json`'s `rootDir`) to `dist/` (`outDir`), `strict: true` plus
  `noUnusedLocals`/`noUnusedParameters`/`noImplicitReturns` for extra
  rigor.
- **Start** (prod-style): `node dist/server.js` — runs the compiled output,
  no `ts-node` involved.
- **Lint/format**: ESLint flat config (`eslint.config.mjs`,
  `typescript-eslint` + `eslint-config-prettier` to disable stylistic rules
  that would fight Prettier) and Prettier, both wired as `npm run
  lint`/`format`/`format:check`.
- **`postinstall: prisma generate`** — see migrations section above; the
  fix for "fresh clone can't build."
- **Pinned dependency versions worth mentioning if asked "why not
  latest?"**: `prisma`/`@prisma/client` pinned to `6.19.3` (v7 introduced
  unwanted project scaffolding and generator changes not desired here);
  `typescript` pinned to `5.9.3` (v7 broke `ts-node-dev`'s transpilation);
  `zod` pinned to `4.4.3` on both backend and frontend specifically so the
  hand-mirrored validation schemas behave identically on both sides.

---

## 8. Likely interview questions this doc should let you answer cold

- *"Walk me through what happens when a POST /quizzes request comes in."*
  → Section 2, top to bottom.
- *"Why three question types in one table instead of three tables or a
  JSON column?"* → Section 3, the nullable-columns tradeoff paragraph.
- *"How do migrations work in Prisma, and what's the difference between
  `migrate dev` and `migrate deploy`?"* → Section 4.
- *"How does a bad request never turn into a 500?"* → Sections 2 (validate
  middleware) and 5 (error table).
- *"Why is cascading delete not written in application code?"* → Section 3,
  `onDelete: Cascade` paragraph — it's a DB-level FK constraint, shown in
  the raw generated SQL.
- *"How do you keep the frontend and backend types in sync without a
  shared package?"* → Section 6, plus the explicit tradeoff comment in
  `frontend/types/quiz.ts`.
- *"Why is there a separate `services/` layer instead of putting Prisma
  calls directly in controllers?"* → Section 1 + Section 2's controller
  paragraph — controllers stay HTTP-shape-only; services are the sole DB
  boundary, which makes it trivial to answer "where would I add a unit
  test for business logic" (service layer, mocking `prisma`) vs "where
  would I add an HTTP-level test" (controller/route layer, via
  supertest against the exported `app`).
