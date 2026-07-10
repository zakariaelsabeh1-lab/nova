# Nova — Claude Code Instructions

Nova is a Monday.com-style work-OS SaaS: workspaces, boards, typed columns,
multiple views, collaboration, automations, and a Free/Pro (Stripe) tier.

## Model
- Default: `claude-sonnet-4-6`. Use `claude-opus-4-6` for complex logic only.

## Stack (authoritative — matches the repo)
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- Routing: react-router-dom v7
- Data: @supabase/supabase-js + @tanstack/react-query (fetch/cache), zustand (auth)
- Drag & drop: @dnd-kit/core + @dnd-kit/sortable
- Animation: framer-motion
- Charts: recharts
- UI: Radix primitives + CVA + tailwind-merge (`cn()` helper), lucide-react icons
- Forms: react-hook-form + zod
- Payments: Stripe (@stripe/stripe-js client, stripe server SDK in /api Vercel functions)
- Backend: Supabase (auth + Postgres + storage + realtime), Resend for email
- Hosting: Vercel

## Design tokens (defined in src/index.css @theme — extend, don't replace)
- Navy: #0f172a / #060c18 / #1e293b   · Teal (accent): #0ea5e9 / #0284c7 / #38bdf8
- Purple: #6366f1 / #8b5cf6            · Surfaces: bg #f1f5f9, card #fff, border #e2e8f0
- Text: #0f172a / #64748b / #94a3b8    · success #22c55e, warning #f59e0b, danger #ef4444
- Font: Plus Jakarta Sans

## Data model
Workspaces > Boards > Groups > Items > Subitems. Boards have typed board_columns;
values live in cell_values (jsonb). Plus: updates, activity_log, files, automations,
automation_runs, notifications, subscriptions.

## Rules
- Reuse existing design tokens, component patterns, and naming. Do not restyle working UI.
- Optimistic updates with rollback + toasts on every mutation.
- Migrations in supabase/migrations/ must be additive — never drop tables with data.
- Enforce plan limits server-side (RLS / insert checks), not just in the client.
- Use .env for all credentials. Never hardcode keys. Keep .env.example current.
- Run `npm run build` after each phase and fix errors.

## Auth
- Supabase email/password + magic link, protected routes, onboarding creates first
  workspace + sample board. Roles: admin, member, viewer (viewer is read-only, RLS-enforced).

## Premium (Stripe test mode)
- Free: 2 boards/workspace, 3 members, 5 automations, 100MB storage, no Timeline/Dashboard,
  CSV export locked. Pro ($12/user/mo): unlimited, all views, 10GB, export unlocked.
- usePlan() hook + <Gate feature="…"> wrapper render a paywall for gated features.
