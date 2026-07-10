-- ============================================================================
-- Nova staging verification. Creates an isolated throwaway scenario, asserts the
-- schema's triggers / RLS helpers / plan limits behave, then ROLLS BACK so the
-- staging database is left untouched. Fails loudly (non-zero exit) on any check.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/verify/verify.sql
-- ============================================================================

begin;

do $$
declare
  uid  uuid := gen_random_uuid();
  uid2 uuid := gen_random_uuid();
  uid3 uuid := gen_random_uuid();
  uid4 uuid := gen_random_uuid();
  ws    uuid;
  b1    uuid;
  scol  uuid;
  role_txt text;
  plan_txt text;
  blocked boolean;
  i int;
begin
  raise notice '── 1. new auth user auto-creates a profile';
  insert into auth.users (id, email, raw_user_meta_data)
    values (uid, 'verify+' || uid || '@nova.test', '{"full_name":"Verify Bot"}');
  perform 1 from public.profiles where id = uid;
  if not found then raise exception 'FAIL: profile not auto-created by handle_new_user'; end if;

  raise notice '── 2. creating a workspace auto-adds owner membership + free subscription';
  insert into public.workspaces (name, slug, owner_id)
    values ('Verify WS', 'verify-' || uid, uid) returning id into ws;

  select role into role_txt from public.workspace_members where workspace_id = ws and user_id = uid;
  if role_txt is distinct from 'admin' then raise exception 'FAIL: owner membership is % (expected admin)', role_txt; end if;

  select plan into plan_txt from public.subscriptions where workspace_id = ws;
  if plan_txt is distinct from 'free' then raise exception 'FAIL: subscription plan is % (expected free)', plan_txt; end if;

  if public.workspace_plan(ws) <> 'free' then raise exception 'FAIL: workspace_plan() helper wrong'; end if;

  raise notice '── 3. board plan limit (free = 2)';
  insert into public.boards (workspace_id, name, type, created_by) values (ws, 'B1', 'tasks', uid) returning id into b1;
  insert into public.boards (workspace_id, name, type, created_by) values (ws, 'B2', 'tasks', uid);
  blocked := false;
  begin
    insert into public.boards (workspace_id, name, type, created_by) values (ws, 'B3', 'tasks', uid);
  exception when others then
    if sqlerrm like '%PLAN_LIMIT%' then blocked := true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: 3rd board was not blocked on free plan'; end if;

  raise notice '── 4. member plan limit (free = 3)';
  insert into auth.users (id, email) values (uid2, 'verify+' || uid2 || '@nova.test');
  insert into auth.users (id, email) values (uid3, 'verify+' || uid3 || '@nova.test');
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, uid2, 'member');
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, uid3, 'viewer');
  insert into auth.users (id, email) values (uid4, 'verify+' || uid4 || '@nova.test');
  blocked := false;
  begin
    insert into public.workspace_members (workspace_id, user_id, role) values (ws, uid4, 'member');
  exception when others then
    if sqlerrm like '%PLAN_LIMIT%' then blocked := true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: 4th member was not blocked on free plan'; end if;

  raise notice '── 5. automation plan limit (free = 5)';
  insert into public.board_columns (board_id, name, type, position, settings)
    values (b1, 'Status', 'status', 0, '{"labels":{"Done":"#22c55e"}}') returning id into scol;
  for i in 1..5 loop
    insert into public.automations (board_id, name, trigger, actions)
      values (b1, 'A' || i, jsonb_build_object('type','status_changes','columnId',scol::text,'to','Done'), '[]'::jsonb);
  end loop;
  blocked := false;
  begin
    insert into public.automations (board_id, name, trigger, actions)
      values (b1, 'A6', jsonb_build_object('type','status_changes','columnId',scol::text,'to','Done'), '[]'::jsonb);
  exception when others then
    if sqlerrm like '%PLAN_LIMIT%' then blocked := true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: 6th automation was not blocked on free plan'; end if;

  raise notice '── 6. RLS helper functions present & callable';
  perform public.is_workspace_member(ws);
  perform public.workspace_role(ws);
  perform public.can_read_board(b1);
  perform public.can_write_board(b1);

  raise notice '── 7. Pro plan lifts limits';
  update public.subscriptions set plan = 'pro' where workspace_id = ws;
  insert into public.boards (workspace_id, name, type, created_by) values (ws, 'B3-pro', 'tasks', uid);
  if public.workspace_plan(ws) <> 'pro' then raise exception 'FAIL: plan did not switch to pro'; end if;

  raise notice '';
  raise notice '✅ ALL STAGING CHECKS PASSED';
end $$;

rollback;
