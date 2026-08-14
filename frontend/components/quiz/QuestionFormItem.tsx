"use client";

import { Trash2 } from "lucide-react";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
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
  "rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const errorClass = "text-sm text-red-600 dark:text-red-400";
const iconButtonClass =
  "shrink-0 rounded-md p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400";

// One question's editable block in the create form. Not fetch/services-
// aware — takes RHF's `control`/`register`/`setValue`/`errors` as props from
// the page, per rules/05-frontend-rules.md's component-layering rule.
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
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Stacked on mobile (the <select> doesn't shrink like a text input
          does, so keeping this a single row down to 375px overflows) —
          inline again from `sm:` up. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor={`question-${index}-text`}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Question {index + 1}
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

          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={`Remove question ${index + 1}`}
            className={iconButtonClass}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {type === "BOOLEAN" && (
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name={`questions.${index}.correctBoolean`}
            render={({ field }) => (
              <div className="flex gap-6 text-sm text-zinc-700 dark:text-zinc-300">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                  />
                  True
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
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
              <button
                type="button"
                onClick={() => removeOption(optionIndex)}
                disabled={optionFields.length <= 2}
                aria-label={`Remove option ${optionIndex + 1}`}
                className={iconButtonClass}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendOption({ text: "", isCorrect: false })}
            className="self-start text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
          >
            + Add option
          </button>
          {questionErrors?.options?.message && (
            <p className={errorClass}>{questionErrors.options.message}</p>
          )}
        </div>
      )}
    </li>
  );
}
