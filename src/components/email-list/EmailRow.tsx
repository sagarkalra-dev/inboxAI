import Link from "next/link";
import type { Email } from "@/lib/email/types";
import { emailParamId, relativeTime } from "@/lib/util";
import { PriorityBadge } from "@/components/ai/PriorityBadge";

export function EmailRow({ email, showSummary }: { email: Email; showSummary?: boolean }) {
  return (
    <Link
      href={`/email/${emailParamId(email)}`}
      className="block px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`truncate text-sm ${email.isRead ? "text-slate-600" : "font-semibold text-slate-900"}`}>
              {email.from.name || email.from.email}
            </span>
            {showSummary && email.ai?.priority && <PriorityBadge priority={email.ai.priority} />}
          </div>
          <div className={`truncate text-sm mt-0.5 ${email.isRead ? "text-slate-600" : "text-slate-900"}`}>
            {email.subject || "(no subject)"}
          </div>
          {showSummary && email.ai?.summary ? (
            <div className="text-xs text-slate-600 mt-1 line-clamp-2">{email.ai.summary}</div>
          ) : (
            <div className="text-xs text-slate-500 mt-1 line-clamp-1">{email.snippet}</div>
          )}
        </div>
        <div className="text-xs text-slate-500 whitespace-nowrap">{relativeTime(email.date)}</div>
      </div>
    </Link>
  );
}

export function EmailRowSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <div className="h-3 w-32 rounded shimmer mb-2" />
      <div className="h-3 w-3/4 rounded shimmer mb-1" />
      <div className="h-3 w-1/2 rounded shimmer" />
    </div>
  );
}
