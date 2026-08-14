import { z } from "zod";
import { QuestionType } from "@/types/quiz";

const optionSchema = z.object({
  text: z.string().trim().min(1, "Option text is required"),
  isCorrect: z.boolean(),
});

const booleanQuestionSchema = z.object({
  type: z.literal("BOOLEAN"),
  text: z.string().trim().min(1, "Question text is required"),
  correctBoolean: z.boolean({ error: "Select True or False" }),
});

const inputQuestionSchema = z.object({
  type: z.literal("INPUT"),
  text: z.string().trim().min(1, "Question text is required"),
  correctText: z.string().trim().min(1, "Correct answer is required"),
});

const checkboxQuestionSchema = z.object({
  type: z.literal("CHECKBOX"),
  text: z.string().trim().min(1, "Question text is required"),
  options: z
    .array(optionSchema)
    .min(2, "Add at least 2 options")
    .refine((options) => options.some((option) => option.isCorrect), {
      message: "Mark at least one option as correct",
    }),
});

// Discriminated on `type`, mirroring backend/src/validation/quizzes.schema.ts
// exactly. The *output* of this schema (after zodResolver runs it) is
// shaped exactly like CreateQuizPayload in types/quiz.ts, so submit
// handlers can pass RHF's data straight to createQuiz() with no extra
// mapping.
const questionSchema = z.discriminatedUnion("type", [
  booleanQuestionSchema,
  inputQuestionSchema,
  checkboxQuestionSchema,
]);

export const createQuizFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

// A looser "input" shape for React Hook Form's defaultValues/field paths.
// Every per-type field is optional here so switching a question's `type`
// never fights RHF's typing — the strict, backend-payload-shaped type only
// exists as the *output* of createQuizFormSchema, produced by the resolver
// on submit.
export interface QuestionFormInput {
  type: QuestionType;
  text: string;
  correctBoolean?: boolean;
  correctText?: string;
  options?: { text: string; isCorrect: boolean }[];
}

export interface CreateQuizFormInput {
  title: string;
  questions: QuestionFormInput[];
}

/** A fresh, empty question of the given type — used both for the form's
 * initial default and whenever the "Add question" button appends a new one,
 * or a question's type is switched (which replaces the whole sub-object so
 * no stale fields from the previous type linger). */
export function emptyQuestion(type: QuestionType = "INPUT"): QuestionFormInput {
  switch (type) {
    case "BOOLEAN":
      return { type: "BOOLEAN", text: "" };
    case "INPUT":
      return { type: "INPUT", text: "", correctText: "" };
    case "CHECKBOX":
      return {
        type: "CHECKBOX",
        text: "",
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
      };
  }
}
