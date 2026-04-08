
# Nevora Flow — Landing Pages + Enhanced Steps

## Phase 1: Database & Navigation
1. **Database migration** — Create `landing_pages`, `landing_page_registrations`, `landing_page_view_logs` tables + alter `funnel_steps` with new columns
2. **Sidebar update** — Add "Landing Pages" nav item between Funnels and Videos

## Phase 2: Landing Pages CRUD
3. **Landing Pages list** — `/landing-pages` with cards, search, filters, empty state
4. **Landing Page builder** — 7-tab editor (Page Info, Design, Form, Email, Video, Links, Publish)

## Phase 3: Edge Functions & Public Page
5. **submit-landing-page-registration** — Form submission with honeypot, rate limiting, validation
6. **send-landing-page-confirmation** — Confirmation email via Resend
7. **get-landing-page-data** — Public data fetch with caching
8. **Public landing page** — `/l/:slug` with registration form, post-submit video, localStorage persistence

## Phase 4: Login/Signup & Registrations
9. **Auth modals** on landing page (login/signup)
10. **Registrations dashboard** — Table with search, filters, CSV export, detail expand

## Phase 5: Enhanced Step Unlocks
11. **Builder UI** — Timer settings, between-step audio/text config in funnel step editor
12. **Public viewer** — Countdown timer, between-step audio/text display, auto-unlock logic

## Phase 6: Analytics
13. **Landing page analytics** — Views, registrations, conversion rates, charts

---

Each phase will be implemented sequentially. I'll start with Phase 1 (database + navigation) and proceed through each phase after confirmation.
