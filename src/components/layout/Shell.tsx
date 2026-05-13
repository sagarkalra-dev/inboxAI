import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { SearchBar } from "./SearchBar";

const navItems = [
  { href: "/", label: "Smart", icon: "✨" },
  { href: "/inbox", label: "Inbox", icon: "📥" },
  { href: "/compose", label: "Compose", icon: "✏️" },
  { href: "/settings", label: "Accounts", icon: "⚙️" },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <div className="px-4 py-5 border-b border-slate-200">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            InboxAI
          </Link>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100"
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 md:px-6 md:py-3 flex items-center gap-3">
          <Link href="/" className="text-base font-semibold md:hidden">
            InboxAI
          </Link>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </header>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-4 z-10">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center py-2 text-xs text-slate-600"
          >
            <span aria-hidden className="text-lg leading-none">
              {item.icon}
            </span>
            <span className="mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
