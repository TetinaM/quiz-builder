"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Resolver, useFieldArray, useForm } from "react-hook-form";
import { QuestionFormItem } from "@/components/quiz/QuestionFormItem";
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
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Create a quiz
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-6"
      >
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label
            htmlFor="quiz-title"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Quiz title
          </label>
          <input
            id="quiz-title"
            {...register("title")}
            placeholder="e.g. Capitals Quiz"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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

        <button
          type="button"
          onClick={() => appendQuestion(emptyQuestion())}
          className="self-start rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          + Add question
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Creating…" : "Create quiz"}
        </button>
      </form>
    </main>
  );
}
