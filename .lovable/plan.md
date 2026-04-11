

# Switch from Resend to Gmail API for Email Sending

## Overview

Replace direct Resend API calls with Gmail API (OAuth2) in the two Edge Functions. Gmail with Google Workspace gives you 2,000 emails/day — 20x more than Resend's free tier.

## What You'll Need to Provide

Before implementation, you'll need to set up a Google Cloud project:

1. **Go to** [Google Cloud Console](https://console.cloud.google.com)
2. **Enable the Gmail API** for your project
3. **Create OAuth2 credentials** (Desktop app type):
   - Get the **Client ID** and **Client Secret**
4. **Generate a Refresh Token** using the OAuth2 Playground or a one-time script — this lets the Edge Function send emails on behalf of your Gmail/Workspace account without user interaction
5. The sender email will be your actual Gmail/Workspace email address (e.g., `noreply@flow.nevorai.com` if it's a Workspace alias)

## Secrets Needed

Three new secrets to add:
- `GMAIL_CLIENT_ID` — OAuth2 client ID
- `GMAIL_CLIENT_SECRET` — OAuth2 client secret  
- `GMAIL_REFRESH_TOKEN` — Long-lived refresh token for your sending account

## Technical Changes

### File: `supabase/functions/send-landing-page-confirmation/index.ts`
- Remove Resend API call
- Add Gmail OAuth2 token exchange (refresh token → access token)
- Send email via Gmail API (`POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`)
- Format email as base64url-encoded MIME message
- Keep all existing template/HTML logic unchanged

### File: `supabase/functions/process-email-queue/index.ts`
- Replace `sendViaResend()` with `sendViaGmail()` 
- Add OAuth2 token refresh logic
- Update rate-limit detection for Gmail's error format (HTTP 429 or quota errors)
- Keep all queue/retry/DLQ logic intact

### Helper: Gmail send function
- Exchange refresh token for access token via `https://oauth2.googleapis.com/token`
- Build RFC 2822 MIME message with proper headers (From, To, Subject, Content-Type)
- Base64url encode and send via Gmail API
- Cache access token in memory for the function's lifetime (~10 min)

## Important Notes

- Gmail API access tokens expire after ~1 hour, but Edge Functions are short-lived so each invocation refreshes
- The refresh token is long-lived and doesn't expire unless revoked
- Gmail quota errors return HTTP 429 — existing retry logic will handle this
- Your "from" address must be a verified alias in Gmail/Workspace settings

