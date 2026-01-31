import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Example component for testing
function ExampleComponent({ message }: { message: string }) {
  return <div data-testid="example">{message}</div>;
}

describe("ExampleComponent", () => {
  it("renders message correctly", () => {
    render(<ExampleComponent message="Hello, World!" />);
    expect(screen.getByTestId("example")).toHaveTextContent("Hello, World!");
  });

  it("is visible in the document", () => {
    render(<ExampleComponent message="Test" />);
    expect(screen.getByTestId("example")).toBeInTheDocument();
  });
});
