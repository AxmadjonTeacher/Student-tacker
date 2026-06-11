// "Maktab qoidalari" display-time score penalty.
// Each weekly violation costs 2 correct answers: -2 on the 0-15 scale,
// -13.33 percentage points on the 0-100 scale. Penalties stack and floor at 0.
// Raw stored scores are NEVER mutated — the deduction is applied only where
// scores are rendered/charted, so later scans don't lose the penalty and
// unmarking a violation restores the full score.

export const RAW_PENALTY = 2; // per violation, 0-15 scale
export const PCT_PENALTY = 13.33; // per violation, 0-100 scale (2/15 answers)

/**
 * Penalize an eng_score/math_score value. These columns hold a dual-unit mix
 * (CSV/manual entry: 0-15; testor scans: 0-100 percentage), so values > 15
 * are treated as percentages.
 */
export function applyRulesPenalty(score: number | null | undefined, violations: number): number | null {
  if (score === null || score === undefined || isNaN(score)) return score ?? null;
  if (!violations || violations <= 0) return score;
  const per = score > 15 ? PCT_PENALTY : RAW_PENALTY;
  return Math.max(0, Math.round((score - violations * per) * 100) / 100);
}

/** Penalize a value that is definitely a 0-100 percentage (e.g. subject_scores). */
export function applyRulesPenaltyPercent(pct: number | null | undefined, violations: number): number | null {
  if (pct === null || pct === undefined || isNaN(pct)) return pct ?? null;
  if (!violations || violations <= 0) return pct;
  return Math.max(0, Math.round((pct - violations * PCT_PENALTY) * 100) / 100);
}

interface WeekRowLike {
  student_id?: string | number;
  week?: string;
  is_deleted?: boolean;
  school_rules?: number;
}

/** Weekly violation count for a student from raw student_weeks rows. */
export function violationsForWeek(studentWeeks: WeekRowLike[] | undefined, studentId: string, week: string | undefined): number {
  if (!studentWeeks || !week) return 0;
  const row = studentWeeks.find(sw =>
    sw && !sw.is_deleted &&
    sw.student_id?.toString().trim().toUpperCase() === studentId?.toString().trim().toUpperCase() &&
    sw.week === week
  );
  return row?.school_rules ?? 0;
}
