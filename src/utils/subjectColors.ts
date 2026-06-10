// Deterministic color per custom subject name, used wherever custom-subject
// scores are charted (Testor Tahlil, GraphModal, ParentCabinet).
const SUBJECT_PALETTE = ['#8b5cf6', '#0d9488', '#f97316', '#3b82f6', '#10b981', '#f43f5e'];

export function getSubjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  }
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}
