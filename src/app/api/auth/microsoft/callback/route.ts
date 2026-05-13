import { NextResponse } from "next/server";
import { microsoftExchangeCode } from "@/lib/email/microsoft";
import { getSessionId } from "@/lib/auth/session";
import { saveToken } from "@/lib/auth/tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error ?? "missing_code")}`, req.url));
  }
  const { account, token } = await microsoftExchangeCode(code);
  const sessionId = await getSessionId();
  await saveToken(sessionId, account, token);
  return NextResponse.redirect(new URL("/", req.url));
}
