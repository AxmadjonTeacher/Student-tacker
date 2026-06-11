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
