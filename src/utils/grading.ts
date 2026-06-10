import { normalizeStudentId } from './idGenerator';
import type { Student } from '../types';

export interface GradeKey {
  subject: 'ENG' | 'MATH';
  answers: string[];
}

export interface GradeResult {
  resolvedId: string | null;
  student: Student | null;
  correctCount: number;
  percentage: number;
  wrongIndices: number[];
}

export function gradeSheet(
  rawStudentId: string,
  scannedAnswers: string[],
  key: GradeKey,
  students: Student[]
): GradeResult {
  const resolvedId = normalizeStudentId(rawStudentId);
  const student = students.find((s) => s.id === resolvedId && !s.isDeleted) ?? null;

  const wrongIndices: number[] = [];
  let correctCount = 0;

  scannedAnswers.forEach((ans, i) => {
    if (ans === key.answers[i]) {
      correctCount++;
    } else {
      wrongIndices.push(i);
    }
  });

  const percentage = Math.round((correctCount / 15) * 1000) / 10;

  return { resolvedId, student, correctCount, percentage, wrongIndices };
}
