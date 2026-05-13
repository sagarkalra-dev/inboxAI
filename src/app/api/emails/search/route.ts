import { NextResponse } from "next/server";
import { getExistingSessionId } from "@/lib/auth/session";
import { searchAllEmails } from "@/lib/email/unified";

export async function GET(req: Request) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ emails: [] });
  const q = new URL(req.url).searchParams.get("q");
  if (!q) return NextResponse.json({ emails: [] });
  return NextResponse.json({ emails: await searchAllEmails(sid, q) });
}
