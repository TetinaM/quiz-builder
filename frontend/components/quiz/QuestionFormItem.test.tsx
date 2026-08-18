import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { QuestionFormItem } from "./QuestionFormItem";
import { CreateQuizFormInput, emptyQuestion } from "@/lib/validation";

// QuestionFormItem takes RHF's control/register/setValue/errors as props
// rather than owning a form itself (see its own file header comment), so
// each test needs a small harness that plays the role of the page.
function Harness({
  defaultType = "INPUT",
  onRemove = jest.fn(),
  canRemove = true,
}: {
  defaultType?: CreateQuizFormInput["questions"][number]["type"];
  onRemove?: () => void;
  canRemove?: boolean;
}) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<CreateQuizFormInput>({
    defaultValues: { title: "", questions: [emptyQuestion(defaultType)] },
  });

  return (
    <QuestionFormItem
      control={control}
      register={register}
      setValue={setValue}
      errors={errors}
      index={0}
      onRemove={onRemove}
      canRemove={canRemove}
    />
  );
}

describe("QuestionFormItem", () => {
  it("renders the question text field and type selector", () => {
    render(<Harness />);

    expect(screen.getByPlaceholderText("Question text")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Question 1 type" }),
    ).toHaveValue("INPUT");
  });

  it("shows a correct-answer text field for an INPUT question", () => {
    render(<Harness defaultType="INPUT" />);

    expect(screen.getByPlaceholderText("Correct answer")).toBeInTheDocument();
  });

  it("shows a True/False radio pair for a BOOLEAN question", () => {
    render(<Harness defaultType="BOOLEAN" />);

    expect(screen.getByRole("radio", { name: "True" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "False" })).toBeInTheDocument();
  });

  it("shows two option rows for a CHECKBOX question", () => {
    render(<Harness defaultType="CHECKBOX" />);

    expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Option 2")).toBeInTheDocument();
  });

  it("swaps the rendered sub-fields when the type is changed", async () => {
    const user = userEvent.setup();
    render(<Harness defaultType="INPUT" />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Question 1 type" }),
      "BOOLEAN",
    );

    expect(
      screen.queryByPlaceholderText("Correct answer"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "True" })).toBeInTheDocument();
  });

  it("adds an option row when 'Add option' is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness defaultType="CHECKBOX" />);

    await user.click(screen.getByRole("button", { name: /add option/i }));

    expect(screen.getByPlaceholderText("Option 3")).toBeInTheDocument();
  });

  it("disables removing an option below the 2-option minimum", () => {
    render(<Harness defaultType="CHECKBOX" />);

    expect(
      screen.getByRole("button", { name: "Remove option 1" }),
    ).toBeDisabled();
  });

  it("calls onRemove when the remove-question button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<Harness onRemove={onRemove} canRemove />);

    await user.click(screen.getByRole("button", { name: "Remove question 1" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disables the remove-question button when canRemove is false", () => {
    render(<Harness canRemove={false} />);

    expect(
      screen.getByRole("button", { name: "Remove question 1" }),
    ).toBeDisabled();
  });
});
