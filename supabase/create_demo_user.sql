-- Create demo user for Nova
-- Run in Supabase SQL Editor

-- 1. Create auth user (requires pgcrypto — enabled by default in Supabase)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
)
VALUES (
  gen_random_uuid(),
  'demo@nova.app',
  crypt('demo1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo User"}',
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (email) DO NOTHING;

-- 2. Create profile
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, 'demo@nova.app', 'Demo User', 'member'
FROM auth.users
WHERE email = 'demo@nova.app'
ON CONFLICT (id) DO UPDATE SET full_name = 'Demo User', role = 'member';
