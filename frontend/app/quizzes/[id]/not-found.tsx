import Link from "next/link";

export default function QuizNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-3 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Quiz not found
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        It may have been deleted, or the link is wrong.
      </p>
      <Link
        href="/quizzes"
        className="font-medium text-zinc-900 underline dark:text-zinc-50"
      >
        ← Back to all quizzes
      </Link>
    </main>
  );
}
