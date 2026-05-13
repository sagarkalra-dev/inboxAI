# InboxAI — Agents, Skills, Hooks & Plugins

## Agents (Claude Code multi-agent workflow)

| Agent | Responsibility |
|-------|---------------|
| **Architect** | Scaffolds project, defines types, sets up routing and provider abstractions |
| **Auth Agent** | Implements OAuth flows for Gmail and Microsoft, token encryption, session management |
| **Gmail Agent** | Implements Gmail API integration — read, send, reply, forward, search, labels, archive, delete |
| **Microsoft Agent** | Implements Microsoft Graph API integration — same operations as Gmail |
| **IMAP Agent** | Implements IMAP/SMTP abstraction layer for Yahoo/AOL |
| **AI Agent** | Implements Claude API integration — summarize, prioritize, draft, categorize |
| **UI Agent** | Builds all React components — Smart Inbox, email detail, compose, account switcher |
| **PWA Agent** | Adds manifest, service worker, icons, mobile responsiveness |
| **Test Agent** | Writes Vitest unit tests and integration tests for API routes and components |

## Skills

| Skill | Purpose |
|-------|---------|
| `email:fetch` | Fetch emails from any connected provider (normalized to unified type) |
| `email:send` | Send/reply/forward via the appropriate provider |
| `email:mutate` | Archive, delete, label, mark read/unread |
| `email:search` | Full-text search across providers |
| `ai:summarize` | Batch-summarize emails via Claude |
| `ai:prioritize` | Score and categorize emails via Claude |
| `ai:draft` | Generate reply drafts given thread context |
| `auth:connect` | Initiate OAuth flow for a provider |
| `auth:refresh` | Silently refresh expired tokens |

## Hooks

| Hook | Trigger | Action |
|------|---------|--------|
| `pre-commit` | Before each git commit | Run `npm run lint` and `npm run typecheck` |
| `post-fetch` | After emails are fetched | Trigger AI enrichment pipeline (summarize + prioritize) |
| `token-expiry` | When an OAuth token nears expiration | Auto-refresh before the next API call |

## Plugins (Extensibility Points)

| Plugin slot | Description |
|-------------|-------------|
| `provider` | Add new email providers by implementing the `EmailProvider` interface |
| `ai-enrichment` | Add custom AI processing steps (e.g., sentiment analysis, action item extraction) |
| `theme` | Swap color schemes and layout variants |
