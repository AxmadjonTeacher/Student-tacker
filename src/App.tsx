import { useState, useEffect, useMemo } from 'react';
import { Settings, X } from 'lucide-react';
import Header from './components/Header';
import StudentTable from './components/StudentTable';
import AdminPanel from './components/AdminPanel';
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

  // Load from Supabase on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase.from('Students').select('*');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const loaded = data.map(mapDbToStudent);
          // Sort based on saved orderIndex to preserve custom sorting
          loaded.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          setStudents(loaded);
        } else {
          // If Supabase table is empty, seed with initial mock data
          setStudents(INITIAL_MOCK_DATA);
          await supabase.from('Students').insert(INITIAL_MOCK_DATA.map(mapStudentToDb));
        }
      } catch (err) {
        console.error('Supabase fetch error, falling back to LocalStorage:', err);
        // Fallback to LocalStorage
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
    // Sequentially index new uploads starting after current length
    const indexedUploads = newStudents.map((s, index) => ({
      ...s,
      orderIndex: students.length + index
    }));

    setStudents(prev => [...prev, ...indexedUploads]);
    if (indexedUploads.length > 0 && indexedUploads[0].className) {
      setActiveClass(getClassGroup(indexedUploads[0].className.toUpperCase()));
    }

    // Sync to Supabase
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

    // Sync to Supabase
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

  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm("Haqiqatan ham ushbu o'quvchini o'chirmoqchimisiz?")) {
      setStudents(prev => prev.filter(s => s.id !== studentId));

      // Sync to Supabase
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
  };

  const handleToggleAdmin = () => {
    setIsAdminMode(prev => !prev);
  };

  const handleBulkDeleteClass = async () => {
    if (window.confirm(`Haqiqatan ham ${activeClass} guruhidagi BARCHA o'quvchilarni o'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.`)) {
      const studentsToDelete = students.filter(s => getClassGroup(s.className.toUpperCase()) === activeClass);
      const idsToDelete = studentsToDelete.map(s => s.id);

      setStudents(prev => prev.filter(s => getClassGroup(s.className.toUpperCase()) !== activeClass));

      // Sync to Supabase
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

  // Keep a Memoized reference of active class students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const group = getClassGroup(s.className.toUpperCase());
      const matchesClass = group === activeClass;
      const matchesSearch = `${s.name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [students, activeClass, searchTerm]);

  // Assign or clear a teacher's association to a student
  const handleAssignTeacher = async (studentId: string, currentTeacher: string) => {
    const teacherName = prompt("O'qituvchining ismi va familiyasini kiriting (o'chirish uchun bo'sh qoldiring):", currentTeacher);
    if (teacherName === null) return; // Cancelled

    const trimmedName = teacherName.trim();
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
  };

  // Move one student next to another via Drag-and-Drop and inherit their teacher group
  const handleMoveStudent = async (draggedId: string, targetId: string) => {
    const draggedIndex = students.findIndex(s => s.id === draggedId);
    const targetIndex = students.findIndex(s => s.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedList = [...students];
    const draggedStudent = { ...updatedList[draggedIndex] };
    const targetStudent = updatedList[targetIndex];

    // Dragged student inherits target student's teacher!
    draggedStudent.teacher = targetStudent.teacher;

    // Remove from the old position and insert at new position next to the target
    updatedList.splice(draggedIndex, 1);
    const newTargetIndex = updatedList.findIndex(s => s.id === targetId);
    updatedList.splice(newTargetIndex, 0, draggedStudent);

    // Re-index all elements sequentially
    const sequentialList = updatedList.map((s, idx) => ({
      ...s,
      orderIndex: idx
    }));

    setStudents(sequentialList);

    // Persist changes in Supabase
    try {
      // Sync dragged student's updated teacher and orderIndex
      const { error } = await supabase
        .from('Students')
        .update({ 
          teacher: draggedStudent.teacher || null,
          order_index: sequentialList.findIndex(s => s.id === draggedId)
        })
        .eq('id', draggedId);

      if (error) throw error;

      // Update orderIndex for all other items in batch
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

      {/* Floating Bottom-Right Admin Toggle Button */}
      <button
        onClick={handleToggleAdmin}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: isAdminMode ? '#0d9488' : '#ffffff',
          color: isAdminMode ? '#ffffff' : '#0d9488',
          border: '1.5px solid #0d9488',
          borderRadius: '9999px',
          padding: '0.75rem 1.5rem',
          fontSize: '0.9rem',
          fontWeight: 700,
          boxShadow: '0 10px 15px -3px rgba(13,148,136,0.3), 0 4px 6px -4px rgba(13,148,136,0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(13,148,136,0.4), 0 8px 10px -6px rgba(13,148,136,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(13,148,136,0.3), 0 4px 6px -4px rgba(13,148,136,0.3)';
        }}
      >
        {isAdminMode ? <X size={18} /> : <Settings size={18} />}
        {isAdminMode ? "Chiqish" : "Admin"}
      </button>
    </div>
  );
}

export default App;
