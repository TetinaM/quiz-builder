import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizCard } from "./QuizCard";
import { QuizSummary } from "@/types/quiz";

const quiz: QuizSummary = {
  id: "quiz-1",
  title: "Capitals Quiz",
  questionCount: 3,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("QuizCard", () => {
  it("renders the title, question count, and a link to the detail page", () => {
    render(<QuizCard quiz={quiz} onDelete={jest.fn()} />);

    expect(screen.getByText("Capitals Quiz")).toBeInTheDocument();
    expect(screen.getByText("3 questions")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/quizzes/quiz-1");
  });

  it("uses singular 'question' for a count of 1", () => {
    render(
      <QuizCard quiz={{ ...quiz, questionCount: 1 }} onDelete={jest.fn()} />,
    );

    expect(screen.getByText("1 question")).toBeInTheDocument();
  });

  it("calls onDelete with the quiz when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    render(<QuizCard quiz={quiz} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith(quiz);
  });

  it("renders the delete button outside the link so clicking it can't navigate", () => {
    render(<QuizCard quiz={quiz} onDelete={jest.fn()} />);

    const link = screen.getByRole("link");
    const deleteButton = screen.getByRole("button", { name: /delete/i });

    expect(link).not.toContainElement(deleteButton);
  });
});
