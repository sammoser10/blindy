-- Blindy Database Schema
-- Run this in the Supabase SQL editor to set up your database

-- ============================================
-- 1. CREATE ALL TABLES
-- ============================================

-- Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Tasting sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  join_code text unique not null,
  wine_count int not null check (wine_count > 0 and wine_count <= 20),
  guess_fields text[] not null default '{}',
  status text not null default 'lobby' check (status in ('lobby', 'tasting', 'revealed')),
  created_at timestamptz default now()
);

-- Session participants
create table if not exists session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(session_id, user_id)
);

-- Wines (actual wine info, filled in during reveal)
create table if not exists wines (
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

-- Tasting entries (notes + guesses + rating per user per wine)
create table if not exists tasting_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  wine_number int not null,
  -- Notes
  appearance_notes text default '',
  nose_notes text default '',
  palate_notes text default '',
  overall_notes text default '',
  -- Guesses
  guess_grape text default '',
  guess_wine_type text default '',
  guess_region text default '',
  guess_producer text default '',
  guess_vintage int,
  -- Rating (1-10 scale, allows half points)
  rating numeric(3,1) check (rating is null or (rating >= 1 and rating <= 10)),
  -- Ranking (1 = favorite)
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
-- 3. RLS POLICIES (all tables exist now)
-- ============================================

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Sessions policies
create policy "Sessions are viewable by participants and for joining"
  on sessions for select using (
    auth.uid() = host_id or
    exists (
      select 1 from session_participants
      where session_id = sessions.id and user_id = auth.uid()
    ) or
    -- Allow lookup by join_code (needed for the join flow)
    true
  );

create policy "Users can create sessions"
  on sessions for insert with check (auth.uid() = host_id);

create policy "Hosts can update their sessions"
  on sessions for update using (auth.uid() = host_id);

-- Session participants policies
create policy "Participants viewable by session members"
  on session_participants for select using (
    exists (
      select 1 from session_participants sp
      where sp.session_id = session_participants.session_id and sp.user_id = auth.uid()
    ) or exists (
      select 1 from sessions s
      where s.id = session_participants.session_id and s.host_id = auth.uid()
    )
  );

create policy "Users can join sessions"
  on session_participants for insert with check (auth.uid() = user_id);

create policy "Users can leave sessions"
  on session_participants for delete using (auth.uid() = user_id);

-- Wines policies
create policy "Wines viewable by session members"
  on wines for select using (
    exists (
      select 1 from session_participants sp
      where sp.session_id = wines.session_id and sp.user_id = auth.uid()
    ) or exists (
      select 1 from sessions s
      where s.id = wines.session_id and s.host_id = auth.uid()
    )
  );

create policy "Hosts can manage wines"
  on wines for insert with check (
    exists (select 1 from sessions where id = session_id and host_id = auth.uid())
  );

create policy "Hosts can update wines"
  on wines for update using (
    exists (select 1 from sessions where id = session_id and host_id = auth.uid())
  );

-- Tasting entries policies
create policy "Users can view own entries during tasting"
  on tasting_entries for select using (
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

create policy "Users can insert their own entries"
  on tasting_entries for insert with check (auth.uid() = user_id);

create policy "Users can update their own entries"
  on tasting_entries for update using (auth.uid() = user_id);

-- ============================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on signup
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

-- Auto-update updated_at timestamp
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
