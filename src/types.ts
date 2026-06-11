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
  engScore?: number | null;
  mathScore?: number | null;
  attendance?: number;
  homework?: number;
  isDeleted?: boolean;
  passcode?: string;
  parentPhone?: string;
  isSessionAdded?: boolean;
  idWrong?: boolean;
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

export type ActiveSubject = 'ENG' | 'MATH' | 'ALL' | 'DETAILS' | 'DASHBOARD' | 'PRIMARY' | 'GRANT' | 'ENG_MATH' | 'KURATOR';

export type GradeBand = '5-6' | '7-8' | '9-11';

export interface Teacher {
  id: number;
  name: string;
  // 'KURATOR' rows are grade-band curators, not subject teachers
  subject: 'ENG' | 'MATH' | 'KURATOR';
  grade_band?: GradeBand;
  created_at?: string;
  login_id?: string;
  passcode?: string;
  phone?: string;
  picture_url?: string;
}

// Row of the main-DB subject_scores table: weekly results for custom
// (non Eng/Math) subjects scanned in the Testor cabinet. score is 0-100.
export interface SubjectScore {
  id?: string;
  student_id: string;
  week: string;
  subject: string;
  score: number;
  created_at?: string;
}

export interface DailyRecord {
  id?: string;
  student_id: string;
  date: string;
  // 'KURATOR' records carry attendance + school_rule; teacher records carry homework
  subject: 'ENG' | 'MATH' | 'KURATOR';
  attendance: boolean;
  homework: boolean;
  // true = rules followed, false = violation (Maktab qoidalari); KURATOR records only
  school_rule?: boolean;
  teacher_name: string;
  week: string;
  created_at?: string;
  updated_at?: string;
}


