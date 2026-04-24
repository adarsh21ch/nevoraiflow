

# Plan — Free Users Can Add Videos via nFlow Link + "Borrow This Video" Button on Public Funnels

Two related changes that together let free users participate without uploading:
1. Free users get the "Add by nFlow Link" capability (currently Pro-only).
2. Every public funnel video shows a **Copy nFlow Link** button (creator-controlled toggle) so any viewer can grab the video ID and reuse it via the link flow.

Daily view limits already exist (10/day for free via `increment_user_daily_view`) — no changes there.

---

## 1. Free tier: enable "Add by nFlow Link"

Currently `video_link` sits in `PREMIUM_FEATURES` in `src/hooks/usePlan.tsx`, blocking free users.

**Change:** Remove `"video_link"` from the `PREMIUM_FEATURES` array. Free users keep the 3-video gallery cap (already enforced by `video_limit: 3`), but those 3 slots can now be **either** uploads (still Pro-only) **or** linked nFlow videos.

The existing `VideoLinkModal` flow already:
- Validates the video exists and is `is_shared = true`
- Inserts into `video_asset_access` (no storage cost — pure pointer)
- Shows up in the user's gallery with the "Added via Link" badge

No DB or modal changes needed.

**On VideosPage** (`src/pages/VideosPage.tsx`): the "Upload Video" button stays gated for free users (existing behavior via `feature_video_upload`), but "Add by nFlow Link" becomes always-visible. Free users see it as their primary option.

---

## 2. Creator-controlled "Allow viewers to reuse this video" toggle

**New field on `video_assets`:** `allow_copy_link boolean DEFAULT true` (migration). Creator chooses per-video whether the public viewer sees the Copy nFlow Link button.

**Where the creator toggles it:**
- `VideoUploadModal` — checkbox "Allow others to reuse this video via nFlow Link" (default on)
- `VideoRenameModal` — same checkbox so existing videos can be updated
- Toggle is also visible on each video card in `VideosPage` (small switch under actions)

---

## 3. "Copy nFlow Link" button on public viewers

Three surfaces show the public video:

**a) `PublicVideoPage` (`/video/:id`)** — directly under the video, add a button:
> 📋 Copy nFlow Link · Use this video in your own funnel

Only renders when `video.allow_copy_link === true`. Clicking copies `${origin}/video/${id}`. Toast: "Link copied. Paste it into nFlow → Videos → Add by nFlow Link."

**b) `PublicFunnel` (`/f/:slug`)** — single-video funnel viewer. The selected `video_assets` row already loads via `get-funnel-data`. Add the same Copy nFlow Link button below the video player area, gated on `allow_copy_link`.

**c) `MultiStepViewer`** — same button rendered per video step, gated on each step's video `allow_copy_link`.

The button is **viewer-facing** (not creator-only) — the whole point is that any visitor can grab the link.

---

## 4. How a free user discovers and uses an nFlow link

End-to-end flow this enables:

```text
Creator A (Pro)
  └─ uploads video → marks "allow reuse" ON → embeds in funnel

Visitor B (free user, signed up later)
  ├─ watches Creator A's funnel
  ├─ sees [📋 Copy nFlow Link] under video
  ├─ clicks → /video/<uuid> copied
  ├─ goes to nFlow → Videos → Add by nFlow Link
  ├─ pastes → video appears in B's gallery (no storage used)
  └─ B uses it in their own funnel
        └─ capped at 10 views/day (existing free limit)
```

No admin involvement. No file storage cost. Daily view cap already enforces fair use.

---

## Files touched

| File | Change |
|------|--------|
| `supabase/migrations/<new>.sql` | Add `allow_copy_link boolean default true` to `video_assets` |
| `src/hooks/usePlan.tsx` | Remove `"video_link"` from `PREMIUM_FEATURES` |
| `src/components/VideoUploadModal.tsx` | Add "Allow reuse" checkbox; persist on insert |
| `src/components/VideoRenameModal.tsx` | Add same checkbox; update on save |
| `src/pages/VideosPage.tsx` | Add per-card reuse toggle; ensure Add-by-Link button always shown |
| `src/pages/PublicVideoPage.tsx` | Add Copy nFlow Link button |
| `src/pages/PublicFunnel.tsx` | Add Copy nFlow Link button below player |
| `src/components/funnel/MultiStepViewer.tsx` | Add Copy nFlow Link per video step |
| `supabase/functions/get-funnel-data/index.ts` | Include `allow_copy_link` in selected video columns |

## Not changing

- Upload capability (still Pro-only — free users only link, not upload)
- Free 3-video gallery cap (linked + uploaded counted together)
- Daily view limit (10/day free, already enforced)
- `video_asset_access` mechanism (already perfect for this)
- Pricing, plans, UI design system

