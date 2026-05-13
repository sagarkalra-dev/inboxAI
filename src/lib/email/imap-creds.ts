import { kv } from "@/lib/kv";
import { encrypt, decrypt } from "@/lib/auth/tokens";

export interface ImapCredentials {
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

const credsKey = (sessionId: string, accountId: string) => `imap-creds:${sessionId}:${accountId}`;

export async function saveImapCreds(sessionId: string, accountId: string, creds: ImapCredentials): Promise<void> {
  await kv.set(credsKey(sessionId, accountId), encrypt(JSON.stringify(creds)));
}

export async function loadImapCreds(sessionId: string, accountId: string): Promise<ImapCredentials | null> {
  const payload = await kv.get<string>(credsKey(sessionId, accountId));
  if (!payload) return null;
  return JSON.parse(decrypt(payload)) as ImapCredentials;
}

export async function deleteImapCreds(sessionId: string, accountId: string): Promise<void> {
  await kv.del(credsKey(sessionId, accountId));
}

export interface ProviderPreset {
  label: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

export const presets: Record<string, ProviderPreset> = {
  yahoo: {
    label: "Yahoo Mail",
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 465,
  },
  aol: {
    label: "AOL Mail",
    imapHost: "imap.aol.com",
    imapPort: 993,
    smtpHost: "smtp.aol.com",
    smtpPort: 465,
  },
};
