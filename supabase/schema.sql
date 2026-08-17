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

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_token_hash_idx on public.sessions(token_hash);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);
alter table public.sessions enable row level security;
-- The API uses SUPABASE_SERVICE_ROLE_KEY, so it bypasses RLS.
-- Do not expose that key in browser code or NEXT_PUBLIC variables.
