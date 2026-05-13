import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { kv } from "@/lib/kv";
import type { Account, ProviderId } from "@/lib/email/types";

const ALG = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY env var is required");
  // Accept either a 32-byte hex string or any string; hash to 32 bytes.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256").update(raw).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(".");
  const decipher = createDecipheriv(ALG, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

const tokenKey = (sessionId: string, accountId: string) => `token:${sessionId}:${accountId}`;
const accountsKey = (sessionId: string) => `accounts:${sessionId}`;

export async function saveToken(sessionId: string, account: Account, token: StoredToken): Promise<void> {
  const payload = encrypt(JSON.stringify(token));
  await kv.set(tokenKey(sessionId, account.id), payload);
  const list = (await kv.get<Account[]>(accountsKey(sessionId))) ?? [];
  const next = [...list.filter((a) => a.id !== account.id), account];
  await kv.set(accountsKey(sessionId), next);
}

export async function loadToken(sessionId: string, accountId: string): Promise<StoredToken | null> {
  const payload = await kv.get<string>(tokenKey(sessionId, accountId));
  if (!payload) return null;
  return JSON.parse(decrypt(payload)) as StoredToken;
}

export async function listAccounts(sessionId: string): Promise<Account[]> {
  return (await kv.get<Account[]>(accountsKey(sessionId))) ?? [];
}

export async function getAccount(sessionId: string, accountId: string): Promise<Account | null> {
  const list = await listAccounts(sessionId);
  return list.find((a) => a.id === accountId) ?? null;
}

export async function removeAccount(sessionId: string, accountId: string): Promise<void> {
  await kv.del(tokenKey(sessionId, accountId));
  const list = await listAccounts(sessionId);
  await kv.set(accountsKey(sessionId), list.filter((a) => a.id !== accountId));
}

export type Refresher = (refreshToken: string) => Promise<StoredToken>;

/**
 * Returns a valid access token, refreshing if expired. Caller passes a provider-specific refresher.
 */
export async function getAccessToken(
  sessionId: string,
  accountId: string,
  provider: ProviderId,
  refresh: Refresher,
): Promise<string> {
  const tok = await loadToken(sessionId, accountId);
  if (!tok) throw new Error(`No token for account ${accountId} (${provider})`);
  // 60s safety window
  if (tok.expiresAt - Date.now() > 60_000) return tok.accessToken;
  if (!tok.refreshToken) throw new Error(`Token expired and no refresh token for ${accountId}`);
  const next = await refresh(tok.refreshToken);
  await kv.set(tokenKey(sessionId, accountId), encrypt(JSON.stringify({
    ...next,
    refreshToken: next.refreshToken ?? tok.refreshToken,
  })));
  return next.accessToken;
}
