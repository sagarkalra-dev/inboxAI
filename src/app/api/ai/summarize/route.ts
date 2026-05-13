import { NextResponse } from "next/server";
import { getExistingSessionId } from "@/lib/auth/session";
import { getEmail } from "@/lib/email/unified";
import { summarizeOne } from "@/lib/ai/summarize";
import { enrichBatch } from "@/lib/ai/prioritize";
import type { Email } from "@/lib/email/types";

export async function POST(req: Request) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json()) as { emails?: Email[]; accountId?: string; messageId?: string };

  if (body.emails) {
    const enriched = await enrichBatch(body.emails);
    return NextResponse.json({ emails: enriched });
  }
  if (body.accountId && body.messageId) {
    const email = await getEmail(sid, body.accountId, body.messageId);
    const ai = await summarizeOne(email);
    return NextResponse.json({ email: { ...email, ai: { ...email.ai, ...ai } } });
  }
  return NextResponse.json({ error: "provide emails[] or accountId+messageId" }, { status: 400 });
}
