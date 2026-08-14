import { z } from "zod";

const optionSchema = z.object({
  text: z.string().trim().min(1, "Option text is required"),
  isCorrect: z.boolean(),
});

const booleanQuestionSchema = z.object({
  type: z.literal("BOOLEAN"),
  text: z.string().trim().min(1, "Question text is required"),
  correctBoolean: z.boolean(),
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
    .min(2, "Checkbox questions need at least 2 options")
    .refine((options) => options.some((option) => option.isCorrect), {
      message: "At least one option must be marked correct",
    }),
});

// Discriminated on `type` so an unknown/missing type is rejected with a
// clear error instead of silently falling through to one of the branches.
const questionSchema = z.discriminatedUnion("type", [
  booleanQuestionSchema,
  inputQuestionSchema,
  checkboxQuestionSchema,
]);

export const createQuizSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required"),
});

export type CreateQuizBody = z.infer<typeof createQuizSchema>;
