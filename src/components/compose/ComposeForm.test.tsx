import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ComposeForm } from "./ComposeForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

describe("ComposeForm (case 10)", () => {
  beforeEach(() => {
    push.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) as unknown as typeof fetch;
  });

  it("validates required fields", async () => {
    render(
      <ComposeForm
        accounts={[
          { id: "gmail:u@x.com", provider: "gmail", email: "u@x.com", connectedAt: new Date().toISOString() },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends via correct provider account when valid", async () => {
    render(
      <ComposeForm
        accounts={[
          { id: "gmail:u@x.com", provider: "gmail", email: "u@x.com", connectedAt: new Date().toISOString() },
          { id: "microsoft:o@x.com", provider: "microsoft", email: "o@x.com", connectedAt: new Date().toISOString() },
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: "microsoft:o@x.com" } });
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: "bob@x.com" } });
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText(/body/i), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.accountId).toBe("microsoft:o@x.com");
    expect(body.to).toEqual([{ email: "bob@x.com" }]);
    expect(body.subject).toBe("Hi");
  });
});
