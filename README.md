# Common Ground v29

Real accounts, real matching, and real Supabase text chat.

This build uses app.js?v=29 and styles.css?v=29 to avoid stale browser assets.
Real text and voice messaging are connected to Supabase for mutual matches.


## v32 voice memos
Run `SUPABASE-v32-VOICE.sql` once in Supabase SQL Editor before testing real voice memos. The audio bucket is private and playback uses temporary signed URLs.


## v33 Safety
Adds real Block + Report controls. Run SUPABASE-v33-SAFETY.sql in Supabase before deploying. Blocking hides the user from matching/messages and database RLS prevents either party from reading or sending messages while a block exists. Reports are stored for review.
