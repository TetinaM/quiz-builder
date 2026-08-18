# 9. Frontend Deep Dive (Interview Prep)

Companion to `08-backend-deep-dive.md`. Describes the frontend **as it
actually exists in code**, not the plan — cross-check against
`frontend/**` if this ever looks stale. Written so you can explain, from
memory, how the Next.js app is structured, what every file does, exactly
how each React/React-Hook-Form hook is used and why, and how the whole
thing gets built and rendered.

---

## 1. The one-sentence architecture

Next.js **App Router**, three routes (`/quizzes`, `/quizzes/[id]`,
`/create`), a strict **pages-fetch-components-render** split: pages own
data-fetching/orchestration and all `services/api.ts` calls; everything in
`components/` is presentational, takes typed props, and never calls
`fetch` itself. One shared type layer (`types/quiz.ts`) hand-mirrors the
backend's response shapes; one shared validation layer (`lib/validation.ts`)
hand-mirrors the backend's Zod rules for instant client-side feedback
before a request is ever sent.

```
types/quiz.ts            — the shape of everything the backend returns/accepts (hand-mirrored)
   │
   ▼
services/api.ts           — the ONLY place fetch() is called; one function per endpoint
   │
   ▼
app/**/page.tsx            — pages: call services/api.ts, hold state/loading/error, pass data down as props
   │
   ▼
components/quiz/*.tsx      — presentational: QuizCard, QuestionView, QuestionFormItem — props in, JSX out
components/ui/*.tsx        — generic: Button, LinkButton, Badge — no domain knowledge at all
components/layout/*.tsx    — Header (nav shell, in every page via layout.tsx)

lib/validation.ts          — Zod schemas + RHF-shaped types for the /create form only
```

---

## 2. Routing: the App Router file-system convention

Next.js's **App Router** (the `app/` directory) maps folder structure
directly to URL structure — there's no separate router config file.

| File                                  | Route                | Rendering                          |
|-----------------------------------------|-----------------------|--------------------------------------|
| `app/layout.tsx`                        | wraps every route      | Server Component (root shell)         |
| `app/page.tsx`                          | `/`                   | Server Component, immediately `redirect()`s to `/quizzes` |
| `app/quizzes/page.tsx`                  | `/quizzes`             | Client Component (`"use client"`)      |
| `app/quizzes/[id]/page.tsx`             | `/quizzes/:id` (dynamic)| Server Component (async)              |
| `app/quizzes/[id]/not-found.tsx`        | rendered in place of `[id]/page.tsx` when `notFound()` is called | Server Component |
| `app/create/page.tsx`                   | `/create`               | Client Component (`"use client"`)      |

- **`[id]` is a dynamic segment** — square brackets in a folder name bind
  that path segment to a `params` prop. In this Next.js version (16.x),
  `params` is a **`Promise`**, not a plain object — a real breaking change
  from earlier Next.js versions that this codebase explicitly works
  around: `async function QuizDetailPage({ params }: { params:
  Promise<{ id: string }> }) { const { id } = await params; ... }`. This is
  called out in a code comment because it's exactly the kind of thing that
  silently type-errors (or worse, silently works in dev and breaks in a
  stricter build) if you assume `params` is a synchronous object the way
  older Next.js docs/training data would suggest.
- **`not-found.tsx`** is a Next.js-reserved filename — when code inside the
  matching route segment calls the `notFound()` function (imported from
  `next/navigation`), Next.js renders the nearest `not-found.tsx` up the
  tree instead of the page, without an actual HTTP redirect (it's rendered
  in-place, though the response status becomes 404).
- **Root `layout.tsx`** wraps literally every page — this is where
  `<Header />` lives (so nav is present on all three routes without
  repeating it), where the two Google Fonts (`Geist`, `Geist_Mono`) are
  loaded via `next/font/google` (self-hosted, zero layout-shift font
  loading built into Next.js), and where `globals.css` is imported exactly
  once.
- **`app/page.tsx` (the bare `/` route)** does nothing but
  `redirect("/quizzes")` — there's no real "home page" content in this
  app's spec, so `/` just forwards to the actual dashboard.

### Server Components vs. Client Components — the core App Router concept

This is the single most important architectural idea to be able to explain
about the App Router, and this codebase uses **both**, deliberately, per
page:

- **Server Component (default, no directive needed)** — renders on the
  server only; ships zero JavaScript for that component to the browser;
  can be `async` and `await` data directly in the component body (no
  `useEffect`/loading state needed at all). Used for:
  - `app/layout.tsx`, `app/page.tsx`
  - **`app/quizzes/[id]/page.tsx`** — the detail page is pure server-side
    fetch + render, no interactivity (everything on it is a disabled,
    read-only view — see `QuestionView`), so it's `async function
    QuizDetailPage(...)` with a direct `await getQuiz(id)` call in the
    component body. No `"use client"`, no client JS bundle cost for this
    page's logic at all.
- **Client Component (`"use client"` directive at the top of the file)** —
  renders on the server for the initial HTML *and* hydrates in the browser,
  ships JS, can use React hooks (`useState`, `useEffect`, event handlers).
  Used for:
  - **`app/quizzes/page.tsx`** — needs `"use client"` because it has
    interactive state: loading/error/ready status, a delete button with a
    confirm dialog, and local list mutation after delete.
  - **`app/create/page.tsx`** — needs `"use client"` because the entire
    page is a controlled, interactive multi-field form (React Hook Form
    requires the client).
  - **`components/layout/Header.tsx`** — needs `"use client"` specifically
    because it calls `usePathname()` to highlight the active nav link,
    which requires knowing the current URL client-side. This is called out
    explicitly in the file's own comment: it's the *only* reason this
    component isn't a Server Component, since everything else it renders
    is static.
  - **`components/quiz/QuestionFormItem.tsx`** — needs `"use client"`
    because it uses React Hook Form hooks (`useFieldArray`, `useWatch`,
    `Controller`).

The rule of thumb this codebase follows: **default to Server Component;
add `"use client"` only on the smallest component that actually needs
interactivity/hooks/browser APIs** — not at a page level "just in case."
`QuizCard.tsx` and `QuestionView.tsx`, for instance, have **no** `"use
client"` directive even though they're rendered from a client page
(`QuizCard` from `/quizzes`) — that's fine, a Server Component can be
imported and rendered by a Client Component's parent tree; the directive
only matters at the boundary where hooks/interactivity are actually needed.
(`QuizCard` itself is presentational and stateless — its `onClick` handler
is just a plain prop passed down, no hook required inside it.)

---

## 3. `services/api.ts` — the only file that calls `fetch`

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError"; }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

- **`NEXT_PUBLIC_` prefix** is a Next.js convention: only env vars
  prefixed this way are inlined into the client-side JS bundle at build
  time. Without the prefix, an env var is server-only and would be
  `undefined` in browser code — necessary here because `getQuizzes`/
  `deleteQuiz` are called from Client Components (`/quizzes`) running in
  the browser, not just from server-rendered pages.
- **`request<T>`** is a single generic private helper that every exported
  function funnels through — this is where the "every error becomes a
  typed `ApiError`" contract lives, matching the backend's "every error
  response is `{ message: string }` with a status code" contract
  (`08-backend-deep-dive.md` section 5). `ApiError` here carries `status`
  specifically so callers can branch on it — see the detail page's
  `if (err instanceof ApiError && err.status === 404) notFound();` pattern.
- **204 handling**: `DELETE /quizzes/:id` returns `204 No Content` with no
  body — calling `res.json()` on an empty body would throw, so `request`
  explicitly special-cases status 204 and returns `undefined` typed as
  `T` (which for `deleteQuiz`'s `Promise<void>` is exactly right).
- **`.catch(() => null)` on the error-body parse** — defends against the
  case where a non-2xx response *isn't* valid JSON at all (e.g. a raw 502
  from a proxy, or the dev server crashing mid-response) so the fallback
  message (`Request failed with status ${res.status}`) is used instead of
  a second, confusing exception masking the first.
- Four exported functions, one per backend endpoint, each a thin
  type-safe wrapper: `getQuizzes()`, `getQuiz(id)`, `createQuiz(payload)`,
  `deleteQuiz(id)`. This module is the **entire** network boundary of the
  frontend — grep for `fetch(` in the codebase and this is the only hit
  outside `node_modules`.

---

## 4. `types/quiz.ts` — the shared type vocabulary

```ts
export type QuestionType = "BOOLEAN" | "INPUT" | "CHECKBOX";
export interface Option { id: string; text: string; isCorrect: boolean; order: number; }
export interface Question { id: string; type: QuestionType; text: string; order: number; correctBoolean: boolean | null; correctText: string | null; options: Option[]; }
export interface QuizSummary { id: string; title: string; questionCount: number; createdAt: string; }
export interface QuizDetail { id: string; title: string; createdAt: string; questions: Question[]; }

export interface CreateOptionPayload { text: string; isCorrect: boolean; }
export type CreateQuestionPayload =
  | { type: "BOOLEAN"; text: string; correctBoolean: boolean }
  | { type: "INPUT"; text: string; correctText: string }
  | { type: "CHECKBOX"; text: string; options: CreateOptionPayload[] };
export interface CreateQuizPayload { title: string; questions: CreateQuestionPayload[]; }
```

- Two families of types here, matching the backend's two directions:
  - **Response types** (`Question`, `QuizSummary`, `QuizDetail`) mirror
    exactly what Prisma/the backend service layer returns — notably
    `correctBoolean`/`correctText` are `boolean | null` / `string | null`
    here too, mirroring the backend's nullable-columns schema design
    (`08-backend-deep-dive.md` section 3) field-for-field.
  - **Request types** (`CreateQuestionPayload`, `CreateQuizPayload`) mirror
    the backend's Zod input schema, including the **same discriminated
    union** shape keyed on `type` — this is intentional and important:
    TypeScript's discriminated unions give you the same narrowing benefit
    client-side that Zod's discriminated union gives the backend at
    runtime. Once you check `question.type === "CHECKBOX"`, TypeScript
    knows `question.options` exists on that branch and refuses to let you
    access `.correctText` (which doesn't exist on that variant).
- Explicitly **not** shared/generated from the backend — the file's header
  comment states the reasoning directly: "kept in sync by hand rather than
  a shared package/codegen — the two apps are small and independently
  deployable, so that overhead isn't worth it here." This is a real,
  defensible architecture tradeoff to be able to discuss: for a two-app
  project of this size, introducing a monorepo/shared-package/OpenAPI-codegen
  pipeline is more infrastructure than the problem justifies; the cost is
  paid instead as "a human must remember to update both files," mitigated
  by keeping both files small and by the type-safety chain described in
  `08-backend-deep-dive.md` section 6 (a mismatch tends to surface as a
  `tsc` error, not a silent bug).

---

## 5. `lib/validation.ts` — the client-side Zod layer, and why it's shaped differently from the backend's

```ts
const questionSchema = z.discriminatedUnion("type", [booleanQuestionSchema, inputQuestionSchema, checkboxQuestionSchema]);
export const createQuizFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export interface QuestionFormInput {
  type: QuestionType; text: string;
  correctBoolean?: boolean; correctText?: string;
  options?: { text: string; isCorrect: boolean }[];
}
export interface CreateQuizFormInput { title: string; questions: QuestionFormInput[]; }

export function emptyQuestion(type: QuestionType = "INPUT"): QuestionFormInput { ... }
```

- **`createQuizFormSchema`** is structurally identical to the backend's
  `createQuizSchema` (same discriminated union, same three question-type
  branches, same `.refine()` on `CHECKBOX` requiring ≥1 correct option) —
  this is what lets invalid input get caught **client-side, instantly**,
  before a request is ever sent, using the exact same rules the backend
  would enforce anyway. The user never has to round-trip to the server to
  find out "checkbox needs at least 2 options."
- **But there are *two* separate TypeScript shapes here**, and
  understanding why is the key insight of this file:
  - `createQuizFormSchema`'s **output** type (after Zod parses it) is
    strict and matches `CreateQuizPayload` from `types/quiz.ts` exactly —
    a `BOOLEAN` question *must* have `correctBoolean` present, etc.
  - `QuestionFormInput`/`CreateQuizFormInput` (the types React Hook Form
    actually uses for its live, in-progress form state) are **deliberately
    looser** — every per-type field (`correctBoolean`, `correctText`,
    `options`) is `?:` optional on a single flat interface, not a
    discriminated union.
  - **Why the mismatch is necessary**: while a user is actively filling
    out the form, switching a question's type dropdown from `INPUT` to
    `CHECKBOX` mid-fill means the in-progress form state briefly doesn't
    match *either* branch's full requirements. If RHF's typed state were
    the strict discriminated union, TypeScript would fight every
    intermediate state transition. The loose shape is the "form is a
    work-in-progress, not yet valid" type; the strict shape (produced only
    by the Zod resolver at submit time) is the "this is now proven valid
    and ready to POST" type. This is a very common, real-world RHF +
    discriminated-union pattern worth being able to explain precisely.
- **`emptyQuestion(type)`** — a factory producing a fresh, correctly-shaped
  blank question for a given type (e.g. `CHECKBOX` gets two blank options
  pre-seeded, since the schema requires ≥2). Used in three places: the
  form's initial `defaultValues`, the "Add question" button, and — key
  detail — whenever a question's type is *switched*, to replace the whole
  sub-object so no stale fields from the previous type linger (e.g.
  switching `CHECKBOX → BOOLEAN` must not leave a dangling `options` array
  in form state that no longer means anything).

---

## 6. React & React Hook Form — every hook used, where, and why

This section is the direct answer to "how do hooks work" in this codebase
— each one used for a specific, real reason, not boilerplate.

### `useState` — local component state
Used in:
- **`app/quizzes/page.tsx`**: `quizzes` (the fetched array) and `status`
  (`"loading" | "error" | "ready"`) — a small explicit state machine
  instead of separate booleans (`isLoading`/`isError`), so the render
  logic can never represent an invalid combination (e.g. "loading and
  error both true").
- **`app/create/page.tsx`**: `submitError` (`string | null`) — holds the
  top-of-form error banner text after a failed `createQuiz` call. Kept
  entirely separate from React Hook Form's own error state
  (`formState.errors`, which is per-field validation errors) because a
  submit failure is a different *kind* of error (a server/network problem,
  not "this field is invalid").

### `useEffect` — running an async fetch on mount
```ts
useEffect(() => {
  startTransition(() => { fetchQuizzes(); });
}, [fetchQuizzes]);
```
- Runs once when `/quizzes` mounts (dependency array `[fetchQuizzes]`,
  where `fetchQuizzes` is itself wrapped in `useCallback` with an empty
  dependency array — see below — so effectively this only re-runs if that
  function identity changes, which in practice is never after mount).
- This is the **standard "fetch data on mount" pattern in a Client
  Component** — the App Router's Server Components can `await` directly in
  the component body instead (as `[id]/page.tsx` does), but `/quizzes`
  is a Client Component specifically because it needs interactive
  delete/retry state, so it falls back to the classic `useEffect` fetch
  pattern.

### `useCallback` — memoizing the fetch function
```ts
const fetchQuizzes = useCallback(async () => {
  try { const data = await getQuizzes(); setQuizzes(data); setStatus("ready"); }
  catch { setStatus("error"); }
}, []);
```
- Wrapping `fetchQuizzes` in `useCallback` (empty deps) gives it a stable
  function identity across re-renders. This matters because it's listed as
  a dependency of the `useEffect` above — without `useCallback`, a plain
  function declaration would get a *new* identity on every render, which
  would make the `useEffect` dependency array `[fetchQuizzes]` "change"
  every render and re-run the effect in an infinite loop. This is the
  textbook reason `useCallback` exists: stabilizing a function reference
  so it can safely be used as a `useEffect`/`useMemo` dependency.
- Also directly reused by the `retry()` handler (the "Retry" button in the
  error state calls the exact same `fetchQuizzes`), so there's only one
  implementation of "how to fetch the quiz list" in the whole component.

### `useTransition` — marking the effect's state updates as non-urgent
```ts
const [, startTransition] = useTransition();
useEffect(() => { startTransition(() => { fetchQuizzes(); }); }, [fetchQuizzes]);
```
- This exists to satisfy a specific **Next.js 16 / React ESLint rule**
  (`react-hooks/set-state-in-effect`) that flags directly calling a
  function that triggers `setState` synchronously inside a bare
  `useEffect` body, nudging toward wrapping such updates in a transition.
  `startTransition` tells React "the state updates inside this callback
  are not urgent, batch/deprioritize them relative to, e.g., user input,"
  which is the officially recommended pattern (from Next's own docs, read
  because of the `AGENTS.md` warning that this Next.js version's
  conventions may differ from training data — see `AGENTS.md` in the
  frontend root, auto-generated by `next dev` itself).
- The setter half of the tuple (`isPending`) is intentionally discarded
  (`const [, startTransition]`) — this page already has its own explicit
  `status` state machine for loading/error/ready, so React's built-in
  pending flag would be redundant here; only the `startTransition`
  function itself is needed, to satisfy the lint rule and follow the
  recommended pattern.

### `useForm` (React Hook Form) — the entire `/create` form's engine
```ts
const { control, register, setValue, handleSubmit, formState: { errors, isSubmitting } } =
  useForm<CreateQuizFormInput, unknown, CreateQuizPayload>({
    resolver: zodResolver(createQuizFormSchema) as Resolver<CreateQuizFormInput, unknown, CreateQuizPayload>,
    defaultValues: { title: "", questions: [emptyQuestion()] },
  });
```
- `useForm` is RHF's single entry-point hook — it returns everything
  needed to wire up a form: `register` (binds a plain `<input>` to form
  state by name, uncontrolled-style, for performance — no re-render on
  every keystroke), `control` (an object handed to `Controller`/
  `useFieldArray`/`useWatch` for fields that can't just use `register`),
  `setValue` (imperatively write a field), `handleSubmit` (wraps your
  submit handler: runs validation first via the resolver, only calls your
  function if valid), and `formState` (`errors`, `isSubmitting`, etc.).
- **Three generic type parameters** — this is a subtle, real TypeScript
  wrinkle worth being able to explain: RHF's `useForm<TFieldValues,
  TContext, TTransformedValues>` lets the *input* shape (`TFieldValues` =
  `CreateQuizFormInput`, the loose in-progress shape) differ from the
  *output* shape after the resolver runs (`TTransformedValues` =
  `CreateQuizPayload`, the strict backend-payload shape). `zodResolver`'s
  own generics are inferred from the schema passed to it
  (`createQuizFormSchema`), which don't structurally match
  `CreateQuizFormInput` exactly (see section 5) — so the resolver is
  passed through an explicit `as Resolver<...>` type assertion, with a
  comment explaining precisely why it's safe: at runtime the resolver just
  validates whatever form state it's given, and every state
  `CreateQuizFormInput` allows is a valid (possibly-incomplete) input for
  the schema to check against.
- `defaultValues: { title: "", questions: [emptyQuestion()] }` seeds the
  form with one blank `INPUT`-type question (via the same `emptyQuestion`
  factory used everywhere else), matching the "at least one question"
  requirement from the very first render.

### `useFieldArray` — dynamic array fields (questions, and nested options)
Used **twice**, at two different nesting levels:
1. **`app/create/page.tsx`**, top level:
   ```ts
   const { fields: questionFields, append: appendQuestion, remove: removeQuestion } =
     useFieldArray({ control, name: "questions" });
   ```
   Manages the `questions` array itself — "Add question" calls
   `appendQuestion(emptyQuestion())`, each `QuestionFormItem`'s remove
   button calls `removeQuestion(index)`.
2. **`components/quiz/QuestionFormItem.tsx`**, nested, per-question:
   ```ts
   const { fields: optionFields, append: appendOption, remove: removeOption, replace: replaceOptions } =
     useFieldArray({ control, name: `questions.${index}.options` });
   ```
   Manages *one specific question's* `options` array, addressed by a
   templated field-path string (`questions.${index}.options`) — this is
   how RHF supports arbitrarily nested dynamic arrays: each `useFieldArray`
   call just needs the dot-path to the array it manages, and the shared
   `control` object (passed down as a prop from the page) ties every
   field, at every nesting level, back to one single form-state tree.
- **Why `useFieldArray` exists at all, instead of plain `useState` array**:
  RHF's `fields` array gives each row a stable `field.id` (a client-only
  key RHF generates, *not* the same as any server `id`) safe to use as a
  React list `key` even as rows are added/removed/reordered — using array
  *index* as a key here would cause React to misattribute input state
  across rows when a middle row is deleted. It also keeps every row's
  fields registered with the parent form's validation/state without
  manual wiring.
- **The `replace()` function and a real bug it fixes** — documented
  directly in a code comment in `QuestionFormItem.tsx`:
  ```ts
  function handleTypeChange(newType: QuestionType) {
    const next = emptyQuestion(newType);
    setValue(`questions.${index}`, next);   // updates the flat fields fine
    replaceOptions(next.options ?? []);      // ...but options needs its own call
  }
  ```
  Calling `setValue` on the *parent* object path (`questions.${index}`)
  correctly updates the flat scalar fields (`type`, `text`,
  `correctBoolean`, `correctText`) in form state, but the **nested
  `useFieldArray` for `options` does not notice** — it only reacts to its
  own `append`/`remove`/`replace`/etc. calls, not to an ancestor object
  being bulk-replaced out from under it. Without the explicit
  `replaceOptions(...)` call, switching a question's type to `CHECKBOX`
  would leave the rendered option rows stale/empty even though form state
  technically has fresh data. This was a real bug found and fixed during
  development, not a hypothetical — worth mentioning as a "gotcha I ran
  into" if asked about RHF experience.

### `useWatch` — subscribing to one field's live value without full re-render coupling
```ts
const type = useWatch({ control, name: `questions.${index}.type` });
```
- Used to read the *current* value of one question's `type` field so the
  component can conditionally render the right sub-fields (`BOOLEAN` radio
  pair vs. `INPUT` text field vs. `CHECKBOX` option list). `useWatch`
  (rather than reading from `register`'s uncontrolled DOM state, which
  isn't accessible as a JS value) subscribes this component to re-render
  specifically when *that one field* changes — not on every keystroke
  across the whole form — which is the performance-conscious way to read a
  live field value in RHF (the alternative, `watch()` from `useForm`
  directly, re-renders the *entire* form on any change; `useWatch` scopes
  the subscription to just this component and just this field).

### `Controller` — bridging RHF to inputs that aren't plain `<input>`s
```tsx
<Controller
  control={control}
  name={`questions.${index}.correctBoolean`}
  render={({ field }) => (
    <div>
      <input type="radio" checked={field.value === true} onChange={() => field.onChange(true)} />
      <input type="radio" checked={field.value === false} onChange={() => field.onChange(false)} />
    </div>
  )}
/>
```
- `register` works by attaching `name`/`onChange`/`onBlur`/`ref` directly
  to a native input and reading its native string value — that's exactly
  wrong for a boolean radio pair, where the two native inputs' `value`
  attributes would be strings but the form state needs an actual `boolean`.
  `Controller` is RHF's escape hatch for exactly this: it hands you
  `field.value`/`field.onChange` and you decide how to map arbitrary
  UI state to and from form state — here, `field.onChange(true)` /
  `field.onChange(false)` writes real booleans into RHF's internal state,
  documented with an explicit comment explaining the "why Controller and
  not register" choice inline in the JSX.

### `handleSubmit` and the resolver pipeline
```ts
async function onSubmit(data: CreateQuizPayload) { ... }
<form onSubmit={handleSubmit(onSubmit)} noValidate>
```
- `handleSubmit(onSubmit)` wraps the actual submit callback: on form
  submission it first runs the Zod resolver against current form state; if
  validation fails, it populates `formState.errors` and **never calls**
  `onSubmit` at all; if it succeeds, `onSubmit` receives `data` already
  typed and shaped as `CreateQuizPayload` (the resolver's *output* type,
  per the three-generic setup above) — meaning `onSubmit` can call
  `createQuiz(data)` directly with **zero manual mapping**, because the
  resolver has already both validated *and* transformed the loose form
  state into the exact backend payload shape.
- `noValidate` on the `<form>` element disables the browser's *native*
  HTML5 validation UI (red outlines/tooltips from `required` attributes
  etc.) so only RHF/Zod's validation and error messages are shown —
  avoiding double, inconsistent validation UI.
- `isSubmitting` (from `formState`) drives the submit button's disabled
  state and a spinner icon, automatically true while the async `onSubmit`
  promise is in flight and reset after it resolves/rejects — no manual
  "isLoading" state needed for the submit button specifically (contrast
  with `/quizzes`'s hand-rolled `status` state, which exists because that
  page isn't an RHF form).

### `forwardRef` (not a hook, but adjacent) — `components/ui/Button.tsx`
```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button ref={ref} className={classes(variant, size, className)} {...props} />
  ),
);
```
- `forwardRef` lets a parent attach a `ref` straight through this wrapper
  to the underlying native `<button>` DOM node — necessary because
  `Button` is a custom component, and refs don't pass through props like
  `className`/`children` do by default; without `forwardRef`, `<Button
  ref={...}>` would silently fail to attach to anything. Not currently
  exercised by a caller that needs the ref today, but it's the correct,
  future-proof way to build a reusable low-level UI primitive that wraps a
  native interactive element (RHF itself, for instance, sometimes needs a
  ref for focus management on validation errors — building the primitive
  ref-forwarding-capable from the start avoids having to retrofit it
  later).

---

## 7. Component-by-component breakdown

### `components/ui/Button.tsx` — `Button` + `LinkButton`
- A single `classes(variant, size, className)` helper builds the combined
  Tailwind class string, shared by both exports — this is what guarantees
  a `<button>` styled `variant="primary"` and a `<Link>` styled
  `variant="primary"` look pixel-identical without duplicating the
  variant/size class maps.
- **Why two separate components instead of one polymorphic
  `as="button"|"a"` component**: an actual `<button>` nested inside an
  `<a>` (or `next/link`'s rendered `<a>`) is invalid HTML and breaks click
  semantics — this was a real mistake caught during the redesign pass
  (see the comment in `LinkButton`: "Never nest a real `<button>` inside
  an `<a>`; this is the alternative"). Keeping them as two exports forces
  the call site to consciously pick "this is a navigation" (`LinkButton`,
  renders `next/link`) vs. "this is an action" (`Button`, renders
  `<button>`) rather than papering over the distinction.
- Variants (`primary`/`outline`/`ghost`/`danger-ghost`) and sizes
  (`sm`/`md`/`icon`) are plain `Record<Variant, string>` lookup maps —
  the standard, simplest way to implement a small variant system in
  Tailwind without a dependency like `class-variance-authority` (not
  needed at this scale — four variants, three sizes).

### `components/ui/Badge.tsx`
- Small stateless presentational `<span>` wrapper, three variants
  (`primary`/`accent`/`neutral`), used for the question-count pill on
  `QuizCard`, the question-type pill and "correct" tag on `QuestionView`.
  No hooks, no props beyond `variant`/`children`/`className` — the
  simplest possible component in the codebase, good example of "pure
  presentational" if asked to point one out.

### `components/layout/Header.tsx`
- The only "use client" component that isn't a form or a data-fetching
  page — purely for `usePathname()` (see section 2). Renders the logo/
  brand mark and two nav links (`/quizzes`, `/create`), highlighting the
  active one via `pathname === link.href || pathname?.startsWith(`${link.href}/`)`
  — the `startsWith` half is what keeps "Quizzes" highlighted while
  viewing `/quizzes/[id]`, not just the exact `/quizzes` list page.
- Uses the fixed `bg-header` color token (not `bg-ink`, which inverts in
  dark mode) — see `globals.css` notes below; this was a real dark-mode
  bug found and fixed (header background flipping light in dark mode)
  during the visual redesign pass.

### `components/quiz/QuizCard.tsx`
- One row on `/quizzes`. Pure presentational, props: `quiz` +
  `onDelete` callback — no fetch/service call inside it at all (per the
  explicit "components/ don't call services" rule in
  `05-frontend-rules.md`); the parent page owns the actual `deleteQuiz`
  call and passes a handler down.
- Structural detail worth noting: the delete `<button>` is a **sibling**
  of the `<Link>`, not nested inside it (the whole card isn't one giant
  `<a>` wrapping a `<button>` — same invalid-HTML issue `Button`/
  `LinkButton` was built to avoid). Clicking delete never triggers
  navigation because it isn't inside the anchor at all, not because of
  `stopPropagation()`.

### `components/quiz/QuestionView.tsx`
- Read-only rendering of one question on the detail page. Every input
  inside it (`type="radio"`, `type="checkbox"`) is rendered `disabled
  readOnly` — a deliberate, explicit choice (commented in the file) that
  this is a **structural view**, never an interactive "take the quiz" UI,
  matching the project spec's requirement that the detail page shows quiz
  *structure*, not a solvable quiz.
- A `TYPE_LABEL` lookup record maps the raw `QuestionType` enum value to a
  human label ("True / False", "Short answer", "Multiple choice") shown in
  a `Badge` — decouples the internal enum naming from user-facing text.

### `components/quiz/QuestionFormItem.tsx`
- The most complex component in the app — one editable question block in
  the `/create` form. Receives RHF's `control`/`register`/`setValue`/
  `errors` as props from the page (it does **not** call `useForm` itself —
  there is only one form instance, owned by the page; this component just
  participates in it via the shared `control` object), plus `index`,
  `onRemove`, `canRemove`.
- Conditionally renders one of three sub-field groups based on the live
  `type` value (from `useWatch`, see section 6): boolean radio pair
  (`Controller`), single text input (`register`), or the nested
  `useFieldArray` option-row list — this conditional-rendering-by-
  discriminant is the UI-level mirror of the backend's Zod discriminated
  union and the shared `CreateQuestionPayload` TS union.
- Layout detail worth mentioning if asked about the responsiveness pass:
  the question-text input and the type `<select>` are stacked vertically
  below `sm:` breakpoint and inline from `sm:` up — commented as a
  deliberate fix, since a `<select>` doesn't shrink the way a text input
  does, so forcing them into one row down to 375px caused overflow.

---

## 8. Styling: Tailwind CSS v4's CSS-first theming, and dark mode

`app/globals.css` is the **entire** styling configuration — there's no
`tailwind.config.js`/`.ts` file in this project at all, because **Tailwind
v4** moved theme configuration into CSS itself via `@theme`, a real
breaking change from v3's JS-config convention.

```css
@import "tailwindcss";

:root {
  --background: #faf9fc;
  --color-primary: #8b7aa8;
  --color-primary-hover: #756393;
  /* ...ink/accent/border/surface tokens... */
  --color-header: #27263d;  /* fixed — never redefined below */
}

@theme inline {
  --color-primary: var(--color-primary);
  /* maps every custom property above to a Tailwind utility class family
     (bg-primary, text-primary, border-primary, etc.) */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #1c1b2c;
    --color-primary: #a494c2;
    /* ...every token EXCEPT --color-header redefined for dark mode... */
  }
}
```

- **Token layering, three levels**:
  1. `:root` — the light-mode (default) values, plain CSS custom
     properties.
  2. `@theme inline { ... }` — Tailwind v4's directive that turns each CSS
     variable into a first-class utility class family. Defining
     `--color-primary` here is what makes `bg-primary`, `text-primary`,
     `border-primary`, `accent-primary`, etc. all valid Tailwind classes
     throughout the app, resolved at build time to `var(--color-primary)`.
  3. `@media (prefers-color-scheme: dark) { :root { ... } }` — overrides
     the *same* custom properties for users with a system-level dark-mode
     preference. Because Tailwind utilities reference the CSS variable
     (not a hard-coded value), **no component needs a `dark:` variant
     class for these tokens at all** — `bg-primary` just resolves to a
     different actual color depending on the media query, automatically,
     everywhere it's used. (`dark:` variants *are* still used in a few
     places for colors that intentionally stay outside the token system —
     e.g. the red destructive/error colors, which are deliberately kept as
     standard Tailwind reds rather than brand colors, since red carries a
     universal "danger" meaning that shouldn't be reskinned.)
- **The `--color-header` non-inverting bug/fix** — worth narrating as a
  real debugging story: the header originally used `bg-ink`, and
  `--color-ink` is *designed* to invert (dark ink text on light background
  in light mode → light ink text in dark mode, since it's used as a
  general "foreground text" token). But the header needs to stay a
  constant dark-navy brand bar regardless of system theme — using
  `--color-ink` there meant the header background itself flipped to
  *light* lavender in dark mode, which is backwards. Fixed by introducing
  a **separate, single-purpose token**, `--color-header`, defined once in
  `:root` and deliberately **absent** from the dark-mode media query block
  — so it never changes value regardless of theme, and `Header.tsx` uses
  `bg-header` instead of `bg-ink`. This is a good concrete example of "a
  token system needs more than one axis sometimes — not everything that
  looks like a foreground color should invert."
- **Brand palette derivation**: three source hex colors were specified
  (`#8b7aa8` lavender/primary, `#27263d` ink, `#7aa899` sage/accent); each
  gets a `-hover` (darker, for interactive states) and `-soft` (very light
  tinted background, for badges/highlights) derived shade, all hand-picked
  to keep sufficient contrast in both light and dark themes.
- **No `tailwind.config.js`** — Tailwind v4 auto-detects content files via
  its Vite/PostCSS plugin (configured minimally in `postcss.config.mjs`
  with `@tailwindcss/postcss`), so there's no `content: [...]` glob array
  to maintain either, unlike Tailwind v3's setup.

---

## 9. Build & tooling summary

- **Dev**: `next dev` — Next.js's dev server (Turbopack by default in this
  version), hot-reloading, and the source of the auto-generated
  `AGENTS.md`/`CLAUDE.md` files at the frontend root (gitignored — these
  are Next's own "heads up, this version has breaking API changes vs. your
  training data, read `node_modules/next/dist/docs/` first" notices,
  regenerated by `next dev` itself on every run).
- **Build**: `next build` — full production build: type-checks (via the
  `next` TS plugin referenced in `tsconfig.json`'s `plugins`), bundles,
  and statically analyzes each route to decide its rendering strategy.
  Last verified output: `/`, `/_not-found`, `/create`, `/quizzes` prerendered
  as static; `/quizzes/[id]` server-rendered per-request (dynamic, since it
  depends on the URL param and always fetches fresh data — no
  `cache: "no-store"` needed because this Next.js version doesn't cache
  `fetch` by default, another explicit breaking-change note carried over
  from `05-frontend-rules.md`).
- **Start**: `next start` — serves the production build.
- **Lint**: ESLint flat config (`eslint.config.mjs`) built on
  `eslint-config-next`'s `core-web-vitals` + `typescript` rule sets, plus
  `eslint-config-prettier` last in the chain to turn off any stylistic
  rule that would conflict with Prettier's own formatting.
- **`tsconfig.json`** highlights: `strict: true`, `moduleResolution:
  "bundler"` (the modern resolution mode matching how Next's bundler
  actually resolves imports, vs. older `"node"` mode), `paths: { "@/*":
  ["./*"] }` — the `@/` import alias used everywhere (`@/components/...`,
  `@/types/quiz`, `@/services/api`) instead of relative `../../` paths.
- **Pinned versions worth mentioning**: `zod` pinned to `4.4.3` on both
  frontend and backend specifically so the hand-mirrored validation
  schemas behave identically; Next 16.3.1, React 19.2.8 — current-major
  versions with real, documented breaking changes from what most training
  data assumes (async `params`, no default fetch caching, the new
  `react-hooks/set-state-in-effect` lint rule), each worked around
  explicitly as described above rather than fought against.

---

## 10. Likely interview questions this doc should let you answer cold

- *"Walk me through what happens when I load `/quizzes/[id]`."* → Section 2
  (Server Component, async `params`, direct `await getQuiz(id)` in the
  component body, `notFound()` on a 404 `ApiError`).
- *"Why is one page a Server Component and another a Client Component?"*
  → Section 2's Server vs. Client explanation, with the specific
  reason for each of the three pages.
- *"How does the dynamic question form work — walk me through the
  hooks."* → Section 6, top to bottom: `useForm` → `useFieldArray`
  (twice, nested) → `useWatch` → `Controller` → `handleSubmit`/resolver.
- *"Tell me about a bug you hit with React Hook Form."* → Section 6's
  `useFieldArray`/`replace()` story (setValue on a parent path not
  syncing a nested field array).
- *"How do you keep frontend and backend types in sync without
  codegen?"* → Section 4, the deliberate hand-mirroring tradeoff, plus
  cross-reference to `08-backend-deep-dive.md` section 6's type-safety
  chain.
- *"Why two different TypeScript shapes for the same form
  (`CreateQuizFormInput` vs. `CreateQuizPayload`)?"* → Section 5, the
  loose-input-vs-strict-output explanation.
- *"How does dark mode work here — did you use Tailwind's `dark:`
  classes everywhere?"* → Section 8, the CSS-custom-property/`@theme`
  token layering, and specifically the `--color-header` bug as a concrete
  "here's a real problem I solved" story.
- *"Why is there no global state manager (Redux/Zustand)?"* → Three
  routes, each with either server-fetched data or simple local/RHF state
  — no cross-page shared client state exists in this app's spec, so a
  global store would be unjustified complexity (explicit "what NOT to
  build" rule in `05-frontend-rules.md`).
