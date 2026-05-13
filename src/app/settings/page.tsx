import { Shell } from "@/components/layout/Shell";
import { AccountList } from "@/components/accounts/AccountList";
import { ImapConnect } from "@/components/accounts/ImapConnect";
import { fetchAccounts } from "@/lib/server-fetch";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const accounts = await fetchAccounts();
  return (
    <Shell>
      <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold">Accounts</h1>
      </div>
      <div className="px-4 py-4 md:px-6 space-y-6 max-w-2xl">
        <section>
          <h2 className="text-sm font-semibold mb-2">Connected</h2>
          <AccountList accounts={accounts} />
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">Connect a new account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="/api/auth/gmail"
              className="rounded-md bg-slate-900 text-white py-3 text-center text-sm font-medium hover:bg-slate-800"
            >
              Connect Gmail
            </a>
            <a
              href="/api/auth/microsoft"
              className="rounded-md border border-slate-300 bg-white text-slate-900 py-3 text-center text-sm font-medium hover:bg-slate-50"
            >
              Connect Office 365
            </a>
          </div>
          <div className="mt-3">
            <ImapConnect />
          </div>
        </section>
      </div>
    </Shell>
  );
}
