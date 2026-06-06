# Al-Xorazmiy School Student Tracker - Technical Rules & System Specification

This document defines the core technical rules, constraints, database schemas, and integration logic for the **Al-Xorazmiy School Student Progress Tracker**. Use these specifications as the source of truth when developing or modifying code relating to IDs, phone numbers, scoring, CSV imports, OMR scanning, or Supabase integrations.

---

## 1. Student ID Specifications & Grade Ranges

The system enforces structured, conforming student IDs. IDs are categorized by grade levels to separate primary, middle, and upper classes.

### 1.1 ID Formats and Boundaries
Conforming student IDs must start with the correct alphabetical prefix and fall within a specific numeric range:

| Grades | ID Prefix | Numeric Range | Grade Name Example |
| :--- | :---: | :---: | :--- |
| **1 - 4** | `BR` | `100` - `199` | 1-Sinf, 2-Sinf, 3-Sinf, 4-Sinf |
| **5 - 6** | `AL` | `200` - `399` | 5-Sinf, 6-Sinf |
| **7 - 8** | `AL` | `400` - `599` | 7-Sinf, 8-Sinf |
| **9 - 11** | `AL` | `600` - `799` | 9-Sinf, 10-Sinf, 11-Sinf |

### 1.2 ID Generation & Validation Logic
- **Manual / CSV Uploads**: If a student row has a blank ID field, a new conforming ID is automatically generated based on their `class_name` range. If the ID is filled, the system updates the student record associated with that ID.
- **Client-Side Validation**:
  - `normalizeStudentId(id)`: Standardizes any string to uppercase without spaces (e.g., `al 305` becomes `AL305`). It also auto-detects and attaches prefixes to raw numbers based on their values (100–199 $\rightarrow$ `BR`, 200–799 $\rightarrow$ `AL`).
  - `isConformingId(id, className)`: Compares the ID's prefix and numeric value against the grade range defined for the student's class.
- **Database Trigger Integration**:
  - A database trigger `trg_students_before_insert` runs before every student insert in Supabase. It calls the function `students_before_insert()`.
  - The database automatically validates the incoming ID. If the ID is non-conforming or blank, it calls `public.generate_unique_student_id_by_class(class_name)` to assign a unique, conforming ID.
  - New students without a passcode are automatically assigned a unique 7-character alphanumeric passcode using the database function `public.generate_unique_student_passcode()`.

> [!IMPORTANT]
> When modifying student IDs in the application (e.g., in `handleSaveCredentials`), **always update the related records in the `student_weeks` table first** to maintain database constraint integrity, then update the `Students` table record.

---

## 2. Parent Phone Number Specifications

Parental contact phone numbers are standardized for SMS notification templates and validation.

### 2.1 Formatting Rules
- **Standard Format**: All phone numbers must start with the country code prefix `+998` (e.g., `+998901234567`).
- **Auto-Correction**:
  - If a number is entered with exactly 9 digits (e.g., `901234567`), it is auto-prefixed with `+998`.
  - If a number starts with `998` without a `+` sign (e.g., `998901234567`), the `+` sign is prepended.
  - If a phone value is exactly `+998` or empty, it is saved in the database as an empty string `""` (or `null`) to prevent incomplete entries.

---

## 3. Score Specifications & Weekly Grading Logic

Scores in the platform represent performance metrics across English and Mathematics tests, attendance, and homework.

### 3.1 Score Formats & Ranges
- **Test Scores (English & Math)**:
  - Raw test scores are integers from `0` to `15`.
  - A blank value in a score section is treated as `0` (which translates to `0%`).
  - **The Asterisk (`*`) Exception**: An asterisk sign next to a score in a CSV import (e.g. `14*`) indicates that the student solved the test but **wrote their ID incorrectly** on the OMR sheet.
- **Attendance & Homework**:
  - Standard inputs are represented as integers.
  - Attendance: `1` indicates present, negative integers represent the number of absences (e.g., `-2` indicates 2 absences).
  - Homework: `1` indicates completed, negative integers represent missed assignments (e.g., `-3` indicates 3 missed homeworks).
  - Staging blank fields in the CSV results in a default behavior of `0%` (attendance or homework value set to `0` or below depending on rules).

### 3.2 Display & Calculation Formulas
- **English / Math Score Percentage**:
  $$\text{Percentage (\%)} = \frac{\text{Score Value}}{15} \times 100$$
- **Attendance Percentage**:
  $$\text{Attendance (\%)} = \max\left(0, 100 - (\text{absences} \times 16.67)\right)$$
- **Homework Percentage**:
  $$\text{Homework (\%)} = \max\left(0, 100 - (\text{missed homeworks} \times 20)\right)$$

---

## 4. OMR Scanner & Student Mapping Logic

The OMR Scanner in `TestorCabinet.tsx` processes physical ZipGrade-style response sheets from weekly testing.

### 4.1 Warping and Resolution
- Target image resolution: **750 x 1000 pixels**.
- Viewfinder checks the 4 outer corner fiducial markers (`TL`, `TR`, `BL`, `BR`) using a Breadth-First Search (BFS) component search on a downscaled 800x600 canvas for speed.
- Once markers are stabilized for 6 consecutive frames, a bilinear perspective warp is executed to map the sheet onto the 750x1000 coordinate system.

### 4.2 Digit bubble grids
- The scanner parses student IDs through a 3-column digit grid (digits 0 to 9).
- The parsed ID code is returned as a 3-digit string (e.g., `"557"`).

### 4.3 Student Matching
The matching code looks for both `BR` and `AL` prefixes in the UI state:
```typescript
const matchingStudent = students.find(s => {
  const matchNum = s.id.match(/^(BR|AL)(\d{3})$/);
  return matchNum && matchNum[2] === parsed.studentIdCode;
});
```
This ensures that students with both primary grade IDs (`BR###`) and middle/upper grade IDs (`AL###`) will auto-match during OMR scanning.

---

## 5. Database Schema & Supabase Integrations

The application uses Supabase Postgres for real-time live database synchronization, with offline fallback caching via `localStorage`.

### 5.1 Tables Summary

#### 1. `public.Students`
Represents the credentials and current cumulative performance statistics of students.
- `id` (`text`, primary key): The student's normalized conforming ID.
- `name` (`text`): First name.
- `surname` (`text`): Last name.
- `class_name` (`text`): Grade and section (e.g., `5A`, `5B`).
- `parent_phone` (`text`, nullable): Standardized Uzbek phone number.
- `passcode` (`text`, nullable): 7-character access passcode for the parent cabinet.
- `starting_level` / `current_level` (`text`): English levels.
- `math_starting_level` / `math_current_level` (`text`): Mathematics levels.
- `teacher` / `math_teacher` (`text`): Teacher assignments.
- `is_deleted` (`boolean`): Soft delete flag.

#### 2. `public.student_weeks`
Historical tracking table storing weekly analysis results.
- `id` (`uuid`, primary key, default `gen_random_uuid()`).
- `student_id` (`text`): Foreign reference matching `Students.id`.
- `week` (`text`): Selected week identifier (e.g., `1-Hafta`).
- `eng_score` / `math_score` (`integer`): Weekly scores out of 15.
- `attendance` / `homework` (`integer`): Weekly metrics.
- `id_wrong` (`boolean`): Flag denoting whether student filled their ID incorrectly (`*` marker).
- `is_deleted` (`boolean`): Soft delete status for historical week records.

#### 3. `public.teachers`
Contains registered instructors.
- `id` (`bigint`, primary key).
- `name` (`text`).
- `subject` (`text`): Either `ENG` or `MATH`.

#### 4. `public.news_events`
Stores scheduled announcements, alerts, and calendar logs.

---

## 6. Technical Workflow Guidelines

When working with data uploads, inline staging, or scoring changes:
1. **Unsaved Changes Banner**: The UI stages modifications to names, IDs, passcodes, or phone numbers in the local `unsavedChanges` state. Provide the Unsaved Changes Banner with dynamic animations (`pulse` keyframe) to alert the user of unsaved credentials.
2. **Offline Resilience**: When fetching database values fails, automatically read from or write to the local offline backup cache (`students_data_v2` in `localStorage`).
3. **Weekly Test Scans**: Keep scans locally in `localStorage` under `testor_scans_{testId}` to prevent data loss before they are committed to database test counts.
