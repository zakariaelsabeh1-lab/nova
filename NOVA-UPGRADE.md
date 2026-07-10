# Nova Upgrade — Phase 0 Audit & Gap Report

> Orientation pass over the existing Nova repo before any building. This documents
> what exists, what's partial, and what's missing against the work-OS feature target,
> plus stack decisions that need your call before Phase 2.

---

## 1. Stack as actually installed

| Area | Task assumed | **Actually in repo** | Note |
|------|--------------|----------------------|------|
| Language | (unstated) | **TypeScript** (strict, `noUnusedLocals`) | All new code must be `.tsx`/`.ts` |
| Framework | React | **React 19.2** | — |
| Build | Vite | **Vite 8** | — |
| Styling | Tailwind | **Tailwind v4** via `@tailwindcss/vite`, tokens in `@theme` block in `src/index.css` | **No `tailwind.config.js` exists** — tokens live in CSS |
| Router | react-router-dom **v6** | **react-router-dom v7.15** | v7 already installed; do NOT downgrade |
| DnD | **@dnd-kit** | **@hello-pangea/dnd 18** | ⚠️ Decision needed (see §5) |
| Animation | **motion** (`motion/react`) | **framer-motion 12** | ⚠️ Same API surface; keep framer-motion |
| Icons | lucide-react | **lucide-react 1.16** ✅ | Already used everywhere |
| Dates | date-fns | **date-fns 4** ✅ | Installed, barely used |
| Data layer | Supabase client | **@supabase/supabase-js 2** + **@tanstack/react-query 5** ✅ | RQ is the fetch/cache layer |
| State | (unstated) | **zustand 5** (auth only) | — |
| UI kit | shadcn/ui | **Radix primitives + CVA + tailwind-merge** (shadcn-style, hand-rolled) | No `components/ui` shadcn CLI setup; `cn()` helper exists |
| Forms | (unstated) | **react-hook-form 7 + zod 4** ✅ | — |
| Charts | **recharts** | **not installed** ❌ | Add for dashboards |
| Payments | **Stripe** | **not installed** ❌ | Add `@stripe/stripe-js` + `stripe` |

### Stack additions genuinely missing (safe to add)
- `recharts` — dashboard widgets
- `@stripe/stripe-js` + `stripe` (server, in `/api`) — premium mode
- **Serverless `/api` functions** — none exist yet; `vercel.json` is SPA-only

### Stack additions to **skip** (already covered by an equivalent)
- `@dnd-kit/*` — `@hello-pangea/dnd` already present and in use (see §5 for the tradeoff)
- `motion` — `framer-motion` present (identical API; `motion/react` is just the rename)
- `react-router-dom v6` — v7 present

---

## 2. Existing database schema (`supabase/schema.sql`)

Tables that **exist**: `profiles`, `boards`, `columns`, `tasks`, `comments`, `notifications`, `invites`.

Structural shape today: **Boards → Columns → Tasks**. Columns double as Kanban lanes
(status), not as spreadsheet columns. Tasks carry `status`, `priority`, `assignee_id`,
`due_date`, `labels[]`, `position`.

RLS today: **permissive** — every authenticated user can read/write every board, column,
and task (`auth.role() = 'authenticated'`). There is **no workspace layer** and **no
role enforcement** in policies (roles exist on `profiles` but only gate UI).

Triggers that exist: `handle_new_user` (auto-create profile), `handle_updated_at` on
`tasks` and `boards`.

Migration hygiene: there is **no `supabase/migrations/` directory**. Instead there are
ad-hoc scripts (`schema.sql`, `migration_fix.sql`, `fix_duplicate_columns.sql`,
`seed_boards.sql`, `create_demo_user.sql`) meant to be pasted into the SQL editor.
Phase 2 must introduce a real incremental `migrations/` folder.

---

## 3. Feature-by-feature gap analysis

Legend: ✅ done · 🟡 partial · ❌ missing

| # | Feature | State | What exists | What's missing |
|---|---------|-------|-------------|----------------|
| 1 | **Auth** | 🟡 | `LoginPage` with email/password + demo button; Supabase auth client; `authStore` | App currently **auto-logs into a demo account** and all route gating was intentionally removed (git: "remove all auth gates"). No magic link, no protected routes, no onboarding, no workspace creation. |
| 2 | **Structure** (Workspaces>Boards>Groups>Items>Subitems) | 🟡 | Boards + Columns + Tasks; sidebar lists boards | **No Workspaces, no Groups, no Subitems.** Sidebar has no favorites, no board search, no "+ Add board", no templates (Project Plan / Sprint / CRM / Content Calendar). Board list is effectively the 4 hardcoded seed types. |
| 3 | **Board table view** (dynamic typed columns, inline edit) | 🟡 | Read-only `ListView` (fixed Task/Status/Priority/Assignee/Due columns); Kanban view | No dynamic columns, no column types (status pill/person/date/timeline/number/priority/checkbox/last-updated), no add/remove/rename/reorder/resize, **no inline cell editing**, no cell-renderer registry, no group sum. |
| 4 | **Drag & drop** | 🟡 | Task drag **between columns** via `@hello-pangea/dnd` (`onDragEnd` → `useMoveTask`) | No item drag across groups, no group reorder, no column reorder, keyboard a11y not verified. |
| 5 | **Views per board** (Table/Kanban/Calendar/Timeline/Dashboard) | 🟡 | Kanban + List toggle only | **Calendar, Timeline/Gantt, Dashboard views all missing.** No recharts. |
| 6 | **Item panel** | 🟡 | `TaskModal` slide-in: title/desc edit, assignee, priority, status, due date, flat comments | No **Updates** tab with threaded comments + @mentions, no **Activity log** (who/what/old/new/when), no **Files** tab (Supabase storage + previews). |
| 7 | **Collaboration** | 🟡 | `invites` table + `TeamPage` (invite by email, list members); roles admin/member | No **viewer** role, **no RLS role enforcement**, no **Supabase realtime** sync, no **presence** avatars. |
| 8 | **Automations** | ❌ | — | No recipe builder, no storage, no execution, no run log, no prebuilt recipes. |
| 9 | **Notifications** | 🟡 | `notifications` table; bell icon in sidebar with a **hardcoded "3"** | No unread count wired, no panel, no triggers (mention/assignment/automation). Edge functions `send-notification` + `daily-digest` exist but are email stubs. |
| 10 | **Global ⌘K search** | ❌ | — | Not present. |
| 11 | **My Work page** | ❌ | — | No cross-board assigned-to-me view, no Today/This week/Next week/Later/Overdue grouping. |
| 12 | **Settings** | 🟡 | Profile (name), Notifications (local-only toggles), Security (password) | No avatar upload (button is inert), no workspace members management table, no board permissions, no duplicate board, **no CSV export**. |
| — | **Premium / Stripe** | ❌ | — | No plans, no `subscriptions` table, no `/api` functions, no `usePlan()`, no `<Gate>`, no paywall, no billing page, no server-side limit enforcement. |

---

## 4. Design tokens & conventions to reuse (do not restyle)

**Tokens** (from `src/index.css` `@theme`) — extend these, don't invent new ones:
- Navy scale: `#0f172a` / `#060c18` / `#1e293b`
- Teal (accent): `#0ea5e9` / `#0284c7` / `#38bdf8`
- Purple: `#6366f1` / `#8b5cf6`
- Surfaces: bg `#f1f5f9`, card `#ffffff`, border `#e2e8f0`
- Text: `#0f172a` / `#64748b` / `#94a3b8`
- Semantic: success `#22c55e`, warning `#f59e0b`, danger `#ef4444`
- Font: **Plus Jakarta Sans** (note: CLAUDE.md says Inter — the code uses Plus Jakarta Sans; I'll follow the code)

**Board type accents** (repeated in several files, worth centralizing): tasks `#0ea5e9`,
projects `#8b5cf6`, assignments `#f59e0b`, vacation `#22c55e`.

**Conventions observed:**
- Inline `style={{}}` with rgba tokens for dark surfaces (board pages are dark navy;
  dashboard/settings/team are light). Two visual worlds coexist by design.
- framer-motion `layoutId` for active-tab/nav underlines; `fadeUp`/`stagger` variants.
- Data via React Query hooks in `src/lib/queries.ts` (`useBoards`, `useTasks`, …) with
  `invalidateQueries` on mutation success. **No optimistic updates yet** (quality bar wants them).
- `cn()` from `src/lib/utils.ts` for class merging.
- Radix + CVA pattern for primitives (though `components/ui` only has `Skeleton`, `EmptyState`).
- 44px min touch targets already applied for mobile.

---

## 5. Decisions I need from you before Phase 2

1. **DnD library.** The task specifies `@dnd-kit`, but the repo already uses
   `@hello-pangea/dnd` and it works. `@dnd-kit` handles **multi-axis** (column reorder +
   row reorder + cross-group) and keyboard a11y more cleanly, which the new table view
   needs. Options: **(a)** migrate everything to `@dnd-kit` (cleaner for the full table
   spec, ~1 rewrite of the existing Kanban), or **(b)** keep `@hello-pangea/dnd` and
   stretch it. **My recommendation: (a) @dnd-kit**, because column-resize/reorder + cell
   keyboard nav are first-class there. Confirm before I add it.

2. **Auth model.** The recent git history deliberately **removed auth gates** and added
   a demo auto-login. The task asks to **restore real protected routes + onboarding**.
   These conflict. My plan: keep a demo/sample path for empty state, but reinstate real
   Supabase auth + protected routes + first-workspace onboarding. Confirm you want auth
   turned back on.

3. **Workspace layer is a schema-wide change.** Introducing `workspaces` +
   `workspace_members` means adding `workspace_id` to boards (and cascading RLS by
   membership + role) — this touches every existing table's policies. I'll write it as
   **additive migrations that backfill a default workspace** for existing data (never
   dropping tables). Confirm this is acceptable.

4. **Groups vs. existing Columns.** Today "columns" are Kanban lanes/status. The new
   model wants **Groups** (colored row sections) *and* typed **Columns** (spreadsheet
   fields) as separate concepts. I'll add new `groups` + `board_columns` + `cell_values`
   tables and **migrate existing `columns`→`groups`** (they map to status lanes), leaving
   old data intact. Flagging because it's the biggest structural shift.

5. **Housekeeping:** `CLAUDE.md` is a committed shell heredoc (literal `echo` lines,
   Windows build path, says model `claude-sonnet-4-6` and font Inter) — it doesn't match
   the real project. Want me to clean it up as part of this work, or leave it?

---

## 6. Proposed build order (unchanged from your phases, refined)

2. **Migrations + data layer** — `supabase/migrations/` with additive files:
   `workspaces`, `workspace_members`, `subscriptions`, `groups`, `board_columns`,
   `cell_values (jsonb)`, `subitems`, `updates`, `activity_log`, `files`, `automations`,
   `automation_runs`, notifications rework; indexes on `board_id`/`item_id`; `updated_at`
   triggers; membership+role RLS. Backfill a default workspace. Regenerate typed hooks.
3. **Table view** — cell-renderer registry, typed columns, inline edit, column CRUD +
   resize/reorder, group sum, dnd (pending §5.1).
4. **Alternate views** — Kanban (rework), Calendar, Timeline/Gantt, Dashboard (recharts).
5. **Item panel + realtime + collaboration** — Updates/Activity/Files tabs, viewer role,
   realtime subscriptions, presence.
6. **Automations + notifications + My Work + ⌘K search.**
7. **Premium** — Stripe products/prices, `subscriptions` sync, `/api` functions,
   `usePlan()`, `<Gate>`, paywall, billing page, **server-side limit enforcement**.
8. **Settings, polish, testing** — avatar upload, members table, permissions, duplicate
   board, CSV export, optimistic updates + toasts everywhere, skeletons/empty states,
   README + `.env.example`, Playwright smoke tests.

---

**Status: awaiting your go-ahead.** Nothing has been built. Once you answer the 5
decisions in §5 (especially DnD, auth, and the CLAUDE.md cleanup), I'll start Phase 2.
