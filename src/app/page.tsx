import { Shell } from "@/components/layout/Shell";
import { Welcome } from "@/components/accounts/Welcome";
import { SmartInbox } from "@/components/smart-inbox/SmartInbox";
import { fetchInbox } from "@/lib/server-fetch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { emails, accounts, aiUnavailable, providerError } = await fetchInbox({ enrich: true });
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
        <h1 className="text-lg font-semibold">Smart Inbox</h1>
        <p className="text-xs text-slate-500">AI-prioritized across all accounts</p>
      </div>
      {providerError && (
        <div className="px-4 py-2 text-xs bg-red-50 text-red-800 border-b border-red-200">
          {providerError}
        </div>
      )}
      <SmartInbox emails={emails} aiUnavailable={aiUnavailable} />
    </Shell>
  );
}
