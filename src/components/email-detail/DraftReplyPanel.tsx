"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DraftReplyPanel({
  accountId,
  messageId,
  toEmail,
  subject,
  initialDraft,
}: {
  accountId: string;
  messageId: string;
  toEmail: string;
  subject: string;
  initialDraft?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft ?? "");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, messageId }),
      });
      const data = (await res.json()) as { draft?: string; error?: string };
      if (data.draft) setDraft(data.draft);
      else setError(data.error ?? "Draft unavailable");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          to: [{ email: toEmail }],
          subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
          body: draft,
          inReplyTo: messageId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Send failed");
      } else {
        setDraft("");
        router.push("/");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">AI draft reply</h3>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Generating…" : draft ? "Regenerate" : "Generate"}
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        placeholder="Click Generate to draft a reply, or type your own."
        className="w-full text-sm rounded-md border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      {error && <div className="text-xs text-red-700 mt-2">{error}</div>}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={send}
          disabled={sending || !draft.trim()}
          className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send reply"}
        </button>
      </div>
    </div>
  );
}
