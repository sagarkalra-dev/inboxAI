import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import type {
  Contact,
  DraftEmail,
  Email,
  EmailMutation,
  EmailProvider,
  ListOptions,
} from "./types";
import { loadImapCreds, type ImapCredentials } from "./imap-creds";

async function withClient<T>(creds: ImapCredentials, fn: (c: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: creds.imapHost,
    port: creds.imapPort,
    secure: creds.imapPort === 993,
    auth: { user: creds.email, pass: creds.password },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
}

function contact(addr: { name?: string; address?: string } | undefined): Contact {
  return { name: addr?.name || undefined, email: addr?.address ?? "" };
}

function normalize(accountId: string, uid: number, parsed: Awaited<ReturnType<typeof simpleParser>>, flags: Set<string>): Email {
  const from = Array.isArray(parsed.from?.value) ? parsed.from?.value[0] : undefined;
  const toAddrs = (Array.isArray(parsed.to) ? parsed.to.flatMap((a) => a.value) : parsed.to?.value) ?? [];
  const ccAddrs = (Array.isArray(parsed.cc) ? parsed.cc.flatMap((a) => a.value) : parsed.cc?.value) ?? [];
  const text = typeof parsed.text === "string" ? parsed.text : undefined;
  const html = typeof parsed.html === "string" ? parsed.html : undefined;
  const snippet = (text ?? (html ? html.replace(/<[^>]+>/g, " ") : "")).slice(0, 200).trim();
  return {
    id: String(uid),
    provider: "imap",
    accountId,
    threadId: parsed.messageId,
    from: contact(from),
    to: toAddrs.map(contact),
    cc: ccAddrs.map(contact),
    subject: parsed.subject ?? "",
    snippet,
    body: { text, html },
    date: (parsed.date ?? new Date()).toISOString(),
    labels: [...flags],
    isRead: flags.has("\\Seen"),
    isStarred: flags.has("\\Flagged"),
    hasAttachments: (parsed.attachments?.length ?? 0) > 0,
  };
}

export function imapProvider(sessionId: string): EmailProvider {
  async function getCreds(accountId: string): Promise<ImapCredentials> {
    const creds = await loadImapCreds(sessionId, accountId);
    if (!creds) throw new Error(`No IMAP credentials for ${accountId}`);
    return creds;
  }

  async function fetchUids(accountId: string, uids: number[]): Promise<Email[]> {
    if (uids.length === 0) return [];
    const creds = await getCreds(accountId);
    return withClient(creds, async (client) => {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const out: Email[] = [];
        for await (const msg of client.fetch(uids, { source: true, flags: true, uid: true })) {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          out.push(normalize(accountId, msg.uid!, parsed, new Set(msg.flags ?? [])));
        }
        return out;
      } finally {
        lock.release();
      }
    });
  }

  return {
    id: "imap",
    async connect() {
      throw new Error("Use POST /api/auth/imap to register IMAP credentials.");
    },
    async listEmails({ accountId, limit = 25 }: ListOptions) {
      const creds = await getCreds(accountId);
      const uids = await withClient(creds, async (client) => {
        const lock = await client.getMailboxLock("INBOX");
        try {
          const status = await client.status("INBOX", { messages: true });
          const total = status.messages ?? 0;
          if (total === 0) return [];
          const start = Math.max(1, total - limit + 1);
          const range = `${start}:${total}`;
          const result: number[] = [];
          for await (const msg of client.fetch(range, { uid: true })) {
            result.push(msg.uid!);
          }
          return result.sort((a, b) => b - a);
        } finally {
          lock.release();
        }
      });
      return fetchUids(accountId, uids);
    },
    async getEmail(accountId, id) {
      const [email] = await fetchUids(accountId, [Number(id)]);
      if (!email) throw new Error(`Message ${id} not found`);
      return email;
    },
    async sendEmail(draft: DraftEmail) {
      const creds = await getCreds(draft.accountId);
      const transport = nodemailer.createTransport({
        host: creds.smtpHost,
        port: creds.smtpPort,
        secure: creds.smtpPort === 465,
        auth: { user: creds.email, pass: creds.password },
      });
      await transport.sendMail({
        from: creds.email,
        to: draft.to.map((c) => (c.name ? `"${c.name}" <${c.email}>` : c.email)).join(", "),
        cc: draft.cc?.map((c) => c.email).join(", "),
        bcc: draft.bcc?.map((c) => c.email).join(", "),
        subject: draft.subject,
        text: draft.body,
        inReplyTo: draft.inReplyTo,
        references: draft.inReplyTo ? [draft.inReplyTo] : undefined,
      });
    },
    async searchEmails(accountId, query) {
      const creds = await getCreds(accountId);
      const uids = await withClient(creds, async (client) => {
        const lock = await client.getMailboxLock("INBOX");
        try {
          const result = await client.search({ or: [{ subject: query }, { body: query }, { from: query }] }, { uid: true });
          const uids = Array.isArray(result) ? result : [];
          return uids.slice(-25).reverse();
        } finally {
          lock.release();
        }
      });
      return fetchUids(accountId, uids);
    },
    async mutateEmail(accountId, id, mutation: EmailMutation) {
      const creds = await getCreds(accountId);
      const uid = Number(id);
      await withClient(creds, async (client) => {
        const lock = await client.getMailboxLock("INBOX");
        try {
          switch (mutation.type) {
            case "archive":
              await client.messageMove(uid, "Archive", { uid: true });
              return;
            case "delete":
              await client.messageDelete(uid, { uid: true });
              return;
            case "markRead":
              if (mutation.value) await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
              else await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
              return;
            case "star":
              if (mutation.value) await client.messageFlagsAdd(uid, ["\\Flagged"], { uid: true });
              else await client.messageFlagsRemove(uid, ["\\Flagged"], { uid: true });
              return;
            case "addLabel":
              await client.messageFlagsAdd(uid, [mutation.label], { uid: true });
              return;
            case "removeLabel":
              await client.messageFlagsRemove(uid, [mutation.label], { uid: true });
              return;
          }
        } finally {
          lock.release();
        }
      });
    },
  };
}
