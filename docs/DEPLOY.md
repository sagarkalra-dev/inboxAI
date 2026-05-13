# Deployment

InboxAI is a Next.js 15 app designed for Vercel. The full deploy is ~10 minutes once OAuth apps are registered.

## 1. Prerequisites

- A Vercel account (free tier works)
- A Google Cloud project for Gmail OAuth
- A Microsoft Entra (Azure AD) app registration for Office 365 OAuth
- An Anthropic API key
- Yahoo / AOL accounts with app passwords if testing IMAP

## 2. Create the Vercel project

```bash
npm i -g vercel
vercel login
vercel link        # accept defaults; pick your team/scope
```

## 3. Provision Vercel KV

In the Vercel dashboard → Storage → Marketplace → "Upstash for Redis" (Vercel KV's successor) → create a database, attach it to the project. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into env automatically. (The code uses the `@vercel/kv` client, which reads these vars; if you choose a different Redis provider, set the same two vars manually.)

## 4. Register OAuth apps

### Gmail (Google Cloud Console)

1. APIs & Services → Credentials → "Create credentials" → OAuth client ID → Web application.
2. Authorized redirect URIs: `https://<your-vercel-domain>/api/auth/gmail/callback` (and `http://localhost:3000/api/auth/gmail/callback` for local).
3. Enable the Gmail API on the project.
4. Add the OAuth consent screen scopes from `src/lib/email/gmail.ts` (`gmail.modify`, `gmail.send`, `userinfo.email`, `userinfo.profile`, `openid`).
5. Copy the client ID + secret → set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in Vercel.

### Microsoft (Entra ID)

1. App registrations → New registration. Supported account types: "Personal Microsoft accounts only" or multi-tenant + personal (matches the `/common` authority used in `microsoft.ts`).
2. Redirect URI: `https://<your-vercel-domain>/api/auth/microsoft/callback` (and the localhost equivalent).
3. Certificates & secrets → New client secret. Copy the **value**.
4. API permissions → Microsoft Graph → Delegated → `Mail.ReadWrite`, `Mail.Send`, `User.Read`, `offline_access`. Grant admin consent for your tenant.
5. Set `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` in Vercel.

## 5. Set remaining env vars

In the Vercel project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `ENCRYPTION_KEY` | Generate with `openssl rand -hex 32` |
| `OAUTH_REDIRECT_BASE_URL` | `https://<your-vercel-domain>` (no trailing slash) |

`KV_REST_API_URL` and `KV_REST_API_TOKEN` are already injected by the Vercel KV integration.

## 6. Deploy

```bash
vercel --prod
```

## 7. Smoke test

Visit the deployed URL and verify:

1. Welcome screen shows three connect options (Gmail / Office 365 / IMAP).
2. Connect Gmail → OAuth roundtrip succeeds → Smart Inbox renders with AI priority groups.
3. Connect Microsoft → second account appears in Smart Inbox alongside Gmail.
4. Connect IMAP (Yahoo or AOL with an app password) → third account appears.
5. Open an email → AI summary loads → "Generate" produces a draft reply → send works.
6. Compose a new email from the chosen provider.
7. Click Forward on an email → compose opens prefilled.
8. Search "invoice" from the top bar → matching messages list.
9. Settings → Disconnect → account removed from KV.
10. On mobile, install the PWA from the browser menu; the app launches standalone.

## 8. Operational notes

- AI cache TTL is 1 hour. Bust by deleting `ai:*` keys in KV.
- Token refresh runs in the provider layer before every API call; if a refresh token is revoked, the user gets a provider-error banner and must reconnect.
- The service worker only caches static assets; API responses are never cached.
- IMAP credentials are encrypted with `ENCRYPTION_KEY` and stored in KV; rotating the key invalidates all stored tokens and IMAP creds.
