"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, AlertCircle, FileQuestion, Loader2 } from "lucide-react";
import { QuizCard } from "@/components/quiz/QuizCard";
import { Button, LinkButton } from "@/components/ui/Button";
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

  // startTransition marks the fetch-triggered state updates as a
  // transition instead of a plain synchronous effect update, which is what
  // React wants for async work kicked off from inside useEffect.
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
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Quizzes
        </h1>
        <LinkButton href="/create">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New quiz
        </LinkButton>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 py-8 text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            Couldn&apos;t load quizzes
          </div>
          <p className="text-sm">Is the backend running?</p>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {status === "ready" && quizzes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-ink-soft">
          <FileQuestion className="h-8 w-8 text-primary" aria-hidden="true" />
          <p>No quizzes yet.</p>
          <LinkButton href="/create" size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create your first quiz
          </LinkButton>
        </div>
      )}

      {status === "ready" && quizzes.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </main>
  );
}
