import { FileX } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export default function QuizNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-3 px-4 py-20 text-center">
      <FileX className="h-10 w-10 text-primary" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Quiz not found
      </h1>
      <p className="text-ink-soft">
        It may have been deleted, or the link is wrong.
      </p>
      <LinkButton href="/quizzes" variant="outline" size="sm" className="mt-2">
        ← Back to all quizzes
      </LinkButton>
    </main>
  );
}
