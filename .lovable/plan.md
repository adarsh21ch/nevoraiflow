

## What's actually blocking your emails right now

Gmail API is now enabled in Google Cloud — confirmed from your screenshot. That blocker is gone.

But the queue is jammed with **5 legacy stuck messages** from before today's payload fix:

| msg_id | recipient | retry count | problem |
|---|---|---|---|
| 1 | teamnevorai@gmail.com | 740× | old format (template/data, no html) |
| 2 | teamnevorai@gmail.com | 739× | old format |
| 3 | vs9040335@**gimalcom** | 428× | old format + typo in email domain |
| 4 | vs9040335@**gimalcom** | 428× | old format + typo |
| 5 | vs9040335@**gimalcom** | 427× | old format + typo |

These have no `message_id` field, so my earlier `MAX_RETRIES` guard never triggers — they re-deliver every ~5 seconds forever, generating constant 400s and starving any new valid OTP/registration emails of CPU time.

This is why even after enabling Gmail API, no test email got through.

## The 3-step fix

### Step 1 — Purge the stuck legacy messages (DB migration)
Delete msg_id 1–5 from `pgmq.q_transactional_emails`. They are from before the OTP payload fix and cannot be recovered. The vs9040335 ones were never deliverable anyway because of the `@gimalcom` typo.

### Step 2 — Harden `process-email-queue` so this can't happen again
Update `supabase/functions/process-email-queue/index.ts` to validate every payload before sending:
- If `to`, `subject`, or `html` is missing → move to DLQ immediately on first encounter (do not retry).
- If `to` doesn't look like a valid email → move to DLQ immediately.
- This prevents a single bad enqueue from ever clogging the queue again.

### Step 3 — Verify end-to-end
Once the queue is empty:
1. Click **Send Test Email** in Admin Settings → should land in `teamnevorai@gmail.com` within 5–10 seconds.
2. Try the Nevorai member OTP login flow → OTP should arrive.
3. Try a landing page registration with your own email → confirmation email should arrive.

## Files changed

- New migration: delete msg_id 1–5 from `pgmq.q_transactional_emails`
- `supabase/functions/process-email-queue/index.ts` — validate payload, DLQ malformed messages on first failure

No frontend changes. No new tables. No re-deployment of `send-gmail-email` needed (Gmail API enable on Google's side is sufficient).

## What you do not need to do

- Do not reconnect Gmail — connection is healthy.
- Do not touch Google Cloud Console again — Gmail API is enabled.
- Do not republish — these are runtime-only changes.

