import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AISummary } from "./AISummary";
import type { Email } from "@/lib/email/types";

const base: Email = {
  id: "x",
  provider: "gmail",
  accountId: "gmail:u@x.com",
  from: { email: "a@x.com" },
  to: [{ email: "u@x.com" }],
  subject: "Subj",
  snippet: "snip",
  body: {},
  date: new Date().toISOString(),
  labels: [],
  isRead: false,
  isStarred: false,
  hasAttachments: false,
};

describe("AISummary (case 8)", () => {
  it("renders summary and priority badge when AI data is present", () => {
    render(<AISummary email={{ ...base, ai: { summary: "This is the summary.", priority: "high", category: "work" } }} />);
    expect(screen.getByText("AI summary")).toBeInTheDocument();
    expect(screen.getByText("This is the summary.")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText(/work/i)).toBeInTheDocument();
  });

  it("renders shimmer placeholder when AI data is missing", () => {
    const { container } = render(<AISummary email={base} />);
    expect(container.querySelectorAll(".shimmer").length).toBeGreaterThan(0);
  });
});
