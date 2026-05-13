import { anthropicClient, MODEL } from "./client";
import { kv } from "@/lib/kv";
import type { AIEnrichment, Email } from "@/lib/email/types";

const BATCH_SIZE = 10;
const CACHE_TTL_S = 60 * 60;

const cacheKey = (emailId: string) => `ai:${emailId}`;

interface BatchInput {
  id: string;
  from: string;
  subject: string;
  snippet: string;
}

interface BatchOutput {
  id: string;
  summary: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
}

const PROMPT = `You are an email triage assistant. For each email in the input JSON array, produce:
- summary: 1-2 sentence factual summary
- priority: one of "critical", "high", "medium", "low"
- category: one of "work", "personal", "updates", "promotions", "social", "other"

Return ONLY a JSON array of objects with keys { id, summary, priority, category }. No prose, no markdown.`;

export async function enrichBatch(emails: Email[]): Promise<Email[]> {
  if (emails.length === 0) return emails;

  // Cache lookups
  const cached = await Promise.all(emails.map((e) => kv.get<AIEnrichment>(cacheKey(e.id))));
  const result = emails.map((e, i) => (cached[i] ? { ...e, ai: { ...e.ai, ...cached[i]! } } : e));
  const toEnrich = result.filter((e) => !e.ai?.summary);
  if (toEnrich.length === 0) return result;

  const batches: Email[][] = [];
  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) batches.push(toEnrich.slice(i, i + BATCH_SIZE));

  const enrichments = new Map<string, AIEnrichment>();
  await Promise.all(
    batches.map(async (batch) => {
      const input: BatchInput[] = batch.map((e) => ({
        id: e.id,
        from: e.from.name ? `${e.from.name} <${e.from.email}>` : e.from.email,
        subject: e.subject,
        snippet: e.snippet.slice(0, 500),
      }));
      const res = await anthropicClient().messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: PROMPT,
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });
      const text = res.content
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("")
        .trim();
      const json = extractJson(text);
      const parsed = JSON.parse(json) as BatchOutput[];
      await Promise.all(
        parsed.map(async (p) => {
          const enrichment: AIEnrichment = {
            summary: p.summary,
            priority: p.priority,
            category: p.category,
          };
          enrichments.set(p.id, enrichment);
          await kv.set(cacheKey(p.id), enrichment, { ex: CACHE_TTL_S });
        }),
      );
    }),
  );

  return result.map((e) => (enrichments.has(e.id) ? { ...e, ai: { ...e.ai, ...enrichments.get(e.id)! } } : e));
}

function extractJson(text: string): string {
  // Strip ``` fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text;
}
