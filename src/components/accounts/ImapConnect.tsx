"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESETS = [
  { id: "yahoo", label: "Yahoo Mail" },
  { id: "aol", label: "AOL Mail" },
  { id: "custom", label: "Custom IMAP" },
] as const;

type Preset = (typeof PRESETS)[number]["id"];

export function ImapConnect() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("yahoo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { email, password };
      if (preset === "custom") {
        payload.imapHost = imapHost;
        payload.smtpHost = smtpHost;
      } else {
        payload.preset = preset;
      }
      const res = await fetch("/api/auth/imap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Connection failed");
        return;
      }
      setOpen(false);
      setEmail("");
      setPassword("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 bg-white text-slate-900 py-3 px-4 text-center text-sm font-medium hover:bg-slate-50"
      >
        Connect IMAP (Yahoo / AOL / custom)
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-slate-300 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Connect IMAP account</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Use an app password — Yahoo and AOL require app passwords generated in their account security settings.
      </p>
      <div>
        <label htmlFor="imap-preset" className="block text-xs font-medium text-slate-600 mb-1">
          Provider
        </label>
        <select
          id="imap-preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="imap-email" className="block text-xs font-medium text-slate-600 mb-1">
          Email
        </label>
        <input
          id="imap-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="imap-password" className="block text-xs font-medium text-slate-600 mb-1">
          App password
        </label>
        <input
          id="imap-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {preset === "custom" && (
        <>
          <div>
            <label htmlFor="imap-host" className="block text-xs font-medium text-slate-600 mb-1">
              IMAP host
            </label>
            <input
              id="imap-host"
              type="text"
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              placeholder="imap.example.com"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="smtp-host" className="block text-xs font-medium text-slate-600 mb-1">
              SMTP host
            </label>
            <input
              id="smtp-host"
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.example.com"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </>
      )}
      {error && <div className="text-xs text-red-700">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Verifying…" : "Connect"}
      </button>
    </form>
  );
}
