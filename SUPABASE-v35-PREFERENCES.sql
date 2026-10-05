-- Common Ground v35: profile preference fields
-- Run once in Supabase SQL Editor before testing v35 saves.

alter table public.profiles
  add column if not exists gender text,
  add column if not exists seeking_genders text[] not null default '{}'::text[],
  add column if not exists religion text,
  add column if not exists relationship_goals text[] not null default '{}'::text[];

update public.profiles
set relationship_goals = array[relationship_goal]
where relationship_goal is not null
  and coalesce(array_length(relationship_goals, 1), 0) = 0;
