import { NextResponse } from "next/server";
import { getExistingSessionId } from "@/lib/auth/session";
import { listAccounts, removeAccount } from "@/lib/auth/tokens";
import { deleteImapCreds } from "@/lib/email/imap-creds";

export async function GET() {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ accounts: [] });
  return NextResponse.json({ accounts: await listAccounts(sid) });
}

export async function DELETE(req: Request) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ ok: true });
  const { accountId } = (await req.json()) as { accountId: string };
  if (accountId.startsWith("imap:")) await deleteImapCreds(sid, accountId);
  await removeAccount(sid, accountId);
  return NextResponse.json({ ok: true });
}
