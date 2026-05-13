import type { Email, Priority } from "@/lib/email/types";
import { EmailRow } from "@/components/email-list/EmailRow";

const groups: { key: Priority; label: string }[] = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High priority" },
  { key: "medium", label: "Standard" },
  { key: "low", label: "Low priority" },
];

export function SmartInbox({ emails, aiUnavailable }: { emails: Email[]; aiUnavailable?: boolean }) {
  if (emails.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-slate-600">
        <div className="text-4xl mb-2">🎉</div>
        <p>You&apos;re all caught up.</p>
      </div>
    );
  }

  const grouped = new Map<Priority | "unrated", Email[]>();
  for (const e of emails) {
    const p = (e.ai?.priority ?? "unrated") as Priority | "unrated";
    if (!grouped.has(p)) grouped.set(p, []);
    grouped.get(p)!.push(e);
  }

  return (
    <div>
      {aiUnavailable && (
        <div className="px-4 py-2 text-xs bg-amber-50 text-amber-800 border-b border-amber-200">
          AI features temporarily unavailable.
        </div>
      )}
      {groups.map((g) => {
        const items = grouped.get(g.key);
        if (!items || items.length === 0) return null;
        return (
          <section key={g.key}>
            <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {g.label}
              <span className="ml-2 text-slate-400 font-normal normal-case tracking-normal">
                {items.length}
              </span>
            </h2>
            <div>
              {items.map((email) => (
                <EmailRow key={`${email.accountId}|${email.id}`} email={email} showSummary />
              ))}
            </div>
          </section>
        );
      })}
      {grouped.get("unrated")?.length ? (
        <section>
          <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Unrated
          </h2>
          {grouped.get("unrated")!.map((email) => (
            <EmailRow key={`${email.accountId}|${email.id}`} email={email} showSummary />
          ))}
        </section>
      ) : null}
    </div>
  );
}
