import { createClient } from '@supabase/supabase-js';
import type { Student } from './types';

const SUPABASE_URL = 'https://mvrywaffldfzzjgfctfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cnl3YWZmbGRmenpqZ2ZjdGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTk5OTcsImV4cCI6MjA5NDUzNTk5N30.BmzKU0SEbGW4oy7Ib8h5Yxs8bXoLc3Hv1g2ckg6zPpU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database mapper helpers
export const mapDbToStudent = (db: any): Student => ({
  id: db.id.toString(), // Support string or bigint mapping gracefully
  name: db.name || '',
  surname: db.surname || '',
  className: db.class_name || '',
  dateJoined: db.date_joined || '',
  startingLevel: db.starting_level || '',
  currentLevel: db.current_level || '',
  pictureUrl: db.picture_url || undefined,
  grandTests: db.grand_tests || undefined,
  teacher: db.teacher || undefined,
  orderIndex: db.order_index !== null && db.order_index !== undefined ? Number(db.order_index) : undefined,
  teacherOrder: db.teacher_order !== null && db.teacher_order !== undefined ? Number(db.teacher_order) : 0,
  mathTeacher: db.math_teacher || undefined,
  mathStartingLevel: db.math_starting_level || undefined,
  mathCurrentLevel: db.math_current_level || undefined,
  mathGrandTests: db.math_grand_tests || undefined,
  mathTeacherOrder: db.math_teacher_order !== null && db.math_teacher_order !== undefined ? Number(db.math_teacher_order) : 0
});

export const mapStudentToDb = (student: Student) => ({
  id: student.id,
  name: student.name,
  surname: student.surname,
  class_name: student.className,
  date_joined: student.dateJoined,
  starting_level: student.startingLevel,
  current_level: student.currentLevel,
  picture_url: student.pictureUrl || null,
  grand_tests: student.grandTests || null,
  teacher: student.teacher || null,
  order_index: student.orderIndex !== undefined ? student.orderIndex : null,
  teacher_order: student.teacherOrder !== undefined ? student.teacherOrder : 0,
  math_teacher: student.mathTeacher || null,
  math_starting_level: student.mathStartingLevel || null,
  math_current_level: student.mathCurrentLevel || null,
  math_grand_tests: student.mathGrandTests || null,
  math_teacher_order: student.mathTeacherOrder !== undefined ? student.mathTeacherOrder : 0
});
