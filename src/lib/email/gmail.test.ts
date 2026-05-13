import { describe, it, expect } from "vitest";
import { _internal } from "./gmail";

describe("Gmail normalization (case 2)", () => {
  it("normalizes a raw Gmail message to unified Email", () => {
    const email = _internal.normalizeMessage("gmail:u@example.com", {
      id: "m1",
      threadId: "t1",
      snippet: "Hello there",
      internalDate: "1730000000000",
      labelIds: ["INBOX", "STARRED"],
      payload: {
        headers: [
          { name: "From", value: '"Alice" <alice@example.com>' },
          { name: "To", value: "u@example.com" },
          { name: "Subject", value: "Hi" },
          { name: "Date", value: "Mon, 27 Oct 2024 00:00:00 +0000" },
        ],
        parts: [
          { mimeType: "text/plain", body: { data: Buffer.from("Hello world").toString("base64").replace(/=+$/, "") } },
        ],
      },
    });
    expect(email.provider).toBe("gmail");
    expect(email.id).toBe("m1");
    expect(email.from).toEqual({ name: "Alice", email: "alice@example.com" });
    expect(email.to).toEqual([{ email: "u@example.com" }]);
    expect(email.subject).toBe("Hi");
    expect(email.isStarred).toBe(true);
    expect(email.isRead).toBe(true); // no UNREAD label
    expect(email.body.text).toBe("Hello world");
  });
});

describe("Gmail send raw (case 3)", () => {
  it("builds a base64url raw with correct headers", () => {
    const raw = _internal.buildRaw(
      {
        accountId: "gmail:u@example.com",
        to: [{ email: "bob@example.com", name: "Bob" }],
        subject: "Greetings",
        body: "Hello",
        inReplyTo: "<msg-id@example.com>",
      },
      "u@example.com",
    );
    // base64url has no = padding
    expect(raw).not.toMatch(/=/);
    const decoded = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    expect(decoded).toContain("From: u@example.com");
    expect(decoded).toContain('To: "Bob" <bob@example.com>');
    expect(decoded).toContain("Subject: Greetings");
    expect(decoded).toContain("In-Reply-To: <msg-id@example.com>");
    expect(decoded).toContain("References: <msg-id@example.com>");
    expect(decoded).toContain("Hello");
  });
});
