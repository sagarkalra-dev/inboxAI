import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { microsoftAuthUrl } from "@/lib/email/microsoft";
import { getSessionId } from "@/lib/auth/session";

export async function GET() {
  await getSessionId();
  const state = randomBytes(16).toString("hex");
  return NextResponse.redirect(microsoftAuthUrl(state));
}
