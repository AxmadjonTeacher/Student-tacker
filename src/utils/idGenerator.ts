// Helper to normalize any student ID to standard BR### or AL### format
export const normalizeStudentId = (id: string | null | undefined): string => {
  if (!id) return '';
  const cleaned = id.toString().replace(/\s+/g, '').toUpperCase();
  const match = cleaned.match(/^(BR|AL)?(\d+)$/i);
  if (match) {
    const prefix = match[1] ? match[1].toUpperCase() : '';
    if (prefix) {
      return `${prefix}${match[2]}`;
    }
    const num = parseInt(match[2]);
    const detectedPrefix = num >= 100 && num <= 199 ? 'BR' : 'AL';
    return `${detectedPrefix}${match[2]}`;
  }
  return cleaned;
};

// Helper to get range boundaries for student grades
export const getGradeRange = (className?: string): { min: number; max: number; prefix: string } => {
  let min = 200;
  let max = 399;
  let prefix = 'AL';

  if (className) {
    const match = className.match(/(\d+)/);
    if (match) {
      const grade = parseInt(match[1]);
      if (grade >= 1 && grade <= 4) {
        min = 100;
        max = 199;
        prefix = 'BR';
      } else if (grade >= 5 && grade <= 6) {
        min = 200;
        max = 399;
        prefix = 'AL';
      } else if (grade >= 7 && grade <= 8) {
        min = 400;
        max = 599;
        prefix = 'AL';
      } else if (grade >= 9 && grade <= 11) {
        min = 600;
        max = 799;
        prefix = 'AL';
      }
    }
  }
  return { min, max, prefix };
};

// Check if a student's ID conforms to their grade range
export const isConformingId = (id: string | null | undefined, className?: string): boolean => {
  if (!id) return false;
  const normalized = normalizeStudentId(id);
  const match = normalized.match(/^(BR|AL)(\d+)$/);
  if (!match) return false;
  const prefix = match[1];
  const num = parseInt(match[2]);
  const range = getGradeRange(className);
  return prefix === range.prefix && num >= range.min && num <= range.max;
};

// Helper to generate a random ID matching grade ranges:
// 1-4 Grades: BR100-BR199
// 5-6 Grades: AL200-AL399
// 7-8 Grades: AL400-AL599
// 9-11 Grades: AL600-AL799
export const generateRandomId = (className?: string, existingIds: string[] = []): string => {
  const { min, max, prefix } = getGradeRange(className);
  const existingSet = new Set(existingIds.map(id => normalizeStudentId(id)));
  let attempts = 0;
  while (attempts < 1000) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    const candidate = `${prefix}${num}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return `${prefix}${num}`;
};

// Helper to generate a random passcode (7 alphanumeric characters)
export const generateRandomPasscode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
