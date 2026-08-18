import { render, screen, within } from "@testing-library/react";
import { QuestionView } from "./QuestionView";
import { Question } from "@/types/quiz";

// All inputs rendered here must stay disabled/read-only — this page is
// explicitly "structure, not solving" per project.txt.
describe("QuestionView", () => {
  it("renders a BOOLEAN question with the correct answer checked and disabled", () => {
    const question: Question = {
      id: "q1",
      type: "BOOLEAN",
      text: "Paris is the capital of France.",
      order: 0,
      correctBoolean: true,
      correctText: null,
      options: [],
    };

    render(<QuestionView question={question} index={0} />);

    expect(
      screen.getByText("Paris is the capital of France."),
    ).toBeInTheDocument();
    const trueRadio = screen.getByRole("radio", { name: "True" });
    const falseRadio = screen.getByRole("radio", { name: "False" });
    expect(trueRadio).toBeChecked();
    expect(trueRadio).toBeDisabled();
    expect(falseRadio).not.toBeChecked();
    expect(falseRadio).toBeDisabled();
  });

  it("renders an INPUT question's stored correct answer as static text", () => {
    const question: Question = {
      id: "q2",
      type: "INPUT",
      text: "Capital of Japan?",
      order: 0,
      correctBoolean: null,
      correctText: "Tokyo",
      options: [],
    };

    render(<QuestionView question={question} index={0} />);

    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    // No interactive textbox — the answer is display-only.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders CHECKBOX options as disabled checkboxes, correct ones badged", () => {
    const question: Question = {
      id: "q3",
      type: "CHECKBOX",
      text: "Which are EU capitals?",
      order: 0,
      correctBoolean: null,
      correctText: null,
      options: [
        { id: "o1", text: "Berlin", isCorrect: true, order: 0 },
        { id: "o2", text: "Oslo", isCorrect: false, order: 1 },
      ],
    };

    render(<QuestionView question={question} index={0} />);

    // The option's checkbox isn't <label>-associated with its text, so find
    // each by its containing row instead of an accessible name.
    const berlinRow = screen.getByText("Berlin").closest("li");
    const osloRow = screen.getByText("Oslo").closest("li");
    if (!berlinRow || !osloRow) throw new Error("option row not found");

    const berlinCheckbox = within(berlinRow).getByRole("checkbox");
    const osloCheckbox = within(osloRow).getByRole("checkbox");
    expect(berlinCheckbox).toBeChecked();
    expect(berlinCheckbox).toBeDisabled();
    expect(osloCheckbox).not.toBeChecked();
    expect(osloCheckbox).toBeDisabled();
    expect(within(berlinRow).getByText("correct")).toBeInTheDocument();
    expect(within(osloRow).queryByText("correct")).not.toBeInTheDocument();
  });

  it("prefixes the question text with its 1-based index", () => {
    const question: Question = {
      id: "q4",
      type: "INPUT",
      text: "Second question",
      order: 1,
      correctBoolean: null,
      correctText: "answer",
      options: [],
    };

    render(<QuestionView question={question} index={1} />);

    expect(screen.getByText("2.")).toBeInTheDocument();
  });
});
