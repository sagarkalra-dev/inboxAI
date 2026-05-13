# InboxAI — Build Workflow

Short writeup of the multi-agent, specs-driven development process.

## Methodology

**Specs-driven development using Claude Code CLI with Agent OS principles.**

The build follows a strict sequence: define specs first, implement against specs, verify after each step. Claude Code agents handle isolated domains in parallel where possible, with the CLAUDE.md serving as the single source of truth for conventions and architecture.

## Build Sequence

### Phase 1: Foundation
1. Write CLAUDE.md with project spec, structure, and conventions
2. Write ARCHITECTURE.md with system design and data types
3. Scaffold Next.js project with TypeScript, Tailwind, folder structure
4. Define unified `Email` type and `EmailProvider` interface
5. **Verify:** `npm run dev` serves empty shell, types compile

### Phase 2: Auth & Email Core
6. Set up Vercel KV for token storage and AI cache
7. Implement Gmail OAuth flow (initiate + callback + encrypted token storage in KV)
8. Implement Gmail API operations (list, get, send, reply, search, labels, archive, delete)
9. Implement Microsoft OAuth flow
10. Implement Microsoft Graph operations
11. Build unified provider router that dispatches to the correct provider
12. **Verify:** Can authenticate with Gmail, fetch real emails via API routes

### Phase 3: AI Layer
12. Implement Claude API client with batch processing
13. Build summarization pipeline (batch emails -> Claude -> summaries)
14. Build prioritization pipeline (batch emails -> Claude -> priority scores)
15. Build reply draft generation (thread context -> Claude -> draft)
16. **Verify:** API route returns AI-enriched email data

### Phase 4: UI
17. Build app shell (responsive layout, sidebar/bottom nav, header with search)
18. Build Smart Inbox view (AI-prioritized, grouped, with summaries — default landing)
19. Build traditional inbox view (chronological email list)
20. Build email detail view with AI summary panel and draft reply suggestions
21. Build compose/reply/forward modal
22. Build account switcher and connection flow
23. **Verify:** Full flow works on mobile viewport — connect account, see smart inbox, read email, reply

### Phase 5: PWA & Polish
24. Add manifest.json, service worker, app icons
25. Mobile responsiveness pass (test at 375px width)
26. Loading states, error states, empty states
27. **Verify:** Lighthouse PWA audit passes, installable on mobile

### Phase 6: Testing & Deploy

Critical test cases:
1. Gmail OAuth flow — token stored and retrievable from KV
2. Gmail fetch → unified Email type normalization
3. Gmail send/reply — correct API call with proper headers
4. AI batch enrichment — 10 emails in, 10 enrichments out, cached in KV
5. AI cache hit — second fetch skips Claude call
6. AI draft reply — thread context produces coherent draft
7. SmartInbox component — renders prioritized groups correctly
8. EmailDetail component — displays AI summary and draft suggestions
9. Account switcher — shows connected accounts, handles disconnect
10. Compose — validates required fields, sends via correct provider

28. Write tests covering the critical cases above
29. Deploy to Vercel, configure environment variables
30. **Verify:** Live URL works end-to-end — connect Gmail, see AI inbox, send reply

## Claude Code Discipline

- **CLAUDE.md** is read before every task — it defines what to build and how
- **Specs before code** — architecture doc and types defined before implementation
- **Verify after each phase** — no moving forward until the check passes
- **Minimal diffs** — each change traces to a specific requirement
- **No speculative code** — every feature maps to the assignment brief
