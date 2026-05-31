export interface Student {
  id: string;
  name: string;
  surname: string;
  className: string;
  dateJoined: string;
  startingLevel: string;
  currentLevel: string;
  pictureUrl?: string;
  grandTests?: { name: string; score: number | null }[];
  teacher?: string;
  orderIndex?: number;
  teacherOrder?: number;
  // Math specific fields
  mathTeacher?: string;
  mathStartingLevel?: string;
  mathCurrentLevel?: string;
  mathGrandTests?: { name: string; score: number | null }[];
  mathTeacherOrder?: number;
  // English explicit helpers (for math projection recovery)
  englishTeacher?: string;
  englishStartingLevel?: string;
  englishCurrentLevel?: string;
  englishGrandTests?: { name: string; score: number | null }[];
  englishTeacherOrder?: number;
  // ALL subject specific fields
  engScore?: number;
  mathScore?: number;
  attendance?: number;
  homework?: number;
  isDeleted?: boolean;
  passcode?: string;
  parentPhone?: string;
  isSessionAdded?: boolean;
}

export type ClassName = '5A' | '5B' | '6A' | '6B' | '7A' | '7B' | '8A' | '8B' | string;

export interface NewsEvent {
  id: number;
  title: string;
  message: string;
  date: string;
  scheduled_for?: string | null;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  label?: string;
  picture_urls?: string[];
  type?: 'news' | 'event' | 'reminder';
}

export type ActiveSubject = 'ENG' | 'MATH' | 'ALL' | 'DETAILS' | 'DASHBOARD';

export interface Teacher {
  id: number;
  name: string;
  subject: 'ENG' | 'MATH';
  created_at?: string;
}

