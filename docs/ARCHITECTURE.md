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
│  ┌────┴────┐  ┌─────┴─────┐  ┌────────┴──────────┐     │
│  │ Gmail   │  │ Microsoft │  │ IMAP/SMTP         │     │
│  │ API     │  │ Graph API │  │ (Yahoo, AOL)      │     │
│  └─────────┘  └───────────┘  └───────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Claude API (Anthropic)                │    │
│  │   Summaries · Reply Drafts · Prioritization     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Core Data Flow

1. **Connect** — User authenticates via OAuth (Gmail/Microsoft) or credentials (IMAP). Tokens stored encrypted server-side.
2. **Fetch** — API routes call the appropriate provider, normalize responses to a unified `Email` type.
3. **Enrich** — Fetched emails are piped through Claude API for summarization, priority scoring, and pre-generated reply drafts.
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

Batch processing: Summarization and prioritization run as a single Claude call per batch of emails, reducing API calls and latency.

## Auth & Security

- OAuth tokens encrypted at rest using AES-256 (via `ENCRYPTION_KEY` env var)
- Tokens stored in HTTP-only secure cookies (no database needed for demo)
- Token refresh handled transparently in the provider layer
- No email content stored server-side — fetched on demand from providers
- ANTHROPIC_API_KEY server-side only, never exposed to client

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
| IMAP/SMTP | App password | Abstracted | Abstracted | Abstracted | Partial | N/A | Partial |
