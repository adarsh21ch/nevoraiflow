# Plan — Comprehensive Security Audit & Hardening (5 Phases)

Approved scope: execute Phase 1 → 5 in order. Pause before any RLS rewrites and show the diff first.

---

## Phase 1 — Input Sanitization (XSS) + Error Handling

- Install `dompurify` + `@types/dompurify`.
- New `src/lib/sanitize.ts`: `sanitizeText`, `sanitizeRichText`, `sanitizeFilename`, `isValidEmail`, `isValidPhone`, `normalizePhone`.
- New `supabase/functions/_shared/sanitize.ts`: regex-based mirror for Deno (no DOM).
- Wire `sanitizeText` into save handlers (NOT onChange — preserve typing UX) in:
  `FunnelEditor`, `LandingPageEditor`, `ProfilePage`, `VideoUploadModal`, `VideoRenameModal`, `VideoLinkModal`, `PrivateLeadForm`, `PublicFunnel` lead capture, `PublicLandingPage` form, `EnterpriseInquiryPage`, `KYCPage`.
- Server mirror in: `submit-landing-page-registration`, `submit-enterprise-inquiry`, `verify-funnel-code`, `refund-request`.
- Audit `dangerouslySetInnerHTML` (only one in shadcn `chart.tsx` for CSS — safe, leave alone).
- Harden `ErrorBoundary`: never show stack traces; replace user-facing `error.message` with generic copy; keep `console.error` for diagnostics.

## Phase 2 — Admin Panel Protection + Audit Trail

- `AdminRoute`: re-check role every 60s (`refetchInterval`) + on `visibilitychange`. Redirect to `/` if it flips false.
- Defense-in-depth role gate inside `AdminLayout`.
- New `supabase/functions/_shared/requireAdmin.ts` helper. Apply to `member-gateway-admin` and other admin-only functions.
- **Migration**: new `admin_audit_logs` table (action, actor_id, target_type, target_id, ip, user_agent, payload jsonb, created_at). RLS: admins SELECT, service role INSERT.
- `logAdminAction()` helper called from KYC, subscriptions, users, settings, member gateway pages.
- "Recent admin activity" widget on `AdminDashboard`.

## Phase 3 — Payment + File Upload Security

- Verify Razorpay HMAC in `payments-webhook`/`razorpay-webhook` BEFORE any DB write; log signature failures to `payment_audit_logs`.
- **Migration**: partial unique index on `funnel_payments.upi_transaction_id` and `live_registrations.upi_transaction_id` (WHERE NOT NULL).
- Frontend pre-check duplicate transaction IDs with friendly error.
- Video uploads: extension/MIME match check, block double extensions, sanitize filename, server-side re-validate in `get-r2-upload-url`.
- KYC docs: allowlist (PDF/JPG/PNG only), 5MB cap, signed URLs (1h) for viewing — never expose raw storage path.

## Phase 4 — Auth, Session, Abuse Prevention

- **Migration**: `auth_attempts (email, ip, success, attempted_at)` + `lead_submission_attempts (ip, funnel_id, created_at)`. Service-role-only RLS.
- New edge function `check-auth-rate-limit`: 5 fails / 30 min / (email+IP) → locked. Wired into `AuthPage` login.
- Password policy: 8+ chars + must contain a digit. New `PasswordStrengthMeter` component on signup, set-password, reset-password.
- OTP: invalidate prior unconsumed OTPs on resend; lock after 3 failed verifies.
- `useAuth.signOut()`: clear `localStorage`/`sessionStorage` (preserve theme key).
- 7-day idle auto-logout via `last_activity` heartbeat.
- Honeypot field on all lead/inquiry forms; server silently 200s if filled.
- Lead rate limit: 10/hour/IP via new edge function check.
- `verify-funnel-code`: enforce ≥6 char codes; 5 fails / 1h lockout per IP+funnel using existing `funnel_access_logs`.
- Exclude funnel-owner self-views from view counts in `get-funnel-data`/increment fn.

## Phase 5 — Data Masking, GDPR, Headers, Account Takeover

- New `src/lib/mask.ts` (`maskPan`, `maskAadhaar`, `maskBank`, `maskPhone`). Apply in `AdminKYCPage`, `KYCPage`, `ProfilePage`, `PaymentsPage`.
- Account takeover:
  - Require current-password re-auth before password change in `SettingsPage`.
  - New edge function `notify-credential-change` — emails OLD address on password/email change.
  - Log device fingerprint hash; new-device login → email notification.
- GDPR:
  - New edge function `export-user-data` → JSON download. "Download my data" button in Settings.
  - New edge function `delete-user-account` → soft-delete + anonymize, type-DELETE confirmation.
  - "Delete lead" button in `LeadsPage` (verify RLS allows it).
- **PAUSE POINT**: Run `supabase--linter`, present findings, and show proposed RLS rewrites for your approval BEFORE executing.
- Security headers via `public/_headers` + `<meta>` CSP fallback in `index.html`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - CSP allowlist: self, `*.supabase.co`, `cdn.nevorai.com`, `*.razorpay.com`, `*.stripe.com`, `accounts.google.com`.

---

## Cross-cutting

- All new edge functions: `verify_jwt = false` default + in-code `getClaims()` validation per project pattern.
- All new tables: RLS enabled at creation, explicit policies with SQL comments.
- No breaking changes — all schema additions are additive.
- Smoke-test each affected flow after every phase.

## Out of scope

- 2FA/TOTP, WAF/DDoS (infra), pen-test report, key rotation (manual op).