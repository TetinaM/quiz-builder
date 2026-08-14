import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Question } from "@/types/quiz";

interface QuestionViewProps {
  question: Question;
  index: number;
}

const TYPE_LABEL: Record<Question["type"], string> = {
  BOOLEAN: "True / False",
  INPUT: "Short answer",
  CHECKBOX: "Multiple choice",
};

// Read-only rendering of one question — shows its structure and correct
// answer(s), never an interactive "solve it" form. All inputs below are
// disabled.
export function QuestionView({ question, index }: QuestionViewProps) {
  return (
    <li className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-ink">
          <span className="mr-2 text-primary">{index + 1}.</span>
          {question.text}
        </p>
        <Badge variant="neutral" className="shrink-0">
          {TYPE_LABEL[question.type]}
        </Badge>
      </div>

      {question.type === "BOOLEAN" && (
        <div className="mt-3 flex gap-6 text-sm text-ink-soft">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={question.correctBoolean === true}
              disabled
              readOnly
              className="accent-primary"
            />
            True
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={question.correctBoolean === false}
              disabled
              readOnly
              className="accent-primary"
            />
            False
          </label>
        </div>
      )}

      {question.type === "INPUT" && (
        <p className="mt-3 text-sm text-ink-soft">
          Answer:{" "}
          <span className="font-medium text-ink">{question.correctText}</span>
        </p>
      )}

      {question.type === "CHECKBOX" && (
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
          {question.options.map((option) => (
            <li key={option.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={option.isCorrect}
                disabled
                readOnly
                className="accent-primary"
              />
              <span>{option.text}</span>
              {option.isCorrect && (
                <Badge variant="accent">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  correct
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
