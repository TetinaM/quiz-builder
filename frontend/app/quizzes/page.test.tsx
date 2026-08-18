import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuizzesPage from "./page";
import { deleteQuiz, getQuizzes } from "@/services/api";
import { QuizSummary } from "@/types/quiz";

jest.mock("@/services/api");

const mockGetQuizzes = getQuizzes as jest.MockedFunction<typeof getQuizzes>;
const mockDeleteQuiz = deleteQuiz as jest.MockedFunction<typeof deleteQuiz>;

const quizzes: QuizSummary[] = [
  { id: "1", title: "Capitals Quiz", questionCount: 3, createdAt: "now" },
  { id: "2", title: "Math Quiz", questionCount: 1, createdAt: "now" },
];

describe("QuizzesPage", () => {
  afterEach(() => {
    // clearAllMocks resets call history on the automocked api module
    // functions (jest.restoreAllMocks alone only affects jest.spyOn spies,
    // e.g. window.confirm/alert below, and wouldn't reset those).
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("shows a loading state, then the fetched quizzes", async () => {
    mockGetQuizzes.mockResolvedValue(quizzes);

    render(<QuizzesPage />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();

    expect(await screen.findByText("Capitals Quiz")).toBeInTheDocument();
    expect(screen.getByText("Math Quiz")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no quizzes", async () => {
    mockGetQuizzes.mockResolvedValue([]);

    render(<QuizzesPage />);

    expect(await screen.findByText("No quizzes yet.")).toBeInTheDocument();
  });

  it("shows an error state with a retry button when the fetch fails", async () => {
    mockGetQuizzes.mockRejectedValueOnce(new Error("network down"));

    render(<QuizzesPage />);

    expect(
      await screen.findByText("Couldn't load quizzes"),
    ).toBeInTheDocument();

    mockGetQuizzes.mockResolvedValueOnce(quizzes);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Capitals Quiz")).toBeInTheDocument();
  });

  it("deletes a quiz and removes it from the list after confirming", async () => {
    mockGetQuizzes.mockResolvedValue(quizzes);
    mockDeleteQuiz.mockResolvedValue(undefined);
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    render(<QuizzesPage />);
    await screen.findByText("Capitals Quiz");

    const card = screen.getByText("Capitals Quiz").closest("li");
    if (!card) throw new Error("card not found");
    await user.click(within(card).getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteQuiz).toHaveBeenCalledWith("1");
    });
    expect(screen.queryByText("Capitals Quiz")).not.toBeInTheDocument();
    expect(screen.getByText("Math Quiz")).toBeInTheDocument();
  });

  it("does not delete when the confirm dialog is dismissed", async () => {
    mockGetQuizzes.mockResolvedValue(quizzes);
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    render(<QuizzesPage />);
    await screen.findByText("Capitals Quiz");

    const card = screen.getByText("Capitals Quiz").closest("li");
    if (!card) throw new Error("card not found");
    await user.click(within(card).getByRole("button", { name: /delete/i }));

    expect(mockDeleteQuiz).not.toHaveBeenCalled();
    expect(screen.getByText("Capitals Quiz")).toBeInTheDocument();
  });

  it("alerts and keeps the quiz in the list when deletion fails", async () => {
    mockGetQuizzes.mockResolvedValue(quizzes);
    mockDeleteQuiz.mockRejectedValue(new Error("failed"));
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();

    render(<QuizzesPage />);
    await screen.findByText("Capitals Quiz");

    const card = screen.getByText("Capitals Quiz").closest("li");
    if (!card) throw new Error("card not found");
    await user.click(within(card).getByRole("button", { name: /delete/i }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(screen.getByText("Capitals Quiz")).toBeInTheDocument();
  });
});
