import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateQuizPage from "./page";
import { createQuiz } from "@/services/api";
import { QuizDetail } from "@/types/quiz";

jest.mock("@/services/api");

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreateQuiz = createQuiz as jest.MockedFunction<typeof createQuiz>;

describe("CreateQuizPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("blocks submission and shows field errors when the form is empty", async () => {
    const user = userEvent.setup();
    render(<CreateQuizPage />);

    await user.click(screen.getByRole("button", { name: "Create quiz" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(mockCreateQuiz).not.toHaveBeenCalled();
  });

  it("submits a valid quiz and redirects to its detail page", async () => {
    const created: QuizDetail = {
      id: "new-id",
      title: "Capitals Quiz",
      createdAt: "now",
      questions: [],
    };
    mockCreateQuiz.mockResolvedValue(created);
    const user = userEvent.setup();

    render(<CreateQuizPage />);

    await user.type(screen.getByLabelText("Quiz title"), "Capitals Quiz");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Question 1 type" }),
      "BOOLEAN",
    );
    await user.type(
      screen.getByPlaceholderText("Question text"),
      "Paris is the capital of France.",
    );
    await user.click(screen.getByRole("radio", { name: "True" }));
    await user.click(screen.getByRole("button", { name: "Create quiz" }));

    await waitFor(() => {
      expect(mockCreateQuiz).toHaveBeenCalledWith({
        title: "Capitals Quiz",
        questions: [
          {
            type: "BOOLEAN",
            text: "Paris is the capital of France.",
            correctBoolean: true,
          },
        ],
      });
    });
    expect(mockPush).toHaveBeenCalledWith("/quizzes/new-id");
  });

  it("shows an error banner and keeps form data when the API call fails", async () => {
    mockCreateQuiz.mockRejectedValue(new Error("Title already exists"));
    const user = userEvent.setup();

    render(<CreateQuizPage />);

    await user.type(screen.getByLabelText("Quiz title"), "Capitals Quiz");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Question 1 type" }),
      "BOOLEAN",
    );
    await user.type(
      screen.getByPlaceholderText("Question text"),
      "Paris is the capital of France.",
    );
    await user.click(screen.getByRole("radio", { name: "True" }));
    await user.click(screen.getByRole("button", { name: "Create quiz" }));

    expect(await screen.findByText("Title already exists")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    // Form data survives the failed submit.
    expect(screen.getByLabelText("Quiz title")).toHaveValue("Capitals Quiz");
  });

  it("adds a new question row when 'Add question' is clicked", async () => {
    const user = userEvent.setup();
    render(<CreateQuizPage />);

    await user.click(screen.getByRole("button", { name: /add question/i }));

    expect(
      screen.getByRole("combobox", { name: "Question 2 type" }),
    ).toBeInTheDocument();
  });

  it("disables removing the only remaining question", () => {
    render(<CreateQuizPage />);

    expect(
      screen.getByRole("button", { name: "Remove question 1" }),
    ).toBeDisabled();
  });
});
