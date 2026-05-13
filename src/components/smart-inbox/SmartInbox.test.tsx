import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SmartInbox } from "./SmartInbox";
import type { Email } from "@/lib/email/types";

function mk(id: string, priority: Email["ai"] extends infer T ? (T extends { priority?: infer P } ? P : never) : never): Email {
  return {
    id,
    provider: "gmail",
    accountId: "gmail:u@x.com",
    from: { email: "a@x.com" },
    to: [{ email: "u@x.com" }],
    subject: `S-${id}`,
    snippet: `snip-${id}`,
    body: {},
    date: new Date().toISOString(),
    labels: [],
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    ai: { summary: `summary-${id}`, priority },
  };
}

describe("SmartInbox (case 7)", () => {
  it("renders priority group headings and email items", () => {
    render(
      <SmartInbox
        emails={[mk("a", "critical"), mk("b", "high"), mk("c", "medium"), mk("d", "low")]}
      />,
    );
    expect(screen.getByRole("heading", { name: /Critical/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /High priority/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Standard/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Low priority/ })).toBeInTheDocument();
    expect(screen.getByText("summary-a")).toBeInTheDocument();
    expect(screen.getByText("S-d")).toBeInTheDocument();
  });

  it("shows caught-up message when empty", () => {
    render(<SmartInbox emails={[]} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });
});
