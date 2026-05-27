import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StudentTable from './components/StudentTable';
import SidebarDrawer from './components/SidebarDrawer';
import CustomDialog from './components/CustomDialog';
import PasscodeModal from './components/PasscodeModal';
import type { Student } from './types';
import { supabase, mapDbToStudent, mapStudentToDb } from './supabase';
import LoginScreen from './components/LoginScreen';
import ParentCabinet from './components/ParentCabinet';

const INITIAL_CLASSES = ['5-Sinf', '6-Sinf', '7-Sinf', '8-Sinf', '9-Sinf', '10-Sinf', '11-Sinf'];

const INITIAL_MOCK_DATA: Student[] = [
  { 
    id: '1', name: 'Emma', surname: 'Thompson', className: '5A', dateJoined: 'Sentyabr 2023', startingLevel: 'Level 1', currentLevel: 'Level 3',
    grandTests: [
      { name: 'Grant 1', score: 65 }, { name: 'Grant 2', score: 72 }, { name: 'Grant 3', score: 81 }, { name: 'Grant 4', score: 88 }
    ],
    teacher: 'Abdulloh Teacher',
    orderIndex: 0
  },
  { 
    id: '2', name: 'Liam', surname: 'Anderson', className: '5A', dateJoined: 'Sentyabr 2023', startingLevel: 'Level 1', currentLevel: 'Level 2',
    grandTests: [
      { name: 'Grant 1', score: 55 }, { name: 'Grant 2', score: 60 }, { name: 'Grant 3', score: 68 }, { name: 'Grant 4', score: 75 }
    ],
    teacher: 'Abdulloh Teacher',
    orderIndex: 1
  },
  { 
    id: '3', name: 'Sophia', surname: 'Martinez', className: '5B', dateJoined: 'Yanvar 2024', startingLevel: 'Level 1', currentLevel: 'Level 1',
    grandTests: [
      { name: 'Grant 1', score: 40 }, { name: 'Grant 2', score: 45 }, { name: 'Grant 3', score: 52 }, { name: 'Grant 4', score: 58 }
    ],
    orderIndex: 2
  }
];

// Helper to map student class (e.g. "5A", "5B", "5-Sinf") to combined group name (e.g. "5-Sinf")
export const getClassGroup = (clsName: string): string => {
  const trimmed = clsName?.toString().trim() || '';
  const match = trimmed.match(/^(\d+)/);
  return match ? `${match[1]}-Sinf` : trimmed;
};

// Helper to convert Swedish date representation YYYY-MM-DD to DD-Month format
export const formatDateLabel = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthsUz = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const monthName = monthsUz[monthIdx] || '';
  return `${day}-${monthName}`;
};

// Helper to get local date string YYYY-MM-DD
export const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse week string to academic year sortable value
export const parseWeekToSortValue = (weekStr: string): number => {
  if (!weekStr) return 0;
  if (weekStr.toLowerCase().endsWith('hafta')) {
    const num = parseInt(weekStr, 10);
    return isNaN(num) ? 0 : num;
  }
  const parts = weekStr.split('-');
  if (parts.length !== 2) return 9999;
  const day = parseInt(parts[0], 10);
  if (isNaN(day)) return 9999;
  const monthStr = parts[1].toLowerCase();
  
  const academicMonths = ['sen', 'okt', 'noy', 'dek', 'yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg'];
  const monthIdx = academicMonths.indexOf(monthStr);
  if (monthIdx === -1) return 1000 + day;
  
  return 1000 + monthIdx * 100 + day;
};

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSubject, setActiveSubject] = useState<'ENG' | 'MATH' | 'ALL'>('ENG');
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<string>('5-Sinf');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [studentWeeks, setStudentWeeks] = useState<any[]>([]);
  const [authRole, setAuthRole] = useState<'admin' | 'parent' | null>(null);
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);

  // Custom Dialog DialogState
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'prompt' | 'date-prompt';
    title: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: (value?: string) => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, danger: boolean, onConfirm: () => void) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText: 'Tasdiqlash',
      cancelText: 'Bekor qilish',
      danger,
      onConfirm: () => {
        onConfirm();
        closeDialog();
      }
    });
  };

  const showPrompt = (
    title: string, 
    message: string, 
    defaultValue: string, 
    placeholder: string, 
    onConfirm: (val: string) => void
  ) => {
    setDialog({
      isOpen: true,
      type: 'prompt',
      title,
      message,
      defaultValue,
      placeholder,
      confirmText: 'Saqlash',
      cancelText: 'Bekor qilish',
      danger: false,
      onConfirm: (val) => {
        onConfirm(val || '');
        closeDialog();
      }
    });
  };

  const showDatePrompt = (
    title: string, 
    message: string, 
    defaultValue: string, 
    onConfirm: (val: string) => void
  ) => {
    setDialog({
      isOpen: true,
      type: 'date-prompt',
      title,
      message,
      defaultValue,
      confirmText: 'Saqlash',
      cancelText: 'Bekor qilish',
      danger: false,
      onConfirm: (val) => {
        onConfirm(val || '');
        closeDialog();
      }
    });
  };

  const closeDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Keyboard shortcut listener for Fullscreen mode (pressing 'F' key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // Safeguard: Do not trigger if user is active inside an input or text area!
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error("Failed to enter fullscreen:", err);
          });
        } else {
          document.exitFullscreen().catch((err) => {
            console.error("Failed to exit fullscreen:", err);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('Students').select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const loaded = data.map(mapDbToStudent);
        loaded.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        setStudents(loaded);
      } else {
        setStudents(INITIAL_MOCK_DATA);
        await supabase.from('Students').insert(INITIAL_MOCK_DATA.map(mapStudentToDb));
      }
    } catch (err) {
      console.error('Supabase fetch error, falling back to LocalStorage:', err);
      const saved = localStorage.getItem('students_data_v2');
      if (saved) {
        try {
          const loaded = JSON.parse(saved);
          loaded.sort((a: Student, b: Student) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          setStudents(loaded);
        } catch (e) {
          setStudents(INITIAL_MOCK_DATA);
        }
      } else {
        setStudents(INITIAL_MOCK_DATA);
      }
    }

    try {
      const { data, error } = await supabase.from('student_weeks').select('*');
      if (error) throw error;
      if (data) {
        setStudentWeeks(data);
        const activeWeeksSet = new Set<string>();
        data.forEach(sw => {
          if (sw.week && !sw.is_deleted) activeWeeksSet.add(sw.week);
        });
        const sortedActiveWeeks = Array.from(activeWeeksSet).sort((a, b) => {
          return parseWeekToSortValue(a) - parseWeekToSortValue(b);
        });
        if (sortedActiveWeeks.length > 0) {
          setSelectedWeek(sortedActiveWeeks[sortedActiveWeeks.length - 1]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student weeks history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load from Supabase on mount / restore session
  useEffect(() => {
    const checkSessionAndFetch = async () => {
      const storedRole = localStorage.getItem('auth_role');
      
      if (storedRole === 'admin') {
        const storedPass = localStorage.getItem('admin_passcode');
        if (storedPass === 'Azz21alxorazmiy') {
          setAuthRole('admin');
          setIsAdminMode(false);
          await fetchAllData();
          return;
        }
      } else if (storedRole === 'parent') {
        const storedId = localStorage.getItem('parent_student_id');
        const storedPasscode = localStorage.getItem('parent_student_passcode');
        if (storedId && storedPasscode) {
          try {
            const { data, error } = await supabase
              .from('Students')
              .select('*')
              .eq('id', storedId)
              .eq('passcode', storedPasscode)
              .eq('is_deleted', false)
              .maybeSingle();

            if (!error && data) {
              const student = mapDbToStudent(data);
              setAuthRole('parent');
              setLoggedInStudent(student);
              setStudents([student]);
              
              const { data: weeksData, error: weeksError } = await supabase
                .from('student_weeks')
                .select('*')
                .eq('student_id', student.id)
                .eq('is_deleted', false);
                
              if (!weeksError && weeksData) {
                setStudentWeeks(weeksData);
              }
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Parent session restore failed:', e);
          }
        }
      }
      setLoading(false);
    };

    checkSessionAndFetch();
  }, []);

  // Sync state to LocalStorage as a local offline cache backup (Admin only)
  useEffect(() => {
    if (!loading && authRole === 'admin') {
      localStorage.setItem('students_data_v2', JSON.stringify(students));
    }
  }, [students, loading, authRole]);

  // Dynamic theme colors: English = Dark Green, Math = Teal, All = Indigo
  useEffect(() => {
    if (activeSubject === 'MATH') {
      document.documentElement.style.setProperty('--accent-primary', '#0d9488'); // Teal
      document.documentElement.style.setProperty('--accent-hover', '#0f766e');
      document.documentElement.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #0d9488, #0f766e)');
    } else if (activeSubject === 'ALL') {
      document.documentElement.style.setProperty('--accent-primary', '#4f46e5'); // Premium Indigo
      document.documentElement.style.setProperty('--accent-hover', '#4338ca');
      document.documentElement.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #4f46e5, #4338ca)');
    } else {
      document.documentElement.style.setProperty('--accent-primary', '#166534'); // Premium Dark Green
      document.documentElement.style.setProperty('--accent-hover', '#14532d');
      document.documentElement.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #166534, #14532d)');
    }
  }, [activeSubject]);

  const handleStudentsUploaded = async (newStudents: Student[]) => {
    const localUpdatedList = [...students];
    const existingUpserts: Student[] = [];
    const newInserts: Student[] = [];
    const finalUpsertedWeeks: any[] = [];

    for (let i = 0; i < newStudents.length; i++) {
      const newS = newStudents[i];
      const matchIndex = localUpdatedList.findIndex(
        old => old.name.toLowerCase().trim() === newS.name.toLowerCase().trim() &&
               old.surname.toLowerCase().trim() === newS.surname.toLowerCase().trim()
      );

      if (matchIndex > -1) {
        const existing = localUpdatedList[matchIndex];
        const merged: Student = {
          ...existing,
          ...newS,
          id: existing.id,
          pictureUrl: existing.pictureUrl || newS.pictureUrl,
          orderIndex: existing.orderIndex ?? (localUpdatedList.length + i),
          grandTests: newS.grandTests || existing.grandTests,
          mathGrandTests: newS.mathGrandTests || existing.mathGrandTests,
          teacher: newS.teacher || existing.teacher,
          mathTeacher: newS.mathTeacher || existing.mathTeacher,
          engScore: existing.engScore,
          mathScore: existing.mathScore,
          attendance: existing.attendance,
          homework: existing.homework
        };
        localUpdatedList[matchIndex] = merged;
        existingUpserts.push(merged);
      } else {
        const tempId = Math.random().toString(36).substr(2, 9);
        let inheritedEngOrder = 0;
        if (newS.teacher) {
          const engStudent = localUpdatedList.find(s => 
            getClassGroup(s.className.toUpperCase()) === getClassGroup(newS.className.toUpperCase()) &&
            s.teacher?.trim() === newS.teacher?.trim()
          );
          if (engStudent) inheritedEngOrder = engStudent.teacherOrder || 0;
        }

        let inheritedMathOrder = 0;
        if (newS.mathTeacher) {
          const mathStudent = localUpdatedList.find(s => 
            getClassGroup(s.className.toUpperCase()) === getClassGroup(newS.className.toUpperCase()) &&
            s.mathTeacher?.trim() === newS.mathTeacher?.trim()
          );
          if (mathStudent) inheritedMathOrder = mathStudent.mathTeacherOrder || 0;
        }

        const brandNew: Student = {
          ...newS,
          id: tempId,
          orderIndex: localUpdatedList.length + i,
          teacherOrder: inheritedEngOrder,
          mathTeacherOrder: inheritedMathOrder,
          engScore: 0,
          mathScore: 0,
          attendance: 1,
          homework: 1,
          passcode: ''
        };
        localUpdatedList.push(brandNew);
        newInserts.push(brandNew);
      }
    }

    let uploadedStudentsUpdatedList = [...localUpdatedList];

    // 1. Process and upsert existing students first (we already know their real IDs)
    if (existingUpserts.length > 0) {
      try {
        const { error } = await supabase
          .from('Students')
          .upsert(existingUpserts.map(mapStudentToDb), { onConflict: 'id' });
        if (error) throw error;
        
        // Add their week data
        if (selectedWeek) {
          existingUpserts.forEach(s => {
            const newS = newStudents.find(ns => ns.name.toLowerCase().trim() === s.name.toLowerCase().trim() && ns.surname.toLowerCase().trim() === s.surname.toLowerCase().trim());
            const existingWeekRecord = studentWeeks.find(sw => sw.student_id === s.id && sw.week === selectedWeek);
            if (newS) {
              finalUpsertedWeeks.push({
                student_id: s.id,
                week: selectedWeek,
                eng_score: newS.engScore !== undefined ? newS.engScore : (existingWeekRecord?.eng_score ?? s.engScore ?? 0),
                math_score: newS.mathScore !== undefined ? newS.mathScore : (existingWeekRecord?.math_score ?? s.mathScore ?? 0),
                attendance: newS.attendance !== undefined ? newS.attendance : (existingWeekRecord?.attendance ?? s.attendance ?? 1),
                homework: newS.homework !== undefined ? newS.homework : (existingWeekRecord?.homework ?? s.homework ?? 1),
                starting_level: activeSubject === 'ENG' ? (newS.startingLevel || existingWeekRecord?.starting_level || s.startingLevel || 'Level 1') : (existingWeekRecord?.starting_level || s.startingLevel || 'Level 1'),
                current_level: activeSubject === 'ENG' ? (newS.currentLevel || existingWeekRecord?.current_level || s.currentLevel || 'Level 1') : (existingWeekRecord?.current_level || s.currentLevel || 'Level 1'),
                grand_tests: activeSubject === 'ENG' ? (newS.grandTests || existingWeekRecord?.grand_tests || s.grandTests || []) : (existingWeekRecord?.grand_tests || s.grandTests || []),
                math_starting_level: activeSubject === 'MATH' ? (newS.mathStartingLevel || existingWeekRecord?.math_starting_level || s.mathStartingLevel || 'Level 1') : (existingWeekRecord?.math_starting_level || s.startingLevel || 'Level 1'),
                math_current_level: activeSubject === 'MATH' ? (newS.mathCurrentLevel || existingWeekRecord?.math_current_level || s.currentLevel || 'Level 1') : (existingWeekRecord?.math_current_level || s.currentLevel || 'Level 1'),
                math_grand_tests: activeSubject === 'MATH' ? (newS.mathGrandTests || existingWeekRecord?.math_grand_tests || s.mathGrandTests || []) : (existingWeekRecord?.math_grand_tests || s.mathGrandTests || [])
              });
            }
          });
        }
      } catch (err) {
        console.error('Failed to upsert existing students:', err);
      }
    }

    // 2. Process and insert new students (letting Supabase generate IDs and passcodes)
    if (newInserts.length > 0) {
      try {
        const { data, error } = await supabase
          .from('Students')
          .insert(newInserts.map(s => {
            const dbPayload = mapStudentToDb(s);
            dbPayload.passcode = null; // Let DB generate passcode
            return dbPayload;
          }))
          .select();
        if (error) throw error;
        if (data) {
          const returnedStudents = data.map(mapDbToStudent);
          
          // Replace newInserts in uploadedStudentsUpdatedList with the returnedStudents that have correct IDs/passcodes
          newInserts.forEach((s) => {
            const matchedDb = returnedStudents.find(rs => rs.name.toLowerCase().trim() === s.name.toLowerCase().trim() && rs.surname.toLowerCase().trim() === s.surname.toLowerCase().trim());
            if (matchedDb) {
              const listIdx = uploadedStudentsUpdatedList.findIndex(item => item.name.toLowerCase().trim() === s.name.toLowerCase().trim() && item.surname.toLowerCase().trim() === s.surname.toLowerCase().trim());
              if (listIdx > -1) {
                uploadedStudentsUpdatedList[listIdx] = matchedDb;
              } else {
                uploadedStudentsUpdatedList.push(matchedDb);
              }

              // Create week payload for this new student using their real ID
              if (selectedWeek) {
                const newS = newStudents.find(ns => ns.name.toLowerCase().trim() === s.name.toLowerCase().trim() && ns.surname.toLowerCase().trim() === s.surname.toLowerCase().trim());
                finalUpsertedWeeks.push({
                  student_id: matchedDb.id,
                  week: selectedWeek,
                  eng_score: newS?.engScore ?? 0,
                  math_score: newS?.mathScore ?? 0,
                  attendance: newS?.attendance ?? 1,
                  homework: newS?.homework ?? 1,
                  starting_level: newS?.startingLevel || 'Level 1',
                  current_level: newS?.currentLevel || 'Level 1',
                  grand_tests: newS?.grandTests || [],
                  math_starting_level: newS?.mathStartingLevel || 'Level 1',
                  math_current_level: newS?.mathCurrentLevel || 'Level 1',
                  math_grand_tests: newS?.mathGrandTests || []
                });
              }
            }
          });
        }
      } catch (err) {
        console.error('Failed to insert new students:', err);
      }
    }

    // 3. Upsert week data for all students in bulk
    if (finalUpsertedWeeks.length > 0) {
      setStudentWeeks(prev => {
        const ids = finalUpsertedWeeks.map(w => w.student_id);
        const filtered = prev.filter(sw => !(ids.includes(sw.student_id) && sw.week === selectedWeek));
        return [...filtered, ...finalUpsertedWeeks];
      });

      try {
        const { error } = await supabase
          .from('student_weeks')
          .upsert(finalUpsertedWeeks, { onConflict: 'student_id,week' });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to upsert week data:', err);
      }
    }

    // Update students state
    setStudents(uploadedStudentsUpdatedList);

    if (newStudents.length > 0 && newStudents[0].className) {
      setActiveClass(getClassGroup(newStudents[0].className.toUpperCase()));
    }
  };

  const handleAddStudent = async (studentData: Partial<Student>) => {
    let inheritedEngOrder = 0;
    if (studentData.teacher) {
      const engStudent = students.find(s => 
        getClassGroup(s.className.toUpperCase()) === activeClass &&
        s.teacher?.trim() === studentData.teacher?.trim()
      );
      if (engStudent) inheritedEngOrder = engStudent.teacherOrder || 0;
    }

    let inheritedMathOrder = 0;
    if (studentData.mathTeacher) {
      const mathStudent = students.find(s => 
        getClassGroup(s.className.toUpperCase()) === activeClass &&
        s.mathTeacher?.trim() === studentData.mathTeacher?.trim()
      );
      if (mathStudent) inheritedMathOrder = mathStudent.mathTeacherOrder || 0;
    }

    const tempId = Math.random().toString(36).substr(2, 9);
    const brandNew: Student = {
      id: tempId,
      name: studentData.name || '',
      surname: studentData.surname || '',
      className: activeClass,
      dateJoined: new Date().toISOString().split('T')[0],
      startingLevel: studentData.startingLevel || 'Level 1',
      currentLevel: studentData.currentLevel || 'Level 1',
      teacher: studentData.teacher,
      mathStartingLevel: studentData.mathStartingLevel || 'Level 1',
      mathCurrentLevel: studentData.mathCurrentLevel || 'Level 1',
      mathTeacher: studentData.mathTeacher,
      orderIndex: students.length,
      teacherOrder: inheritedEngOrder,
      mathTeacherOrder: inheritedMathOrder,
      engScore: studentData.engScore !== undefined ? studentData.engScore : 0,
      mathScore: studentData.mathScore !== undefined ? studentData.mathScore : 0,
      attendance: studentData.attendance !== undefined ? studentData.attendance : 1,
      homework: studentData.homework !== undefined ? studentData.homework : 1,
      passcode: '',
      parentPhone: studentData.parentPhone || ''
    };

    setStudents(prev => [...prev, brandNew]);

    try {
      const dbPayload = mapStudentToDb(brandNew);
      dbPayload.passcode = null; // Let Supabase trigger generate passcode

      const { data, error } = await supabase
        .from('Students')
        .insert(dbPayload)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        const dbStudent = mapDbToStudent(data);
        // Replace temp student with db-generated ID and passcode in local state
        setStudents(prev => prev.map(s => s.id === tempId ? dbStudent : s));

        // If selectedWeek is active, insert a week record for this new student
        if (selectedWeek) {
          const weekPayload = {
            student_id: dbStudent.id,
            week: selectedWeek,
            eng_score: dbStudent.engScore ?? 0,
            math_score: dbStudent.mathScore ?? 0,
            attendance: dbStudent.attendance ?? 1,
            homework: dbStudent.homework ?? 1,
            starting_level: dbStudent.startingLevel || 'Level 1',
            current_level: dbStudent.currentLevel || 'Level 1',
            grand_tests: dbStudent.grandTests || [],
            math_starting_level: dbStudent.mathStartingLevel || 'Level 1',
            math_current_level: dbStudent.mathCurrentLevel || 'Level 1',
            math_grand_tests: dbStudent.mathGrandTests || []
          };

          setStudentWeeks(prev => {
            const filtered = prev.filter(sw => !(sw.student_id === dbStudent.id && sw.week === selectedWeek));
            return [...filtered, weekPayload];
          });

          await supabase
            .from('student_weeks')
            .upsert(weekPayload, { onConflict: 'student_id,week' });
        }
      }
    } catch (err) {
      console.error('Failed to add student manually to Supabase:', err);
      // Rollback optimistic add
      setStudents(prev => prev.filter(s => s.id !== tempId));
    }
  };

  const handleUpdateStudentPhoto = async (studentId: string, photoUrl: string) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, pictureUrl: photoUrl } : s
    ));

    try {
      const { error } = await supabase
        .from('Students')
        .update({ picture_url: photoUrl })
        .eq('id', studentId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to sync updated photo to Supabase:', err);
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const fullName = student ? `${student.name} ${student.surname}` : "o'quvchi";

    showConfirm(
      "O'quvchini o'chirish",
      `Haqiqatan ham ${fullName}ni sinfdan o'chirmoqchimisiz? (O'quvchi savatga o'tkaziladi)`,
      true,
      async () => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, isDeleted: true } : s));
        try {
          const { error } = await supabase
            .from('Students')
            .update({ is_deleted: true })
            .eq('id', studentId);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to soft-delete student in Supabase:', err);
        }
      }
    );
  };

  const handleToggleAdmin = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      setShowPasscodeModal(true);
    }
  };

  const handleLoginSuccess = async (role: 'admin' | 'parent', studentData?: any) => {
    setAuthRole(role);
    if (role === 'admin') {
      setIsAdminMode(false);
      await fetchAllData();
    } else if (role === 'parent' && studentData) {
      const student = mapDbToStudent(studentData);
      setLoggedInStudent(student);
      setStudents([student]);
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('student_weeks')
          .select('*')
          .eq('student_id', student.id)
          .eq('is_deleted', false);
          
        if (!error && data) {
          setStudentWeeks(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_role');
    localStorage.removeItem('admin_passcode');
    localStorage.removeItem('parent_student_id');
    localStorage.removeItem('parent_student_passcode');
    
    setAuthRole(null);
    setLoggedInStudent(null);
    setStudents([]);
    setStudentWeeks([]);
    setIsAdminMode(false);
  };

  const handleBulkDeleteClass = () => {
    showConfirm(
      "Sinfni tozalash",
      `Haqiqatan ham ${activeClass} guruhidagi BARCHA o'quvchilarni o'chirmoqchimisiz? (O'quvchilar savatga o'tkaziladi)`,
      true,
      async () => {
        const studentsToDelete = students.filter(s => getClassGroup(s.className.toUpperCase()) === activeClass && !s.isDeleted);
        const idsToDelete = studentsToDelete.map(s => s.id);

        setStudents(prev => prev.map(s => idsToDelete.includes(s.id) ? { ...s, isDeleted: true } : s));

        try {
          const { error } = await supabase
            .from('Students')
            .update({ is_deleted: true })
            .in('id', idsToDelete);
          if (error) throw error;
        } catch (err) {
          console.error('Failed bulk delete in Supabase:', err);
        }
      }
    );
  };

  const activeStudents = useMemo(() => {
    return students.filter(s => !s.isDeleted);
  }, [students]);

  const deletedStudents = useMemo(() => {
    return students.filter(s => s.isDeleted);
  }, [students]);

  const weeksList = useMemo(() => {
    const weeksSet = new Set<string>();
    studentWeeks.forEach(sw => {
      if (sw.week && !sw.is_deleted) weeksSet.add(sw.week);
    });
    return Array.from(weeksSet).sort((a, b) => {
      return parseWeekToSortValue(a) - parseWeekToSortValue(b);
    });
  }, [studentWeeks]);

  const deletedWeeks = useMemo(() => {
    const weeksSet = new Set<string>();
    studentWeeks.forEach(sw => {
      if (sw.week && sw.is_deleted) weeksSet.add(sw.week);
    });
    return Array.from(weeksSet).sort((a, b) => {
      return parseWeekToSortValue(a) - parseWeekToSortValue(b);
    });
  }, [studentWeeks]);

  const availableClasses = useMemo(() => {
    const groups = new Set([
      ...INITIAL_CLASSES,
      ...activeStudents.map(s => getClassGroup(s.className.toUpperCase()))
    ]);
    return Array.from(groups).sort((a, b) => {
      const intA = parseInt(a);
      const intB = parseInt(b);
      if (!isNaN(intA) && !isNaN(intB)) return intA - intB;
      return a.localeCompare(b);
    });
  }, [activeStudents]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach(cls => counts[cls] = 0);
    activeStudents.forEach(s => {
      const group = getClassGroup(s.className.toUpperCase());
      if (counts[group] !== undefined) {
        counts[group]++;
      } else {
        counts[group] = 1;
      }
    });
    return counts;
  }, [activeStudents, availableClasses]);

  // Dynamically project activeSubject properties to standard fields and apply selectedWeek time-travel data
  const projectedStudents = useMemo(() => {
    return activeStudents.map(student => {
      let startingLevel = student.startingLevel;
      let currentLevel = student.currentLevel;
      let grandTests = student.grandTests;
      let mathStartingLevel = student.mathStartingLevel;
      let mathCurrentLevel = student.mathCurrentLevel;
      let mathGrandTests = student.mathGrandTests;
      let engScore = student.engScore;
      let mathScore = student.mathScore;
      let attendance = student.attendance;
      let homework = student.homework;

      if (selectedWeek) {
        const hist = studentWeeks.find(sw => sw.student_id === student.id && sw.week === selectedWeek);
        if (hist) {
          startingLevel = hist.starting_level ?? student.startingLevel;
          currentLevel = hist.current_level ?? student.currentLevel;
          grandTests = hist.grand_tests ?? student.grandTests;
          mathStartingLevel = hist.math_starting_level ?? student.mathStartingLevel;
          mathCurrentLevel = hist.math_current_level ?? student.mathCurrentLevel;
          mathGrandTests = hist.math_grand_tests ?? student.mathGrandTests;
          engScore = hist.eng_score ?? student.engScore;
          mathScore = hist.math_score ?? student.mathScore;
          attendance = hist.attendance ?? student.attendance;
          homework = hist.homework ?? student.homework;
        } else {
          startingLevel = student.startingLevel;
          currentLevel = student.currentLevel || student.startingLevel;
          grandTests = student.grandTests || [];
          mathStartingLevel = student.mathStartingLevel || 'Level 1';
          mathCurrentLevel = student.mathCurrentLevel || 'Level 1';
          mathGrandTests = student.mathGrandTests || [];
          engScore = student.engScore ?? 0;
          mathScore = student.mathScore ?? 0;
          attendance = student.attendance ?? 1;
          homework = student.homework ?? 1;
        }
      } else {
        startingLevel = student.startingLevel;
        currentLevel = student.currentLevel || student.startingLevel;
        grandTests = student.grandTests || [];
        mathStartingLevel = student.mathStartingLevel || 'Level 1';
        mathCurrentLevel = student.mathCurrentLevel || 'Level 1';
        mathGrandTests = student.mathGrandTests || [];
        engScore = student.engScore ?? 0;
        mathScore = student.mathScore ?? 0;
        attendance = student.attendance ?? 1;
        homework = student.homework ?? 1;
      }

      // Always store original english values explicitly so they are not lost after projection!
      const studentWithEng = {
        ...student,
        engScore,
        mathScore,
        attendance,
        homework,
        englishTeacher: student.teacher,
        englishStartingLevel: startingLevel,
        englishCurrentLevel: currentLevel,
        englishGrandTests: grandTests,
        englishTeacherOrder: student.teacherOrder
      };

      if (activeSubject === 'MATH') {
        return {
          ...studentWithEng,
          teacher: student.mathTeacher || '',
          startingLevel: mathStartingLevel || 'Level 1',
          currentLevel: mathCurrentLevel || 'Level 1',
          grandTests: mathGrandTests || [],
          teacherOrder: student.mathTeacherOrder || 0
        };
      } else if (activeSubject === 'ALL') {
        return {
          ...studentWithEng,
          teacher: '',
          teacherOrder: 0
        };
      }
      return {
        ...studentWithEng,
        startingLevel,
        currentLevel,
        grandTests: grandTests || [],
        teacherOrder: student.teacherOrder || 0
      };
    });
  }, [activeStudents, activeSubject, selectedWeek, studentWeeks]);

  const filteredStudents = useMemo(() => {
    return projectedStudents.filter(s => {
      const group = getClassGroup(s.className.toUpperCase());
      const matchesClass = group === activeClass;
      const matchesSearch = `${s.name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [projectedStudents, activeClass, searchTerm]);

  const handleUpdateProgress = async (
    studentId: string, 
    startingLevel: string, 
    currentLevel: string, 
    grandTests: { name: string; score: number | null }[],
    newName?: string,
    newSurname?: string,
    newClassName?: string,
    engScore?: number,
    mathScore?: number,
    attendance?: number,
    homework?: number,
    parentPhone?: string
  ) => {
    // 1. Update local students state for baseline identity & progress edits
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updated = {
          ...s,
          name: newName !== undefined ? newName : s.name,
          surname: newSurname !== undefined ? newSurname : s.surname,
          className: newClassName !== undefined ? newClassName : s.className,
          engScore: engScore !== undefined ? engScore : s.engScore,
          mathScore: mathScore !== undefined ? mathScore : s.mathScore,
          attendance: attendance !== undefined ? attendance : s.attendance,
          homework: homework !== undefined ? homework : s.homework,
          parentPhone: parentPhone !== undefined ? parentPhone : s.parentPhone
        };

        if (activeSubject === 'ENG') {
          updated.startingLevel = startingLevel;
          updated.currentLevel = currentLevel;
          updated.grandTests = grandTests;
          // Keep explicit helpers in sync
          updated.englishStartingLevel = startingLevel;
          updated.englishCurrentLevel = currentLevel;
          updated.englishGrandTests = grandTests;
        } else if (activeSubject === 'MATH') {
          updated.mathStartingLevel = startingLevel;
          updated.mathCurrentLevel = currentLevel;
          updated.mathGrandTests = grandTests;
        }

        return updated;
      }
      return s;
    }));

    // 2. Update Students table in Supabase for baseline identity & progress
    try {
      const payload: any = {};
      if (newName !== undefined) payload.name = newName;
      if (newSurname !== undefined) payload.surname = newSurname;
      if (newClassName !== undefined) payload.class_name = newClassName;
      
      if (engScore !== undefined) payload.eng_score = engScore;
      if (mathScore !== undefined) payload.math_score = mathScore;
      if (attendance !== undefined) payload.attendance = attendance;
      if (homework !== undefined) payload.homework = homework;
      if (parentPhone !== undefined) payload.parent_phone = parentPhone;
      
      if (activeSubject === 'ENG') {
        payload.starting_level = startingLevel;
        payload.current_level = currentLevel;
        payload.grand_tests = grandTests;
      } else if (activeSubject === 'MATH') {
        payload.math_starting_level = startingLevel;
        payload.math_current_level = currentLevel;
        payload.math_grand_tests = grandTests;
      }

      await supabase
        .from('Students')
        .update(payload)
        .eq('id', studentId);
    } catch (err) {
      console.error('Failed to update student baseline in Supabase:', err);
    }

    // 3. Update student_weeks table for weekly scores
    if (selectedWeek) {
      const existing = studentWeeks.find(sw => sw.student_id === studentId && sw.week === selectedWeek);
      const baseStudent = students.find(s => s.id === studentId);

      const weekPayload = {
        student_id: studentId,
        week: selectedWeek,
        eng_score: engScore !== undefined ? engScore : (existing?.eng_score ?? baseStudent?.engScore ?? 0),
        math_score: mathScore !== undefined ? mathScore : (existing?.math_score ?? baseStudent?.mathScore ?? 0),
        attendance: attendance !== undefined ? attendance : (existing?.attendance ?? baseStudent?.attendance ?? 1),
        homework: homework !== undefined ? homework : (existing?.homework ?? baseStudent?.homework ?? 1),
        starting_level: activeSubject === 'ENG' ? startingLevel : (existing?.starting_level ?? baseStudent?.startingLevel ?? 'Level 1'),
        current_level: activeSubject === 'ENG' ? currentLevel : (existing?.current_level ?? baseStudent?.currentLevel ?? 'Level 1'),
        grand_tests: activeSubject === 'ENG' ? grandTests : (existing?.grand_tests ?? baseStudent?.grandTests ?? []),
        math_starting_level: activeSubject === 'MATH' ? startingLevel : (existing?.math_starting_level ?? baseStudent?.mathStartingLevel ?? 'Level 1'),
        math_current_level: activeSubject === 'MATH' ? currentLevel : (existing?.math_current_level ?? baseStudent?.mathCurrentLevel ?? 'Level 1'),
        math_grand_tests: activeSubject === 'MATH' ? grandTests : (existing?.math_grand_tests ?? baseStudent?.mathGrandTests ?? [])
      };

      setStudentWeeks(prev => {
        const filtered = prev.filter(sw => !(sw.student_id === studentId && sw.week === selectedWeek));
        return [...filtered, weekPayload];
      });

      try {
        const { error } = await supabase
          .from('student_weeks')
          .upsert(weekPayload, { onConflict: 'student_id,week' });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to sync student week progress to Supabase:', err);
      }
    }
  };

  const handleAssignTeacher = (studentId: string, currentTeacher: string) => {
    showPrompt(
      "O'qituvchini biriktirish",
      "O'qituvchining ismi va familiyasini kiriting (o'chirish uchun bo'sh qoldiring):",
      currentTeacher,
      "Ism va familiya...",
      async (value) => {
        const trimmedName = value.trim();
        
        let inheritedOrder = 0;
        if (trimmedName) {
          const existingStudent = students.find(s => 
            getClassGroup(s.className.toUpperCase()) === activeClass &&
            (activeSubject === 'MATH' ? s.mathTeacher : s.teacher)?.trim() === trimmedName
          );
          if (existingStudent) {
            inheritedOrder = activeSubject === 'MATH' 
              ? (existingStudent.mathTeacherOrder || 0) 
              : (existingStudent.teacherOrder || 0);
          }
        }

        setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
            return activeSubject === 'MATH'
              ? { ...s, mathTeacher: trimmedName || undefined, mathTeacherOrder: inheritedOrder }
              : { ...s, teacher: trimmedName || undefined, teacherOrder: inheritedOrder };
          }
          return s;
        }));

        try {
          const updatePayload = activeSubject === 'MATH'
            ? { math_teacher: trimmedName || null, math_teacher_order: inheritedOrder }
            : { teacher: trimmedName || null, teacher_order: inheritedOrder };

          const { error } = await supabase
            .from('Students')
            .update(updatePayload)
            .eq('id', studentId);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to sync teacher assignment to Supabase:', err);
        }
      }
    );
  };

  const handleMoveStudent = async (draggedId: string, targetId: string) => {
    const draggedIndex = students.findIndex(s => s.id === draggedId);
    const targetIndex = students.findIndex(s => s.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedList = [...students];
    const draggedStudent = { ...updatedList[draggedIndex] };
    const targetStudent = updatedList[targetIndex];

    if (activeSubject === 'MATH') {
      draggedStudent.mathTeacher = targetStudent.mathTeacher;
    } else {
      draggedStudent.teacher = targetStudent.teacher;
    }

    updatedList.splice(draggedIndex, 1);
    const newTargetIndex = updatedList.findIndex(s => s.id === targetId);
    updatedList.splice(newTargetIndex, 0, draggedStudent);

    const sequentialList = updatedList.map((s, idx) => ({
      ...s,
      orderIndex: idx
    }));

    setStudents(sequentialList);

    try {
      const updatePayload = activeSubject === 'MATH'
        ? { 
            math_teacher: draggedStudent.mathTeacher || null,
            order_index: sequentialList.findIndex(s => s.id === draggedId)
          }
        : { 
            teacher: draggedStudent.teacher || null,
            order_index: sequentialList.findIndex(s => s.id === draggedId)
          };

      const { error } = await supabase
        .from('Students')
        .update(updatePayload)
        .eq('id', draggedId);

      if (error) throw error;

      const promises = sequentialList.map((s, idx) =>
        supabase.from('Students').update({ order_index: idx }).eq('id', s.id)
      );
      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to sync drag-and-drop reorder to Supabase:', err);
    }
  };

  const handleRenameTeacherTable = (oldTeacherName: string) => {
    showPrompt(
      "Jadval nomini tahrirlash",
      "O'qituvchining yangi ismini va familiyasini kiriting (o'chirish uchun bo'sh qoldiring):",
      oldTeacherName,
      "Ism va familiya...",
      async (newTeacherName) => {
        const trimmedNew = newTeacherName.trim();
        // Update local state
        setStudents(prev => prev.map(s => {
          const studentClassGroup = getClassGroup(s.className.toUpperCase());
          if (studentClassGroup !== activeClass) return s;

          if (activeSubject === 'MATH') {
            if ((s.mathTeacher || '') === oldTeacherName) {
              return { ...s, mathTeacher: trimmedNew || undefined };
            }
          } else {
            if ((s.teacher || '') === oldTeacherName) {
              return { ...s, teacher: trimmedNew || undefined };
            }
          }
          return s;
        }));

        // Update Supabase
        try {
          const field = activeSubject === 'MATH' ? 'math_teacher' : 'teacher';
          const matchingStudents = students.filter(s => {
            const studentClassGroup = getClassGroup(s.className.toUpperCase());
            if (studentClassGroup !== activeClass) return false;
            
            const t = activeSubject === 'MATH' ? s.mathTeacher : s.teacher;
            return (t || '') === oldTeacherName;
          });

          if (matchingStudents.length === 0) return;

          const ids = matchingStudents.map(s => s.id);

          const { error } = await supabase
            .from('Students')
            .update({ [field]: trimmedNew || null })
            .in('id', ids);

          if (error) throw error;
        } catch (err) {
          console.error('Failed to rename teacher table in Supabase:', err);
        }
      }
    );
  };

  const handleDeleteTeacherTable = (teacherName: string) => {
    const matchingStudents = students.filter(s => {
      const studentClassGroup = getClassGroup(s.className.toUpperCase());
      if (studentClassGroup !== activeClass) return false;
      if (s.isDeleted) return false;

      const t = activeSubject === 'MATH' ? s.mathTeacher : s.teacher;
      return (t || '') === teacherName;
    });

    if (matchingStudents.length === 0) return;

    const teacherDisplay = teacherName || "O'qituvchi biriktirilmagan";
    showConfirm(
      "Jadvalni o'chirish",
      `Haqiqatan ham "${teacherDisplay}" guruhidagi barcha (${matchingStudents.length} ta) o'quvchilarni o'chirmoqchimisiz? (O'quvchilar savatga o'tkaziladi)`,
      true,
      async () => {
        const idsToDelete = matchingStudents.map(s => s.id);
        setStudents(prev => prev.map(s => idsToDelete.includes(s.id) ? { ...s, isDeleted: true } : s));

        try {
          const { error } = await supabase
            .from('Students')
            .update({ is_deleted: true })
            .in('id', idsToDelete);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to soft-delete teacher table students from Supabase:', err);
        }
      }
    );
  };

  const handleRestoreStudent = async (studentId: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, isDeleted: false } : s));
    try {
      const { error } = await supabase
        .from('Students')
        .update({ is_deleted: false })
        .eq('id', studentId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to restore student in Supabase:', err);
    }
  };

  const handlePermanentDeleteStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const fullName = student ? `${student.name} ${student.surname}` : "o'quvchi";

    showConfirm(
      "O'quvchini butunlay o'chirish",
      `Haqiqatan ham ${fullName}ni butunlay o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi va uning barcha haftalik natijalari o'chib ketadi!`,
      true,
      async () => {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        try {
          await supabase
            .from('student_weeks')
            .delete()
            .eq('student_id', studentId);

          const { error } = await supabase
            .from('Students')
            .delete()
            .eq('id', studentId);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to permanently delete student in Supabase:', err);
        }
      }
    );
  };

  const handleStartNewWeekClick = () => {
    showDatePrompt(
      "Yangi o'quv haftasini boshlash",
      "Yangi o'quv haftasi sanasini tanlang. Yangi hafta barcha o'quvchilar uchun 0 ball va 100% davomat bilan ochiladi:",
      getLocalDateString(),
      async (selectedDate) => {
        if (!selectedDate) return;
        const weekName = formatDateLabel(selectedDate);
        if (!weekName) return;

        try {
          // 1. Prepare snapshot payload (initializing all active students with 0 scores and 100% attendance/homework)
          const activeStudentsList = students.filter(s => !s.isDeleted);
          if (activeStudentsList.length === 0) {
            alert("Faol o'quvchilar mavjud emas!");
            return;
          }

          const snapshotPayload = activeStudentsList.map(s => ({
            student_id: s.id,
            week: weekName,
            eng_score: 0,
            math_score: 0,
            attendance: 1,
            homework: 1,
            starting_level: s.startingLevel || 'Level 1',
            current_level: s.currentLevel || 'Level 1',
            grand_tests: s.grandTests || [],
            math_starting_level: s.mathStartingLevel || 'Level 1',
            math_current_level: s.mathCurrentLevel || 'Level 1',
            math_grand_tests: s.mathGrandTests || []
          }));

          // 2. Upload snapshot
          const { error: snapshotError } = await supabase
            .from('student_weeks')
            .upsert(snapshotPayload, { onConflict: 'student_id,week' });

          if (snapshotError) throw snapshotError;

          // Refetch student weeks history to ensure sync
          const { data: weekData, error: weekFetchError } = await supabase
            .from('student_weeks')
            .select('*');
          if (!weekFetchError && weekData) {
            setStudentWeeks(weekData);
          }

          setSelectedWeek(weekName);
          alert(`"${weekName}" muvaffaqiyatli boshlandi! Yangi hafta barcha o'quvchilar uchun 0 ball bilan ochildi.`);
        } catch (err) {
          console.error("Yangi haftani boshlashda xatolik:", err);
          alert("Haftani arxivlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
        }
      }
    );
  };

  const handleDeleteWeek = (weekName: string) => {
    showConfirm(
      "Haftani o'chirish",
      `Haqiqatan ham "${weekName}" o'quv haftasini savatga o'chirmoqchimisiz?`,
      true,
      async () => {
        // Update local state
        setStudentWeeks(prev => prev.map(sw => sw.week === weekName ? { ...sw, is_deleted: true } : sw));
        try {
          const { error } = await supabase
            .from('student_weeks')
            .update({ is_deleted: true })
            .eq('week', weekName);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to soft-delete week in Supabase:', err);
        }

        // Auto select another week
        const remainingWeeks = weeksList.filter(w => w !== weekName);
        if (remainingWeeks.length > 0) {
          setSelectedWeek(remainingWeeks[remainingWeeks.length - 1]);
        } else {
          setSelectedWeek('');
        }
      }
    );
  };

  const handleRestoreWeek = async (weekName: string) => {
    // Update local state
    setStudentWeeks(prev => prev.map(sw => sw.week === weekName ? { ...sw, is_deleted: false } : sw));
    try {
      const { error } = await supabase
        .from('student_weeks')
        .update({ is_deleted: false })
        .eq('week', weekName);
      if (error) throw error;
      setSelectedWeek(weekName);
    } catch (err) {
      console.error('Failed to restore week in Supabase:', err);
    }
  };

  const handlePermanentDeleteWeek = (weekName: string) => {
    showConfirm(
      "Haftani butunlay o'chirish",
      `Haqiqatan ham "${weekName}" o'quv haftasini butunlay o'chirib tashlamoqchimisiz? Ushbu haftadagi barcha o'quvchilar ballari butunlay yo'qoladi va bu amalni ortga qaytarib bo'lmaydi!`,
      true,
      async () => {
        // Update local state
        setStudentWeeks(prev => prev.filter(sw => sw.week !== weekName));
        try {
          const { error } = await supabase
            .from('student_weeks')
            .delete()
            .eq('week', weekName);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to permanently delete week in Supabase:', err);
        }
      }
    );
  };



  const handleMoveTeacherTable = async (sourceTeacherName: string, direction: 'up' | 'down') => {
    // Determine the unique teachers in the current class for the active subject
    const groupsMap: { [teacher: string]: number } = {};
    filteredStudents.forEach(s => {
      const teacher = s.teacher?.trim() || '';
      const order = s.teacherOrder || 0;
      if (groupsMap[teacher] === undefined) {
        groupsMap[teacher] = order;
      } else {
        groupsMap[teacher] = Math.max(groupsMap[teacher], order);
      }
    });

    const uniqueTeachers = Object.keys(groupsMap).sort((a, b) => {
      if (a === '') return 1;
      if (b === '') return -1;
      if (groupsMap[a] !== groupsMap[b]) {
        return groupsMap[a] - groupsMap[b];
      }
      return a.localeCompare(b, 'uz');
    });

    const sourceIdx = uniqueTeachers.indexOf(sourceTeacherName);
    if (sourceIdx === -1) return;

    const targetIdx = direction === 'up' ? sourceIdx - 1 : sourceIdx + 1;
    
    // Check bounds
    if (targetIdx < 0 || targetIdx >= uniqueTeachers.length) return;
    // Don't swap with the "unassigned" teacher empty string if it is explicitly kept at the end
    if (uniqueTeachers[targetIdx] === '') return;

    // Swap elements
    const temp = uniqueTeachers[sourceIdx];
    uniqueTeachers[sourceIdx] = uniqueTeachers[targetIdx];
    uniqueTeachers[targetIdx] = temp;

    // Now uniquely assign an order based on the new array index
    const localField = activeSubject === 'MATH' ? 'mathTeacherOrder' : 'teacherOrder';
    
    // Build update payload for Supabase and update local state simultaneously
    const updates: any[] = [];
    
    const updatedStudents = students.map(s => {
      if (getClassGroup(s.className.toUpperCase()) !== activeClass) return s;
      const t = (activeSubject === 'MATH' ? s.mathTeacher : s.teacher)?.trim() || '';
      const newOrder = uniqueTeachers.indexOf(t) !== -1 ? uniqueTeachers.indexOf(t) : 0;
      
      // If order changed, track for Supabase
      if (s[localField] !== newOrder) {
        updates.push(mapStudentToDb({
          ...s,
          [localField]: newOrder
        }));
      }

      return {
        ...s,
        [localField]: newOrder
      };
    });

    setStudents(updatedStudents);

    if (updates.length > 0) {
      try {
        const { error } = await supabase
          .from('Students')
          .upsert(updates, { onConflict: 'id' });
        
        if (error) throw error;
      } catch (err) {
        console.error('Failed to sync teacher table order to Supabase:', err);
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#fcfcf9',
        color: '#0d9488',
        gap: '1.5rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #ccfbf1',
          borderTop: '4px solid #0d9488',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
          Ma'lumotlar yuklanmoqda...
        </div>
      </div>
    );
  }

  if (authRole === null) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (authRole === 'parent' && loggedInStudent) {
    return (
      <ParentCabinet
        student={loggedInStudent}
        studentWeeks={studentWeeks}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-container">
      <Header
        classes={availableClasses}
        activeClass={activeClass}
        onClassSelect={setActiveClass}
        classCounts={classCounts}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
        activeSubject={activeSubject}
        isAdminMode={isAdminMode}
        weeksList={weeksList}
        onStartNewWeekClick={handleStartNewWeekClick}
        onDeleteWeekClick={handleDeleteWeek}
        onLogout={handleLogout}
      />

      <StudentTable
        students={filteredStudents}
        isAdminMode={isAdminMode}
        onUpdatePhoto={handleUpdateStudentPhoto}
        onDeleteStudent={isAdminMode ? handleDeleteStudent : undefined}
        onAssignTeacher={handleAssignTeacher}
        onMoveStudent={handleMoveStudent}
        onMoveTeacherTable={handleMoveTeacherTable}
        activeSubject={activeSubject}
        onUpdateProgress={handleUpdateProgress}
        onRenameTeacherTable={handleRenameTeacherTable}
        onDeleteTeacherTable={handleDeleteTeacherTable}
        studentWeeks={studentWeeks}
      />

      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeSubject={activeSubject}
        onSubjectChange={setActiveSubject}
        isAdminMode={isAdminMode}
        onToggleAdmin={handleToggleAdmin}
        students={activeStudents}
        deletedStudents={deletedStudents}
        onRestoreStudent={handleRestoreStudent}
        onPermanentDeleteStudent={handlePermanentDeleteStudent}
        activeClass={activeClass}
        onStudentsUploaded={handleStudentsUploaded}
        onBulkDeleteClass={handleBulkDeleteClass}
        onAddStudent={handleAddStudent}
        deletedWeeks={deletedWeeks}
        onRestoreWeek={handleRestoreWeek}
        onPermanentDeleteWeek={handlePermanentDeleteWeek}
      />

      {/* Elegant Symmetrical Footer */}
      <footer style={{
        marginTop: 'auto',
        paddingTop: '3rem',
        paddingBottom: '1.5rem',
        textAlign: 'center',
        borderTop: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        alignItems: 'center'
      }}>
        <div style={{ textTransform: 'uppercase' }}>
          © 2026 Al-Xorazmiy School. Barcha huquqlar himoyalangan.
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
          Created by Axmadjon
        </div>
      </footer>

      {/* Modern Custom Dialog Pop-up */}
      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        defaultValue={dialog.defaultValue}
        placeholder={dialog.placeholder}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        danger={dialog.danger}
        onConfirm={dialog.onConfirm}
        onClose={closeDialog}
      />

      {showPasscodeModal && (
        <PasscodeModal
          activeSubject={activeSubject}
          onClose={() => setShowPasscodeModal(false)}
          onSuccess={() => {
            setIsAdminMode(true);
            setShowPasscodeModal(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
