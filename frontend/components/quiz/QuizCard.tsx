import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { QuizSummary } from "@/types/quiz";

interface QuizCardProps {
  quiz: QuizSummary;
  onDelete: (quiz: QuizSummary) => void;
}

// Presentational only — no fetch/services calls here; the parent page owns
// deleting and passes onDelete down. The delete button is a sibling of the
// link (not nested inside it), so this stays valid HTML and clicking it
// never triggers navigation.
export function QuizCard({ quiz, onDelete }: QuizCardProps) {
  return (
    <li className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
      <Link
        href={`/quizzes/${quiz.id}`}
        className="flex flex-1 items-center gap-3 overflow-hidden"
      >
        <span className="truncate font-medium text-ink transition-colors group-hover:text-primary">
          {quiz.title}
        </span>
        <Badge variant="primary" className="shrink-0">
          {quiz.questionCount}{" "}
          {quiz.questionCount === 1 ? "question" : "questions"}
        </Badge>
      </Link>
      <button
        type="button"
        aria-label={`Delete "${quiz.title}"`}
        onClick={() => onDelete(quiz)}
        className="shrink-0 rounded-md p-2 text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
