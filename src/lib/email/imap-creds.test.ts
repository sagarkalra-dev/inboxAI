import { describe, it, expect, beforeAll } from "vitest";
import { saveImapCreds, loadImapCreds, deleteImapCreds, presets } from "./imap-creds";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-key-for-imap-creds-1234567890ab";
});

describe("IMAP credentials storage (case 11: IMAP provider)", () => {
  it("encrypts, stores, and retrieves IMAP credentials", async () => {
    const sid = "sess-imap";
    const accountId = "imap:user@yahoo.com";
    await saveImapCreds(sid, accountId, {
      email: "user@yahoo.com",
      password: "app-secret",
      imapHost: presets.yahoo.imapHost,
      imapPort: presets.yahoo.imapPort,
      smtpHost: presets.yahoo.smtpHost,
      smtpPort: presets.yahoo.smtpPort,
    });
    const loaded = await loadImapCreds(sid, accountId);
    expect(loaded?.email).toBe("user@yahoo.com");
    expect(loaded?.password).toBe("app-secret");
    expect(loaded?.imapHost).toBe("imap.mail.yahoo.com");
    expect(loaded?.smtpPort).toBe(465);
    await deleteImapCreds(sid, accountId);
    expect(await loadImapCreds(sid, accountId)).toBeNull();
  });

  it("exposes Yahoo and AOL presets", () => {
    expect(presets.yahoo.imapHost).toBe("imap.mail.yahoo.com");
    expect(presets.aol.imapHost).toBe("imap.aol.com");
    expect(presets.yahoo.smtpPort).toBe(465);
  });
});
