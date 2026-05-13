import { Shell } from "@/components/layout/Shell";
import { Welcome } from "@/components/accounts/Welcome";
import { ComposeForm } from "@/components/compose/ComposeForm";
import { fetchAccounts } from "@/lib/server-fetch";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function param(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function ComposePage({ searchParams }: { searchParams: Promise<SP> }) {
  const accounts = await fetchAccounts();
  if (accounts.length === 0) {
    return (
      <Shell>
        <Welcome />
      </Shell>
    );
  }
  const sp = await searchParams;
  const initial = {
    accountId: param(sp, "accountId"),
    to: param(sp, "to"),
    subject: param(sp, "subject"),
    body: param(sp, "body"),
  };
  const heading = initial.subject?.startsWith("Fwd:")
    ? "Forward message"
    : initial.subject?.startsWith("Re:")
      ? "Reply"
      : "New message";
  return (
    <Shell>
      <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold">{heading}</h1>
      </div>
      <div className="px-4 py-4 md:px-6">
        <ComposeForm accounts={accounts} initial={initial} />
      </div>
    </Shell>
  );
}
