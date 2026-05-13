import { NextResponse } from "next/server";
import { getExistingSessionId } from "@/lib/auth/session";
import { getEmail } from "@/lib/email/unified";
import { draftReply } from "@/lib/ai/draft";

export async function POST(req: Request) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { accountId, messageId, instruction } = (await req.json()) as {
    accountId: string;
    messageId: string;
    instruction?: string;
  };
  const email = await getEmail(sid, accountId, messageId);
  const draft = await draftReply(email, instruction);
  return NextResponse.json({ draft });
}
