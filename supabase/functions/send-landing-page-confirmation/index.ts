import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Fetch registration
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

    // Fetch landing page
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

    // Fetch creator profile
    const { data: creator } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', page.owner_id)
      .single()

    // Replace template variables
    let emailBody = (page.email_body || '').replace(/\{\{name\}\}/g, reg.name || 'there')
      .replace(/\{\{email\}\}/g, reg.email || '')
      .replace(/\{\{phone\}\}/g, reg.phone || '')

    let subject = (page.email_subject || 'Registration Confirmed').replace(/\{\{name\}\}/g, reg.name || 'there')

    // Build HTML email
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #22c55e; font-size: 20px; margin: 0;">Nevora Flow</h1>
    </div>
    <h2 style="font-size: 22px; margin: 0 0 16px; color: #fafafa;">${page.email_heading || 'You are registered!'}</h2>
    <div style="font-size: 15px; line-height: 1.7; color: #d4d4d4; white-space: pre-line;">${emailBody}</div>
    ${page.email_footer_text ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #262626; font-size: 13px; color: #737373;">${page.email_footer_text}</div>` : ''}
    <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #525252;">
      Powered by Nevora Flow
    </div>
  </div>
</body>
</html>`

    // Send via Resend (if available) or log
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (LOVABLE_API_KEY && RESEND_API_KEY) {
      const response = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: `${creator?.full_name || 'Nevora Flow'} <onboarding@resend.dev>`,
          to: [reg.email],
          subject,
          html,
          reply_to: creator?.email || undefined,
        }),
      })
      const result = await response.json()
      console.log('Resend result:', result)
    } else {
      console.log('No email service configured. Would send to:', reg.email)
    }

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
