import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const { type, recipientId, taskId, mentionedBy } = await req.json()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get recipient profile
  const { data: recipient } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', recipientId)
    .single()

  if (!recipient) return new Response('Recipient not found', { status: 404 })

  let subject = ''
  let html = ''

  if (type === 'mention') {
    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .single()

    subject = `${mentionedBy} mentioned you in "${task?.title}"`
    html = `<p>Hi ${recipient.full_name},</p>
<p><strong>${mentionedBy}</strong> mentioned you in a comment on the task <strong>"${task?.title}"</strong>.</p>
<p><a href="${SUPABASE_URL}/app">View task →</a></p>`
  } else if (type === 'assignment') {
    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .single()

    subject = `You've been assigned to "${task?.title}"`
    html = `<p>Hi ${recipient.full_name},</p>
<p>You've been assigned to the task <strong>"${task?.title}"</strong>.</p>
<p><a href="${SUPABASE_URL}/app">View task →</a></p>`
  }

  // Send via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Nova <noreply@yourapp.com>',
      to: recipient.email,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    return new Response('Email send failed', { status: 500 })
  }

  // Store notification record
  await supabase.from('notifications').insert({
    user_id: recipientId,
    type,
    title: subject,
    body: `You have a new ${type} notification.`,
    task_id: taskId,
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
