import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

const COOKIE = "inbox_sid";

export async function getSessionId(): Promise<string> {
  const c = await cookies();
  const existing = c.get(COOKIE)?.value;
  if (existing) return existing;
  const sid = randomBytes(24).toString("base64url");
  c.set(COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return sid;
}

export async function getExistingSessionId(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}
