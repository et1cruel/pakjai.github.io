-- Pakjai production schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

-- Legacy custom-auth tables are retained for migration compatibility.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(), username text not null unique, email text not null unique,
  password_hash text not null, bio text not null default '', profile_image text not null default '',
  cover_image text not null default '', nickname text not null default '', nickname_color text not null default '#34a887',
  pet text not null default '', tree text not null default '', zodiac text not null default '',
  followers text[] not null default '{}', following text[] not null default '{}', posts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(), token_hash text not null unique,
  user_id uuid not null references public.users(id) on delete cascade, expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique, email text unique, nickname text not null default '', nickname_color text not null default '#34a887',
  bio text not null default '', pet text not null default '', tree text not null default '', zodiac text not null default '',
  avatar_path text, cover_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null default '', image_path text, audio_path text, visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade, body text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like','thanks','hug')), created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction_type)
);
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade, following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (follower_id, following_id), check (follower_id <> following_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade, body text not null,
  read_at timestamptz, created_at timestamptz not null default now(), check (sender_id <> recipient_id)
);

create index if not exists posts_author_created_idx on public.posts(author_id, created_at desc);
create index if not exists comments_post_created_idx on public.comments(post_id, created_at);
create index if not exists reactions_post_idx on public.post_reactions(post_id);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists messages_participants_idx on public.messages(sender_id, recipient_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
 drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();

alter table public.users enable row level security; alter table public.sessions enable row level security;
alter table public.profiles enable row level security; alter table public.posts enable row level security; alter table public.comments enable row level security;
alter table public.post_reactions enable row level security; alter table public.follows enable row level security; alter table public.messages enable row level security;

-- Profiles: public read, owner write.
drop policy if exists profiles_select on public.profiles; create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_insert on public.profiles; create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update on public.profiles; create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- Posts: public posts are readable; private/followers filtering is enforced by API/RLS policy extension.
drop policy if exists posts_select on public.posts; create policy posts_select on public.posts for select using (visibility = 'public' or auth.uid() = author_id);
drop policy if exists posts_insert on public.posts; create policy posts_insert on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists posts_update on public.posts; create policy posts_update on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists posts_delete on public.posts; create policy posts_delete on public.posts for delete using (auth.uid() = author_id);
-- Comments/reactions/follows/messages are owner-scoped; messages are visible only to participants.
drop policy if exists comments_select on public.comments; create policy comments_select on public.comments for select using (exists (select 1 from public.posts p where p.id = post_id and (p.visibility = 'public' or p.author_id = auth.uid())));
drop policy if exists comments_insert on public.comments; create policy comments_insert on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists comments_update on public.comments; create policy comments_update on public.comments for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists comments_delete on public.comments; create policy comments_delete on public.comments for delete using (auth.uid() = author_id);
drop policy if exists reactions_all on public.post_reactions; create policy reactions_all on public.post_reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists follows_all on public.follows; create policy follows_all on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id and follower_id <> following_id);
drop policy if exists messages_select on public.messages; create policy messages_select on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists messages_insert on public.messages; create policy messages_insert on public.messages for insert with check (auth.uid() = sender_id and sender_id <> recipient_id);
drop policy if exists messages_update on public.messages; create policy messages_update on public.messages for update using (auth.uid() = recipient_id);

-- Storage buckets are private by default; use signed URLs from the server/API.
insert into storage.buckets (id, name, public) values ('avatars','avatars',false),('covers','covers',false),('posts','posts',false),('artworks','artworks',false) on conflict (id) do nothing;
-- Service-role API performs Storage operations. Do not expose service-role keys to clients.

-- Storage policies: object owner is represented by the first path segment (auth.uid()).
drop policy if exists storage_owner_insert on storage.objects;
create policy storage_owner_insert on storage.objects for insert to authenticated with check (bucket_id in ('avatars','covers','posts','artworks') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists storage_owner_update on storage.objects;
create policy storage_owner_update on storage.objects for update to authenticated using ((storage.foldername(name))[1] = auth.uid()::text) with check ((storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists storage_owner_delete on storage.objects;
create policy storage_owner_delete on storage.objects for delete to authenticated using ((storage.foldername(name))[1] = auth.uid()::text);
