import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionView } from "@/components/quiz/QuestionView";
import { ApiError, getQuiz } from "@/services/api";
import { QuizDetail } from "@/types/quiz";

// Server Component: purely read-only, no client interactivity needed, so no
// "use client" — keeps this page out of the client JS bundle entirely.
export default async function QuizDetailPage({
  params,
}: {
  // Route params are async in this Next.js version.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let quiz: QuizDetail;
  try {
    quiz = await getQuiz(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link
          href="/quizzes"
          className="text-sm text-ink-soft transition-colors hover:text-primary"
        >
          ← All quizzes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {quiz.title}
        </h1>
      </div>

      <ol className="flex flex-col gap-3">
        {quiz.questions.map((question, index) => (
          <QuestionView key={question.id} question={question} index={index} />
        ))}
      </ol>
    </main>
  );
}
