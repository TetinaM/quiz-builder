"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Resolver, useFieldArray, useForm } from "react-hook-form";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { QuestionFormItem } from "@/components/quiz/QuestionFormItem";
import { Button } from "@/components/ui/Button";
import {
  createQuizFormSchema,
  CreateQuizFormInput,
  emptyQuestion,
} from "@/lib/validation";
import { createQuiz } from "@/services/api";
import { CreateQuizPayload } from "@/types/quiz";

export default function CreateQuizPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuizFormInput, unknown, CreateQuizPayload>({
    // zodResolver's generics are tied to createQuizFormSchema's own (strict,
    // discriminated-union) input type, which doesn't structurally match our
    // looser CreateQuizFormInput (deliberately loose so switching a
    // question's type mid-fill doesn't fight RHF — see lib/validation.ts).
    // The cast is safe: at runtime the resolver just validates whatever
    // form state it's given, and every state CreateQuizFormInput allows is
    // a valid (possibly incomplete) value for the schema to check.
    resolver: zodResolver(createQuizFormSchema) as Resolver<
      CreateQuizFormInput,
      unknown,
      CreateQuizPayload
    >,
    defaultValues: { title: "", questions: [emptyQuestion()] },
  });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({ control, name: "questions" });

  // The resolver already validated + shaped `data` to match CreateQuizPayload
  // exactly (see lib/validation.ts) — no extra mapping needed before POSTing.
  async function onSubmit(data: CreateQuizPayload) {
    setSubmitError(null);
    try {
      const quiz = await createQuiz(data);
      router.push(`/quizzes/${quiz.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Create a quiz
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-6"
      >
        {submitError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <label
            htmlFor="quiz-title"
            className="text-sm font-medium text-ink-soft"
          >
            Quiz title
          </label>
          <input
            id="quiz-title"
            {...register("title")}
            placeholder="e.g. Capitals Quiz"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft"
          />
          {errors.title && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.title.message}
            </p>
          )}
        </div>

        <ul className="flex flex-col gap-3">
          {questionFields.map((field, index) => (
            <QuestionFormItem
              key={field.id}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              index={index}
              onRemove={() => removeQuestion(index)}
              canRemove={questionFields.length > 1}
            />
          ))}
        </ul>
        {errors.questions?.root?.message && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.questions.root.message}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => appendQuestion(emptyQuestion())}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add question
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? "Creating…" : "Create quiz"}
          </Button>
        </div>
      </form>
    </main>
  );
}
