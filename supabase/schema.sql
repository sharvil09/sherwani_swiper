-- Sherwani Picker schema — run this in Supabase SQL Editor.
-- No auth: public read/write via anon key, scoped by board slug.

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  created_at timestamptz default now()
);

create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  -- NULL = shared pool (every board); set = visible only on that board
  board_id uuid references boards(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  image_id uuid not null references images(id) on delete cascade,
  decision text not null check (decision in ('liked','passed')),
  created_at timestamptz default now(),
  unique(board_id, image_id)
);

-- Enable RLS + open policies (no auth by design)
alter table boards enable row level security;
alter table images enable row level security;
alter table votes enable row level security;

drop policy if exists "public read boards" on boards;
create policy "public read boards" on boards for select using (true);
drop policy if exists "public insert boards" on boards;
create policy "public insert boards" on boards for insert with check (true);

drop policy if exists "public read images" on images;
create policy "public read images" on images for select using (true);
drop policy if exists "public insert images" on images;
create policy "public insert images" on images for insert with check (true);
drop policy if exists "public delete images" on images;
create policy "public delete images" on images for delete using (true);

drop policy if exists "public read votes" on votes;
create policy "public read votes" on votes for select using (true);
drop policy if exists "public insert votes" on votes;
create policy "public insert votes" on votes for insert with check (true);
drop policy if exists "public delete votes" on votes;
create policy "public delete votes" on votes for delete using (true);

-- Helpful indexes
create index if not exists votes_board_idx on votes(board_id);
create index if not exists votes_image_idx on votes(image_id);
create index if not exists images_board_idx on images(board_id);

-- Migration for existing DBs (run once): scope images per board
-- alter table images add column if not exists board_id uuid references boards(id) on delete cascade;
-- create index if not exists images_board_idx on images(board_id);
-- alter table images drop constraint if exists images_url_key;
