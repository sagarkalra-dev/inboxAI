# InboxAI — Agents, Skills, Hooks & Plugins

## Agents (Claude Code build agents)

Each agent owns a domain and runs as a focused Claude Code session. Agents are sequenced by dependency — Auth before Email, Email before AI, AI before UI.

| Agent | Owns | Depends on | Delivers |
|-------|------|------------|----------|
| **Architect** | Project scaffold, types, interfaces | — | Compiling Next.js shell with unified Email type and EmailProvider interface |
| **Auth Agent** | OAuth flows, token encryption, Vercel KV session store | Architect | Working `/api/auth/gmail` and `/api/auth/microsoft` endpoints |
| **Gmail Agent** | Gmail API integration | Auth Agent | All Gmail operations (list, get, send, reply, forward, search, labels, archive, delete) via `/api/emails` |
| **Microsoft Agent** | Microsoft Graph integration | Auth Agent | Same operations as Gmail, same API surface |
| **IMAP Agent** | `imapflow` + `nodemailer` for Yahoo/AOL/custom IMAP via app passwords | Auth Agent | Same `EmailProvider` operations; credentials encrypted in KV |
| **AI Agent** | Claude API client, batch enrichment, draft generation | Gmail Agent (needs real emails to test) | `/api/ai/*` endpoints returning enriched email data |
| **UI Agent** | All React components | AI Agent (needs API to fetch from) | Smart Inbox, email detail, compose, account switcher — working end-to-end |
| **PWA Agent** | Manifest, service worker, icons, mobile polish | UI Agent | Lighthouse PWA audit passing, installable on phone |
| **Test Agent** | Vitest test suite | All agents | Tests passing for critical paths |

## Skills (runtime capabilities)

| Skill | Implementation | Notes |
|-------|---------------|-------|
| `email:fetch` | `lib/email/unified.ts` → dispatches to `gmail.ts`, `microsoft.ts`, or `imap.ts` | Returns normalized `Email[]` |
| `email:send` | Provider-specific send via Gmail API or Graph API | Handles compose, reply, forward |
| `email:mutate` | Archive, delete, label, star, mark read/unread | Provider-specific mutation |
| `email:search` | Gmail: `q` parameter, Microsoft: `$search` OData | Unified search results |
| `ai:enrich` | Batches up to 10 emails → single Claude call → returns summaries + priorities + categories | Results cached in Vercel KV (1hr TTL) |
| `ai:draft` | Full thread context → Claude → reply draft | On-demand, not cached |
| `auth:connect` | Initiates OAuth redirect for selected provider | Returns authorization URL |
| `auth:refresh` | Checks token expiry, refreshes transparently before API calls | Runs in provider layer |

## Hooks

| Hook | Implementation | Purpose |
|------|---------------|---------|
| `pre-commit` | Claude Code hook in `.claude/settings.json` | Runs `npm run lint && npm run typecheck` before every commit |
| `post-fetch` | Called in `/api/emails/route.ts` after provider fetch | Triggers `ai:enrich` for uncached emails |
| `token-refresh` | Called in `lib/auth/tokens.ts` before every provider API call | Transparently refreshes expired OAuth tokens |

## Plugin interface (extensibility)

New email providers implement `EmailProvider`:

```typescript
interface EmailProvider {
  id: string;
  connect(credentials: unknown): Promise<AuthResult>;
  listEmails(options: ListOptions): Promise<Email[]>;
  getEmail(id: string): Promise<Email>;
  sendEmail(draft: DraftEmail): Promise<void>;
  searchEmails(query: string): Promise<Email[]>;
  mutateEmail(id: string, mutation: EmailMutation): Promise<void>;
}
```

This is how Gmail, Microsoft, and IMAP are implemented. Adding new providers means implementing this interface — no changes to UI or AI layer.
