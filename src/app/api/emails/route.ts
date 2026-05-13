import { NextResponse } from "next/server";
import { getExistingSessionId } from "@/lib/auth/session";
import { listAllEmails, sendEmail } from "@/lib/email/unified";
import { enrichBatch } from "@/lib/ai/prioritize";
import type { DraftEmail } from "@/lib/email/types";

export async function GET(req: Request) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ emails: [] });
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "25");
  const emails = await listAllEmails(sid, limit);
  // post-fetch hook: enrich uncached emails
  try {
    const enriched = await enrichBatch(emails);
    return NextResponse.json({ emails: enriched });
  } catch {
    return NextResponse.json({ emails, aiUnavailable: true });
  }
}

export async function POST(req: Request) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const draft = (await req.json()) as DraftEmail;
  if (!draft.accountId || !draft.to?.length || !draft.subject) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  await sendEmail(sid, draft);
  return NextResponse.json({ ok: true });
}
