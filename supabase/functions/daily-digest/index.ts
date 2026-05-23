import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get all members subscribed to daily digest
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')

  if (!profiles) return new Response('No profiles', { status: 200 })

  const today = new Date().toISOString().split('T')[0]

  for (const profile of profiles) {
    // Get tasks assigned to this user due today or overdue
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, status, priority, due_date')
      .eq('assignee_id', profile.id)
      .neq('status', 'done')
      .lte('due_date', today)
      .order('due_date')
      .limit(10)

    if (!tasks || tasks.length === 0) continue

    const taskRows = tasks
      .map(
        (t) =>
          `<tr>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;">${t.title}</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;">${t.priority}</td>
          <td style="padding:8px;border-bottom:1px solid #f1f5f9;">${t.due_date || 'No date'}</td>
        </tr>`
      )
      .join('')

    const html = `
<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#0f172a;">Your Daily Digest</h2>
  <p style="color:#64748b;">Here are your open tasks for today:</p>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px;text-align:left;color:#94a3b8;font-size:12px;">Task</th>
        <th style="padding:8px;text-align:left;color:#94a3b8;font-size:12px;">Priority</th>
        <th style="padding:8px;text-align:left;color:#94a3b8;font-size:12px;">Due</th>
      </tr>
    </thead>
    <tbody>${taskRows}</tbody>
  </table>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
    <a href="${SUPABASE_URL}/app" style="color:#0ea5e9;">Open Nova →</a>
  </p>
</div>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nova <noreply@yourapp.com>',
        to: profile.email,
        subject: `Nova Daily Digest — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        html,
      }),
    })
  }

  return new Response(JSON.stringify({ sent: profiles.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
