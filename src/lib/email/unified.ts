import type { Account, DraftEmail, Email, EmailMutation, EmailProvider, ProviderId } from "./types";
import { gmailProvider } from "./gmail";
import { microsoftProvider } from "./microsoft";
import { imapProvider } from "./imap";
import { listAccounts } from "@/lib/auth/tokens";

export function providerFor(sessionId: string, id: ProviderId): EmailProvider {
  if (id === "gmail") return gmailProvider(sessionId);
  if (id === "microsoft") return microsoftProvider(sessionId);
  return imapProvider(sessionId);
}

export function providerForAccount(sessionId: string, account: Account): EmailProvider {
  return providerFor(sessionId, account.provider);
}

export async function listAllEmails(sessionId: string, limit = 25): Promise<Email[]> {
  const accounts = await listAccounts(sessionId);
  if (accounts.length === 0) return [];
  const results = await Promise.allSettled(
    accounts.map((a) => providerForAccount(sessionId, a).listEmails({ accountId: a.id, limit })),
  );
  const emails = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return emails.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function searchAllEmails(sessionId: string, query: string): Promise<Email[]> {
  const accounts = await listAccounts(sessionId);
  const results = await Promise.allSettled(
    accounts.map((a) => providerForAccount(sessionId, a).searchEmails(a.id, query)),
  );
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getEmail(sessionId: string, accountId: string, id: string): Promise<Email> {
  const accounts = await listAccounts(sessionId);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`Unknown account ${accountId}`);
  return providerForAccount(sessionId, account).getEmail(accountId, id);
}

export async function sendEmail(sessionId: string, draft: DraftEmail): Promise<void> {
  const accounts = await listAccounts(sessionId);
  const account = accounts.find((a) => a.id === draft.accountId);
  if (!account) throw new Error(`Unknown account ${draft.accountId}`);
  return providerForAccount(sessionId, account).sendEmail(draft);
}

export async function mutateEmail(
  sessionId: string,
  accountId: string,
  id: string,
  mutation: EmailMutation,
): Promise<void> {
  const accounts = await listAccounts(sessionId);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`Unknown account ${accountId}`);
  return providerForAccount(sessionId, account).mutateEmail(accountId, id, mutation);
}
