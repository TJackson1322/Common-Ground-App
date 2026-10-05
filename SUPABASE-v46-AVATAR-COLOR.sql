-- Common Ground v46: custom profile avatar color
-- Run once in Supabase SQL Editor before saving profile colors.

alter table public.profiles
  add column if not exists avatar_color text default '#66786f';
