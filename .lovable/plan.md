

## Root cause

Looking at the actual code in `src/pages/AdminSettingsPage.tsx`, the file is **missing** the `useEffect` that was supposed to detect `?gmail=connected` on return from Google. So the flow is:

1. You click **Reconnect Gmail** → redirected to Google → approve → Google redirects to the callback edge function.
2. The callback **does** successfully write a fresh token to the database (this part works — Google confirmed the email earlier).
3. Callback HTML auto-redirects you back to `/admin/settings?gmail=connected`.
4. **AdminSettingsPage mounts but never reads `?gmail=connected`, never invalidates the query, and the React Query cache still holds the old "Reconnect needed (token_revoked)" result for 30 seconds** — so the badge stays orange.

Compounding this on a custom domain (`nflow.nevorai.com`), the user perception is "nothing happened" because the page looks identical before and after.

The token IS being refreshed in the DB. The UI just doesn't know.

## Fix (3 small changes, all in `src/pages/AdminSettingsPage.tsx`)

1. **Add a `useEffect` that detects `?gmail=connected` on mount**, then:
   - Invalidates the `gmail-connection-status` query.
   - Refetches it immediately.
   - Shows a success toast.
   - Strips the `?gmail=connected` param from the URL so refresh doesn't retrigger it.
2. **Drop `staleTime` from 30s to 0** for the Gmail status query, and add `refetchOnMount: "always"` so every navigation back re-probes Gmail.
3. **Also refetch on window focus** — covers the case where the OAuth tab/window swap leaves stale data.

That's it. No edge function changes needed — the OAuth flow itself works (logs already show successful boots after reconnect attempts; the 401s in `process-email-queue` are old queued messages that pre-date the reconnect).

## Why this is the right diagnosis (not the same loop as before)

Previous attempts fixed:
- Popup → full-page redirect ✓ (already done, working)
- `returnTo` on custom domain ✓ (`sanitizeReturnTo` allows `nflow.nevorai.com`)
- Live probe instead of "token exists" check ✓ (already done)

The one missing piece across all those iterations is the **client-side cache invalidation on return**. The data is correct on the server; the UI just keeps showing the cached "bad" result for 30 seconds and the user clicks Reconnect again, perpetuating the perception of failure.

## After the fix, what you'll see

1. Click **Reconnect Gmail** → Google approval screen → return to settings.
2. Within ~1 second the status flips to green **Connected (teamnevorai@gmail.com)**.
3. Toast: "Gmail reconnected successfully".
4. Queued OTPs in `process-email-queue` start delivering on the next 5-second cron tick.

## Files to change

- `src/pages/AdminSettingsPage.tsx` — add the `useEffect`, tweak the `useQuery` options. ~15 lines added.

No edge function redeploy needed.

