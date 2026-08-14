import Link from "next/link";
import { Trash2 } from "lucide-react";
import { QuizSummary } from "@/types/quiz";

interface QuizCardProps {
  quiz: QuizSummary;
  onDelete: (quiz: QuizSummary) => void;
}

// Presentational only — no fetch/services calls here. The delete button is
// a sibling of the link (not nested inside it) so it stays valid HTML and
// clicking it never triggers navigation; see rules/05-frontend-rules.md.
export function QuizCard({ quiz, onDelete }: QuizCardProps) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <Link
        href={`/quizzes/${quiz.id}`}
        className="flex flex-1 items-baseline gap-3 overflow-hidden"
      >
        <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
          {quiz.title}
        </span>
        <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
          {quiz.questionCount}{" "}
          {quiz.questionCount === 1 ? "question" : "questions"}
        </span>
      </Link>
      <button
        type="button"
        aria-label={`Delete "${quiz.title}"`}
        onClick={() => onDelete(quiz)}
        className="shrink-0 rounded-md p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
