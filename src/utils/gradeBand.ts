import type { GradeBand } from '../types';

// Grade-band membership for kurator scoping and ENG/MATH range filters.
// "5A" -> 5, "10B" -> 10; non-numeric class names match no band.
export const matchesGradeBand = (className: string, band: GradeBand): boolean => {
  const match = className?.toString().trim().match(/^(\d+)/);
  if (!match) return false;
  const gradeNum = parseInt(match[1], 10);
  if (band === '5-6') return gradeNum === 5 || gradeNum === 6;
  if (band === '7-8') return gradeNum === 7 || gradeNum === 8;
  return gradeNum >= 9 && gradeNum <= 11;
};

export const gradeBandLabel = (band: GradeBand | undefined | null): string => {
  if (!band) return '';
  return `${band}-sinflar`;
};
