-- Common Ground v32 voice storage. App normalizes browser MIME types before upload.
-- Common Ground v30: private voice memo storage
-- Run once in Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-memos',
  'voice-memos',
  false,
  15728640,
  array['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/x-m4a']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Match members can upload voice memos" on storage.objects;
create policy "Match members can upload voice memos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'voice-memos'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.matches m
    where m.id = ((storage.foldername(name))[1])::bigint
      and ((select auth.uid()) = m.user_one or (select auth.uid()) = m.user_two)
  )
);

drop policy if exists "Match members can read voice memos" on storage.objects;
create policy "Match members can read voice memos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'voice-memos'
  and exists (
    select 1
    from public.matches m
    where m.id = ((storage.foldername(name))[1])::bigint
      and ((select auth.uid()) = m.user_one or (select auth.uid()) = m.user_two)
  )
);

drop policy if exists "Senders can delete own voice memos" on storage.objects;
create policy "Senders can delete own voice memos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'voice-memos'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
