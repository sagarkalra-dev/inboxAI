import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, saveToken, loadToken, listAccounts, removeAccount } from "./tokens";
import type { Account } from "@/lib/email/types";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-key-for-tokens-1234567890abcdef";
});

describe("token encryption + KV storage", () => {
  it("roundtrips an encrypted payload", () => {
    const plain = JSON.stringify({ access: "abc", refresh: "xyz" });
    const enc = encrypt(plain);
    expect(enc).not.toEqual(plain);
    expect(decrypt(enc)).toEqual(plain);
  });

  it("stores and retrieves a token by session+account (case 1: Gmail OAuth token stored/retrieved)", async () => {
    const account: Account = {
      id: "gmail:user@example.com",
      provider: "gmail",
      email: "user@example.com",
      connectedAt: new Date().toISOString(),
    };
    const sid = "sess1";
    await saveToken(sid, account, {
      accessToken: "at-123",
      refreshToken: "rt-456",
      expiresAt: Date.now() + 3600_000,
    });
    const tok = await loadToken(sid, account.id);
    expect(tok?.accessToken).toBe("at-123");
    expect(tok?.refreshToken).toBe("rt-456");
    const accounts = await listAccounts(sid);
    expect(accounts.map((a) => a.id)).toContain(account.id);
    await removeAccount(sid, account.id);
    expect(await loadToken(sid, account.id)).toBeNull();
  });
});
