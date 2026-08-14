import { Question } from "@/types/quiz";

interface QuestionViewProps {
  question: Question;
  index: number;
}

// Structural, read-only rendering of one question — never for solving, per
// project.txt ("Render questions in read-only mode ... just structure").
// All inputs below are disabled; nothing here is interactive.
export function QuestionView({ question, index }: QuestionViewProps) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="font-medium text-zinc-900 dark:text-zinc-50">
        {index + 1}. {question.text}
      </p>

      {question.type === "BOOLEAN" && (
        <div className="mt-3 flex gap-6 text-sm text-zinc-700 dark:text-zinc-300">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={question.correctBoolean === true}
              disabled
              readOnly
            />
            True
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={question.correctBoolean === false}
              disabled
              readOnly
            />
            False
          </label>
        </div>
      )}

      {question.type === "INPUT" && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          Answer:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {question.correctText}
          </span>
        </p>
      )}

      {question.type === "CHECKBOX" && (
        <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          {question.options.map((option) => (
            <li key={option.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={option.isCorrect}
                disabled
                readOnly
              />
              <span>{option.text}</span>
              {option.isCorrect && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                  correct
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
