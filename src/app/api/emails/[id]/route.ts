import { NextResponse } from "next/server";
import { getExistingSessionId } from "@/lib/auth/session";
import { getEmail, mutateEmail } from "@/lib/email/unified";
import type { EmailMutation } from "@/lib/email/types";

function parseId(combined: string): { accountId: string; messageId: string } {
  // expected shape "<provider>:<email>|<messageId>"
  const idx = combined.lastIndexOf("|");
  if (idx === -1) throw new Error("Invalid id; expected accountId|messageId");
  return { accountId: combined.slice(0, idx), messageId: combined.slice(idx + 1) };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { accountId, messageId } = parseId(decodeURIComponent(id));
  const email = await getEmail(sid, accountId, messageId);
  return NextResponse.json({ email });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { accountId, messageId } = parseId(decodeURIComponent(id));
  const mutation = (await req.json()) as EmailMutation;
  await mutateEmail(sid, accountId, messageId, mutation);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sid = await getExistingSessionId();
  if (!sid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { accountId, messageId } = parseId(decodeURIComponent(id));
  await mutateEmail(sid, accountId, messageId, { type: "delete" });
  return NextResponse.json({ ok: true });
}
