-- ============================================================================
-- 0012 · App-owner full access.
--
-- Plan limits are enforced server-side by enforce_board_limit / _member_limit /
-- _automation_limit, all of which read workspace_plan(). To give the app owner
-- unlimited access without paying (for ownership + testing), workspace_plan()
-- returns 'pro' for any workspace whose owner is in the allowlist below. Keep the
-- email list in sync with SUPER_OWNER_EMAILS in src/lib/plan.ts.
-- Idempotent (create or replace).
-- ============================================================================

create or replace function public.workspace_plan(ws uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when exists (
      select 1
      from workspaces w
      join profiles p on p.id = w.owner_id
      where w.id = ws
        and lower(p.email) = any (array['zack.elsabeh@hotmail.com'])
    ) then 'pro'
    else coalesce((select plan from subscriptions where workspace_id = ws), 'free')
  end;
$$;

-- Reflect Pro on the owner's existing subscriptions so the Billing page and any
-- direct subscription reads show Pro too (not just the plan-limit checks).
update public.subscriptions s
set plan = 'pro', status = 'active', updated_at = now()
from public.workspaces w
join public.profiles p on p.id = w.owner_id
where s.workspace_id = w.id
  and lower(p.email) = 'zack.elsabeh@hotmail.com';
