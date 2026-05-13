import { Shell } from "@/components/layout/Shell";
import { EmailRow } from "@/components/email-list/EmailRow";
import { Welcome } from "@/components/accounts/Welcome";
import { fetchAccounts } from "@/lib/server-fetch";
import { getExistingSessionId } from "@/lib/auth/session";
import { searchAllEmails } from "@/lib/email/unified";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const accounts = await fetchAccounts();
  if (accounts.length === 0) {
    return (
      <Shell>
        <Welcome />
      </Shell>
    );
  }
  const sid = await getExistingSessionId();
  const query = q?.trim() ?? "";
  const emails = sid && query ? await searchAllEmails(sid, query) : [];

  return (
    <Shell>
      <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold">
          {query ? `Results for "${query}"` : "Search"}
        </h1>
        <p className="text-xs text-slate-500">
          {query ? `${emails.length} match${emails.length === 1 ? "" : "es"} across all accounts` : "Type a query in the search bar above."}
        </p>
      </div>
      {emails.length === 0 ? (
        query ? (
          <div className="px-6 py-12 text-center text-slate-600">No matches.</div>
        ) : null
      ) : (
        emails.map((e) => <EmailRow key={`${e.accountId}|${e.id}`} email={e} />)
      )}
    </Shell>
  );
}
