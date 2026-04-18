

The user is asking whether the auto-detect-on-typing plan is worth doing — does it help users, is it safe, or should we skip it?

## Honest assessment

**Verdict: Worth doing. Low risk, high UX win. Recommended.**

### Does it help the user?

Yes, meaningfully:
- **Removes a click.** Today: type email → click Continue → wait → see result. With auto-detect: type email → result appears. One less step on the most-used screen.
- **Feels magical for Nevorai users.** The moment they finish typing their email, they see "Welcome back, Nevorai family!" — instant recognition builds trust.
- **Reduces confusion.** Users who don't know they're "part of the Nevorai family" discover it before committing to a signup path. Fewer support questions like "why am I being asked for a password?"
- **Mobile-friendly.** On phones, tapping Continue after typing is extra friction. Auto-detect on blur (when keyboard closes) feels natural.

### Is it safe?

Yes, with the safeguards already in the plan:
- **No new data exposed.** We're calling the same `verify-nevorai-member` lookup endpoint that already exists — just earlier. The endpoint only returns `exists` / `isPro` / `fullName` — no sensitive data.
- **No account creation happens on lookup.** Auto-detect only *reads*. Account creation still requires explicit OTP verification (unchanged).
- **Rate limiting already exists** on the bridge (3 OTP sends/hour). The lookup itself is cheap and cached server-side for 24h per email.
- **Debounce + AbortController** prevents hammering the endpoint while typing.
- **Per-email client cache** means re-typing the same email doesn't re-hit the function.

### Risks worth naming honestly

1. **Email enumeration.** Auto-detect makes it slightly easier for someone to probe "is this email a Nevorai user?" by typing emails. *Mitigation:* this is already possible via the manual Continue button — auto-detect doesn't change the attack surface, just the speed. If we're worried, we can add IP-based rate limiting on lookup mode (currently only OTP send is rate-limited).
2. **Extra edge function calls.** Each valid email typed = 1 lookup call. For a busy auth page this adds load. *Mitigation:* 700ms debounce + per-email cache keeps it minimal. Real-world cost: probably <2x current call volume.
3. **Flicker risk.** If the status row appears/disappears as the user edits, it can feel jumpy. *Mitigation:* show the "Checking…" state for a minimum 300ms so it doesn't flash, and only clear the success state when email actually changes.

### What we could skip if we wanted to be conservative

If you'd rather avoid it, the current "click Continue" flow already works correctly — auto-detect is purely a UX polish, not a functional fix. The trade-off:
- **Skip it:** zero risk, slightly worse UX, one extra click per signup.
- **Do it:** small added complexity in `AuthPage.tsx`, marginal extra load on the bridge, noticeably smoother experience.

### My recommendation

**Do it, but add one safeguard the original plan didn't mention:** add lightweight IP rate limiting (e.g. 30 lookups per IP per minute) to `verify-nevorai-member` lookup mode. This closes the enumeration concern without affecting real users.

---

## Final plan (revised)

1. Add debounced (700ms) + on-blur email checker to `AuthPage.tsx`.
2. Show inline "Checking…" / "Welcome back, Nevorai family!" status under the email input with a minimum 300ms display to prevent flicker.
3. On Nevorai match, reveal "Send code" CTA inline (don't auto-jump — let user confirm).
4. Cache results per email in client + abort in-flight requests on re-typing.
5. **Add IP rate limit (30/min) to `verify-nevorai-member` lookup mode** to mitigate enumeration.
6. Test with three emails: brand-new, free Nevorai, Pro Nevorai — including rapid-typing and paste scenarios.

