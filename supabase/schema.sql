-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to run more than once (create table/policy are idempotent below).

create table if not exists progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table progress enable row level security;

drop policy if exists "select own progress" on progress;
create policy "select own progress" on progress
  for select using (auth.uid() = user_id);

drop policy if exists "insert own progress" on progress;
create policy "insert own progress" on progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own progress" on progress;
create policy "update own progress" on progress
  for update using (auth.uid() = user_id);

-- Публичный (для всех залогиненных) рейтинг: только ник + агрегированные баллы,
-- сырые данные практики остаются в progress и никому кроме владельца не видны.
create table if not exists leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  overall_band numeric,
  sessions integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table leaderboard enable row level security;

drop policy if exists "select all leaderboard rows" on leaderboard;
create policy "select all leaderboard rows" on leaderboard
  for select using (auth.role() = 'authenticated');

drop policy if exists "insert own leaderboard row" on leaderboard;
create policy "insert own leaderboard row" on leaderboard
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own leaderboard row" on leaderboard;
create policy "update own leaderboard row" on leaderboard
  for update using (auth.uid() = user_id);
