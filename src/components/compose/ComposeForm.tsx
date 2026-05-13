"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Account } from "@/lib/email/types";

export interface ComposeInitial {
  accountId?: string;
  to?: string;
  subject?: string;
  body?: string;
}

export function ComposeForm({ accounts, initial }: { accounts: Account[]; initial?: ComposeInitial }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !to.trim() || !subject.trim()) {
      setError("From, To, and Subject are required.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          to: to.split(",").map((s) => ({ email: s.trim() })).filter((c) => c.email),
          subject,
          body,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Send failed");
        return;
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-2xl">
      <div>
        <label htmlFor="from" className="block text-xs font-medium text-slate-600 mb-1">From</label>
        <select
          id="from"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email} ({a.provider})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="to" className="block text-xs font-medium text-slate-600 mb-1">To</label>
        <input
          id="to"
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recipient@example.com"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="subject" className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="body" className="block text-xs font-medium text-slate-600 mb-1">Body</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <div className="text-sm text-red-700">{error}</div>}
      <button
        type="submit"
        disabled={sending}
        className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
