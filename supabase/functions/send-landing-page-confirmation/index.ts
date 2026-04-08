const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { registration_id, landing_page_id } = await req.json()

    if (!registration_id || !landing_page_id) {
      return new Response(JSON.stringify({ error: 'Missing params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: reg } = await supabase
      .from('landing_page_registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (!reg || !reg.email) {
      return new Response(JSON.stringify({ sent: false, reason: 'No email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: page } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', landing_page_id)
      .single()

    if (!page || !page.send_confirmation_email) {
      return new Response(JSON.stringify({ sent: false, reason: 'Email disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: creator } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', page.owner_id)
      .single()

    let emailBody = (page.email_body || '').replace(/\{\{name\}\}/g, reg.name || 'there')
      .replace(/\{\{email\}\}/g, reg.email || '')
      .replace(/\{\{phone\}\}/g, reg.phone || '')

    let subject = (page.email_subject || 'Registration Confirmed').replace(/\{\{name\}\}/g, reg.name || 'there')

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #ffffff; color: #1a1a1a; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #22c55e; font-size: 20px; margin: 0;">Nevorai Flow</h1>
    </div>
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #1a1a1a;">${page.email_heading || 'You are registered!'}</h2>
    <div style="font-size: 15px; line-height: 1.7; color: #555555; white-space: pre-line;">${emailBody}</div>
    ${page.email_footer_text ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 13px; color: #999999;">${page.email_footer_text}</div>` : ''}
    <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #999999;">
      Powered by Nevorai Flow
    </div>
  </div>
</body>
</html>`

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    const senderDomain = 'notify.flow.nevorai.com'
    const fromName = creator?.full_name || 'Nevorai Flow'

    const result = await sendLovableEmail(
      {
        to: reg.email,
        subject,
        html,
        from: `${fromName} <noreply@flow.nevorai.com>`,
        sender_domain: senderDomain,
        purpose: 'transactional',
        idempotency_key: `lp-confirm-${registration_id}`,
        message_id: `lp-confirm-${registration_id}`,
      },
      { apiKey: LOVABLE_API_KEY }
    )

    console.log('Email sent result:', JSON.stringify(result))

    // Update registration
    await supabase.from('landing_page_registrations').update({
      confirmation_email_sent: true,
      confirmation_email_sent_at: new Date().toISOString(),
    }).eq('id', registration_id)

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Email error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
