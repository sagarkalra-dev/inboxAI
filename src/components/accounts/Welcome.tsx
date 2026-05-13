export function Welcome() {
  return (
    <div className="px-6 py-12 max-w-md mx-auto text-center">
      <div className="text-5xl mb-4">📬</div>
      <h1 className="text-2xl font-semibold text-slate-900">Welcome to InboxAI</h1>
      <p className="text-slate-600 mt-2 mb-8">
        Connect an email account to see your AI-prioritized inbox.
      </p>
      <div className="space-y-3">
        <a
          href="/api/auth/gmail"
          className="block w-full rounded-md bg-slate-900 text-white py-3 text-sm font-medium hover:bg-slate-800"
        >
          Connect Gmail
        </a>
        <a
          href="/api/auth/microsoft"
          className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 py-3 text-sm font-medium hover:bg-slate-50"
        >
          Connect Office 365
        </a>
        <a
          href="/settings"
          className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 py-3 text-sm font-medium hover:bg-slate-50"
        >
          Connect Yahoo / AOL (IMAP)
        </a>
      </div>
    </div>
  );
}
