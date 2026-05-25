export interface Student {
  id: string;
  name: string;
  surname: string;
  className: string;
  dateJoined: string;
  startingLevel: string;
  currentLevel: string;
  pictureUrl?: string;
  grandTests?: { name: string; score: number }[];
  teacher?: string;
  orderIndex?: number;
  teacherOrder?: number;
  // Math specific fields
  mathTeacher?: string;
  mathStartingLevel?: string;
  mathCurrentLevel?: string;
  mathGrandTests?: { name: string; score: number }[];
  mathTeacherOrder?: number;
  // English explicit helpers (for math projection recovery)
  englishTeacher?: string;
  englishStartingLevel?: string;
  englishCurrentLevel?: string;
  englishGrandTests?: { name: string; score: number }[];
  englishTeacherOrder?: number;
  // ALL subject specific fields
  engScore?: number;
  mathScore?: number;
  attendance?: number;
  homework?: number;
}

export type ClassName = '5A' | '5B' | '6A' | '6B' | '7A' | '7B' | '8A' | '8B' | string;
