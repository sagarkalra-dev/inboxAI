import { anthropicClient, MODEL } from "./client";
import { kv } from "@/lib/kv";
import type { AIEnrichment, Email } from "@/lib/email/types";

const CACHE_TTL_S = 60 * 60;
const cacheKey = (emailId: string) => `ai:${emailId}`;

export async function summarizeOne(email: Email): Promise<AIEnrichment> {
  const cached = await kv.get<AIEnrichment>(cacheKey(email.id));
  if (cached?.summary) return cached;
  const body = (email.body.text ?? email.body.html ?? email.snippet).slice(0, 8000);
  const res = await anthropicClient().messages.create({
    model: MODEL,
    max_tokens: 512,
    system: `Summarize the email in 1-2 sentences and classify priority (critical, high, medium, low) and category (work, personal, updates, promotions, social, other). Return ONLY JSON: {"summary": string, "priority": string, "category": string}.`,
    messages: [
      {
        role: "user",
        content: `From: ${email.from.email}\nSubject: ${email.subject}\n\n${body}`,
      },
    ],
  });
  const text = res.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();
  const json = text.replace(/^```(?:json)?|```$/g, "").trim();
  const parsed = JSON.parse(json) as AIEnrichment;
  await kv.set(cacheKey(email.id), parsed, { ex: CACHE_TTL_S });
  return parsed;
}
