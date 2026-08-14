"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { CreateQuizFormInput, emptyQuestion } from "@/lib/validation";
import { QuestionType } from "@/types/quiz";

interface QuestionFormItemProps {
  control: Control<CreateQuizFormInput>;
  register: UseFormRegister<CreateQuizFormInput>;
  setValue: UseFormSetValue<CreateQuizFormInput>;
  errors: FieldErrors<CreateQuizFormInput>;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "BOOLEAN", label: "True / False" },
  { value: "INPUT", label: "Short answer" },
  { value: "CHECKBOX", label: "Multiple choice" },
];

const fieldClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft";
const errorClass = "text-sm text-red-600 dark:text-red-400";

// One question's editable block in the create form. Not fetch/services-
// aware — takes React Hook Form's `control`/`register`/`setValue`/`errors`
// as props from the page, which owns the actual form and the submit call.
export function QuestionFormItem({
  control,
  register,
  setValue,
  errors,
  index,
  onRemove,
  canRemove,
}: QuestionFormItemProps) {
  const type = useWatch({ control, name: `questions.${index}.type` });
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
    replace: replaceOptions,
  } = useFieldArray({ control, name: `questions.${index}.options` });

  const questionErrors = errors.questions?.[index];

  // setValue() on the parent `questions.${index}` path updates the flat
  // fields (type/text/correctBoolean/correctText) fine, but a nested
  // useFieldArray doesn't notice an array replaced that way — it only
  // reacts to its own append/remove/replace/etc. So the options array needs
  // its own explicit replace() call here to stay in sync.
  function handleTypeChange(newType: QuestionType) {
    const next = emptyQuestion(newType);
    setValue(`questions.${index}`, next);
    replaceOptions(next.options ?? []);
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow focus-within:shadow-md">
      {/* Stacked on mobile (the <select> doesn't shrink like a text input
          does, so keeping this a single row down to 375px overflows) —
          inline again from `sm:` up. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor={`question-${index}-text`}
            className="flex items-center gap-2 text-sm font-medium text-ink-soft"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {index + 1}
            </span>
            Question
          </label>
          <input
            id={`question-${index}-text`}
            {...register(`questions.${index}.text`)}
            placeholder="Question text"
            className={fieldClass}
          />
          {questionErrors?.text && (
            <p className={errorClass}>{questionErrors.text.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label={`Question ${index + 1} type`}
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className={`flex-1 sm:flex-none ${fieldClass}`}
          >
            {QUESTION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="danger-ghost"
            size="icon"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={`Remove question ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {type === "BOOLEAN" && (
        <div className="flex flex-col gap-1">
          {/* Controller instead of register(): a radio's native value is
              always a string, but we need a real boolean in form state. */}
          <Controller
            control={control}
            name={`questions.${index}.correctBoolean`}
            render={({ field }) => (
              <div className="flex gap-6 text-sm text-ink-soft">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                    className="accent-primary"
                  />
                  True
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                    className="accent-primary"
                  />
                  False
                </label>
              </div>
            )}
          />
          {questionErrors?.correctBoolean && (
            <p className={errorClass}>
              {questionErrors.correctBoolean.message}
            </p>
          )}
        </div>
      )}

      {type === "INPUT" && (
        <div className="flex flex-col gap-1">
          <input
            {...register(`questions.${index}.correctText`)}
            placeholder="Correct answer"
            aria-label={`Question ${index + 1} correct answer`}
            className={fieldClass}
          />
          {questionErrors?.correctText && (
            <p className={errorClass}>{questionErrors.correctText.message}</p>
          )}
        </div>
      )}

      {type === "CHECKBOX" && (
        <div className="flex flex-col gap-2">
          {optionFields.map((optionField, optionIndex) => (
            <div key={optionField.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`Option ${optionIndex + 1} is correct`}
                className="accent-accent"
                {...register(
                  `questions.${index}.options.${optionIndex}.isCorrect`,
                )}
              />
              <input
                {...register(`questions.${index}.options.${optionIndex}.text`)}
                placeholder={`Option ${optionIndex + 1}`}
                aria-label={`Option ${optionIndex + 1} text`}
                className={`flex-1 ${fieldClass}`}
              />
              <Button
                type="button"
                variant="danger-ghost"
                size="icon"
                onClick={() => removeOption(optionIndex)}
                disabled={optionFields.length <= 2}
                aria-label={`Remove option ${optionIndex + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => appendOption({ text: "", isCorrect: false })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add option
          </Button>
          {questionErrors?.options?.message && (
            <p className={errorClass}>{questionErrors.options.message}</p>
          )}
        </div>
      )}
    </li>
  );
}
