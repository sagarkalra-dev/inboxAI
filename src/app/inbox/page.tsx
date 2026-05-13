import { Shell } from "@/components/layout/Shell";
import { Welcome } from "@/components/accounts/Welcome";
import { EmailRow } from "@/components/email-list/EmailRow";
import { fetchInbox } from "@/lib/server-fetch";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { emails, accounts, providerError } = await fetchInbox();
  if (accounts.length === 0) {
    return (
      <Shell>
        <Welcome />
      </Shell>
    );
  }
  return (
    <Shell>
      <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold">Inbox</h1>
        <p className="text-xs text-slate-500">Chronological across all accounts</p>
      </div>
      {providerError && (
        <div className="px-4 py-2 text-xs bg-red-50 text-red-800 border-b border-red-200">
          {providerError}
        </div>
      )}
      {emails.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-600">
          <div className="text-4xl mb-2">📭</div>
          <p>No emails to show.</p>
        </div>
      ) : (
        emails.map((e) => <EmailRow key={`${e.accountId}|${e.id}`} email={e} />)
      )}
    </Shell>
  );
}
