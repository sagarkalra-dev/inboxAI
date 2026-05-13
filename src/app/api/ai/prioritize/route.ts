import { NextResponse } from "next/server";
import { getExistingSessionId } from "@/lib/auth/session";
import { listAllEmails } from "@/lib/email/unified";
import { enrichBatch } from "@/lib/ai/prioritize";

export async function GET() {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ emails: [] });
  const emails = await listAllEmails(sid);
  const enriched = await enrichBatch(emails);
  return NextResponse.json({ emails: enriched });
}
