

## Diagnosis (why every previous attempt looked broken)

Looking at the code I just read:

1. **Frontend** uses `window.location.href` → full-page redirect. On a custom domain you lose the React Query cache and the listener that would refresh status.
2. **Callback HTML** has `Content-Type: text/html` (no `charset=utf-8`). On some browsers/configurations the HTML gets shown as raw source — exactly what your screenshot showed.
3. **Auto-redirect** uses `setTimeout(... window.location.href = returnTo, 1200)` — if the script never runs (e.g. raw-source rendering, popup blocker, browser policy on cross-origin auto-nav), the user is stuck.
4. **No popup → parent communication.** Even when redirect works, the parent only knows via `?gmail=connected` URL detection, which is fragile.

The OAuth params are actually already correct (`access_type=offline`, `prompt=consent`, `gmail.send` scope). Tokens ARE being stored. The breakage is purely in the **post-callback handoff to the UI**.

## The fix — popup + postMessage (3 files)

### 1. `supabase/functions/gmail-oauth-callback/index.ts` (rewrite the response layer)

- Add explicit `Content-Type: text/html; charset=utf-8` header (kills raw-HTML bug).
- On success, the page does THREE things in order, so it works no matter how it was opened:
  1. `window.opener.postMessage({ type: 'GMAIL_OAUTH_SUCCESS', email }, '*')` then `window.close()` (popup case).
  2. If `!window.opener` (full-page fallback or popup blocked) → redirect to `returnTo` after 800ms.
  3. Always render a visible "Return to Settings" button as a final fallback so the user is never stranded.
- On error, same pattern with `GMAIL_OAUTH_ERROR`.
- **Keep using the existing `gmail_oauth_tokens` table** — do NOT switch to `platform_settings`. That table is already wired into `send-gmail-email` and `process-email-queue`; switching would break live email sending and orphan the existing token row.
- OAuth scopes/params are already correct — no changes needed in `gmail-oauth-init`.

### 2. `src/pages/AdminSettingsPage.tsx` (popup flow)

Replace `handleConnectGmail`:
- Open a centered 500×650 popup pointing at `about:blank` first (so popup blockers don't fire), then set `popup.location.href = data.auth_url` after the init call returns.
- Register a `message` listener that:
  - Checks `event.data?.type === 'GMAIL_OAUTH_SUCCESS'` → close popup, invalidate + refetch `gmail-connection-status`, success toast.
  - Checks `'GMAIL_OAUTH_ERROR'` → error toast.
  - **Origin check**: accept messages from the Supabase functions origin (`https://atwnmovdnblcqyvhaxls.supabase.co`) since that's where the callback page is served.
- Poll `popup.closed` every 500ms; if user closes popup manually without finishing, clean up listener and re-enable button.
- Keep the existing `?gmail=connected` URL detection as a backup path (covers popup-blocked → full-page fallback).
- Keep `staleTime: 0`, `refetchOnMount: 'always'`, `refetchOnWindowFocus: true` (already in place).

### 3. (No backend change for `send-gmail-email`)

Token refresh logic in `send-gmail-email` already does the right thing (refreshes 5 min before expiry, falls back to retry on 401). No changes needed.

## After the fix — what you'll see

1. Click **Connect Gmail** → small centered popup opens with Google's consent screen.
2. Approve → popup shows green "Gmail Connected!" for ~1 second → popup closes itself automatically.
3. Settings page (still open behind the popup) immediately flips to green **Connected (teamnevorai@gmail.com)** and shows toast "Gmail connected successfully".
4. If the popup is blocked: it falls back to full-page redirect, and on return the existing `?gmail=connected` handler still works.
5. Queued OTPs in `process-email-queue` deliver on the next 5-second cron tick.

## Files changed

- `supabase/functions/gmail-oauth-callback/index.ts` — new HTML with postMessage + charset + manual fallback button.
- `src/pages/AdminSettingsPage.tsx` — popup-based `handleConnectGmail` + message listener.

That's it. No DB schema changes. No new tables. Existing tokens remain valid.

