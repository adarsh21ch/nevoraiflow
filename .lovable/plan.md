

## What's happening

Your screen shows Gmail as "Connected" — but that status only checks if a token row exists in the database, **not whether the token still works with Google**. The actual Gmail API call is failing with `401 Unauthorized` because Google revoked the refresh token (this happens every ~7 days when the OAuth app is in "Testing" mode).

So the UI lies a little: it says Connected, but sending is broken.

## What to do — two parts

### Part A: Fix it right now (manual, 30 seconds)

1. On this screen, click **Disconnect**.
2. Click **Connect Gmail** → sign in as `teamnevorai@gmail.com` → approve.
3. Queued OTP emails will start delivering within ~1 minute (the queue retries automatically).

That's it for the immediate fix. Test by trying the signup OTP flow again.

### Part B: Stop this from happening every week (one-time, ~5 minutes)

The root cause is that your Google OAuth app is in **Testing** mode. Google force-expires refresh tokens after 7 days in Testing mode. Switch it to **Production** and tokens stop expiring.

Steps (you do this in Google Cloud Console, not in Lovable):
1. Go to https://console.cloud.google.com/apis/credentials/consent
2. Select the project that owns the OAuth client used for Gmail.
3. Under **Publishing status**, click **Publish App** → confirm.
4. Status changes to "In production". No Google verification review is needed because you're only using the `gmail.send` scope for your own account.

After this, the refresh token issued on your next reconnect (Part A) will live indefinitely.

### Part C (optional, recommended): Make the UI honest

Right now the "Connected" badge is misleading because it doesn't actually probe Gmail. I can improve `send-gmail-email` (GET branch) to do a lightweight Gmail API ping (e.g. `users.getProfile`) and return `connected: false` + `reason: "token_revoked"` when the token is dead. That way the admin screen shows a red "Reconnect needed" state instead of a false green check, so you catch this before users do.

This is a small edit — one extra fetch in the GET handler plus a status pill in `AdminSettingsPage.tsx`. Say the word and I'll add it after you've done Part A + B.

## Recommended order

1. **Now:** Do Part A (Disconnect → Connect Gmail).
2. **Today:** Do Part B (publish OAuth app to Production) so this never recurs.
3. **Optional:** Approve Part C and I'll ship the honest-status improvement.

