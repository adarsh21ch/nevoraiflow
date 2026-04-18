

## Root cause (precise)

The user's OTP verification fails with 403 "No Nevorai record found for this email" because:

1. `verify-nevorai-member` (send_otp step) called the Nevorai bridge → bridge confirmed the email belongs to a real Nevorai user → OTP email was sent ✓
2. But the bridge result was **never persisted** into `public.nevorai_member_registry` (table currently has 0 rows total — confirmed by direct DB query)
3. `confirm-nevorai-otp` does a hard lookup against `nevorai_member_registry` and bails with 403 when the row is missing (line 101–103)
4. On the user's first click, OTP was correctly verified and consumed at 17:36:25 — but then the registry-lookup blocked account creation
5. Every subsequent click returns 400 "Code expired or not found" because the OTP is now marked consumed

So two real bugs:
- **Bug A** (functional blocker, blocks login): `confirm-nevorai-otp` requires a registry row that may never exist
- **Bug B** (data hygiene): `verify-nevorai-member` upsert into `nevorai_member_registry` is silently failing for at least this user — table is completely empty

## Fix plan

### Step 1 — Make `confirm-nevorai-otp` self-sufficient
Update `supabase/functions/confirm-nevorai-otp/index.ts`:
- If `nevorai_member_registry` row is missing for the email, **call the bridge directly** (same env vars: `NEVORAI_BRIDGE_URL`, `NEVORAI_BRIDGE_SECRET`) to fetch `isPro`, `full_name`, `phone` live
- Upsert that result into `nevorai_member_registry` so future calls are cached
- If bridge is unreachable AND no cached row exists, fall back to creating a Nevorai-linked free account using just the verified email (do NOT block login — the OTP itself proves email ownership and `verify-nevorai-member` already confirmed they exist on Nevorai before sending the code)

### Step 2 — Fix the silent upsert failure in `verify-nevorai-member`
Update `supabase/functions/verify-nevorai-member/index.ts`:
- Capture the upsert error and log it (currently swallowed)
- Ensure `expires_at` is always set (currently set, but verify column type compatibility)
- Also upsert in the `lookup` mode path, not only when `send_otp` is requested

### Step 3 — Reset the consumed OTP for socialwiire@gmail.com so this user can immediately retry
DB migration: delete the consumed-but-unused OTP row so the user can request a fresh code without hitting the 3-per-hour rate limit.

### Step 4 — Verify end-to-end
After deploy, the user clicks **Send code** → enters OTP → should land in `/dashboard` as a free Nevorai-linked account (or Pro if the bridge marks them Pro). All flows must succeed even if `nevorai_member_registry` starts empty.

## Files to change

- `supabase/functions/confirm-nevorai-otp/index.ts` — self-heal via bridge, never hard-fail on missing registry
- `supabase/functions/verify-nevorai-member/index.ts` — log upsert errors, run upsert in lookup mode too
- New DB migration — clear the stale consumed OTP for `socialwiire@gmail.com`

## Out of scope

- No frontend changes (`AuthPage.tsx`, `NevoraiMemberAccessModal.tsx` already handle the response shape)
- No Gmail/email infrastructure changes (sending side is healthy — confirmed by the OTP arriving)
- No schema changes to `nevorai_member_registry` or `member_otps`

