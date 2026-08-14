"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { QuizCard } from "@/components/quiz/QuizCard";
import { deleteQuiz, getQuizzes } from "@/services/api";
import { QuizSummary } from "@/types/quiz";

type Status = "loading" | "error" | "ready";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [, startTransition] = useTransition();

  const fetchQuizzes = useCallback(async () => {
    try {
      const data = await getQuizzes();
      setQuizzes(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // Wrapping the effect's async fetch in startTransition is the pattern
  // Next.js's own docs use for "fetch + setState inside useEffect" — see
  // node_modules/next/dist/docs/.../07-mutating-data.md's useEffect example.
  useEffect(() => {
    startTransition(() => {
      fetchQuizzes();
    });
  }, [fetchQuizzes]);

  function retry() {
    setStatus("loading");
    startTransition(() => {
      fetchQuizzes();
    });
  }

  async function handleDelete(quiz: QuizSummary) {
    if (!window.confirm(`Delete "${quiz.title}"? This can't be undone.`)) {
      return;
    }
    try {
      await deleteQuiz(quiz.id);
      setQuizzes((current) => current.filter((q) => q.id !== quiz.id));
    } catch {
      window.alert("Failed to delete the quiz. Please try again.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Quizzes
        </h1>
        <Link
          href="/create"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New quiz
        </Link>
      </div>

      {status === "loading" && (
        <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <p>Couldn&apos;t load quizzes. Is the backend running?</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {status === "ready" && quizzes.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-300 p-6 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          <p>No quizzes yet.</p>
          <Link href="/create" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            Create one
          </Link>
        </div>
      )}

      {status === "ready" && quizzes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </main>
  );
}
