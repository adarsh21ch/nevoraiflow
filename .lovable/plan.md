

## Plan: Migrate Video Delivery to cdn.nevorai.com

### What's happening now
- Videos are stored in R2 with keys like `videos/{id}/filename.mp4`
- The `confirm-r2-upload` edge function builds `public_url` using the `R2_PUBLIC_URL` secret (currently `https://pub-ae283552759240cf98fa3f6ccb20733d.r2.dev`)
- All 2 existing videos have URLs pointing to `pub-*.r2.dev`
- Frontend components read `public_url` from the `video_assets` table directly

### Changes required

**1. Update the `R2_PUBLIC_URL` secret**
- Change the value from `https://pub-ae283552759240cf98fa3f6ccb20733d.r2.dev` to `https://cdn.nevorai.com`
- This ensures all future uploads automatically get CDN URLs
- No code change needed in `confirm-r2-upload/index.ts` — it already uses `R2_PUBLIC_URL` dynamically

**2. Database migration — normalize existing video URLs**
- Run a SQL migration to update all existing `public_url` values:
```sql
UPDATE video_assets
SET public_url = REPLACE(public_url, 'https://pub-ae283552759240cf98fa3f6ccb20733d.r2.dev', 'https://cdn.nevorai.com')
WHERE public_url LIKE '%pub-ae283552759240cf98fa3f6ccb20733d.r2.dev%';
```

**3. No frontend code changes needed**
- All frontend components (`PublicFunnel.tsx`, `PublicVideoPage.tsx`, `FunnelEditor.tsx`, `VideosPage.tsx`, `VideoPickerModal.tsx`) read `public_url` from the database — they don't hardcode any R2 domain
- Once the DB URLs are updated and the secret is changed, everything works automatically

### CORS note
Since `cdn.nevorai.com` is a custom domain on the R2 bucket, CORS headers are served by Cloudflare automatically. The video element just needs GET access which custom domains provide by default. No additional CORS config is needed for `<video src="...">` tags (same-origin policy doesn't apply to media elements).

### Cache headers
Cloudflare CDN automatically caches static assets served through custom domains. For optimal performance, set a Cache-Control rule in the Cloudflare dashboard for the `cdn.nevorai.com` domain:
- `Cache-Control: public, max-age=31536000, immutable` for the `videos/*` path
- This is safe because video files are immutable (each upload gets a unique path with the video ID)

### Production readiness
- Moving off `r2.dev` removes the undocumented rate limits on the dev subdomain
- Cloudflare CDN edge caching means videos are served from the nearest POP to the viewer
- This change alone raises the safe concurrent viewer estimate from ~100 to ~500+

### Summary of actions
1. Update `R2_PUBLIC_URL` secret to `https://cdn.nevorai.com`
2. Run DB migration to rewrite 2 existing URLs
3. No code changes to any frontend or backend files

