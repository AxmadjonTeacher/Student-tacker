# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Al-Xorazmiy School Student Progress Tracker** — a React/TypeScript PWA (also deployable as a Capacitor iOS/Android app) for tracking student performance across English and Math subjects in Uzbek school grades 1–11.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

Capacitor (iOS/Android):
```bash
npx cap sync       # Sync web build to native projects
npx cap open ios   # Open Xcode
```

## Architecture

### Authentication & Roles (`src/App.tsx`)
Role-based access is purely client-side via `localStorage`. Roles: `admin` (full access), `admin123` (limited admin), `publish` (view/publish), `testor` (OMR scanning), `teacher` (own students only), `parent` (own child only). Session is persisted in `localStorage` keys `auth_role` + `auth_passcode` / `teacher_id` / `parent_children`.

### State Management (`src/App.tsx`)
All global state lives in `App`. The two most important derived state pipelines:
1. **`projectedStudents`** — overlays `student_weeks` history onto base `students` for the currently `selectedWeek`. When `activeSubject === 'MATH'`, it swaps ENG fields for MATH fields. English originals are preserved in `englishTeacher`, `englishStartingLevel`, etc.
2. **`filteredStudents`** — filters `projectedStudents` by `activeClass` and `searchTerm`.

### Subject Tabs (`ActiveSubject` type in `src/types.ts`)
`'ENG' | 'MATH' | 'ALL' | 'PRIMARY' | 'GRANT' | 'ENG_MATH' | 'DETAILS' | 'DASHBOARD'`
- `PRIMARY` shows grades 1–4; all other subjects filter them out.
- `DETAILS` adds `'Barchasi'` (all classes) option.

### Data Layer (`src/supabase.ts`)
- `mapDbToStudent` / `mapStudentToDb` — convert between snake_case DB columns and camelCase `Student` interface.
- Offline fallback: on Supabase failure, reads from `localStorage` key `students_data_v2`.

### Weekly Progress (`student_weeks` table)
Weekly scores are stored separately from the base `Students` table. Each row: `(student_id, week)` unique pair holding `eng_score`, `math_score`, `attendance`, `homework`, level snapshots, and `grand_tests` JSON arrays.

**When changing a student ID**, always update `student_weeks` first, then `Students` — see `handleSaveCredentials` in `App.tsx` and the critical note in `TECHNICAL_RULES.md`.

### OMR Scanner (`src/components/TestorCabinet.tsx`, `src/utils/omrScanner.ts`)
Scans ZipGrade-style answer sheets via camera. Uses BFS corner detection on a 800×600 downscale, then bilinear perspective warp to 750×1000. Parses a 3-digit student ID from bubble grids and matches against `BR###` / `AL###` patterns. Scans are buffered in `localStorage` under `testor_scans_{testId}` before DB commit.

## Key Business Rules

Defined authoritatively in `TECHNICAL_RULES.md`:

- **Student ID format**: `BR100–199` (grades 1–4), `AL200–799` (grades 5–11). `normalizeStudentId()` and `isConformingId()` in `src/utils/idGenerator.ts` are the canonical validators.
- **Scores**: integers 0–15; displayed as `(score / 15) × 100%`. An asterisk suffix in CSV (`14*`) sets `id_wrong = true`.
- **Attendance**: `1` = present; negative = absences. `max(0, 100 − absences × 16.67)%`.
- **Homework**: `1` = done; negative = missed. `max(0, 100 − missed × 20)%`.
- **Phone numbers**: must start with `+998`; 9-digit inputs are auto-prefixed.

## Design System

Defined authoritatively in `DESIGN_SPEC.md`. Key rules for UI work:
- **Theme**: Refined Glassmorphism. Cards use `backdrop-filter: blur(24px)` + `var(--bg-card)`.
- **Accent**: teal (`#0d9488`) in light mode; violet (`#8b5cf6`) in dark mode — set via CSS custom properties on `<html>`.
- **Buttons**: pill-shaped (`border-radius: 9999px`). No heavy solid borders — use `var(--border-subtle)`.
- **Dark mode** is toggled by setting `data-theme="dark"` on `document.documentElement` and updating CSS variables. State persisted in `localStorage('isDarkMode')`.

## Agent Workflow

See `AGENTS.md` for the Orchestrator/UI-Designer/Technical-Engineer subagent SOP used for complex features.
