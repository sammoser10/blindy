-- Blindy Database Schema
-- Run this in the Supabase SQL editor to set up your database

-- ============================================
-- 0. CLEAN SLATE - drop everything if it exists
-- ============================================

-- Drop tables (CASCADE automatically removes their triggers, policies, etc.)
drop table if exists tasting_entries cascade;
drop table if exists wines cascade;
drop table if exists session_participants cascade;
drop table if exists sessions cascade;
drop table if exists profiles cascade;

-- Drop trigger on auth.users (this table always exists)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop function if exists update_updated_at();

-- ============================================
-- 1. CREATE ALL TABLES
-- ============================================

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  join_code text unique not null,
  wine_count int not null check (wine_count > 0 and wine_count <= 20),
  guess_fields text[] not null default '{}',
  status text not null default 'lobby' check (status in ('lobby', 'tasting', 'revealed')),
  created_at timestamptz default now()
);

create table session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(session_id, user_id)
);

create table wines (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  wine_number int not null check (wine_number > 0),
  name text,
  grape text,
  wine_type text,
  region text,
  producer text,
  vintage int,
  unique(session_id, wine_number)
);

create table tasting_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  wine_number int not null,
  appearance_notes text default '',
  nose_notes text default '',
  palate_notes text default '',
  overall_notes text default '',
  guess_grape text default '',
  guess_wine_type text default '',
  guess_region text default '',
  guess_producer text default '',
  guess_vintage int,
  rating numeric(3,1) check (rating is null or (rating >= 1 and rating <= 10)),
  ranking int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, user_id, wine_number)
);

-- ============================================
-- 2. ENABLE RLS ON ALL TABLES
-- ============================================

alter table profiles enable row level security;
alter table sessions enable row level security;
alter table session_participants enable row level security;
alter table wines enable row level security;
alter table tasting_entries enable row level security;

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Profiles
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Sessions (readable by anyone so join-by-code works)
create policy "sessions_select" on sessions for select using (true);
create policy "sessions_insert" on sessions for insert with check (auth.uid() = host_id);
create policy "sessions_update" on sessions for update using (auth.uid() = host_id);

-- Session participants
create policy "participants_select" on session_participants for select using (
  exists (
    select 1 from session_participants sp
    where sp.session_id = session_participants.session_id and sp.user_id = auth.uid()
  ) or exists (
    select 1 from sessions s
    where s.id = session_participants.session_id and s.host_id = auth.uid()
  )
);
create policy "participants_insert" on session_participants for insert with check (auth.uid() = user_id);
create policy "participants_delete" on session_participants for delete using (auth.uid() = user_id);

-- Wines
create policy "wines_select" on wines for select using (
  exists (
    select 1 from session_participants sp
    where sp.session_id = wines.session_id and sp.user_id = auth.uid()
  ) or exists (
    select 1 from sessions s
    where s.id = wines.session_id and s.host_id = auth.uid()
  )
);
create policy "wines_insert" on wines for insert with check (
  exists (select 1 from sessions where id = session_id and host_id = auth.uid())
);
create policy "wines_update" on wines for update using (
  exists (select 1 from sessions where id = session_id and host_id = auth.uid())
);

-- Tasting entries
create policy "entries_select" on tasting_entries for select using (
  auth.uid() = user_id or
  exists (
    select 1 from sessions s
    where s.id = session_id and s.status = 'revealed' and (
      s.host_id = auth.uid() or
      exists (
        select 1 from session_participants sp
        where sp.session_id = s.id and sp.user_id = auth.uid()
      )
    )
  )
);
create policy "entries_insert" on tasting_entries for insert with check (auth.uid() = user_id);
create policy "entries_update" on tasting_entries for update using (auth.uid() = user_id);

-- ============================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasting_entries_updated_at
  before update on tasting_entries
  for each row execute function update_updated_at();

-- ============================================
-- 5. ENABLE REALTIME
-- ============================================

alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table session_participants;
alter publication supabase_realtime add table tasting_entries;
alter publication supabase_realtime add table wines;
