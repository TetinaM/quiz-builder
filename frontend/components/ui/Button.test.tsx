import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, LinkButton } from "./Button";

describe("Button", () => {
  it("renders as a native button and forwards onClick", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick while disabled", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("LinkButton", () => {
  it("renders a link pointing at the given href", () => {
    render(<LinkButton href="/create">New quiz</LinkButton>);

    expect(screen.getByRole("link", { name: "New quiz" })).toHaveAttribute(
      "href",
      "/create",
    );
  });
});
