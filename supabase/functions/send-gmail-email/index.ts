const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper: base64url encode for Gmail API
function base64url(str: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')

    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type AdminAccessResult =
  | { kind: 'error'; response: Response }
  | { kind: 'ok'; adminSupabase: any }

async function requireAdminAccess(
  authHeader: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<AdminAccessResult> {
  const userSupabase = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await userSupabase.auth.getUser()
  if (userError || !user) {
    return { kind: 'error', response: jsonResponse({ error: 'Unauthorized' }, 401) }
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: isAdmin, error: roleError } = await adminSupabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })

  if (roleError || !isAdmin) {
    return { kind: 'error', response: jsonResponse({ error: 'Admin access required' }, 403) }
  }

  return { kind: 'ok', adminSupabase }
}

async function getLatestToken(supabase: any) {
  const { data: tokens, error: tokenErr } = await supabase
    .from('gmail_oauth_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (tokenErr) {
    throw new Error(tokenErr.message)
  }

  return tokens?.[0] ?? null
}

async function refreshAccessToken(supabase: any, tokenRow: any): Promise<string> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokenRow.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Token refresh failed: ${errText}`)
  }

  const data = await res.json()
  const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()

  await supabase.from('gmail_oauth_tokens').update({
    access_token: data.access_token,
    token_expiry: newExpiry,
  }).eq('id', tokenRow.id)

  return data.access_token
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (req.method === 'GET') {
      if (!authHeader) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      const adminAccess = await requireAdminAccess(authHeader, supabaseUrl, serviceRoleKey)
      if (adminAccess.kind === 'error') {
        return adminAccess.response
      }

      const tokenRow = await getLatestToken(adminAccess.adminSupabase)

      return jsonResponse({
        connected: Boolean(tokenRow),
        email: tokenRow?.gmail_email ?? null,
        token_expiry: tokenRow?.token_expiry ?? null,
      })
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: `Method ${req.method} not allowed` }, 405)
    }

    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
    const claims = token ? parseJwtClaims(token) : null

    let supabase: any
    if (claims?.role === 'service_role') {
      supabase = createClient(supabaseUrl, serviceRoleKey)
    } else {
      const adminAccess = await requireAdminAccess(authHeader, supabaseUrl, serviceRoleKey)
      if (adminAccess.kind === 'error') {
        return adminAccess.response
      }

      supabase = adminAccess.adminSupabase
    }

    const payload = await req.json().catch(() => null)
    const to = typeof payload?.to === 'string' ? payload.to.trim() : ''
    const subject = typeof payload?.subject === 'string' ? payload.subject.trim() : ''
    const html = typeof payload?.html === 'string' ? payload.html.trim() : ''
    const sender_name = typeof payload?.sender_name === 'string' ? payload.sender_name.trim() : undefined

    if (!to || !subject || !html) {
      return jsonResponse({ error: 'Missing required fields: to, subject, html' }, 400)
    }

    // Get the admin's Gmail tokens (pick the most recent)
    const tokenRow = await getLatestToken(supabase)

    if (!tokenRow) {
      console.error('No Gmail tokens found')
      return jsonResponse({ error: 'Gmail not connected. Please connect Gmail in admin settings.' }, 503)
    }

    let accessToken = tokenRow.access_token

    // Check if token is expired (with 5 min buffer)
    const expiresAt = new Date(tokenRow.token_expiry).getTime()
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt - 5 * 60 * 1000) {
      console.log('Access token expired, refreshing...')
      accessToken = await refreshAccessToken(supabase, tokenRow)
    }

    // Build MIME message
    const fromName = sender_name || 'Nevorai Flow'
    const fromEmail = tokenRow.gmail_email
    const mimeMessage = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n')

    const encodedMessage = base64url(mimeMessage)

    // Send via Gmail API
    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    })

    if (!gmailRes.ok) {
      const errBody = await gmailRes.text()
      console.error(`Gmail API error [${gmailRes.status}]:`, errBody)

      // If 401, try refreshing token once more
      if (gmailRes.status === 401) {
        accessToken = await refreshAccessToken(supabase, tokenRow)
        const retryRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedMessage }),
        })

        if (!retryRes.ok) {
          const retryErr = await retryRes.text()
          throw new Error(`Gmail API retry failed [${retryRes.status}]: ${retryErr}`)
        }

        const retryResult = await retryRes.json()
        console.log('Email sent via Gmail (after retry):', retryResult.id)
        return jsonResponse({ sent: true, message_id: retryResult.id })
      }

      throw new Error(`Gmail API error [${gmailRes.status}]: ${errBody}`)
    }

    const result = await gmailRes.json()
    console.log('Email sent via Gmail:', result.id)

    return jsonResponse({ sent: true, message_id: result.id })
  } catch (err: any) {
    console.error('Gmail email error:', err)
    return jsonResponse({ error: err.message, sent: false }, 500)
  }
})