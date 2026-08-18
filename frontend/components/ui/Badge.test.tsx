import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>3 questions</Badge>);

    expect(screen.getByText("3 questions")).toBeInTheDocument();
  });

  it("defaults to the neutral variant's classes", () => {
    render(<Badge>neutral</Badge>);

    expect(screen.getByText("neutral")).toHaveClass("bg-border/60");
  });

  it("applies the requested variant's classes", () => {
    render(<Badge variant="accent">correct</Badge>);

    expect(screen.getByText("correct")).toHaveClass("bg-accent-soft");
  });
});
