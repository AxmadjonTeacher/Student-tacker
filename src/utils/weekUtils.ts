// Week-label helpers shared by components without importing from App.tsx
// (components deliberately avoid App imports to prevent dependency cycles).

// Same format as formatDateLabel in App.tsx and the create_weekly_snapshot()
// pg_cron function in the main DB: "13-Iyun"
const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export const formatDateLabel = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = MONTHS_UZ[monthIdx] || '';
  return `${day}-${monthName}`;
};

/**
 * Week label for a lesson date: the label of that week's SATURDAY.
 * The school week runs Monday–Saturday; Sundays belong to no week → null.
 */
export const weekLabelForDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  const dow = d.getDay(); // 0 = Sunday
  if (dow === 0) return null;
  const saturday = new Date(d);
  saturday.setDate(d.getDate() + (6 - dow));
  const y = saturday.getFullYear();
  const m = String(saturday.getMonth() + 1).padStart(2, '0');
  const day = String(saturday.getDate()).padStart(2, '0');
  return formatDateLabel(`${y}-${m}-${day}`);
};

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Resolve a week label like "13-Iyun" back to its Saturday's ISO date.
 * Labels carry no year, so the year is inferred: among the previous, current
 * and next year, pick candidates where that day-month actually falls on a
 * Saturday (week labels are always Saturdays by construction), tie-broken by
 * closeness to today — this also handles the Dec/Jan boundary. Returns null
 * for legacy non-date labels ("1-Hafta") or labels that are never a Saturday.
 */
export const saturdayDateForWeekLabel = (label: string, now: Date = new Date()): string | null => {
  if (!label) return null;
  const parts = label.split('-');
  if (parts.length !== 2) return null;
  const day = parseInt(parts[0], 10);
  const monthIdx = MONTHS_UZ.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
  if (isNaN(day) || monthIdx === -1) return null;

  let best: Date | null = null;
  for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    const candidate = new Date(year, monthIdx, day, 12, 0, 0);
    if (candidate.getDate() !== day || candidate.getMonth() !== monthIdx) continue; // invalid date (e.g. Feb 30)
    if (candidate.getDay() !== 6) continue; // not a Saturday in this year
    if (!best || Math.abs(candidate.getTime() - now.getTime()) < Math.abs(best.getTime() - now.getTime())) {
      best = candidate;
    }
  }
  return best ? toISODate(best) : null;
};

/** Monday–Saturday ISO date range for a week label; null for legacy labels. */
export const dateRangeForWeek = (label: string, now: Date = new Date()): { start: string; end: string } | null => {
  const satStr = saturdayDateForWeekLabel(label, now);
  if (!satStr) return null;
  const sat = new Date(`${satStr}T12:00:00`);
  const mon = new Date(sat);
  mon.setDate(sat.getDate() - 5);
  return { start: toISODate(mon), end: satStr };
};

/**
 * Teachers/kurators may edit a lesson's marks for 2 days after the lesson
 * date (until the end of lessonDate + 2). Admin bypasses this in the UI.
 */
export const isLessonEditable = (dateStr: string, now: Date = new Date()): boolean => {
  if (!dateStr) return false;
  const deadline = new Date(`${dateStr}T23:59:59`);
  if (isNaN(deadline.getTime())) return false;
  deadline.setDate(deadline.getDate() + 2);
  return now.getTime() <= deadline.getTime();
};
