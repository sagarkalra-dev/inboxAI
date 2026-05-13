# CLAUDE.md

Behavioral guidelines for LLM-assisted development. Keep code minimal, correct, and traceable to requirements.

## 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple approaches exist, present tradeoffs — don't pick silently.
- If a simpler solution exists, say so. Push back when warranted.

## 2. Simplicity First

- Minimum code that solves the problem. Nothing speculative.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

## 3. Surgical Changes

- Touch only what the task requires.
- Match existing style.
- Remove only orphans YOUR changes created.

## 4. Goal-Driven Execution

Transform tasks into verifiable goals:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
```

---

## Project: InboxAI

AI-first universal email client. Mobile-ready PWA built with Next.js on Vercel.

### Tech Stack
- **Framework:** Next.js 15 (App Router) on Vercel
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`) for summaries, reply drafts, prioritization
- **Email providers:**
  - Gmail — Google OAuth 2.0 + Gmail API (`googleapis`)
  - Office 365 — Microsoft OAuth 2.0 + Graph API (`@microsoft/microsoft-graph-client`)
  - IMAP — Yahoo / AOL / generic IMAP via `imapflow` + `nodemailer`, authenticated with app passwords stored encrypted in KV
- **Auth/Session:** Vercel KV (Redis) for encrypted OAuth tokens + session data. Cookies hold only a session ID — tokens are too large for cookie storage.
- **Cache:** Vercel KV also caches AI enrichments (summaries, priorities) keyed by email ID. TTL 1 hour. Avoids re-processing on every page load.
- **PWA:** Web app manifest + service worker (via `next-pwa` or manual)
- **Testing:** Vitest + React Testing Library

### Project Structure
```
src/
  app/
    layout.tsx                — Root layout, providers, PWA meta
    page.tsx                  — Smart Inbox (AI-first default view)
    inbox/page.tsx            — Traditional inbox view
    compose/page.tsx          — Compose new email
    email/[id]/page.tsx       — Email detail + AI summary + draft replies
    settings/page.tsx         — Account management
    api/
      auth/gmail/route.ts           — Gmail OAuth initiate
      auth/gmail/callback/route.ts  — Gmail OAuth callback
      auth/microsoft/route.ts       — Microsoft OAuth initiate
      auth/microsoft/callback/route.ts — Microsoft OAuth callback
      auth/accounts/route.ts        — List/disconnect accounts
      emails/route.ts               — GET unified inbox, POST send
      emails/[id]/route.ts          — GET detail, PATCH labels/archive, DELETE
      emails/search/route.ts        — Search across accounts
      ai/summarize/route.ts         — Summarize email(s)
      ai/draft/route.ts             — Generate reply draft
      ai/prioritize/route.ts        — Prioritize/categorize inbox
  components/
    smart-inbox/          — AI-prioritized view (default landing)
    email-list/           — Traditional email list
    email-detail/         — Single email view with AI panel
    compose/              — Compose, reply, forward
    accounts/             — Account switcher, connect flow
    ai/                   — Summary cards, draft suggestions, priority badges
    layout/               — Shell, sidebar, header, mobile nav
  lib/
    email/
      types.ts            — Unified email/account types (provider-agnostic)
      gmail.ts            — Gmail API operations
      microsoft.ts        — Microsoft Graph operations
      unified.ts          — Provider router: normalizes all providers to unified types
    ai/
      client.ts           — Claude API client
      summarize.ts        — Summarization logic
      draft.ts            — Reply draft generation
      prioritize.ts       — Priority scoring and categorization
    auth/
      tokens.ts           — Encrypted token storage and refresh
      session.ts          — Session helpers
  hooks/                  — React hooks for data fetching (useEmails, useAccounts, useAI)
public/
  manifest.json           — PWA manifest
  sw.js                   — Service worker
  icons/                  — App icons (192x192, 512x512)
```

### Design Principles
- **AI-first UX:** Smart Inbox is the default view — emails arrive pre-prioritized, summarized, with draft replies ready. Traditional inbox is one tap away but not the default.
- **Unified abstraction:** All email providers normalize to a single `Email` type. Components never know which provider an email came from.
- **Mobile-first:** Responsive design with bottom nav on mobile, sidebar on desktop. Every interaction must work on a phone.
- **Three providers, one contract:** Gmail (primary, OAuth + Gmail API), Office 365 (secondary, OAuth + Graph API), and IMAP (Yahoo/AOL/custom via app passwords). All three implement the same `EmailProvider` interface. Components and the AI layer are provider-agnostic.

### Conventions
- App Router with server components by default, `"use client"` only where needed
- API routes handle all email provider communication — no direct API calls from client
- Tailwind for all styling, no CSS modules or styled-components
- Parallel route fetching where possible (React Suspense boundaries)
- Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `ENCRYPTION_KEY` (AES-256-GCM, used by `lib/auth/tokens.ts` to encrypt OAuth tokens at rest in KV), `KV_REST_API_URL`, `KV_REST_API_TOKEN`
- Scripts: `npm run dev` (local), `npm run build` (production), `npm run test` (vitest)
