import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StudentTable from './components/StudentTable';
import AdminPanel from './components/AdminPanel';
import CustomDialog from './components/CustomDialog';
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
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<string>('5-Sinf');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

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

  const handleStudentsUploaded = async (newStudents: Student[]) => {
    const indexedUploads = newStudents.map((s, index) => ({
      ...s,
      orderIndex: students.length + index
    }));

    setStudents(prev => [...prev, ...indexedUploads]);
    if (indexedUploads.length > 0 && indexedUploads[0].className) {
      setActiveClass(getClassGroup(indexedUploads[0].className.toUpperCase()));
    }

    try {
      const { error } = await supabase.from('Students').insert(indexedUploads.map(mapStudentToDb));
      if (error) throw error;
    } catch (err) {
      console.error('Failed to sync uploaded students to Supabase:', err);
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
    setIsAdminMode(prev => !prev);
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

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const group = getClassGroup(s.className.toUpperCase());
      const matchesClass = group === activeClass;
      const matchesSearch = `${s.name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [students, activeClass, searchTerm]);

  const handleAssignTeacher = (studentId: string, currentTeacher: string) => {
    showPrompt(
      "O'qituvchini biriktirish",
      "O'qituvchining ismi va familiyasini kiriting (o'chirish uchun bo'sh qoldiring):",
      currentTeacher,
      "Ism va familiya...",
      async (value) => {
        const trimmedName = value.trim();
        setStudents(prev => prev.map(s =>
          s.id === studentId ? { ...s, teacher: trimmedName || undefined } : s
        ));

        try {
          const { error } = await supabase
            .from('Students')
            .update({ teacher: trimmedName || null })
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

    draggedStudent.teacher = targetStudent.teacher;

    updatedList.splice(draggedIndex, 1);
    const newTargetIndex = updatedList.findIndex(s => s.id === targetId);
    updatedList.splice(newTargetIndex, 0, draggedStudent);

    const sequentialList = updatedList.map((s, idx) => ({
      ...s,
      orderIndex: idx
    }));

    setStudents(sequentialList);

    try {
      const { error } = await supabase
        .from('Students')
        .update({ 
          teacher: draggedStudent.teacher || null,
          order_index: sequentialList.findIndex(s => s.id === draggedId)
        })
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
      />

      <StudentTable
        students={filteredStudents}
        isAdminMode={isAdminMode}
        onUpdatePhoto={handleUpdateStudentPhoto}
        onDeleteStudent={isAdminMode ? handleDeleteStudent : undefined}
        onAssignTeacher={handleAssignTeacher}
        onMoveStudent={handleMoveStudent}
      />

      {isAdminMode && (
        <AdminPanel
          students={students}
          activeClass={activeClass}
          onStudentsUploaded={handleStudentsUploaded}
          onDeleteStudent={handleDeleteStudent}
          onBulkDeleteClass={handleBulkDeleteClass}
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
    </div>
  );
}

export default App;
