-- Common Ground v33 safety controls
-- Run once in Supabase SQL Editor.

-- Keep current block/report tables from the earlier schema; this script is safe to re-run.

-- Prevent blocked users from reading each other's messages.
drop policy if exists "Users can read messages in their matches" on public.messages;
create policy "Users can read messages in unblocked matches"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (m.user_one = (select auth.uid()) or m.user_two = (select auth.uid()))
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = m.user_one and b.blocked_id = m.user_two)
           or (b.blocker_id = m.user_two and b.blocked_id = m.user_one)
      )
  )
);

-- Prevent blocked users from sending messages to each other.
drop policy if exists "Users can send messages in their matches" on public.messages;
create policy "Users can send messages in unblocked matches"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (m.user_one = (select auth.uid()) or m.user_two = (select auth.uid()))
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = m.user_one and b.blocked_id = m.user_two)
           or (b.blocker_id = m.user_two and b.blocked_id = m.user_one)
      )
  )
);

-- A user may view blocks involving their account, create blocks, and remove blocks they created.
drop policy if exists "Users can see blocks involving themselves" on public.blocks;
create policy "Users can see blocks involving themselves"
on public.blocks
for select
to authenticated
using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));

drop policy if exists "Users can create their own blocks" on public.blocks;
create policy "Users can create their own blocks"
on public.blocks
for insert
to authenticated
with check (blocker_id = (select auth.uid()));

drop policy if exists "Users can remove their own blocks" on public.blocks;
create policy "Users can remove their own blocks"
on public.blocks
for delete
to authenticated
using (blocker_id = (select auth.uid()));

-- Users can submit reports but cannot browse reports from other users.
drop policy if exists "Users can submit reports" on public.reports;
create policy "Users can submit reports"
on public.reports
for insert
to authenticated
with check (reporter_id = (select auth.uid()) and reporter_id <> reported_id);

-- Make sure authenticated users have required privileges.
grant select, insert, delete on public.blocks to authenticated;
grant insert on public.reports to authenticated;
