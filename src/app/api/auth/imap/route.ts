import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { getSessionId } from "@/lib/auth/session";
import { saveImapCreds, presets, type ImapCredentials } from "@/lib/email/imap-creds";
import { saveToken } from "@/lib/auth/tokens";
import type { Account } from "@/lib/email/types";

interface Body {
  email: string;
  password: string;
  preset?: keyof typeof presets;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }
  const preset = body.preset ? presets[body.preset] : undefined;
  const creds: ImapCredentials = {
    email: body.email,
    password: body.password,
    imapHost: body.imapHost ?? preset?.imapHost ?? "",
    imapPort: body.imapPort ?? preset?.imapPort ?? 993,
    smtpHost: body.smtpHost ?? preset?.smtpHost ?? "",
    smtpPort: body.smtpPort ?? preset?.smtpPort ?? 465,
  };
  if (!creds.imapHost || !creds.smtpHost) {
    return NextResponse.json({ error: "imapHost and smtpHost required (or use a preset)" }, { status: 400 });
  }

  // Verify credentials work before saving.
  try {
    const test = new ImapFlow({
      host: creds.imapHost,
      port: creds.imapPort,
      secure: creds.imapPort === 993,
      auth: { user: creds.email, pass: creds.password },
      logger: false,
    });
    await test.connect();
    await test.logout();
  } catch (e) {
    return NextResponse.json(
      { error: `IMAP login failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 401 },
    );
  }

  const sid = await getSessionId();
  const account: Account = {
    id: `imap:${creds.email}`,
    provider: "imap",
    email: creds.email,
    displayName: body.preset ? presets[body.preset]?.label : creds.email,
    connectedAt: new Date().toISOString(),
  };
  await saveImapCreds(sid, account.id, creds);
  // Register the account in the same accounts list other providers use.
  await saveToken(sid, account, { accessToken: "imap", expiresAt: Date.now() + 365 * 24 * 3600_000 });
  return NextResponse.json({ ok: true, account });
}
