import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { AISummary } from "@/components/email-detail/AISummary";
import { DraftReplyPanel } from "@/components/email-detail/DraftReplyPanel";
import { fetchEmail } from "@/lib/server-fetch";
import { summarizeOne } from "@/lib/ai/summarize";

export const dynamic = "force-dynamic";

export default async function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const sep = decoded.lastIndexOf("|");
  if (sep === -1) {
    return (
      <Shell>
        <div className="p-6 text-slate-700">Invalid email id.</div>
      </Shell>
    );
  }
  const accountId = decoded.slice(0, sep);
  const messageId = decoded.slice(sep + 1);

  const email = await fetchEmail(accountId, messageId);
  if (!email) {
    return (
      <Shell>
        <div className="p-6 text-slate-700">Email not found.</div>
      </Shell>
    );
  }

  let aiUnavailable = false;
  try {
    const ai = await summarizeOne(email);
    email.ai = { ...email.ai, ...ai };
  } catch {
    aiUnavailable = true;
  }

  const bodyText =
    email.body.text ?? (email.body.html ? stripHtml(email.body.html) : email.snippet);

  return (
    <Shell>
      <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
          ← Back
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/compose?${new URLSearchParams({
              accountId,
              subject: email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`,
              body: `\n\n---------- Forwarded message ----------\nFrom: ${email.from.name ?? ""} <${email.from.email}>\nDate: ${email.date}\nSubject: ${email.subject}\n\n${bodyText}`,
            }).toString()}`}
            className="text-xs px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
          >
            Forward
          </Link>
          <span className="text-xs text-slate-500">{email.provider}</span>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 max-w-3xl space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-slate-900">{email.subject || "(no subject)"}</h1>
          <div className="text-xs text-slate-500 mt-1">
            From <span className="text-slate-700">{email.from.name || email.from.email}</span>{" "}
            &lt;{email.from.email}&gt; ·{" "}
            {new Date(email.date).toLocaleString()}
          </div>
        </header>

        {aiUnavailable ? (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
            AI summary unavailable.
          </div>
        ) : (
          <AISummary email={email} />
        )}

        <article className="bg-white border border-slate-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-slate-800">
          {bodyText}
        </article>

        <DraftReplyPanel
          accountId={accountId}
          messageId={messageId}
          toEmail={email.from.email}
          subject={email.subject}
        />
      </div>
    </Shell>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+\n/g, "\n").trim();
}
