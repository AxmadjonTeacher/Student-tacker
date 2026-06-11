-- Run this in the TESTOR Supabase project's SQL editor (the secondary
-- account that holds public_tests). Persists raw per-question scan answers
-- so that answer-key edits can re-score already-committed results from any
-- device. The app degrades to localStorage-only if this table is missing.

create table if not exists public.test_scans (
  id uuid primary key default gen_random_uuid(),
  test_id text not null,
  student_id text,                -- main-DB student id (BR###/AL###); null for unmatched scans
  student_id_code text,           -- 3-digit bubbled code from the sheet
  student_name text,
  answers jsonb not null default '[]'::jsonb,   -- raw per-question answers, e.g. ["A","C",null,"B"]
  correct_count int not null default 0,
  total_questions int not null default 0,
  percentage int not null default 0,
  week text,
  scanned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One scan per student per test (re-scans overwrite). Plain unique index so
-- PostgREST upserts can target it; NULL student_id rows never conflict, so
-- unmatched scans are still kept individually.
create unique index if not exists test_scans_test_student_uq
  on public.test_scans (test_id, student_id);

create index if not exists test_scans_test_idx on public.test_scans (test_id);

alter table public.test_scans enable row level security;

-- Mirrors the permissive anon access model used by public_tests.
drop policy if exists "anon all test_scans" on public.test_scans;
create policy "anon all test_scans" on public.test_scans
  for all using (true) with check (true);
