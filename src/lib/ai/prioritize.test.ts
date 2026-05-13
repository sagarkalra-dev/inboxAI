import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = { create: createMock };
    },
  };
});

import { enrichBatch } from "./prioritize";
import { draftReply } from "./draft";
import type { Email } from "@/lib/email/types";

function mkEmail(id: string): Email {
  return {
    id,
    provider: "gmail",
    accountId: "gmail:u@x.com",
    from: { email: "sender@x.com", name: "Sender" },
    to: [{ email: "u@x.com" }],
    subject: `Subj ${id}`,
    snippet: `Snippet ${id}`,
    body: { text: `Body ${id}` },
    date: new Date().toISOString(),
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

beforeEach(() => {
  createMock.mockReset();
  process.env.ANTHROPIC_API_KEY = "test";
});

describe("AI batch enrichment (cases 4 + 5)", () => {
  it("enriches 10 emails in one batch call and caches results", async () => {
    const emails = Array.from({ length: 10 }, (_, i) => mkEmail(`m${i}`));
    const payload = emails.map((e) => ({ id: e.id, summary: `summary-${e.id}`, priority: "medium", category: "work" }));
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(payload) }] });

    const enriched = await enrichBatch(emails);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(enriched).toHaveLength(10);
    for (const e of enriched) expect(e.ai?.summary).toBe(`summary-${e.id}`);
  });

  it("case 5: cache hit — second call skips Claude", async () => {
    const emails = [mkEmail("cache-1"), mkEmail("cache-2")];
    const payload = emails.map((e) => ({ id: e.id, summary: `s-${e.id}`, priority: "low", category: "updates" }));
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify(payload) }] });

    await enrichBatch(emails);
    expect(createMock).toHaveBeenCalledTimes(1);

    // Second pass with the same emails — fully cached, no Claude call
    const second = await enrichBatch(emails);
    expect(createMock).toHaveBeenCalledTimes(1); // unchanged
    expect(second[0].ai?.summary).toBe("s-cache-1");
    expect(second[1].ai?.summary).toBe("s-cache-2");
  });
});

describe("AI draft reply (case 6)", () => {
  it("calls Claude with thread context and returns the draft text", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "Thanks — sounds good!" }] });
    const out = await draftReply(mkEmail("d1"));
    expect(out).toBe("Thanks — sounds good!");
    const call = createMock.mock.calls[0][0];
    expect(call.messages[0].content).toContain("Subj d1");
    expect(call.messages[0].content).toContain("Body d1");
  });
});
