import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWARegister } from "@/components/layout/PWARegister";

export const metadata: Metadata = {
  title: "InboxAI",
  description: "AI-first universal email client",
  manifest: "/manifest.json",
  applicationName: "InboxAI",
  appleWebApp: {
    capable: true,
    title: "InboxAI",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
