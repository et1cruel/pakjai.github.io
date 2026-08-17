-- Run this script in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  bio text not null default '',
  profile_image text not null default '',
  followers text[] not null default '{}',
  following text[] not null default '{}',
  posts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
-- The API uses SUPABASE_SERVICE_ROLE_KEY, so it bypasses RLS.
-- Do not expose that key in browser code or NEXT_PUBLIC variables.
