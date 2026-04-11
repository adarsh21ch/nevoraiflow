

# Switch Email Sending from Lovable Email to Resend

## Overview

Replace all `sendLovableEmail` calls with Resend API calls via the connector gateway. Two Edge Functions need updating, and a Resend connection needs to be linked to the project.

## Step 1: Connect Resend

Link a Resend connector to the project so `RESEND_API_KEY` and `LOVABLE_API_KEY` are available as environment variables in Edge Functions.

## Step 2: Update `send-landing-page-confirmation/index.ts`

- Remove `import { sendLovableEmail } from 'npm:@lovable.dev/email-js'`
- Replace the `sendLovableEmail(...)` call with a `fetch` to `https://connector-gateway.lovable.dev/resend/emails` using the Resend gateway pattern
- Use `Authorization: Bearer $LOVABLE_API_KEY` and `X-Connection-Api-Key: $RESEND_API_KEY` headers
- Send `from`, `to`, `subject`, `html`, `text` fields via Resend's API format
- Keep all existing logic (template building, unsubscribe tokens, DB updates) unchanged

## Step 3: Update `process-email-queue/index.ts`

- Remove `import { sendLovableEmail } from 'npm:@lovable.dev/email-js'`
- Replace the `sendLovableEmail(...)` call with a `fetch` to the Resend gateway
- Map existing payload fields (`to`, `from`, `subject`, `html`, `text`) to Resend's API format
- Keep all queue logic (retry, DLQ, rate-limit detection, TTL) intact
- Update rate-limit detection to check HTTP 429 from fetch response instead of error object

## Step 4: Deploy Updated Functions

Deploy both `send-landing-page-confirmation` and `process-email-queue` Edge Functions.

## Technical Notes

- Resend requires a verified sender domain. The current "from" address is `noreply@flow.nevorai.com` — this domain must be verified in Resend's dashboard.
- The Resend gateway pattern handles OAuth/token refresh automatically.
- No database or frontend changes needed — only the two Edge Functions change.

