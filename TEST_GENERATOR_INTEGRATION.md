# Test Generator ↔ Student Progress Tracker Integration

This document is the handoff for connecting the **external test generator web app** to the
Student Progress Tracker so that tests are organized by **week** and support **custom subjects**
and **question counts (10/15/20/30)**.

There are two Supabase projects involved:

| Role | Project ref | Used for |
|---|---|---|
| Main tracker DB | `mvrywaffldfzzjgfctfp` | `Students`, `student_weeks`, `subject_scores` |
| Testor / generator DB | `hervrnzkctfppeoayokx` | `public_tests` (test definitions + answer keys) |

---

## 1. One-time SQL — run in the **testor** project (`hervrnzkctfppeoayokx`) SQL editor

```sql
alter table public.public_tests add column if not exists week text;
alter table public.public_tests add column if not exists question_count integer;
```

Existing rows keep `week = NULL`; the tracker shows them under **"Haftaga biriktirilmagan"**
(not assigned to a week). Nothing breaks if this SQL is run later — the tracker app detects the
missing columns and falls back automatically.

Optional backfill of `question_count` from existing answer keys (only if `questions_json` is
`jsonb`; if it's `json`, replace `jsonb_array_length`/`jsonb_typeof` with `json_array_length`/
`json_typeof`; if it's plain `text`, skip — the app falls back to the key array length):

```sql
update public.public_tests
  set question_count = jsonb_array_length(questions_json)
  where question_count is null and jsonb_typeof(questions_json) = 'array';
```

## 2. Test generator app changes

### 2a. Fetch available weeks (from the MAIN tracker DB)

The list of valid weeks lives in the tracker's `student_weeks` table. Read it with the tracker's
**anon key** (the same `SUPABASE_URL` / `SUPABASE_ANON_KEY` values found in the tracker repo at
`src/supabase.ts`):

```
GET https://mvrywaffldfzzjgfctfp.supabase.co/rest/v1/student_weeks?select=week&is_deleted=eq.false
Headers:
  apikey: <tracker anon key>
  Authorization: Bearer <tracker anon key>
```

Or with supabase-js:

```js
const { data } = await trackerClient
  .from('student_weeks')
  .select('week')
  .eq('is_deleted', false);
const weeks = [...new Set(data.map(r => r.week))];
```

Dedupe client-side and show as a **dropdown in the test creation form**. Week labels look like
`"10-Iyun"` (day + Uzbek month) or `"1-Hafta"`. Sort by academic order if desired
(sen → okt → noy → dek → yan → fev → mar → apr → may → iyun → iyul → avg).

### 2b. Write the new fields when creating a test

When inserting into `public_tests`, additionally include:

- `week` — the **exact** selected week string. ⚠️ The tracker matches weeks by exact text
  equality (`"10-Iyun"` ≠ `"10-iyun"` ≠ `"10 Iyun"`). Always pass through the value fetched in
  2a unchanged.
- `question_count` — one of `10 | 15 | 20 | 30`. The answer key array in `questions_json`
  should have exactly this many entries.

Both fields are optional; omitting them keeps the old behavior (test appears under
"Haftaga biriktirilmagan" with key-length-derived question count).

### 2c. Custom subjects

`subject` is free text now. `"Matematika"` and `"Ingliz Tili"` route scan scores into the
tracker's weekly Eng/Math columns; **any other subject name** (e.g. `"Fizika"`) gets its scores
stored per-subject in the tracker's `subject_scores` table and shown in the analysis charts,
student progress graphs, and the parent cabinet. Use consistent subject spelling so scores group
under one folder.

## 3. Scan sheet layouts (10/15/20/30 questions)

The tracker's OMR scanner currently has bubble coordinate layouts for the **15-question sheet**
(and grades 10-question tests on the first 10 rows of the same sheet). To enable scanning of
20- and 30-question sheets, provide for each layout:

1. A clean sample scan/photo of the printed sheet, and
2. (if available) the PDF/template the generator prints from.

Coordinates will be added to `src/utils/omr_coordinates.json` under `layouts` — a data-only
change, no code rewrite. Until then, 20/30-question tests can be created and their keys edited,
but the scan button is disabled with a notice.
