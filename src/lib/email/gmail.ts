import { google, type gmail_v1 } from "googleapis";
import type {
  Account,
  Contact,
  DraftEmail,
  Email,
  EmailMutation,
  EmailProvider,
  ListOptions,
} from "./types";
import { getAccessToken, saveToken, type StoredToken } from "@/lib/auth/tokens";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
];

function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required");
  }
  const base = process.env.OAUTH_REDIRECT_BASE_URL ?? "http://localhost:3000";
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${base}/api/auth/gmail/callback`);
}

export function gmailAuthUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function gmailExchangeCode(code: string): Promise<{ account: Account; token: StoredToken }> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("Gmail: no access token in response");
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();
  const email = me.data.email!;
  const account: Account = {
    id: `gmail:${email}`,
    provider: "gmail",
    email,
    displayName: me.data.name ?? undefined,
    connectedAt: new Date().toISOString(),
  };
  const token: StoredToken = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    expiresAt: tokens.expiry_date ?? Date.now() + 3600_000,
  };
  return { account, token };
}

async function gmailClient(sessionId: string, accountId: string): Promise<gmail_v1.Gmail> {
  const access = await getAccessToken(sessionId, accountId, "gmail", async (refreshToken) => {
    const client = oauthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token ?? refreshToken,
      expiresAt: credentials.expiry_date ?? Date.now() + 3600_000,
    };
  });
  const client = new google.auth.OAuth2();
  client.setCredentials({ access_token: access });
  return google.gmail({ version: "v1", auth: client });
}

function parseAddress(raw: string | undefined | null): Contact {
  if (!raw) return { email: "" };
  const m = raw.match(/^\s*(?:"?([^"<]+?)"?\s)?<?([^>]+?)>?\s*$/);
  if (!m) return { email: raw.trim() };
  return { name: m[1]?.trim() || undefined, email: m[2].trim() };
}

function parseAddressList(raw: string | undefined | null): Contact[] {
  if (!raw) return [];
  return raw.split(/,(?![^<]*>)/).map(parseAddress).filter((c) => c.email);
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): { text?: string; html?: string } {
  if (!payload) return {};
  const out: { text?: string; html?: string } = {};
  const walk = (p: gmail_v1.Schema$MessagePart) => {
    if (p.body?.data) {
      const decoded = decodeBase64Url(p.body.data);
      if (p.mimeType === "text/plain" && !out.text) out.text = decoded;
      else if (p.mimeType === "text/html" && !out.html) out.html = decoded;
    }
    p.parts?.forEach(walk);
  };
  walk(payload);
  return out;
}

function normalizeMessage(accountId: string, msg: gmail_v1.Schema$Message): Email {
  const headers = msg.payload?.headers ?? [];
  const h = (name: string) => headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
  const labels = msg.labelIds ?? [];
  const hasAttachments = !!msg.payload?.parts?.some((p) => p.filename && p.filename.length > 0);
  const body = extractBody(msg.payload ?? undefined);
  return {
    id: msg.id!,
    provider: "gmail",
    accountId,
    threadId: msg.threadId ?? undefined,
    from: parseAddress(h("From")),
    to: parseAddressList(h("To")),
    cc: parseAddressList(h("Cc")),
    subject: h("Subject"),
    snippet: msg.snippet ?? "",
    body,
    date: new Date(parseInt(msg.internalDate ?? "0", 10) || Date.parse(h("Date"))).toISOString(),
    labels,
    isRead: !labels.includes("UNREAD"),
    isStarred: labels.includes("STARRED"),
    hasAttachments,
  };
}

function buildRaw(draft: DraftEmail, fromEmail: string): string {
  const headers: string[] = [
    `From: ${fromEmail}`,
    `To: ${draft.to.map((c) => (c.name ? `"${c.name}" <${c.email}>` : c.email)).join(", ")}`,
  ];
  if (draft.cc?.length) headers.push(`Cc: ${draft.cc.map((c) => c.email).join(", ")}`);
  if (draft.bcc?.length) headers.push(`Bcc: ${draft.bcc.map((c) => c.email).join(", ")}`);
  headers.push(`Subject: ${draft.subject}`);
  if (draft.inReplyTo) {
    headers.push(`In-Reply-To: ${draft.inReplyTo}`);
    headers.push(`References: ${draft.inReplyTo}`);
  }
  headers.push("MIME-Version: 1.0");
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  const raw = `${headers.join("\r\n")}\r\n\r\n${draft.body}`;
  return Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function gmailProvider(sessionId: string): EmailProvider {
  return {
    id: "gmail",
    async connect() {
      throw new Error("Use gmailAuthUrl + gmailExchangeCode for connect flow");
    },
    async listEmails({ accountId, limit = 25, labelIds }: ListOptions) {
      const g = await gmailClient(sessionId, accountId);
      const list = await g.users.messages.list({
        userId: "me",
        maxResults: limit,
        labelIds: labelIds ?? ["INBOX"],
      });
      const ids = list.data.messages ?? [];
      const messages = await Promise.all(
        ids.map((m) => g.users.messages.get({ userId: "me", id: m.id!, format: "metadata", metadataHeaders: ["From", "To", "Cc", "Subject", "Date"] })),
      );
      return messages.map((r) => normalizeMessage(accountId, r.data));
    },
    async getEmail(accountId, id) {
      const g = await gmailClient(sessionId, accountId);
      const res = await g.users.messages.get({ userId: "me", id, format: "full" });
      return normalizeMessage(accountId, res.data);
    },
    async sendEmail(draft) {
      const g = await gmailClient(sessionId, draft.accountId);
      const fromEmail = draft.accountId.replace(/^gmail:/, "");
      const raw = buildRaw(draft, fromEmail);
      await g.users.messages.send({ userId: "me", requestBody: { raw, threadId: draft.threadId } });
    },
    async searchEmails(accountId, query) {
      const g = await gmailClient(sessionId, accountId);
      const list = await g.users.messages.list({ userId: "me", q: query, maxResults: 25 });
      const ids = list.data.messages ?? [];
      const messages = await Promise.all(
        ids.map((m) => g.users.messages.get({ userId: "me", id: m.id!, format: "metadata", metadataHeaders: ["From", "To", "Cc", "Subject", "Date"] })),
      );
      return messages.map((r) => normalizeMessage(accountId, r.data));
    },
    async mutateEmail(accountId, id, mutation) {
      const g = await gmailClient(sessionId, accountId);
      switch (mutation.type) {
        case "archive":
          await g.users.messages.modify({ userId: "me", id, requestBody: { removeLabelIds: ["INBOX"] } });
          return;
        case "delete":
          await g.users.messages.trash({ userId: "me", id });
          return;
        case "markRead":
          await g.users.messages.modify({
            userId: "me",
            id,
            requestBody: mutation.value ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] },
          });
          return;
        case "star":
          await g.users.messages.modify({
            userId: "me",
            id,
            requestBody: mutation.value ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] },
          });
          return;
        case "addLabel":
          await g.users.messages.modify({ userId: "me", id, requestBody: { addLabelIds: [mutation.label] } });
          return;
        case "removeLabel":
          await g.users.messages.modify({ userId: "me", id, requestBody: { removeLabelIds: [mutation.label] } });
          return;
      }
    },
  };
}

export { saveToken as gmailSaveToken };

// Exposed for tests
export const _internal = { normalizeMessage, buildRaw, parseAddress, parseAddressList };
