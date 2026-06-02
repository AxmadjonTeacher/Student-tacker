// Helper to generate a random ID matching grade ranges:
// 5-6 Grades: 300-400
// 7-8 Grades: 400-500
// 9-11 Grades: 500-600
export const generateRandomId = (className?: string, existingIds: string[] = []): string => {
  let min = 300;
  let max = 600;

  if (className) {
    const match = className.match(/(\d+)/);
    if (match) {
      const grade = parseInt(match[1]);
      if (grade === 5 || grade === 6) {
        min = 300;
        max = 400;
      } else if (grade === 7 || grade === 8) {
        min = 400;
        max = 500;
      } else if (grade >= 9 && grade <= 11) {
        min = 500;
        max = 600;
      }
    }
  }

  const existingSet = new Set(existingIds);
  let attempts = 0;
  while (attempts < 1000) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    const candidate = `AL${num}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return `AL${num}`;
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
