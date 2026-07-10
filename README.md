# Nova — Work OS

A Monday.com-style work operating system: workspaces, boards with typed columns,
multiple views (Table, Kanban, Calendar, Timeline, Dashboard), threaded updates,
activity logs, files, automations, realtime collaboration, and a Free/Pro tier
powered by Stripe.

## Stack

- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **Routing:** react-router-dom v7 · **State/data:** zustand + @tanstack/react-query
- **Drag & drop:** @dnd-kit · **Animation:** framer-motion · **Charts:** recharts
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **Payments:** Stripe (client `@stripe/stripe-js`, server SDK in Vercel `/api` functions)
- **Hosting:** Vercel · **Email:** Resend

## Getting started

```bash
npm install
cp .env.example .env      # fill in the values below
npm run dev
```

### Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client | Supabase anon key |
| `VITE_RESEND_API_KEY` | client | Resend key (invite emails, optional) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | client | Stripe publishable key (test mode) |
| `VITE_STRIPE_PRICE_MONTHLY` / `VITE_STRIPE_PRICE_ANNUAL` | client | Price IDs (display) |
| `STRIPE_SECRET_KEY` | server | Stripe secret key (test mode) |
| `STRIPE_WEBHOOK_SECRET` | server | Webhook signing secret |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` | server | Price IDs used at checkout |
| `SUPABASE_URL` | server | Same project URL (for the webhook) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Service role key — webhook writes `subscriptions` |
| `APP_URL` | server | App origin for Stripe redirect callbacks |

> Client vars are `VITE_`-prefixed and bundled into the browser. Server vars (no
> prefix) are only read by the `/api` serverless functions — never expose the
> service role or Stripe secret key to the client.

## Database migrations

Migrations live in `supabase/migrations/` and are **additive** — they never drop
tables with data. They introduce the workspace model on top of the original
schema and backfill existing boards/columns/tasks into the new
groups/items/cell_values model.

Run them in order against your Supabase project:

```bash
# Using the Supabase CLI (recommended)
supabase db push

# …or paste each file (in filename order) into the Supabase SQL editor:
#   0001 workspaces_and_members     0005 backfill
#   0002 board_structure            0006 rls_and_triggers
#   0003 collaboration              0007 storage
#   0004 automations_notifications  0008 invites_workspace
```

The migrations also create two storage buckets (`avatars`, `attachments`) and
enforce plan limits server-side via triggers, so the client cannot bypass them
by calling the API directly.

## Stripe setup (test mode)

1. In the Stripe dashboard (test mode) create a **Product** "Nova Pro" with two
   recurring **Prices**: `$12 / user / month` and an annual price. Copy both
   price IDs into `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` (and the
   `VITE_` equivalents).
2. Set `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY`.
3. **Local webhook** — forward events to your dev server:

   ```bash
   stripe listen --forward-to localhost:5173/api/stripe-webhook
   # copy the printed whsec_… into STRIPE_WEBHOOK_SECRET
   ```

   Then trigger a test purchase from **Settings → Billing → Upgrade to Pro** and
   use Stripe's test card `4242 4242 4242 4242`.
4. **Production** — add a webhook endpoint pointing at
   `https://<your-app>/api/stripe-webhook` for the events
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`.

### Plan limits

| | Free | Pro ($12/user/mo) |
|--|------|-------------------|
| Boards / workspace | 2 | Unlimited |
| Members | 3 | Unlimited |
| Automations | 5 | Unlimited |
| Storage | 100 MB | 10 GB |
| Timeline & Dashboard views | — | ✓ |
| CSV export | — | ✓ |

Limits are enforced both in the UI (`usePlan()` + `<Gate>`) and server-side
(Postgres triggers + RLS).

## Scripts

```bash
npm run dev       # local dev server
npm run build     # typecheck (tsc -b) + production build
npm run preview   # preview the production build
npm run lint      # eslint
npm run test:e2e  # Playwright smoke tests (needs a running app with env set)
```

## Deployment (Vercel)

Push to a Vercel project with the environment variables above configured. The
`/api/*.ts` files deploy as serverless functions; `vercel.json` keeps the SPA
rewrite from swallowing `/api` routes.
