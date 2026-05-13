import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountList } from "./AccountList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("AccountList (case 9)", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) as unknown as typeof fetch;
  });

  it("shows empty state when no accounts", () => {
    render(<AccountList accounts={[]} />);
    expect(screen.getByText(/no accounts connected/i)).toBeInTheDocument();
  });

  it("renders accounts and calls disconnect endpoint when clicked", async () => {
    render(
      <AccountList
        accounts={[
          { id: "gmail:u@x.com", provider: "gmail", email: "u@x.com", connectedAt: new Date().toISOString() },
        ]}
      />,
    );
    expect(screen.getByText("u@x.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/auth/accounts");
    expect((init as RequestInit).method).toBe("DELETE");
    expect((init as RequestInit).body).toContain("gmail:u@x.com");
  });
});
