import { render, screen } from "@testing-library/react";
import QuizDetailPage from "./page";
import { ApiError, getQuiz } from "@/services/api";
import { QuizDetail } from "@/types/quiz";

// Only getQuiz is mocked — automocking the whole module would also stub out
// the ApiError *class*, breaking the page's `err instanceof ApiError` check.
jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  getQuiz: jest.fn(),
}));

// next/navigation's real notFound() throws a special NEXT_NOT_FOUND error
// that only the framework's error boundary understands; a plain throw is
// enough here since the test just asserts it was called and propagated.
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

const mockGetQuiz = getQuiz as jest.MockedFunction<typeof getQuiz>;

// This page is an async Server Component (no "use client"), so it's tested
// by calling the exported function directly and rendering what it resolves
// to, rather than mounting it via RTL's render() up front.
describe("QuizDetailPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the quiz title and each question, in order", async () => {
    const quiz: QuizDetail = {
      id: "1",
      title: "Capitals Quiz",
      createdAt: "now",
      questions: [
        {
          id: "q1",
          type: "BOOLEAN",
          text: "Paris is in France.",
          order: 0,
          correctBoolean: true,
          correctText: null,
          options: [],
        },
        {
          id: "q2",
          type: "INPUT",
          text: "Capital of Japan?",
          order: 1,
          correctBoolean: null,
          correctText: "Tokyo",
          options: [],
        },
      ],
    };
    mockGetQuiz.mockResolvedValue(quiz);

    const jsx = await QuizDetailPage({
      params: Promise.resolve({ id: "1" }),
    });
    render(jsx);

    expect(screen.getByText("Capitals Quiz")).toBeInTheDocument();
    expect(screen.getByText("Paris is in France.")).toBeInTheDocument();
    expect(screen.getByText("Capital of Japan?")).toBeInTheDocument();
  });

  it("calls notFound() when the API returns a 404", async () => {
    mockGetQuiz.mockRejectedValue(new ApiError(404, "Quiz not found"));

    await expect(
      QuizDetailPage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow();

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-404 errors instead of calling notFound()", async () => {
    mockGetQuiz.mockRejectedValue(new Error("network down"));

    await expect(
      QuizDetailPage({ params: Promise.resolve({ id: "1" }) }),
    ).rejects.toThrow("network down");

    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
