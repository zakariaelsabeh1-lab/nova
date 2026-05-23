import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://nova.vercel.app'
// Use Resend's shared domain for testing; swap to verified domain in prod
const FROM_ADDRESS = Deno.env.get('FROM_EMAIL') || 'Nova <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { type, recipientId, taskId, mentionedBy, email, role, invitedBy } = body

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    let toEmail = email
    let toName = ''
    let subject = ''
    let html = ''

    if (type === 'invite') {
      // Invite email — recipient is an external email, not a profile
      subject = `${invitedBy} invited you to Nova`
      html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:16px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:14px;font-size:24px;font-weight:900;color:white;">N</div>
            <h1 style="margin:16px 0 4px;font-size:22px;font-weight:800;color:white;">You're invited to Nova</h1>
            <p style="margin:0;color:#94a3b8;font-size:14px;">Your workspace. Your team.</p>
          </div>
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;">
            <strong style="color:white;">${invitedBy}</strong> has invited you to join Nova as a <strong style="color:#0ea5e9;">${role}</strong>.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;font-weight:700;font-size:15px;border-radius:12px;text-decoration:none;">
              Accept Invitation →
            </a>
          </div>
          <p style="color:#475569;font-size:12px;text-align:center;">If you didn't expect this, you can ignore this email.</p>
        </div>`
    } else {
      // Notification to existing user
      const { data: recipient } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', recipientId)
        .single()

      if (!recipient) {
        return new Response(JSON.stringify({ error: 'Recipient not found' }), { status: 404, headers: corsHeaders })
      }

      toEmail = recipient.email
      toName = recipient.full_name

      if (type === 'mention') {
        const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single()
        subject = `${mentionedBy} mentioned you in "${task?.title}"`
        html = `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:16px;">
            <p style="color:#94a3b8;">Hi <strong style="color:white;">${toName}</strong>,</p>
            <p style="color:#94a3b8;line-height:1.6;"><strong style="color:white;">${mentionedBy}</strong> mentioned you in a comment on <strong style="color:#0ea5e9;">"${task?.title}"</strong>.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">View task →</a>
            </div>
          </div>`

        await supabase.from('notifications').insert({
          user_id: recipientId, type, title: subject,
          body: `${mentionedBy} mentioned you.`, task_id: taskId,
        })
      } else if (type === 'assignment') {
        const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single()
        subject = `You've been assigned to "${task?.title}"`
        html = `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:16px;">
            <p style="color:#94a3b8;">Hi <strong style="color:white;">${toName}</strong>,</p>
            <p style="color:#94a3b8;line-height:1.6;">You've been assigned to <strong style="color:#0ea5e9;">"${task?.title}"</strong>.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">View task →</a>
            </div>
          </div>`

        await supabase.from('notifications').insert({
          user_id: recipientId, type, title: subject,
          body: `You were assigned to a task.`, task_id: taskId,
        })
      }
    }

    if (!toEmail || !subject) {
      return new Response(JSON.stringify({ error: 'Nothing to send' }), { status: 400, headers: corsHeaders })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: toEmail, subject, html }),
    })

    const resBody = await res.json()

    if (!res.ok) {
      console.error('Resend error:', resBody)
      return new Response(JSON.stringify({ error: 'Email send failed', detail: resBody }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: resBody.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
