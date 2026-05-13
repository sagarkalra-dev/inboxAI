# InboxAI — Architecture

One-page architecture overview for an AI-first universal email client PWA.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client (PWA)                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │Smart View│  │ Inbox    │  │ Compose/Reply      │    │
│  │(default) │  │ (trad.)  │  │ /Forward           │    │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘    │
│       └──────────────┴────────────────┘                 │
│                      │ React hooks                      │
├──────────────────────┼──────────────────────────────────┤
│                 Next.js API Routes                      │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐    │
│  │ /api/auth│  │/api/email│  │ /api/ai             │    │
│  │ OAuth    │  │ CRUD     │  │ summarize/draft/    │    │
│  │ flows    │  │ unified  │  │ prioritize          │    │
│  └────┬─────┘  └────┬─────┘  └────────┬────────────┘   │
├───────┼──────────────┼─────────────────┼────────────────┤
│       │         Provider Layer         │                │
│  ┌────┴────┐  ┌─────┴─────┐                             │
│  │ Gmail   │  │ Microsoft │   EmailProvider interface   │
│  │ API     │  │ Graph API │   allows adding IMAP later  │
│  └─────────┘  └───────────┘                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Claude API (Anthropic)                │    │
│  │   Summaries · Reply Drafts · Prioritization     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Core Data Flow

1. **Connect** — User authenticates via OAuth (Gmail/Microsoft). Tokens encrypted with AES-256 and stored in Vercel KV, keyed by session ID. Session ID held in HTTP-only cookie.
2. **Fetch** — API routes call the appropriate provider, normalize responses to a unified `Email` type.
3. **Enrich** — Fetched emails are checked against KV cache (keyed by `ai:{emailId}`, TTL 1 hour). Cache miss → batch up to 10 emails per Claude API call for summarization + prioritization. Results written back to cache.
4. **Render** — Smart Inbox displays AI-enriched results by default. User can switch to traditional view, drill into detail, compose, reply, or forward.

## Unified Email Type

All providers normalize to this shape:

```typescript
interface Email {
  id: string;
  provider: "gmail" | "microsoft" | "imap";
  accountId: string;
  threadId?: string;
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  subject: string;
  snippet: string;
  body: { text?: string; html?: string };
  date: string;            // ISO 8601
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  // AI-enriched fields (populated after Claude processing)
  ai?: {
    summary?: string;
    priority?: "critical" | "high" | "medium" | "low";
    category?: string;     // e.g., "work", "updates", "promotions"
    draftReply?: string;
  };
}
```

## AI Strategy

AI is not a feature — it is the primary interface.

| Feature | How it works | When it runs |
|---------|-------------|--------------|
| **Summarize** | Claude reads email body, produces 1-2 sentence summary | On inbox fetch (batched) |
| **Prioritize** | Claude scores email importance based on sender, content, urgency signals | On inbox fetch (batched) |
| **Draft Reply** | Claude generates contextual reply given thread history | On email detail open |
| **Categorize** | Claude assigns category labels (work, updates, promotions, personal) | On inbox fetch (batched) |

Batch processing: Summarize + prioritize + categorize run as a **single Claude call per batch of up to 10 emails**. Input is a JSON array of `{ id, from, subject, snippet }`. Output is a JSON array of `{ id, summary, priority, category }`. This keeps inbox load to 2-3 API calls instead of 20+.

Draft replies are generated **on demand** when the user opens an email detail view (single Claude call with full thread context).

## Auth & Token Storage

- OAuth tokens encrypted at rest using AES-256 (via `ENCRYPTION_KEY` env var)
- Stored in **Vercel KV** keyed by session ID — NOT in cookies (OAuth tokens exceed the 4KB cookie limit)
- HTTP-only secure cookie holds only the session ID
- Token refresh handled transparently in the provider layer before each API call
- No email content stored server-side — fetched on demand from providers
- ANTHROPIC_API_KEY server-side only, never exposed to client

## AI Cache

- AI enrichments cached in Vercel KV: key `ai:{emailId}`, value `{ summary, priority, category }`
- TTL: 1 hour — balances freshness with cost
- Cache checked before calling Claude — on inbox load, only uncached emails are sent for enrichment
- Draft replies are NOT cached (contextual, user may want fresh suggestions)

## PWA

- `manifest.json` with app name, icons, theme color, `display: "standalone"`
- Service worker caches static assets and app shell for offline loading
- Add-to-homescreen prompt on mobile
- Responsive breakpoints: mobile-first (< 768px bottom nav), desktop (>= 768px sidebar)

## Provider Implementation Status

| Provider | Auth | Read | Send | Reply/Fwd | Search | Labels | Archive/Delete |
|----------|------|------|------|-----------|--------|--------|----------------|
| Gmail | Full OAuth | Yes | Yes | Yes | Yes | Yes | Yes |
| Office 365 | Full OAuth | Yes | Yes | Yes | Yes | Yes | Yes |
| IMAP (Yahoo/AOL/custom) | App password (encrypted in KV) | Yes | Yes (SMTP) | Yes | Yes | Flags only | Yes |

All three implement the same `EmailProvider` interface; new providers are pluggable by implementing the same contract.

## UI States

Every view handles these states explicitly:

| State | What the user sees |
|-------|-------------------|
| **No accounts** | Welcome screen with "Connect your email" CTA — prominent Gmail and Microsoft buttons |
| **Loading** | Skeleton cards matching the email list layout (not a spinner) |
| **Empty inbox** | Illustration + "You're all caught up" message |
| **AI processing** | Shimmer effect on summary/priority fields while Claude processes |
| **AI unavailable** | Emails display normally without AI fields; subtle banner: "AI features temporarily unavailable" |
| **Provider error** | Per-account error badge in sidebar; other accounts remain functional |
| **Offline (PWA)** | Cached app shell loads; banner: "You're offline — showing cached data" |
