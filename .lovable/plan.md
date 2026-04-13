

# Update Google OAuth Credentials

## What This Does
Replace the current `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets with new ones from your other Google Cloud Console account, then clear the old Gmail connection so you can re-authorize with the new account.

## Steps

1. **Update secrets** — Use the add_secret tool to set new values for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

2. **Clear old tokens** — Run a migration to delete all rows from `gmail_oauth_tokens` so the old connection is removed.

3. **Redeploy edge functions** — Redeploy `gmail-oauth-init`, `gmail-oauth-callback`, and `send-gmail-email` so they pick up the new credentials.

4. **Re-connect Gmail** — You'll go to Admin Settings and click "Connect Gmail" to authorize the new Google account.

## Important
In your **new** Google Cloud Console project, make sure:
- Gmail API is enabled
- OAuth consent screen is configured
- This redirect URI is added: `https://atwnmovdnblcqyvhaxls.supabase.co/functions/v1/gmail-oauth-callback`

