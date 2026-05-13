import { anthropicClient, MODEL } from "./client";
import type { Email } from "@/lib/email/types";

export async function draftReply(email: Email, instruction?: string): Promise<string> {
  const body = (email.body.text ?? email.body.html ?? email.snippet).slice(0, 8000);
  const userPrompt = [
    `Write a concise, professional reply to this email.`,
    instruction ? `Additional guidance: ${instruction}` : "",
    `\n---\nFrom: ${email.from.name ?? ""} <${email.from.email}>`,
    `Subject: ${email.subject}`,
    `Date: ${email.date}`,
    `\n${body}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await anthropicClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: "You are an assistant that writes email replies in the user's voice. Respond with only the reply body — no subject line, no quoted original, no signature placeholder.",
    messages: [{ role: "user", content: userPrompt }],
  });
  return res.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();
}
