import { ApiError, createQuiz, deleteQuiz, getQuiz, getQuizzes } from "./api";
import { CreateQuizPayload, QuizDetail, QuizSummary } from "@/types/quiz";

// services/api.ts reads NEXT_PUBLIC_API_URL once at module scope and
// prefixes every request with it. Next.js deliberately doesn't load
// .env.local under NODE_ENV=test (so tests behave the same on every
// machine), so that base URL is unset here — assertions below match on the
// request path's suffix rather than an exact URL.
function mockFetchOnce(response: Partial<Response> & { ok: boolean }) {
  const fetchMock = jest.fn().mockResolvedValue(response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("services/api", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getQuizzes", () => {
    it("GETs /quizzes and returns the parsed list", async () => {
      const quizzes: QuizSummary[] = [
        { id: "1", title: "Capitals", questionCount: 3, createdAt: "now" },
      ];
      const fetchMock = mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => quizzes,
      });

      const result = await getQuizzes();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/quizzes$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toEqual(quizzes);
    });
  });

  describe("getQuiz", () => {
    it("GETs /quizzes/:id and returns the parsed quiz", async () => {
      const quiz: QuizDetail = {
        id: "1",
        title: "Capitals",
        createdAt: "now",
        questions: [],
      };
      const fetchMock = mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => quiz,
      });

      const result = await getQuiz("1");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/quizzes\/1$/),
        expect.anything(),
      );
      expect(result).toEqual(quiz);
    });

    it("throws an ApiError with the backend's message on 404", async () => {
      mockFetchOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: "Quiz not found" }),
      });

      await expect(getQuiz("missing")).rejects.toMatchObject(
        new ApiError(404, "Quiz not found"),
      );
    });

    it("falls back to a generic message when the error body isn't JSON", async () => {
      mockFetchOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      });

      await expect(getQuiz("1")).rejects.toMatchObject({
        status: 500,
        message: "Request failed with status 500",
      });
    });
  });

  describe("createQuiz", () => {
    it("POSTs the payload as JSON and returns the created quiz", async () => {
      const payload: CreateQuizPayload = {
        title: "New Quiz",
        questions: [{ type: "BOOLEAN", text: "Q1?", correctBoolean: true }],
      };
      const created: QuizDetail = {
        id: "new-id",
        title: payload.title,
        createdAt: "now",
        questions: [],
      };
      const fetchMock = mockFetchOnce({
        ok: true,
        status: 201,
        json: async () => created,
      });

      const result = await createQuiz(payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/quizzes$/),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe("deleteQuiz", () => {
    it("DELETEs /quizzes/:id and resolves with no value on 204", async () => {
      const fetchMock = mockFetchOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error("no body to parse on 204");
        },
      });

      const result = await deleteQuiz("1");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/quizzes\/1$/),
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(result).toBeUndefined();
    });

    it("throws an ApiError on failure", async () => {
      mockFetchOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: "Quiz not found" }),
      });

      await expect(deleteQuiz("missing")).rejects.toThrow("Quiz not found");
    });
  });
});
