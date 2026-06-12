-- Run this in the TESTOR Supabase project's SQL editor.
-- Verified 2026-06-11: anon INSERT into public_tests fails with 42501 and
-- anon UPDATE silently matches 0 rows — RLS only permits SELECT. The app
-- creates tests, edits answer keys and bumps student_count with the anon
-- key, so all of those were falling back to local memory ("RLS ruxsati"
-- warning on test creation, silent no-op on key saves).
--
-- Mirrors the permissive anon access model used by test_scans.

alter table public.public_tests enable row level security;

drop policy if exists "anon all public_tests" on public.public_tests;
create policy "anon all public_tests" on public.public_tests
  for all using (true) with check (true);
