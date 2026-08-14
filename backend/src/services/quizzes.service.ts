import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { CreateQuizBody } from "../validation/quizzes.schema";

// Input type comes straight from the Zod schema (single source of truth for
// the POST /quizzes shape) — see validation/quizzes.schema.ts.
export type CreateQuizInput = CreateQuizBody;

// Shared "full nested quiz" include shape, ordered per the `order` column —
// see rules/03-database-schema.md for why `order` exists.
const quizWithQuestionsInclude = {
  questions: {
    orderBy: { order: "asc" as const },
    include: {
      options: {
        orderBy: { order: "asc" as const },
      },
    },
  },
} satisfies Prisma.QuizInclude;

export async function createQuiz(input: CreateQuizInput) {
  return prisma.quiz.create({
    data: {
      title: input.title,
      questions: {
        create: input.questions.map((question, questionIndex) => ({
          type: question.type,
          text: question.text,
          order: questionIndex,
          correctBoolean:
            question.type === "BOOLEAN"
              ? (question.correctBoolean ?? null)
              : null,
          correctText:
            question.type === "INPUT" ? (question.correctText ?? null) : null,
          options:
            question.type === "CHECKBOX" && question.options
              ? {
                  create: question.options.map((option, optionIndex) => ({
                    text: option.text,
                    isCorrect: option.isCorrect,
                    order: optionIndex,
                  })),
                }
              : undefined,
        })),
      },
    },
    include: quizWithQuestionsInclude,
  });
}

export async function listQuizzes() {
  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    questionCount: quiz._count.questions,
    createdAt: quiz.createdAt,
  }));
}

export async function getQuizById(id: string) {
  return prisma.quiz.findUnique({
    where: { id },
    include: quizWithQuestionsInclude,
  });
}

/** Returns `true` if a quiz was deleted, `false` if no quiz had that id. */
export async function deleteQuiz(id: string): Promise<boolean> {
  try {
    await prisma.quiz.delete({ where: { id } });
    return true;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return false;
    }
    throw err;
  }
}
