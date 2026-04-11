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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { to, subject, html, sender_name } = await req.json()

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the admin's Gmail tokens (pick the most recent)
    const { data: tokens, error: tokenErr } = await supabase
      .from('gmail_oauth_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (tokenErr || !tokens || tokens.length === 0) {
      console.error('No Gmail tokens found:', tokenErr)
      return new Response(JSON.stringify({ error: 'Gmail not connected. Please connect Gmail in admin settings.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tokenRow = tokens[0]
    let accessToken = tokenRow.access_token

    // Check if token is expired (with 5 min buffer)
    const expiresAt = new Date(tokenRow.token_expiry).getTime()
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
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
        return new Response(JSON.stringify({ sent: true, message_id: retryResult.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      throw new Error(`Gmail API error [${gmailRes.status}]: ${errBody}`)
    }

    const result = await gmailRes.json()
    console.log('Email sent via Gmail:', result.id)

    return new Response(JSON.stringify({ sent: true, message_id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Gmail email error:', err)
    return new Response(JSON.stringify({ error: err.message, sent: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})