-- ============================================================
-- Pakjai community backend — run this in Supabase SQL editor
-- (Dashboard > SQL Editor > New query > paste > Run)
-- Creates: profiles, posts, reactions, follows, reports,
-- notifications, post-images bucket, RLS, triggers, RPCs.
-- ============================================================

-- ---------- tables ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null,
  name text not null default 'สมาชิกใหม่',
  bio text not null default '',
  interests text[] not null default '{}',
  mood text not null default 'ทั้งหมด',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  author text not null,
  handle text not null,
  text text not null default '',
  category text not null default 'ธรรมชาติ',
  image text not null default '',
  warning boolean not null default false,
  visibility text not null default 'สาธารณะ',
  likes int not null default 0,
  risk int not null default 0,
  hidden boolean not null default false,
  comments jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on posts (created_at desc);
create index if not exists posts_user_idx on posts (user_id);

create table if not exists reactions (
  user_id uuid not null references profiles (id) on delete cascade,
  post_id uuid not null references posts (id) on delete cascade,
  kind text not null check (kind in ('like', 'save', 'repost')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, kind)
);

create table if not exists follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  handle text not null,
  following_id uuid references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, handle)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  text text not null,
  read boolean not null default false,
  post_id uuid references posts (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- ---------- storage bucket ----------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table posts enable row level security;
alter table reactions enable row level security;
alter table follows enable row level security;
alter table reports enable row level security;
alter table notifications enable row level security;

-- profiles: anyone signed in can read (member directory), owners write
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles
  for select to authenticated using (true);
drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own" on profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles
  for update to authenticated using (auth.uid() = id);

-- posts: hidden never visible; เฉพาะฉัน = owner only;
-- ผู้ติดตาม = owner or follower; สาธารณะ = all signed in
drop policy if exists "posts read" on posts;
create policy "posts read" on posts
  for select to authenticated using (
    not hidden and (
      visibility = 'สาธารณะ'
      or user_id = auth.uid()
      or (
        visibility = 'ผู้ติดตาม'
        and exists (
          select 1 from follows
          where follower_id = auth.uid()
            and (following_id = posts.user_id or handle = posts.handle)
        )
      )
    )
  );
drop policy if exists "posts insert own" on posts;
create policy "posts insert own" on posts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "posts update own" on posts;
create policy "posts update own" on posts
  for update to authenticated using (auth.uid() = user_id);
drop policy if exists "posts delete own" on posts;
create policy "posts delete own" on posts
  for delete to authenticated using (auth.uid() = user_id);

-- reactions: users only ever see/touch their own
drop policy if exists "reactions own" on reactions;
create policy "reactions own" on reactions
  for all to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- follows: own rows only
drop policy if exists "follows own" on follows;
create policy "follows own" on follows
  for all to authenticated using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- reports: insert own, read own
drop policy if exists "reports insert" on reports;
create policy "reports insert" on reports
  for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "reports read own" on reports;
create policy "reports read own" on reports
  for select to authenticated using (auth.uid() = reporter_id);

-- notifications: own rows (rows are written by triggers/RPCs)
drop policy if exists "notifications own" on notifications;
create policy "notifications own" on notifications
  for all to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- storage: public read, signed-in users write under their own folder
drop policy if exists "post-images public read" on storage.objects;
create policy "post-images public read" on storage.objects
  for select to public using (bucket_id = 'post-images');
drop policy if exists "post-images own upload" on storage.objects;
create policy "post-images own upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "post-images own delete" on storage.objects;
create policy "post-images own delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- functions & triggers ----------
-- Defense in depth: very risky posts are hidden even if client check is bypassed
create or replace function pakjai_autohide()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.risk >= 80 then
    new.hidden := true;
  end if;
  return new;
end;
$$;
drop trigger if exists posts_autohide on posts;
create trigger posts_autohide
  before insert or update of risk, text on posts
  for each row execute function pakjai_autohide();

-- keep posts.likes in sync with like-reactions
create or replace function pakjai_sync_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.kind = 'like' then
    update posts set likes = likes + 1 where id = new.post_id;
    -- notify the author (not for self-likes)
    insert into notifications (user_id, type, text, post_id)
    select p.user_id, 'ถูกใจ', 'มีคนส่งกำลังใจให้เรื่องที่คุณแบ่งปัน', p.id
    from posts p
    where p.id = new.post_id and p.user_id <> new.user_id;
  elsif tg_op = 'DELETE' and old.kind = 'like' then
    update posts set likes = greatest(likes - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists reactions_sync_likes on reactions;
create trigger reactions_sync_likes
  after insert or delete on reactions
  for each row execute function pakjai_sync_likes();

-- Append a comment atomically + notify the post author.
-- Returns the updated comments array.
create or replace function add_comment(
  p_post_id uuid,
  p_comment jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comments jsonb;
  v_owner uuid;
begin
  select comments, user_id into v_comments, v_owner
  from posts where id = p_post_id and not hidden;
  if not found then
    raise exception 'post not found';
  end if;
  v_comments := coalesce(v_comments, '[]'::jsonb) || jsonb_build_array(p_comment);
  update posts set comments = v_comments where id = p_post_id;
  if v_owner <> auth.uid() then
    insert into notifications (user_id, type, text, post_id)
    values (v_owner, 'ความคิดเห็น', 'มีคนร่วมบทสนทนาในเรื่องของคุณ', p_post_id);
  end if;
  return v_comments;
end;
$$;

-- File a report; auto-hide the post once it reaches 3 distinct reporters.
create or replace function report_post(
  p_post_id uuid,
  p_reason text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into reports (post_id, reporter_id, reason)
  values (p_post_id, auth.uid(), p_reason)
  on conflict (post_id, reporter_id) do update set reason = excluded.reason;
  select count(*) into v_count from reports where post_id = p_post_id;
  if v_count >= 3 then
    update posts set hidden = true where id = p_post_id;
  end if;
  return v_count;
end;
$$;
