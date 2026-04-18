
## Exact problem

This is primarily on our side, not Google’s side.

I checked the actual code and the backend logs. There are 3 separate bugs causing the “connected but no emails arrive” problem:

1. **Backend-to-backend Gmail sends are being rejected before Gmail is even called**
   - `process-email-queue` and `send-landing-page-confirmation` call `send-gmail-email` using the backend secret in the `Authorization` header.
   - `send-gmail-email` only works if that header parses like a JWT with `role = service_role`, otherwise it falls back to “admin user” auth and returns `401 Unauthorized`.
   - Your logs show exactly that: `{"error":"Unauthorized"}` from `send-gmail-email`.
   - If Google were the problem, the logs would show a Gmail API error message, not this internal 401.

2. **OTP emails are queued in the wrong format**
   - `verify-nevorai-member` enqueues:
     - `template`
     - `data`
     - `to`
     - `subject`
   - But `process-email-queue` only knows how to send messages that already contain **final `html` content**.
   - So even after fixing the auth bug, OTP emails still will not send correctly until that payload is rendered properly.

3. **Landing page registration pretends the email was sent even when it failed**
   - `submit-landing-page-registration` triggers email sending in a fire-and-forget way and ignores the result.
   - So the UI can say “email sent” even when the backend later fails.

## Conclusion

- **Current delivery failure is app-side.**
- **Google Console is not the main blocker for the mail-not-sending issue you are seeing right now.**
- Your Gmail connection can appear “connected”, but actual sending still fails because the internal send pipeline is broken.

## What I will change after approval

### 1. Fix internal authentication for `send-gmail-email`
Update `supabase/functions/send-gmail-email/index.ts` so backend callers are accepted reliably.

Plan:
- Keep admin-only access for browser status/disconnect actions.
- Add a safe internal backend path for other edge functions using the project backend secret.
- Do not depend only on JWT claim parsing for internal calls.

This will fix:
- queue dispatcher → Gmail send
- landing page confirmation → Gmail send

### 2. Fix the OTP email payload
Update `supabase/functions/verify-nevorai-member/index.ts` so OTP emails are queued with a complete sendable payload:
- `to`
- `subject`
- `html`
- `label`
- `message_id`
- `queued_at`

That way `process-email-queue` can actually deliver the OTP.

### 3. Fix misleading “email sent” behavior
Update the landing page flow so it does not falsely imply success when delivery failed.

Plan:
- Improve backend handling around `send-landing-page-confirmation`
- Make the registration email path log/send in a way that reflects real delivery state
- Keep the registration submission successful, but make email state accurate

### 4. Add a real test-send path in admin settings
Update the settings page so you can verify Gmail with an actual send, not just connection status.

Plan:
- Add “Send Test Email”
- Send to the connected Gmail address
- Show the real backend result
- This confirms end-to-end delivery, not just OAuth connection

### 5. Re-test the full email chain
After implementation, verify all 3 flows:
1. Admin Gmail test email
2. Landing page confirmation email
3. Nevorai OTP email

## Files to update

- `supabase/functions/send-gmail-email/index.ts`
- `supabase/functions/process-email-queue/index.ts`
- `supabase/functions/send-landing-page-confirmation/index.ts`
- `supabase/functions/verify-nevorai-member/index.ts`
- `src/pages/AdminSettingsPage.tsx`

## What you may need to check manually

Only as a secondary check, not the main issue:
- Google OAuth redirect URI still correct
- Gmail API enabled
- OAuth consent screen valid
- Gmail account not manually revoked

But again: **the current “connected but mail not sending” bug is from our backend flow, not mainly from Google settings.**
