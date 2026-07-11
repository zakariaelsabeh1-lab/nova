-- ============================================================================
-- 0010 · Let a signed-in user create their OWN profile row.
-- Accounts created before the handle_new_user trigger existed have no profile,
-- which breaks workspace creation (owner_id FK + RLS). With this policy the app
-- can self-heal by inserting the missing profile on login.
-- ============================================================================

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);
