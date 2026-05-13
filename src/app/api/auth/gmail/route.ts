import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { gmailAuthUrl } from "@/lib/email/gmail";
import { getSessionId } from "@/lib/auth/session";

export async function GET() {
  await getSessionId();
  const state = randomBytes(16).toString("hex");
  return NextResponse.redirect(gmailAuthUrl(state));
}
