import { createQuizFormSchema, emptyQuestion } from "./validation";

// Mirrors backend/src/validation/quizzes.schema.ts's rules one-for-one (see
// that file's own test suite) — these tests check the frontend's copy
// enforces the same invariants client-side.
describe("createQuizFormSchema", () => {
  it("accepts a quiz with one question of each type", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Capitals Quiz",
      questions: [
        { type: "BOOLEAN", text: "Paris is in France.", correctBoolean: true },
        { type: "INPUT", text: "Capital of Japan?", correctText: "Tokyo" },
        {
          type: "CHECKBOX",
          text: "Which are EU capitals?",
          options: [
            { text: "Berlin", isCorrect: true },
            { text: "Oslo", isCorrect: false },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createQuizFormSchema.safeParse({
      title: "   ",
      questions: [{ type: "BOOLEAN", text: "Q1?", correctBoolean: true }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a quiz with zero questions", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Empty Quiz",
      questions: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a question with empty text", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Quiz",
      questions: [{ type: "INPUT", text: "  ", correctText: "answer" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an INPUT question with an empty correct answer", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Quiz",
      questions: [{ type: "INPUT", text: "Q1?", correctText: "" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a BOOLEAN question with no answer selected", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Quiz",
      questions: [{ type: "BOOLEAN", text: "Q1?" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a CHECKBOX question with fewer than 2 options", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Quiz",
      questions: [
        {
          type: "CHECKBOX",
          text: "Q1?",
          options: [{ text: "Only one", isCorrect: true }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a CHECKBOX question with no option marked correct", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Quiz",
      questions: [
        {
          type: "CHECKBOX",
          text: "Q1?",
          options: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown question type", () => {
    const result = createQuizFormSchema.safeParse({
      title: "Quiz",
      questions: [{ type: "ESSAY", text: "Q1?" }],
    });

    expect(result.success).toBe(false);
  });
});

describe("emptyQuestion", () => {
  it("defaults to an INPUT question when no type is given", () => {
    expect(emptyQuestion()).toEqual({
      type: "INPUT",
      text: "",
      correctText: "",
    });
  });

  it("builds a blank BOOLEAN question", () => {
    expect(emptyQuestion("BOOLEAN")).toEqual({
      type: "BOOLEAN",
      text: "",
    });
  });

  it("builds a CHECKBOX question with two blank, unmarked options", () => {
    const question = emptyQuestion("CHECKBOX");

    expect(question).toEqual({
      type: "CHECKBOX",
      text: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
    });
  });
});
