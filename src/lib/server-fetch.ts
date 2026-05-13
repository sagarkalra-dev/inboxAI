import { getExistingSessionId } from "@/lib/auth/session";
import { listAllEmails, getEmail as getEmailUnified } from "@/lib/email/unified";
import { listAccounts } from "@/lib/auth/tokens";
import { enrichBatch } from "@/lib/ai/prioritize";
import type { Account, Email } from "@/lib/email/types";

export async function fetchAccounts(): Promise<Account[]> {
  const sid = await getExistingSessionId();
  if (!sid) return [];
  return listAccounts(sid);
}

export interface InboxData {
  emails: Email[];
  accounts: Account[];
  aiUnavailable: boolean;
  providerError?: string;
}

export async function fetchInbox(opts?: { enrich?: boolean }): Promise<InboxData> {
  const sid = await getExistingSessionId();
  if (!sid) return { emails: [], accounts: [], aiUnavailable: false };
  const accounts = await listAccounts(sid);
  if (accounts.length === 0) return { emails: [], accounts, aiUnavailable: false };

  let emails: Email[] = [];
  let providerError: string | undefined;
  try {
    emails = await listAllEmails(sid);
  } catch (e) {
    providerError = e instanceof Error ? e.message : "Provider error";
  }

  if (!opts?.enrich) return { emails, accounts, aiUnavailable: false, providerError };

  try {
    const enriched = await enrichBatch(emails);
    return { emails: enriched, accounts, aiUnavailable: false, providerError };
  } catch {
    return { emails, accounts, aiUnavailable: true, providerError };
  }
}

export async function fetchEmail(accountId: string, messageId: string): Promise<Email | null> {
  const sid = await getExistingSessionId();
  if (!sid) return null;
  return getEmailUnified(sid, accountId, messageId);
}
