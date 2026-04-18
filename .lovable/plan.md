

The user wants ALL Nevorai users (Pro + free) to have a smooth path into nFlow — not just Pro members. The two databases are separate Supabase projects with independent `auth.users`, so we need a bridge that recognizes any existing Nevorai user (regardless of Pro status) and gives them a frictionless way in.

**Recommended approach: OTP-verified account linking (passwordless for Nevorai users)**

Why OTP over "use the same password":
- Passwords cannot be shared across separate Supabase projects (hashed differently, no cross-project auth API).
- "Use the same password" would require either (a) the user re-typing it and us validating against the other project — which means storing/forwarding plaintext passwords, a security red flag, or (b) syncing password hashes — not possible.
- OTP to the verified email is the industry standard for cross-system identity proof (used by Notion, Linear, Slack workspace switching). It proves email ownership without ever touching the user's Nevorai password.
- Works identically for Pro and free users — only the resulting plan differs.

**The unified flow:**

```text
User lands on /auth (signup or login tab)
         |
         v
Enters email + clicks Continue
         |
         v
[Bridge check: verify-nevorai-member with mode=lookup]
         |
   +-----+---------------------------+----------------------+
   |                                  |                      |
Not in Nevorai          In Nevorai (free user)        In Nevorai (Pro user)
   |                                  |                      |
   v                                  v                      v
Normal signup form        "You're part of the          "You're a Nevorai Pro
(name, email,              Nevorai family! Verify      member — verify your
password)                  your email to continue."    email to unlock
                           [Send OTP button]            Individual plan free."
                                  |                     [Send OTP button]
                                  v                            |
                          OTP entered + verified               v
                                  |                    OTP entered + verified
                                  v                            |
                          Auto-create nFlow                    v
                          account (prefill name           Auto-create nFlow
                          from bridge), set                account + flip
                          random password,                 nevorai_member flag
                          send to dashboard                + Individual plan
                                                                |
                                                                v
                                                          Dashboard
```

**Key UX decisions:**
1. **Email-first on the auth page**: Single email field gates the flow. After typing email + clicking Continue, we decide what to show next based on bridge result. This avoids two parallel paths.
2. **No password for Nevorai users**: OTP creates the account. They can set a password later from Settings if they want. This removes the "why do I need a new password?" friction entirely.
3. **Free Nevorai users still get OTP linking**: Same flow as Pro, but no plan upgrade — just a recognized account with a `nevorai_member` flag (active=false for free, active=true for Pro). This lets us message them ("Welcome back, Nevorai family member") without giving plan benefits.
4. **Brand-new users (no Nevorai account)**: Standard email + password signup, unchanged.
5. **Existing nFlow users**: If the email already has an nFlow account, just log them in normally (password field appears).

**What needs to change:**

1. **Bridge function (`is-pro-user` on Nevorai side)** — Already returns `email`, `phone`, `fullName`, `isPro`, `plan`. We need it to also return `exists: true` even when `isPro: false`, so we can detect free Nevorai users. Confirm this with one curl test; if missing, ask Nevorai team to add it.

2. **`verify-nevorai-member` edge function (nFlow side)** — Extend `mode=lookup` response to include `exists` (any Nevorai user) and `isPro` (subset who are Pro). Currently it only flags Pro members.

3. **New edge function: `send-nevorai-link-otp`** — Generates 6-digit OTP, stores in `member_otps` table (already exists), sends via Gmail. Works for both Pro and free Nevorai users.

4. **Extend `confirm-nevorai-otp`** — On successful OTP verify:
   - If nFlow account exists for this email → log them in (issue session).
   - If not → create nFlow user via admin API with random password, set `nevorai_member=true`, `nevorai_member_active=<isPro>`, prefill `full_name` and `phone` from bridge.
   - Return a session token the client can set.

5. **Rework `AuthPage.tsx`** — Convert to email-first flow:
   - Step 1: Email input + Continue button.
   - Step 2 (branched on bridge result): show password (existing nFlow user), show OTP send (Nevorai user), or show full signup form (brand new).
   - Reuse existing `NevoraiMemberAccessModal` styling but inline it as a step.

6. **`profiles` table** — No schema change needed. `nevorai_member` and `nevorai_member_active` columns already exist. Free Nevorai users get `nevorai_member=true, nevorai_member_active=false`.

**Security notes:**
- OTP: 6 digits, 10-minute expiry, max 5 attempts, rate-limited to 3 sends per email per hour.
- Bridge calls are server-to-server with `NEVORAI_BRIDGE_SECRET` — never exposed to client.
- We never receive or store the user's Nevorai password.
- Random passwords for OTP-created accounts are 32-char crypto-random; users can reset via standard "Forgot password" if they ever want password login.

**What I will NOT do:**
- Will not ask users to re-type their Nevorai password (security + UX anti-pattern).
- Will not sync password hashes across projects (impossible + insecure).
- Will not silently create accounts without OTP verification (account takeover risk if someone guesses a Nevorai user's email).
- Will not block brand-new users from normal signup — the email-first gate just routes them to the right path.

**Open question worth confirming before I build:**
The Nevorai `is-pro-user` bridge currently focuses on Pro detection. I need it to also confirm "yes, this email exists in Nevorai even though they're not Pro." If the Nevorai team can add an `exists: true` field for any registered user (Pro or free), the flow above works as-is. If they can't, we'd treat "isPro=false" as "not in Nevorai at all" and free Nevorai users would just go through normal signup (no special welcome) — still functional, just less personalized.

I'll proceed with the assumption the bridge can return `exists` for all users. If after testing it can't, the fallback is graceful (free users sign up normally).

---

## Plan summary

1. Test/confirm Nevorai bridge returns `exists` for all registered users (not just Pro).
2. Extend `verify-nevorai-member` to surface `exists` + `isPro` separately in lookup mode.
3. Build `send-nevorai-link-otp` edge function (OTP generation + Gmail send).
4. Extend `confirm-nevorai-otp` to create-or-login the nFlow account on successful OTP.
5. Rework `AuthPage.tsx` into email-first flow with three branches: existing nFlow login, Nevorai OTP link, brand-new signup.
6. Test end-to-end with three accounts: brand-new email, free Nevorai user, Pro Nevorai user.

