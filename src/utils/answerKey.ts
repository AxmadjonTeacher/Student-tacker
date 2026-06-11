// Answer-key normalization shared by scoring, the edit-key modal and
// re-scoring. A key entry in public_tests.questions_json may be:
//   "A"                      — legacy single answer
//   "AC"                     — multi-answer (A or C accepted)
//   { correct_answer: "A" }  — legacy object form
//   { correct: ["A","C"] }   — object form with explicit array
// Normalized form is always a sorted array of unique letters, e.g. ["A","C"].

const VALID_OPTIONS = ['A', 'B', 'C', 'D'];

export const normalizeKeyEntry = (entry: unknown): string[] => {
  let letters: string[] = [];
  if (typeof entry === 'string') {
    letters = entry.toUpperCase().split('');
  } else if (Array.isArray(entry)) {
    letters = entry.map(l => String(l).toUpperCase());
  } else if (entry && typeof entry === 'object') {
    const obj = entry as { correct?: unknown; correct_answer?: unknown };
    if (Array.isArray(obj.correct)) {
      letters = obj.correct.map(l => String(l).toUpperCase());
    } else if (typeof obj.correct_answer === 'string') {
      letters = obj.correct_answer.toUpperCase().split('');
    }
  }
  const unique = Array.from(new Set(letters.filter(l => VALID_OPTIONS.includes(l))));
  return unique.sort();
};

/** Normalize a whole key array, padding/trimming to questionCount when given. */
export const normalizeKeys = (rawKeys: unknown[], questionCount?: number): string[][] => {
  const keys = (Array.isArray(rawKeys) ? rawKeys : []).map(normalizeKeyEntry);
  if (questionCount && questionCount > 0) {
    while (keys.length < questionCount) keys.push(['A']);
    if (keys.length > questionCount) keys.length = questionCount;
  }
  return keys.map(k => (k.length > 0 ? k : ['A']));
};

export const isAnswerCorrect = (answer: string | null | undefined, accepted: string[] | undefined): boolean =>
  !!answer && !!accepted && accepted.includes(answer);

/** Score a raw answer array against normalized keys. */
export const scoreAnswers = (answers: (string | null)[], keys: string[][]) => {
  let correct = 0;
  for (let i = 0; i < keys.length; i++) {
    if (isAnswerCorrect(answers[i], keys[i])) correct++;
  }
  const total = keys.length || 1;
  return { correctCount: correct, percentage: Math.round((correct / total) * 100) };
};

/** Storage form of one normalized entry: ["A","C"] -> "AC". */
export const keyEntryToStorage = (entry: string[]): string => entry.join('');
