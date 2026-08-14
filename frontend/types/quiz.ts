// Mirrors the backend's response shapes field-for-field. Kept in sync by
// hand rather than a shared package/codegen — the two apps are small and
// independently deployable, so that overhead isn't worth it here.

export type QuestionType = "BOOLEAN" | "INPUT" | "CHECKBOX";

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  order: number;
  correctBoolean: boolean | null;
  correctText: string | null;
  options: Option[];
}

export interface QuizSummary {
  id: string;
  title: string;
  questionCount: number;
  createdAt: string;
}

export interface QuizDetail {
  id: string;
  title: string;
  createdAt: string;
  questions: Question[];
}

// POST /quizzes request shape — mirrors backend/src/validation/quizzes.schema.ts.
export interface CreateOptionPayload {
  text: string;
  isCorrect: boolean;
}

export type CreateQuestionPayload =
  | { type: "BOOLEAN"; text: string; correctBoolean: boolean }
  | { type: "INPUT"; text: string; correctText: string }
  | { type: "CHECKBOX"; text: string; options: CreateOptionPayload[] };

export interface CreateQuizPayload {
  title: string;
  questions: CreateQuestionPayload[];
}
