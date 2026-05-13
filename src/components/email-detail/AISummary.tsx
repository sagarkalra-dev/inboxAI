import { PriorityBadge } from "@/components/ai/PriorityBadge";
import type { Email } from "@/lib/email/types";

export function AISummary({ email }: { email: Email }) {
  if (!email.ai?.summary && !email.ai?.priority) {
    return (
      <div className="rounded-lg bg-white border border-slate-200 p-4">
        <div className="h-3 w-24 rounded shimmer mb-2" />
        <div className="h-3 w-full rounded shimmer mb-1" />
        <div className="h-3 w-2/3 rounded shimmer" />
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold">AI summary</h3>
        <PriorityBadge priority={email.ai.priority} />
        {email.ai.category && (
          <span className="text-[10px] uppercase tracking-wide text-slate-500">{email.ai.category}</span>
        )}
      </div>
      {email.ai.summary && <p className="text-sm text-slate-700">{email.ai.summary}</p>}
    </div>
  );
}
