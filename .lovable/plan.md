

# Replicate Gmail OAuth2 Email System from Smart Income Funnel

## Overview

Copy the exact Gmail OAuth2 email architecture from the [Smart Income Funnel](/projects/cb4e093e-0bcb-428f-b101-0f9ed06766a5) project into this project. This replaces the current Resend-based email sending with a fully automated Gmail API flow where an admin connects their Gmail account once, and all emails are sent through it automatically.

## What Gets Created

### 1. Database Table: `gmail_oauth_tokens`
New table to store OAuth tokens securely:
- `id`, `user_id`, `access_token`, `refresh_token`, `token_expiry`, `gmail_email`, `created_at`
- RLS: only service_role can read/write (edge functions use service role client)

### 2. Three New Edge Functions

**`gmail-oauth-init`** — Admin-only endpoint that builds and returns the Google OAuth consent URL. Verifies admin role before generating the URL with `gmail.send` and `userinfo.email` scopes, `access_type=offline`, `prompt=consent`.

**`gmail-oauth-callback`** — Receives Google's redirect (no JWT verification). Exchanges the authorization code for tokens, fetches the gmail email via userinfo API, stores everything in `gmail_oauth_tokens`, and renders a success/error HTML page.

**`send-gmail-email`** — Accepts `{to, subject, html, sender_name}`. Fetches the latest token row, auto-refreshes if expired (5-min buffer), builds a base64url-encoded MIME message, sends via Gmail API. Retries once on 401.

### 3. Updated Existing Functions

**`send-landing-page-confirmation`** — Replace Resend API call with internal call to `send-gmail-email` edge function.

**`process-email-queue`** — Replace `sendViaResend()` with internal call to `send-gmail-email` edge function for queue-based sends.

### 4. Config Updates (`supabase/config.toml`)
```toml
[functions.gmail-oauth-callback]
verify_jwt = false

[functions.send-gmail-email]
verify_jwt = false
```

### 5. Admin UI — "Connect Gmail" Section
Add a Gmail connection section to `AdminSettingsPage.tsx`:
- Shows connection status (connected email or "Not connected")
- "Connect Gmail" button that opens OAuth consent flow in popup
- Polls for successful connection
- "Disconnect" button to remove tokens
- Identical UX to the reference project

### 6. Secrets Required
Two secrets need to be added:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Important Notes

- The `RESEND_API_KEY` secret will no longer be used for email sending but remains configured
- The redirect URI that must be added in Google Cloud Console is: `https://atwnmovdnblcqyvhaxls.supabase.co/functions/v1/gmail-oauth-callback`
- All branding references will use "Nevorai Flow" instead of "Smart Income Program"
- The existing email queue infrastructure (pgmq, DLQ, retry logic) is preserved — only the send mechanism changes from Resend to Gmail

## Implementation Order
1. Add secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
2. Create `gmail_oauth_tokens` table with RLS
3. Create `gmail-oauth-init` edge function
4. Create `gmail-oauth-callback` edge function
5. Create `send-gmail-email` edge function
6. Update `send-landing-page-confirmation` to call `send-gmail-email`
7. Update `process-email-queue` to call `send-gmail-email`
8. Update `config.toml` with JWT settings
9. Add Gmail connection UI to `AdminSettingsPage.tsx`
10. Deploy all edge functions

