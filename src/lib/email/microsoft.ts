import { Client } from "@microsoft/microsoft-graph-client";
import type {
  Account,
  Contact,
  DraftEmail,
  Email,
  EmailMutation,
  EmailProvider,
  ListOptions,
} from "./types";
import { getAccessToken, type StoredToken } from "@/lib/auth/tokens";

const SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.ReadWrite",
  "Mail.Send",
];

const AUTHORITY = "https://login.microsoftonline.com/common";

function redirectUri(): string {
  const base = process.env.OAUTH_REDIRECT_BASE_URL ?? "http://localhost:3000";
  return `${base}/api/auth/microsoft/callback`;
}

export function microsoftAuthUrl(state: string): string {
  const { MICROSOFT_CLIENT_ID } = process.env;
  if (!MICROSOFT_CLIENT_ID) throw new Error("MICROSOFT_CLIENT_ID required");
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
  });
  return `${AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`;
}

async function tokenExchange(body: Record<string, string>): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const { MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET } = process.env;
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) throw new Error("Microsoft client credentials required");
  const res = await fetch(`${AUTHORITY}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      ...body,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function microsoftExchangeCode(code: string): Promise<{ account: Account; token: StoredToken }> {
  const tokens = await tokenExchange({ grant_type: "authorization_code", code, scope: SCOPES.join(" ") });
  const client = Client.init({ authProvider: (done) => done(null, tokens.access_token) });
  const me = await client.api("/me").get();
  const email = (me.mail ?? me.userPrincipalName) as string;
  const account: Account = {
    id: `microsoft:${email}`,
    provider: "microsoft",
    email,
    displayName: me.displayName ?? undefined,
    connectedAt: new Date().toISOString(),
  };
  return {
    account,
    token: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    },
  };
}

async function graph(sessionId: string, accountId: string): Promise<Client> {
  const access = await getAccessToken(sessionId, accountId, "microsoft", async (refreshToken) => {
    const tokens = await tokenExchange({ grant_type: "refresh_token", refresh_token: refreshToken, scope: SCOPES.join(" ") });
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  });
  return Client.init({ authProvider: (done) => done(null, access) });
}

type GraphMessage = {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string; contentType?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: { emailAddress?: { name?: string; address?: string } }[];
  ccRecipients?: { emailAddress?: { name?: string; address?: string } }[];
  receivedDateTime?: string;
  isRead?: boolean;
  flag?: { flagStatus?: string };
  hasAttachments?: boolean;
  categories?: string[];
};

function contact(r?: { emailAddress?: { name?: string; address?: string } }): Contact {
  return { name: r?.emailAddress?.name, email: r?.emailAddress?.address ?? "" };
}

function normalize(accountId: string, m: GraphMessage): Email {
  const isHtml = m.body?.contentType === "html";
  return {
    id: m.id,
    provider: "microsoft",
    accountId,
    threadId: m.conversationId,
    from: contact(m.from),
    to: (m.toRecipients ?? []).map(contact),
    cc: (m.ccRecipients ?? []).map(contact),
    subject: m.subject ?? "",
    snippet: m.bodyPreview ?? "",
    body: isHtml ? { html: m.body?.content } : { text: m.body?.content },
    date: m.receivedDateTime ?? new Date().toISOString(),
    labels: m.categories ?? [],
    isRead: !!m.isRead,
    isStarred: m.flag?.flagStatus === "flagged",
    hasAttachments: !!m.hasAttachments,
  };
}

export function microsoftProvider(sessionId: string): EmailProvider {
  return {
    id: "microsoft",
    async connect() {
      throw new Error("Use microsoftAuthUrl + microsoftExchangeCode for connect flow");
    },
    async listEmails({ accountId, limit = 25 }: ListOptions) {
      const g = await graph(sessionId, accountId);
      const res = await g
        .api("/me/mailFolders/inbox/messages")
        .top(limit)
        .select("id,conversationId,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,isRead,flag,hasAttachments,categories")
        .orderby("receivedDateTime desc")
        .get();
      return (res.value as GraphMessage[]).map((m) => normalize(accountId, m));
    },
    async getEmail(accountId, id) {
      const g = await graph(sessionId, accountId);
      const m: GraphMessage = await g.api(`/me/messages/${id}`).get();
      return normalize(accountId, m);
    },
    async sendEmail(draft) {
      const g = await graph(sessionId, draft.accountId);
      if (draft.inReplyTo) {
        await g.api(`/me/messages/${draft.inReplyTo}/reply`).post({
          message: {
            toRecipients: draft.to.map((c) => ({ emailAddress: { address: c.email, name: c.name } })),
          },
          comment: draft.body,
        });
        return;
      }
      await g.api("/me/sendMail").post({
        message: {
          subject: draft.subject,
          body: { contentType: "Text", content: draft.body },
          toRecipients: draft.to.map((c) => ({ emailAddress: { address: c.email, name: c.name } })),
          ccRecipients: draft.cc?.map((c) => ({ emailAddress: { address: c.email, name: c.name } })) ?? [],
          bccRecipients: draft.bcc?.map((c) => ({ emailAddress: { address: c.email, name: c.name } })) ?? [],
        },
        saveToSentItems: true,
      });
    },
    async searchEmails(accountId, query) {
      const g = await graph(sessionId, accountId);
      const res = await g
        .api("/me/messages")
        .search(`"${query.replace(/"/g, '\\"')}"`)
        .top(25)
        .get();
      return (res.value as GraphMessage[]).map((m) => normalize(accountId, m));
    },
    async mutateEmail(accountId, id, mutation: EmailMutation) {
      const g = await graph(sessionId, accountId);
      switch (mutation.type) {
        case "archive":
          await g.api(`/me/messages/${id}/move`).post({ destinationId: "archive" });
          return;
        case "delete":
          await g.api(`/me/messages/${id}`).delete();
          return;
        case "markRead":
          await g.api(`/me/messages/${id}`).patch({ isRead: mutation.value });
          return;
        case "star":
          await g.api(`/me/messages/${id}`).patch({ flag: { flagStatus: mutation.value ? "flagged" : "notFlagged" } });
          return;
        case "addLabel":
        case "removeLabel": {
          const existing = (await g.api(`/me/messages/${id}`).select("categories").get()) as { categories?: string[] };
          const cats = new Set(existing.categories ?? []);
          if (mutation.type === "addLabel") cats.add(mutation.label);
          else cats.delete(mutation.label);
          await g.api(`/me/messages/${id}`).patch({ categories: [...cats] });
          return;
        }
      }
    },
  };
}
