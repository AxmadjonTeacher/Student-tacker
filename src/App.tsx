import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StudentTable from './components/StudentTable';
import AdminPanel from './components/AdminPanel';
import CustomDialog from './components/CustomDialog';
import PasscodeModal from './components/PasscodeModal';
import type { Student } from './types';
import { supabase, mapDbToStudent, mapStudentToDb } from './supabase';

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

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSubject, setActiveSubject] = useState<'ENG' | 'MATH' | 'ALL'>('ENG');
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<string>('5-Sinf');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  // Custom Dialog DialogState
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'prompt';
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

  // Load from Supabase on mount
  useEffect(() => {
    const fetchStudents = async () => {
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
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Sync state to LocalStorage as a local offline cache backup
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('students_data_v2', JSON.stringify(students));
    }
  }, [students, loading]);

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
    const upsertedStudents: Student[] = [];
    const localUpdatedList = [...students];

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
          engScore: newS.engScore !== undefined ? newS.engScore : existing.engScore,
          mathScore: newS.mathScore !== undefined ? newS.mathScore : existing.mathScore,
          attendance: newS.attendance !== undefined ? newS.attendance : existing.attendance,
          homework: newS.homework !== undefined ? newS.homework : existing.homework
        };
        localUpdatedList[matchIndex] = merged;
        upsertedStudents.push(merged);
      } else {
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
          orderIndex: localUpdatedList.length,
          teacherOrder: inheritedEngOrder,
          mathTeacherOrder: inheritedMathOrder,
          engScore: newS.engScore !== undefined ? newS.engScore : 0,
          mathScore: newS.mathScore !== undefined ? newS.mathScore : 0,
          attendance: newS.attendance !== undefined ? newS.attendance : 1,
          homework: newS.homework !== undefined ? newS.homework : 1
        };
        localUpdatedList.push(brandNew);
        upsertedStudents.push(brandNew);
      }
    }

    setStudents(localUpdatedList);

    if (upsertedStudents.length > 0 && upsertedStudents[0].className) {
      setActiveClass(getClassGroup(upsertedStudents[0].className.toUpperCase()));
    }

    try {
      const { error } = await supabase
        .from('Students')
        .upsert(upsertedStudents.map(mapStudentToDb), { onConflict: 'id' });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to sync upserted students to Supabase:', err);
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

    const brandNew: Student = {
      id: Math.random().toString(36).substr(2, 9),
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
      homework: studentData.homework !== undefined ? studentData.homework : 1
    };

    setStudents(prev => [...prev, brandNew]);

    try {
      const { error } = await supabase
        .from('Students')
        .insert(mapStudentToDb(brandNew));
      if (error) throw error;
    } catch (err) {
      console.error('Failed to add student manually to Supabase:', err);
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
      `Haqiqatan ham ${fullName}ni sinfdan o'chirmoqchimisiz?`,
      true,
      async () => {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        try {
          const { error } = await supabase
            .from('Students')
            .delete()
            .eq('id', studentId);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to delete student from Supabase:', err);
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

  const handleBulkDeleteClass = () => {
    showConfirm(
      "Sinfni tozalash",
      `Haqiqatan ham ${activeClass} guruhidagi BARCHA o'quvchilarni o'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.`,
      true,
      async () => {
        const studentsToDelete = students.filter(s => getClassGroup(s.className.toUpperCase()) === activeClass);
        const idsToDelete = studentsToDelete.map(s => s.id);

        setStudents(prev => prev.filter(s => getClassGroup(s.className.toUpperCase()) !== activeClass));

        try {
          const { error } = await supabase
            .from('Students')
            .delete()
            .in('id', idsToDelete);
          if (error) throw error;
        } catch (err) {
          console.error('Failed bulk delete in Supabase:', err);
        }
      }
    );
  };

  const availableClasses = useMemo(() => {
    const groups = new Set([
      ...INITIAL_CLASSES,
      ...students.map(s => getClassGroup(s.className.toUpperCase()))
    ]);
    return Array.from(groups).sort((a, b) => {
      const intA = parseInt(a);
      const intB = parseInt(b);
      if (!isNaN(intA) && !isNaN(intB)) return intA - intB;
      return a.localeCompare(b);
    });
  }, [students]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach(cls => counts[cls] = 0);
    students.forEach(s => {
      const group = getClassGroup(s.className.toUpperCase());
      if (counts[group] !== undefined) {
        counts[group]++;
      } else {
        counts[group] = 1;
      }
    });
    return counts;
  }, [students, availableClasses]);

  // Dynamically project activeSubject properties to standard fields
  const projectedStudents = useMemo(() => {
    return students.map(student => {
      // Always store original english values explicitly so they are not lost after projection!
      const studentWithEng = {
        ...student,
        englishTeacher: student.teacher,
        englishStartingLevel: student.startingLevel,
        englishCurrentLevel: student.currentLevel,
        englishGrandTests: student.grandTests,
        englishTeacherOrder: student.teacherOrder
      };

      if (activeSubject === 'MATH') {
        return {
          ...studentWithEng,
          teacher: student.mathTeacher || '',
          startingLevel: student.mathStartingLevel || student.startingLevel || 'Level 1',
          currentLevel: student.mathCurrentLevel || student.currentLevel || 'Level 1',
          grandTests: student.mathGrandTests || [],
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
        teacherOrder: student.teacherOrder || 0
      };
    });
  }, [students, activeSubject]);

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
    grandTests: { name: string; score: number }[],
    newName?: string,
    newSurname?: string,
    newClassName?: string,
    engScore?: number,
    mathScore?: number,
    attendance?: number,
    homework?: number
  ) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updatedBase = {
          ...s,
          name: newName !== undefined ? newName : s.name,
          surname: newSurname !== undefined ? newSurname : s.surname,
          className: newClassName !== undefined ? newClassName : s.className,
          engScore: engScore !== undefined ? engScore : s.engScore,
          mathScore: mathScore !== undefined ? mathScore : s.mathScore,
          attendance: attendance !== undefined ? attendance : s.attendance,
          homework: homework !== undefined ? homework : s.homework
        };

        if (activeSubject === 'MATH') {
          return {
            ...updatedBase,
            mathStartingLevel: startingLevel,
            mathCurrentLevel: currentLevel,
            mathGrandTests: grandTests
          };
        } else if (activeSubject === 'ENG') {
          return {
            ...updatedBase,
            startingLevel: startingLevel,
            currentLevel: currentLevel,
            grandTests: grandTests
          };
        } else {
          return updatedBase;
        }
      }
      return s;
    }));

    try {
      let updatePayload: any = {};
      if (activeSubject === 'MATH') {
        updatePayload = {
          math_starting_level: startingLevel,
          math_current_level: currentLevel,
          math_grand_tests: grandTests
        };
      } else if (activeSubject === 'ENG') {
        updatePayload = {
          starting_level: startingLevel,
          current_level: currentLevel,
          grand_tests: grandTests
        };
      }

      if (newName !== undefined) updatePayload.name = newName;
      if (newSurname !== undefined) updatePayload.surname = newSurname;
      if (newClassName !== undefined) updatePayload.class_name = newClassName;
      if (engScore !== undefined) updatePayload.eng_score = engScore;
      if (mathScore !== undefined) updatePayload.math_score = mathScore;
      if (attendance !== undefined) updatePayload.attendance = attendance;
      if (homework !== undefined) updatePayload.homework = homework;

      const { error } = await supabase
        .from('Students')
        .update(updatePayload)
        .eq('id', studentId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to sync progress updates to Supabase:', err);
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

      const t = activeSubject === 'MATH' ? s.mathTeacher : s.teacher;
      return (t || '') === teacherName;
    });

    if (matchingStudents.length === 0) return;

    const teacherDisplay = teacherName || "O'qituvchi biriktirilmagan";
    showConfirm(
      "Jadvalni o'chirish",
      `Haqiqatan ham "${teacherDisplay}" guruhidagi barcha (${matchingStudents.length} ta) o'quvchilarni o'chirmoqchimisiz?`,
      true,
      async () => {
        const idsToDelete = matchingStudents.map(s => s.id);
        setStudents(prev => prev.filter(s => !idsToDelete.includes(s.id)));

        try {
          const { error } = await supabase
            .from('Students')
            .delete()
            .in('id', idsToDelete);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to delete teacher table students from Supabase:', err);
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

  return (
    <div className="app-container">
      <Header
        classes={availableClasses}
        activeClass={activeClass}
        onClassSelect={setActiveClass}
        classCounts={classCounts}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isAdminMode={isAdminMode}
        onToggleAdmin={handleToggleAdmin}
        activeSubject={activeSubject}
        onSubjectChange={setActiveSubject}
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
      />

      {isAdminMode && (
        <AdminPanel
          students={students}
          activeClass={activeClass}
          onStudentsUploaded={handleStudentsUploaded}
          onDeleteStudent={handleDeleteStudent}
          onBulkDeleteClass={handleBulkDeleteClass}
          onAddStudent={handleAddStudent}
          activeSubject={activeSubject}
        />
      )}

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
