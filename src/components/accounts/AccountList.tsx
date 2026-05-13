"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Account } from "@/lib/email/types";

export function AccountList({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function disconnect(accountId: string) {
    start(async () => {
      await fetch("/api/auth/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      router.refresh();
    });
  }

  if (accounts.length === 0) {
    return <p className="text-sm text-slate-600">No accounts connected.</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
      {accounts.map((a) => (
        <li key={a.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-900">{a.email}</div>
            <div className="text-xs text-slate-500">
              {a.provider} · connected {new Date(a.connectedAt).toLocaleDateString()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => disconnect(a.id)}
            disabled={pending}
            className="text-xs px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Disconnect
          </button>
        </li>
      ))}
    </ul>
  );
}
