import React, { useState } from 'react';
import type { Student, ActiveSubject, Teacher } from '../types';
import { Inbox, LineChart, ArrowRight, Trash2, Pencil, Users, MoreVertical, ChevronUp, ChevronDown, Key, Phone, Save, RotateCw, Download, X } from 'lucide-react';
import GraphModal from './GraphModal';
import EditProgressModal from './EditProgressModal';
import * as XLSX from 'xlsx';

interface StudentTableProps {
  students: Student[];
  isAdminMode: boolean;
  onUpdatePhoto?: (studentId: string, photoUrl: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onAssignTeacher?: (studentId: string, teacherName: string) => void;
  onMoveStudent?: (draggedId: string, targetId: string) => void;
  activeSubject?: ActiveSubject;
  onUpdateProgress?: (
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
  ) => void;
  onRenameTeacherTable?: (oldName: string) => void;
  onDeleteTeacherTable?: (teacherName: string) => void;
  onMoveTeacherTable?: (teacherName: string, direction: 'up' | 'down') => void;
  studentWeeks?: any[];
  onSaveCredentials?: (changes: Record<string, Partial<Student>>) => Promise<boolean>;
  onBatchRegenerateCredentials?: (regenerateIds: boolean, regeneratePasscodes: boolean, targetClass: string | null) => Promise<boolean>;
  teachers?: Teacher[];
  authRole?: string | null;
  showSummerPlan?: boolean;
  selectedWeek?: string;
  onWeekChange?: (week: string) => void;
  weeksList?: string[];
  onStartNewWeekClick?: () => void;
  onDeleteWeekClick?: (weekName: string) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({ 
  students, 
  isAdminMode,
  onUpdatePhoto, 
  onDeleteStudent,
  onAssignTeacher,
  onMoveStudent,
  activeSubject = 'ENG',
  onUpdateProgress,
  onRenameTeacherTable,
  onDeleteTeacherTable,
  onMoveTeacherTable,
  studentWeeks = [],
  onSaveCredentials,
  onBatchRegenerateCredentials,
  teachers = [],
  authRole,
  showSummerPlan = true,
  selectedWeek,
  onWeekChange,
  weeksList = [],
  onStartNewWeekClick,
  onDeleteWeekClick
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [photoActionStudentId, setPhotoActionStudentId] = useState<string | null>(null);
  const [uploadingStudentId, setUploadingStudentId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'HL' | 'AZ' | 'ID_ASC' | 'ID_DESC' | 'DEFAULT'>('DEFAULT');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // States for inline credentials editing
  const [editingCell, setEditingCell] = useState<{ studentId: string, field: 'name' | 'id' | 'passcode' | 'parentPhone' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, Partial<Student>>>({});

  // Copy to clipboard notification toast state
  const [copiedId, setCopiedId] = useState<{ id: string; field: string } | null>(null);

  // Teacher assignment modal choice dropdown state
  const [assigningStudent, setAssigningStudent] = useState<{ id: string; currentTeacher: string } | null>(null);

  // States for batch regenerate modal
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regenIds, setRegenIds] = useState(true);
  const [regenPasscodes, setRegenPasscodes] = useState(true);
  const [regenTarget, setRegenTarget] = useState<'class' | 'all'>('class');

  const handleCopyText = (text: string, studentId: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId({ id: studentId, field });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderAllSectionMenu = () => {
    const dropdownId = 'all-section-menu';
    const isOpen = openDropdownId === dropdownId;
    return (
      <div 
        className="table-actions-dropdown-container" 
        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isOpen ? null : dropdownId); }}
          style={{
            background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer',
            padding: '0.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
        >
          <MoreVertical size={16} />
        </button>
        
        <div 
          className="table-actions-menu"
          style={{
            position: 'absolute', top: '100%', right: 0, paddingTop: '6px',
            display: isOpen ? 'flex' : 'none', zIndex: 100,
          }}
          onMouseEnter={() => setOpenDropdownId(dropdownId)}
          onMouseLeave={() => setOpenDropdownId(null)}
        >
          <div style={{
            width: '190px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left'
          }}>
            <button
              onClick={() => { setOpenDropdownId(null); setSortBy('HL'); }}
              style={{
                background: sortBy === 'HL' ? '#f1f5f9' : 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155', cursor: 'pointer',
                textAlign: 'left', width: '100%'
              }}
            >
              Sort bu highest to lowest
            </button>
            <button
              onClick={() => { setOpenDropdownId(null); setSortBy('AZ'); }}
              style={{
                background: sortBy === 'AZ' ? '#f1f5f9' : 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155', cursor: 'pointer',
                textAlign: 'left', width: '100%'
              }}
            >
              Sort by A to Z
            </button>
            <button
              onClick={() => { setOpenDropdownId(null); handleExportAllToExcel(sortedStudents); }}
              style={{
                background: 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155', cursor: 'pointer',
                textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Excel Yuklash
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailsSectionMenu = () => {
    const dropdownId = 'details-section-menu';
    const isOpen = openDropdownId === dropdownId;
    return (
      <div 
        className="table-actions-dropdown-container" 
        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isOpen ? null : dropdownId); }}
          style={{
            background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer',
            padding: '0.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
        >
          <MoreVertical size={16} />
        </button>
        
        <div 
          className="table-actions-menu"
          style={{
            position: 'absolute', top: '100%', right: 0, paddingTop: '6px',
            display: isOpen ? 'flex' : 'none', zIndex: 100,
          }}
          onMouseEnter={() => setOpenDropdownId(dropdownId)}
          onMouseLeave={() => setOpenDropdownId(null)}
        >
          <div style={{
            width: '210px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left'
          }}>
            <button
              onClick={() => { setOpenDropdownId(null); setSortBy('AZ'); }}
              style={{
                background: sortBy === 'AZ' ? 'var(--bg-card-hover)' : 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                textAlign: 'left', width: '100%'
              }}
            >
              Ism bo'yicha tartiblash (A-Z)
            </button>
            <button
              onClick={() => { setOpenDropdownId(null); setSortBy('ID_ASC'); }}
              style={{
                background: sortBy === 'ID_ASC' ? 'var(--bg-card-hover)' : 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                textAlign: 'left', width: '100%'
              }}
            >
              ID bo'yicha (O'suvchi)
            </button>
            <button
              onClick={() => { setOpenDropdownId(null); setSortBy('ID_DESC'); }}
              style={{
                background: sortBy === 'ID_DESC' ? 'var(--bg-card-hover)' : 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                textAlign: 'left', width: '100%'
              }}
            >
              ID bo'yicha (Kamayuvchi)
            </button>
            <button
              onClick={() => { setOpenDropdownId(null); handleExportCredentialsToExcel(sortedStudents); }}
              style={{
                background: 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Excel Yuklash
            </button>
          </div>
        </div>
      </div>
    );
  };

  const sortedStudents = React.useMemo(() => {
    if (activeSubject !== 'ALL' && activeSubject !== 'DETAILS') return students;

    const getAveragePercentage = (s: Student) => {
      const eng = (s.engScore || 0) / 15 * 100;
      const math = (s.mathScore || 0) / 15 * 100;
      const absences = (s.attendance ?? 1) < 0 ? -(s.attendance ?? 1) : 0;
      const att = Math.max(0, 100 - absences * 16.67);
      const missedHw = (s.homework ?? 1) < 0 ? -(s.homework ?? 1) : 0;
      const hw = Math.max(0, 100 - missedHw * 20);
      return (eng + math + att + hw) / 4;
    };

    // Separate new session-added students to always keep them at the bottom
    const existingStudents = students.filter(s => !s.isSessionAdded);
    const sessionNewStudents = students.filter(s => s.isSessionAdded);

    // Sort existing students
    if (activeSubject === 'ALL' && sortBy === 'HL') {
      existingStudents.sort((a, b) => getAveragePercentage(b) - getAveragePercentage(a));
    } else if (sortBy === 'ID_ASC') {
      existingStudents.sort((a, b) => {
        const numA = parseInt((a.id || '').replace(/\D/g, '')) || 0;
        const numB = parseInt((b.id || '').replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    } else if (sortBy === 'ID_DESC') {
      existingStudents.sort((a, b) => {
        const numA = parseInt((a.id || '').replace(/\D/g, '')) || 0;
        const numB = parseInt((b.id || '').replace(/\D/g, '')) || 0;
        return numB - numA;
      });
    } else if (sortBy === 'AZ') {
      existingStudents.sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'uz'));
    } else {
      // Default sorting is alphabetical A-Z
      existingStudents.sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'uz'));
    }

    // Sort new students alphabetically as well so they are tidy at the bottom
    sessionNewStudents.sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'uz'));

    return [...existingStudents, ...sessionNewStudents];
  }, [students, sortBy, activeSubject]);

  const handleCellSave = (studentId: string, field: 'name' | 'id' | 'passcode' | 'parentPhone', value: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      setEditingCell(null);
      return;
    }

    setUnsavedChanges(prev => {
      const studentEdits = prev[studentId] || {};
      const updatedEdits = { ...studentEdits };

      if (field === 'name') {
        const parts = value.trim().split(/\s+/);
        const newName = parts[0] || '';
        const newSurname = parts.slice(1).join(' ') || '';
        updatedEdits.name = newName;
        updatedEdits.surname = newSurname;
      } else if (field === 'id') {
        updatedEdits.id = value.trim();
      } else if (field === 'passcode') {
        updatedEdits.passcode = value.trim();
      } else if (field === 'parentPhone') {
        let phoneVal = value.trim();
        if (phoneVal === '+998' || phoneVal === '') {
          updatedEdits.parentPhone = '';
        } else {
          updatedEdits.parentPhone = phoneVal;
        }
      }

      // If the field is identical to original, remove from edits
      if (updatedEdits.name === student.name && updatedEdits.surname === student.surname) {
        delete updatedEdits.name;
        delete updatedEdits.surname;
      }
      if (updatedEdits.id === student.id) {
        delete updatedEdits.id;
      }
      if (updatedEdits.passcode === student.passcode) {
        delete updatedEdits.passcode;
      }
      if (updatedEdits.parentPhone === (student.parentPhone || '')) {
        delete updatedEdits.parentPhone;
      }

      const newPrev = { ...prev };
      if (Object.keys(updatedEdits).length === 0) {
        delete newPrev[studentId];
      } else {
        newPrev[studentId] = updatedEdits;
      }
      return newPrev;
    });
    setEditingCell(null);
  };

  const handleExportCredentialsToExcel = (studentsList: Student[]) => {
    const data = studentsList.map(student => {
      const edits = unsavedChanges[student.id] || {};
      const name = edits.name !== undefined ? edits.name : student.name;
      const surname = edits.surname !== undefined ? edits.surname : student.surname;
      const idVal = edits.id || student.id;
      const passcodeVal = edits.passcode !== undefined ? edits.passcode : student.passcode;
      const phoneVal = edits.parentPhone !== undefined ? edits.parentPhone : student.parentPhone;

      return {
        "O'quvchining ismi va familiyasi": `${name} ${surname}`.trim(),
        "Sinf": student.className,
        "ID raqami": idVal,
        "Parol (Passcode)": passcodeVal || '',
        "Telefon raqami": phoneVal || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    worksheet['!cols'] = [
      { wch: 30 }, // O'quvchining ismi va familiyasi
      { wch: 10 }, // Sinf
      { wch: 15 }, // ID raqami
      { wch: 15 }, // Parol
      { wch: 20 }  // Telefon raqami
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "O'quvchilar Ma'lumotlari");

    const firstStudentClass = studentsList[0]?.className || '';
    const match = firstStudentClass.match(/^(\d+)/);
    const classLabel = match ? `${match[1]}-sinf` : 'Barcha';
    const filename = `${classLabel}_oquvchilar_tafsilotlari.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleExportTableToExcel = (teacherName: string, studentsList: Student[]) => {
    const suffix = activeSubject.toLowerCase(); // 'eng' or 'math'
    
    const data = studentsList.map(student => {
      const getScore = (testName: string) => {
        const test = student.grandTests?.find(t => t.name.toLowerCase().includes(testName.toLowerCase()));
        return test ? test.score : '';
      };

      return {
        "O'quvchining ismi va familiyasi": `${student.name} ${student.surname}`,
        "sinf": student.className,
        [`boshlang'ich daraja ${suffix}`]: student.startingLevel,
        [`hozirgi daraja ${suffix}`]: student.currentLevel,
        [`Grant 1 ${suffix}`]: getScore("Grant 1") || getScore("1"),
        [`Grant 2 ${suffix}`]: getScore("Grant 2") || getScore("2"),
        [`Grant 3 ${suffix}`]: getScore("Grant 3") || getScore("3"),
        [`Grant 4 ${suffix}`]: getScore("Grant 4") || getScore("4")
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Beautiful column widths matching content
    worksheet['!cols'] = [
      { wch: 30 }, // O'quvchining ismi va familiyasi
      { wch: 10 }, // sinf
      { wch: 25 }, // boshlang'ich daraja
      { wch: 20 }, // hozirgi daraja
      { wch: 15 }, // Grant 1
      { wch: 15 }, // Grant 2
      { wch: 15 }, // Grant 3
      { wch: 15 }  // Grant 4
    ];

    const workbook = XLSX.utils.book_new();
    const safeTeacherName = teacherName.replace(/[^a-zA-Z0-9 uz]/g, '') || 'Oqituvchisiz';
    XLSX.utils.book_append_sheet(workbook, worksheet, safeTeacherName.slice(0, 30));

    const filename = `${safeTeacherName}_${activeSubject}_tabel.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleExportAllToExcel = (studentsList: Student[]) => {
    const data = studentsList.map(student => {
      return {
        "ID": student.id,
        "O'quvchining ismi va familiyasi": `${student.name} ${student.surname}`,
        "sinf": student.className,
        "Eng score": student.engScore ?? 0,
        "Math score": student.mathScore ?? 0,
        "Attendance": student.attendance ?? 1,
        "Homework": student.homework ?? 1
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    worksheet['!cols'] = [
      { wch: 12 }, // ID
      { wch: 30 }, // O'quvchining ismi va familiyasi
      { wch: 10 }, // sinf
      { wch: 15 }, // Eng score
      { wch: 15 }, // Math score
      { wch: 15 }, // Attendance
      { wch: 15 }  // Homework
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Barcha natijalar");

    const filename = `${studentsList[0]?.className || 'Barcha'}_barcha_natijalar.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleAvatarClick = (studentId: string) => {
    setUploadingStudentId(studentId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingStudentId || !onUpdatePhoto) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onUpdatePhoto(uploadingStudentId, dataUrl);
        
        setUploadingStudentId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const getLevelValue = (levelStr: string): number => {
    const match = levelStr.match(/\d+/);
    if (match) return parseInt(match[0], 10);

    const l = levelStr.toLowerCase();
    if (l.includes('adv') || l.includes('c1') || l.includes('c2')) return 6;
    if (l.includes('up')) return 5;
    if (l.includes('pre')) return 3;
    if (l.includes('int') || l.includes('b1') || l.includes('b2')) return 4;
    if (l.includes('ele') || l.includes('a2')) return 2;
    return 1;
  };

  const calculateImprovement = (start: string, current: string) => {
    const diff = getLevelValue(current) - getLevelValue(start);
    if (diff > 0) return `+${diff} daraja`;
    if (diff < 0) return `${diff} daraja`;
    return 'Daraja saqlandi';
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    if (sourceId && sourceId !== targetId && !sourceId.startsWith('group:') && onMoveStudent) {
      onMoveStudent(sourceId, targetId);
    }
    setDraggedId(null);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .mobile-label {
          display: none;
        }
        @media (max-width: 768px) {
          .table-header-row {
            display: none !important;
          }
          .table-card-container {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            margin-bottom: 0 !important;
          }
          .teacher-group-header {
            display: block !important;
            background: transparent !important;
            border-bottom: none !important;
            padding: 0.5rem 0.25rem !important;
            margin-top: 1rem !important;
            margin-bottom: 0.5rem !important;
          }
          .teacher-group-header > div:first-child {
            font-size: 0.95rem !important;
            font-weight: 850 !important;
            color: #0f172a !important;
            letter-spacing: 0.02em !important;
          }
          .teacher-group-header > div:not(:first-child) {
            display: none !important;
          }
          .student-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            border: 1.5px solid #e5e7eb !important;
            border-radius: 16px !important;
            margin-bottom: 1.25rem !important;
            padding: 1.25rem 1rem !important;
            gap: 0.75rem !important;
            background: #ffffff !important;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01) !important;
          }
          .table-cell {
            border-right: none !important;
            border-bottom: 1px dashed #f1f5f9 !important;
            padding: 0.5rem 0 !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            height: auto !important;
          }
          .table-cell:last-child, .table-cell.no-border {
            border-bottom: none !important;
          }
          .chart-cell {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            padding: 0.75rem 0 !important;
          }
          .chart-cell svg {
            width: 74px !important;
            margin-right: 0 !important;
            flex-shrink: 0 !important;
          }
          .mobile-label {
            display: inline-block !important;
            font-weight: 700 !important;
            color: #64748b !important;
            font-size: 0.8rem !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .name-block {
            border-right: none !important;
            border-bottom: 1px solid #e5e7eb !important;
            padding-bottom: 0.75rem !important;
            margin-bottom: 0.25rem !important;
            width: 100% !important;
            height: auto !important;
          }
        }
        .student-table-container {
          padding: 1.5rem 2.5rem 3.5rem 2.5rem;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .student-table-container {
            padding: 1rem 1rem 2rem 1rem !important;
          }
        }
      `}} />
      <div 
        className="student-table-container"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem', 
          width: '100%'
        }}
      >
        {students.length === 0 ? (
          <div className="empty-state">
            <Inbox size={48} />
            <p>Ushbu sinfda o'quvchilar topilmadi.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>O'quvchilar ma'lumotlarini yuklash uchun admin paneldan foydalaning.</p>
          </div>
        ) : (
          <>
            {activeSubject === 'ALL' ? (
              <div 
                className="table-card-container"
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)',
                  overflow: 'hidden',
                  marginBottom: '2rem'
                }}
              >
                {/* Header row */}
                <div className="table-header-row" style={{
                  display: 'grid',
                  gridTemplateColumns: isAdminMode ? '2.5fr 1fr 1fr 1fr 1fr 1.5fr 1fr' : '2.5fr 1fr 1fr 1fr 1fr 1.5fr',
                  alignItems: 'stretch',
                  padding: '0 1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-card-hover)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em'
                }}>
                  <div style={{ 
                    fontWeight: 900, 
                    color: 'var(--text-primary)', 
                    fontSize: '0.85rem', 
                    letterSpacing: '0.04em', 
                    borderRight: '1px solid var(--border-color)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.5rem 0',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ whiteSpace: 'nowrap' }}>HAFTALIK NATIJALAR</span>
                    {onWeekChange && weeksList && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={selectedWeek}
                            onChange={(e) => onWeekChange(e.target.value)}
                            style={{
                              background: 'var(--bg-card-hover)',
                              color: 'var(--text-primary)',
                              border: '1.5px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '0.35rem 1.75rem 0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              outline: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              display: 'block',
                              lineHeight: 1.2
                            }}
                          >
                            {weeksList.length === 0 ? (
                              <option value="">Hafta yo'q</option>
                            ) : (
                              weeksList.map(w => (
                                <option key={w} value={w}>{w}</option>
                              ))
                            )}
                          </select>
                          <div style={{
                            position: 'absolute',
                            right: '0.5rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <svg width="8" height="5" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 1L5 5L9 1" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>

                        {isAdminMode && selectedWeek && authRole !== 'admin123' && onDeleteWeekClick && (
                          <button
                            onClick={() => onDeleteWeekClick(selectedWeek)}
                            title="Ushbu haftani savatga o'chirish"
                            style={{
                              background: '#fee2e2',
                              color: '#ef4444',
                              border: '1.5px solid #fca5a5',
                              borderRadius: '8px',
                              padding: '0.35rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              height: '26px',
                              width: '26px',
                              boxSizing: 'border-box'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#fee2e2';
                              e.currentTarget.style.color = '#ef4444';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                        {isAdminMode && onStartNewWeekClick && (
                          <button
                            onClick={onStartNewWeekClick}
                            title="Yangi o'quv haftasini boshlash"
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#10b981',
                              border: '1.5px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '8px',
                              padding: '0.35rem 0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'all 0.2s ease',
                              height: '26px',
                              boxSizing: 'border-box'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#10b981';
                              e.currentTarget.style.color = '#ffffff';
                              e.currentTarget.style.borderColor = '#10b981';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                              e.currentTarget.style.color = '#10b981';
                              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                            }}
                          >
                            <span>+ Yangi Hafta</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.9rem 1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>ENG SCORE</div>
                  <div style={{ padding: '0.9rem 1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>MATH SCORE</div>
                  <div style={{ padding: '0.9rem 1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>ATTENDANCE</div>
                  <div style={{ padding: '0.9rem 1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>HOMEWORK</div>
                  <div style={{ 
                    padding: '0.9rem 1.5rem', 
                    borderRight: isAdminMode ? '1px solid var(--border-color)' : 'none',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '0.5rem',
                    position: 'relative'
                  }}>
                    <span style={{ textAlign: 'center', flexGrow: 1 }}>CHART</span>
                    {!isAdminMode && renderAllSectionMenu()}
                  </div>
                  {isAdminMode && (
                    <div style={{ 
                      padding: '0.9rem 1.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '0.5rem',
                      position: 'relative'
                    }}>
                      <span style={{ textAlign: 'center', flexGrow: 1 }}>AMALLAR</span>
                      {renderAllSectionMenu()}
                    </div>
                  )}
                </div>

                {/* Rows */}
                {sortedStudents.map((student, idx) => {
                  const engPercent = ((student.engScore || 0) / 15 * 100);
                  const mathPercent = ((student.mathScore || 0) / 15 * 100);
                  const absences = (student.attendance ?? 1) < 0 ? -(student.attendance ?? 1) : 0;
                  const attPercent = Math.max(0, 100 - absences * 16.67);
                  const missedHw = (student.homework ?? 1) < 0 ? -(student.homework ?? 1) : 0;
                  const hwPercent = Math.max(0, 100 - missedHw * 20);

                  const weekRecord = studentWeeks?.find(sw => sw.student_id === student.id && sw.week === selectedWeek);
                  const isIdWrong = weekRecord?.id_wrong === true;

                  const isLast = idx === sortedStudents.length - 1;

                  return (
                    <div 
                      key={student.id}
                      className="student-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isAdminMode ? '2.5fr 1fr 1fr 1fr 1fr 1.5fr 1fr' : '2.5fr 1fr 1fr 1fr 1fr 1.5fr',
                        alignItems: 'center',
                        padding: '1.2rem 1.5rem',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
                    >
                      {/* Name block */}
                      <div className="name-block" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '1px solid var(--border-color)', height: '100%' }}>
                        <div 
                          onClick={() => {
                            if (onUpdatePhoto) {
                              if (student.pictureUrl) {
                                setPhotoActionStudentId(student.id);
                              } else {
                                handleAvatarClick(student.id);
                              }
                            }
                          }}
                          style={{ 
                            width: '52px', height: '52px', borderRadius: '50%', 
                            background: 'var(--accent-primary)', color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', fontWeight: 600, flexShrink: 0,
                            cursor: onUpdatePhoto ? 'pointer' : 'default',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                          title={onUpdatePhoto ? (student.pictureUrl ? "Rasm yuklash / o'chirish" : "Rasm yuklash") : ""}
                        >
                          {student.pictureUrl ? (
                            <img src={student.pictureUrl} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            getInitials(student.name, student.surname)
                          )}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span>{student.name} {student.surname}</span>
                            {isIdWrong && (
                              <span 
                                title="Haftalik ballar yuklanganda ushbu talaba ismi/id topilmadi"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  padding: '0.1rem 0.4rem',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                                ID Xato
                              </span>
                            )}
                          </h3>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                            SINF {student.className.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      {/* Eng Score block */}
                      <div className="table-cell" style={{ padding: '0 1.5rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="mobile-label">Ingliz tili</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {engPercent.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {student.engScore || 0} / 15
                        </div>
                      </div>

                      {/* Math Score block */}
                      <div className="table-cell" style={{ padding: '0 1.5rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="mobile-label">Matematika</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {mathPercent.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {student.mathScore || 0} / 15
                        </div>
                      </div>

                      {/* Attendance block */}
                      <div className="table-cell" style={{ padding: '0 1.5rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="mobile-label">Davomat</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {attPercent.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {student.attendance || 1} ({absences} dars)
                        </div>
                      </div>

                      {/* Homework block */}
                      <div className="table-cell" style={{ padding: '0 1.5rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="mobile-label">Vazifalar</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {hwPercent.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {student.homework || 1} ({missedHw} vazifa)
                        </div>
                      </div>

                      {/* Chart block */}
                      <div 
                        className="table-cell chart-cell"
                        onClick={() => setSelectedStudent(student)}
                        style={{ 
                          padding: '0 1.5rem', 
                          borderRight: isAdminMode ? '1px solid var(--border-color)' : 'none', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease, opacity 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.opacity = '0.85';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.opacity = '1';
                        }}
                        title="Grafikni ko'rish"
                      >
                        <span className="mobile-label">Grafik tahlil</span>
                        <svg width="74" height="42" style={{ overflow: 'visible' }}>
                          {/* Eng Bar */}
                          <g>
                            <rect 
                              x="5" 
                              y={38 - (engPercent / 100) * 32} 
                              width="12" 
                              height={(engPercent / 100) * 32} 
                              rx="3" 
                              fill="var(--accent-primary)"
                            >
                              <title>English Score: {engPercent.toFixed(2)}% ({student.engScore || 0}/15)</title>
                            </rect>
                          </g>
                          {/* Math Bar */}
                          <g>
                            <rect 
                              x="22" 
                              y={38 - (mathPercent / 100) * 32} 
                              width="12" 
                              height={(mathPercent / 100) * 32} 
                              rx="3" 
                              fill="#f97316"
                            >
                              <title>Math Score: {mathPercent.toFixed(2)}% ({student.mathScore || 0}/15)</title>
                            </rect>
                          </g>
                          {/* Attendance Bar */}
                          <g>
                            <rect 
                              x="39" 
                              y={38 - (attPercent / 100) * 32} 
                              width="12" 
                              height={(attPercent / 100) * 32} 
                              rx="3" 
                              fill="#6b7280"
                            >
                              <title>Attendance: {attPercent.toFixed(2)}% ({absences} absences)</title>
                            </rect>
                          </g>
                          {/* Homework Bar */}
                          <g>
                            <rect 
                              x="56" 
                              y={38 - (hwPercent / 100) * 32} 
                              width="12" 
                              height={(hwPercent / 100) * 32} 
                              rx="3" 
                              fill="#10b981"
                            >
                              <title>Homework: {hwPercent.toFixed(2)}% ({missedHw} missed)</title>
                            </rect>
                          </g>
                          {/* Bottom baseline */}
                          <line x1="0" y1="39" x2="74" y2="39" stroke="var(--border-color)" strokeWidth="1" />
                        </svg>
                      </div>

                      {/* Actions */}
                      {isAdminMode && (
                        <div className="table-cell no-border" style={{ padding: '0 0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                          <span className="mobile-label">Amallar</span>
                          <button 
                            onClick={() => setEditingStudent(student)}
                            title="Tahrirlash"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#eff6ff', color: '#2563eb',
                              border: '1px solid #bfdbfe', borderRadius: '50%',
                              width: '36px', height: '36px',
                              cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteStudent && onDeleteStudent(student.id)}
                            title="O'chirib yuborish"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#fee2e2', color: '#b91c1c',
                              border: '1px solid #fca5a5', borderRadius: '50%',
                              width: '36px', height: '36px',
                              cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : activeSubject === 'DETAILS' ? (
              <div 
                className="table-card-container"
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)',
                  overflow: 'hidden',
                  marginBottom: '2rem'
                }}
              >
                {/* Header row */}
                <div className="table-header-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.5fr 1.5fr 2fr 1fr',
                  alignItems: 'stretch',
                  padding: '0 1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-card-hover)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em'
                }}>
                  <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '0.85rem', letterSpacing: '0.04em', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0.9rem 0' }}>
                    TAFSILOTLAR VA ID/PAROLLAR
                  </div>
                  <div style={{ padding: '0.9rem 1rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>ID RAQAMI</div>
                  <div style={{ padding: '0.9rem 1rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>PAROL (PASSCODE)</div>
                  <div style={{ padding: '0.9rem 1rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>TELEFON RAQAMI</div>
                  <div style={{ 
                    padding: '0.5rem 1rem', 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '0.35rem',
                    position: 'relative'
                  }}>
                    <button
                      onClick={() => handleExportCredentialsToExcel(sortedStudents)}
                      title="Excel fayl yuklash"
                      style={{
                        background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                        padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', transition: 'all 0.15s ease',
                        flex: 1, whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                    >
                      <Download size={10} />
                      <span>Excel</span>
                    </button>
                    {renderDetailsSectionMenu()}
                  </div>
                </div>

                {/* Rows list */}
                {sortedStudents.map((student, idx) => {
                  const isLast = idx === sortedStudents.length - 1;
                  const edits = unsavedChanges[student.id] || {};
                  
                  const weekRecord = studentWeeks?.find(sw => sw.student_id === student.id && sw.week === selectedWeek);
                  const isIdWrong = weekRecord?.id_wrong === true;
                  
                  const nameVal = edits.name !== undefined ? edits.name : student.name;
                  const surnameVal = edits.surname !== undefined ? edits.surname : student.surname;
                  const idVal = edits.id !== undefined ? edits.id : student.id;
                  const passcodeVal = edits.passcode !== undefined ? edits.passcode : student.passcode;
                  const phoneVal = edits.parentPhone !== undefined ? edits.parentPhone : student.parentPhone;

                  const fullName = `${nameVal} ${surnameVal}`.trim();

                  const isEditing = (field: 'name' | 'id' | 'passcode' | 'parentPhone') => 
                    editingCell?.studentId === student.id && editingCell?.field === field;

                  const handleDoubleClick = (field: 'name' | 'id' | 'passcode' | 'parentPhone', currentVal: string) => {
                    if (!isAdminMode) return;
                    if (authRole === 'admin123' && field !== 'parentPhone') return;
                    setEditingCell({ studentId: student.id, field });
                    setEditingValue(currentVal);
                  };

                  return (
                    <div 
                      key={student.id}
                      className="student-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2.5fr 1.5fr 1.5fr 2fr 1fr',
                        alignItems: 'center',
                        padding: '1.1rem 1.5rem',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
                    >
                      {/* Name/Surname Block */}
                      <div 
                        className="name-block" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderRight: '1px solid var(--border-color)', height: '100%', cursor: 'pointer' }}
                        onDoubleClick={() => handleDoubleClick('name', fullName)}
                        title="Tahrirlash uchun ikki marta bosing"
                      >
                        {student.pictureUrl ? (
                          <img 
                            src={student.pictureUrl} 
                            alt={fullName} 
                            style={{
                              width: '40px', height: '40px', borderRadius: '50%',
                              objectFit: 'cover', flexShrink: 0,
                              border: '1px solid var(--profile-border)'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'var(--profile-bg)', color: 'var(--profile-text)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 700, flexShrink: 0
                          }}>
                            {getInitials(nameVal, surnameVal)}
                          </div>
                        )}
                        <div style={{ flexGrow: 1, paddingRight: '0.5rem' }}>
                          {isEditing('name') ? (
                            <input
                              type="text"
                              value={editingValue}
                              autoFocus
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={(e) => handleCellSave(student.id, 'name', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(student.id, 'name', e.currentTarget.value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              style={{
                                width: '90%', padding: '0.25rem 0.5rem', borderRadius: '6px',
                                border: '2px solid var(--accent-primary)', fontSize: '0.9rem', outline: 'none',
                                fontWeight: 600, color: 'var(--text-primary)'
                              }}
                            />
                           ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 650, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span>{fullName || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Ism kiritilmagan</span>}</span>
                                {isIdWrong && (
                                  <span 
                                    title="Haftalik ballar yuklanganda ushbu talaba ismi/id topilmadi"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: '6px',
                                      padding: '0.1rem 0.4rem',
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem'
                                    }}
                                  >
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                                    ID Xato
                                  </span>
                                )}
                              </h3>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.1rem' }}>
                                Sinf: {student.className.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ID Number Cell */}
                      <div 
                        className="table-cell" 
                        style={{ padding: '0 1rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => { if(!isEditing('id') && idVal) handleCopyText(idVal, student.id, 'id'); }}
                        onDoubleClick={() => handleDoubleClick('id', idVal)}
                        title="Nusxa olish uchun bir marta, tahrirlash uchun ikki marta bosing"
                      >
                        {isEditing('id') ? (
                          <input
                            type="text"
                            value={editingValue}
                            autoFocus
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={(e) => handleCellSave(student.id, 'id', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave(student.id, 'id', e.currentTarget.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{
                              width: '90%', padding: '0.25rem 0.5rem', borderRadius: '6px',
                              border: '2px solid var(--accent-primary)', fontSize: '0.9rem', outline: 'none',
                              fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace'
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                            {copiedId?.id === student.id && copiedId?.field === 'id' ? (
                              <span style={{ color: '#16a34a', fontWeight: 800 }}>Nusxalandi! ✓</span>
                            ) : (
                              idVal || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Bo'sh</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Passcode Cell */}
                      <div 
                        className="table-cell" 
                        style={{ padding: '0 1rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => { if(!isEditing('passcode') && passcodeVal) handleCopyText(passcodeVal, student.id, 'passcode'); }}
                        onDoubleClick={() => handleDoubleClick('passcode', passcodeVal || '')}
                        title="Nusxa olish uchun bir marta, tahrirlash uchun ikki marta bosing"
                      >
                        {isEditing('passcode') ? (
                          <input
                            type="text"
                            value={editingValue}
                            autoFocus
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={(e) => handleCellSave(student.id, 'passcode', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave(student.id, 'passcode', e.currentTarget.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{
                              width: '90%', padding: '0.25rem 0.5rem', borderRadius: '6px',
                              border: '2px solid var(--accent-primary)', fontSize: '0.9rem', outline: 'none',
                              fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace'
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {copiedId?.id === student.id && copiedId?.field === 'passcode' ? (
                              <span style={{ color: '#16a34a', fontWeight: 800 }}>Nusxalandi! ✓</span>
                            ) : (
                              <>
                                <Key size={13} style={{ color: '#94a3b8' }} />
                                <span>{passcodeVal || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Bo'sh</span>}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Parent Phone Number Cell */}
                      <div 
                        className="table-cell" 
                        style={{ padding: '0 1rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => { if(!isEditing('parentPhone') && phoneVal) handleCopyText(phoneVal, student.id, 'parentPhone'); }}
                        onDoubleClick={() => handleDoubleClick('parentPhone', phoneVal || '+998')}
                        title="Nusxa olish uchun bir marta, tahrirlash uchun ikki marta bosing"
                      >
                        {isEditing('parentPhone') ? (
                          <input
                            type="text"
                            value={editingValue}
                            autoFocus
                            onChange={(e) => {
                              let val = e.target.value;
                              if (!val.startsWith('+998') && val !== '' && val !== '+') {
                                val = '+998' + val.replace(/^\+?998?/, '');
                              }
                              setEditingValue(val);
                            }}
                            onBlur={(e) => handleCellSave(student.id, 'parentPhone', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave(student.id, 'parentPhone', e.currentTarget.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{
                              width: '90%', padding: '0.25rem 0.5rem', borderRadius: '6px',
                              border: '2px solid var(--accent-primary)', fontSize: '0.9rem', outline: 'none',
                              fontWeight: 600, color: 'var(--text-primary)'
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {copiedId?.id === student.id && copiedId?.field === 'parentPhone' ? (
                              <span style={{ color: '#16a34a', fontWeight: 800 }}>Nusxalandi! ✓</span>
                            ) : (
                              <>
                                <Phone size={13} style={{ color: '#94a3b8' }} />
                                <span>{phoneVal || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Kiritilmagan</span>}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Delete Action Cell */}
                      <div className="table-cell no-border" style={{ padding: '0 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {isAdminMode && authRole !== 'admin123' && (
                          <button 
                            onClick={() => onDeleteStudent && onDeleteStudent(student.id)}
                            title="O'quvchini o'chirish"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#fee2e2', color: '#b91c1c',
                              border: '1px solid #fca5a5', borderRadius: '50%',
                              width: '32px', height: '32px',
                              cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (() => {
              const groupsMap: { [teacher: string]: Student[] } = {};
              students.forEach((student) => {
                const currentTeacher = student.teacher?.trim() || '';
                if (!groupsMap[currentTeacher]) {
                  groupsMap[currentTeacher] = [];
                }
                groupsMap[currentTeacher].push(student);
              });

              // Convert map to array and sort: orderIndex, unassigned teachers at the very bottom
              const groups = Object.keys(groupsMap).map((teacher) => {
                // Find the maximum teacherOrder in the group (ignores newly added 0s if group is non-zero)
                const orderIndex = Math.max(...groupsMap[teacher].map(s => s.teacherOrder ?? 0));
                return {
                  teacher,
                  orderIndex,
                  students: groupsMap[teacher]
                };
              }).sort((a, b) => {
                if (a.teacher === '') return 1;
                if (b.teacher === '') return -1;
                if (a.orderIndex !== b.orderIndex) {
                  return a.orderIndex - b.orderIndex;
                }
                return a.teacher.localeCompare(b.teacher, 'uz');
              });

              // Sort students inside each group by alphabetical order
              groups.forEach(g => {
                g.students.sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'uz'));
              });

              return groups.map((group, groupIdx) => (
                <div 
                  key={group.teacher || `unassigned-${groupIdx}`}
                  className="table-card-container"
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)',
                    overflow: 'hidden',
                    marginBottom: '2rem'
                  }}
                >
                  {/* Clean and Small but Noticeable Column Headers (With Integrated Teacher Name in All Caps) */}
                  <div className="table-header-row teacher-group-header" style={{
                    display: 'grid',
                    gridTemplateColumns: showSummerPlan ? '2.5fr 1fr 1.5fr 1.5fr 1.5fr' : '2.5fr 1.25fr 1.75fr 1.5fr',
                    alignItems: 'stretch',
                    padding: '0 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em'
                  }}>
                    <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '0.85rem', letterSpacing: '0.04em', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0.9rem 0' }}>
                      {group.teacher ? `O'QITUVCHI: ${group.teacher.toUpperCase()}` : "O'QITUVCHI BIRIKTIRILMAGAN"}
                    </div>
                    <div style={{ padding: '0.9rem 1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>AVVALGI DARAJA</div>
                    <div style={{ padding: '0.9rem 1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>HOZIRGI DARAJA</div>
                    {showSummerPlan && (
                      <div style={{ padding: '0.9rem 1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', color: '#ea580c', fontWeight: 800 }}>☀️ YOZGI REJA</div>
                    )}
                    <div style={{ 
                      padding: '0.9rem 1.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '0.5rem',
                      position: 'relative'
                    }}>
                      <span style={{ textAlign: 'center', flexGrow: 1 }}>
                        {isAdminMode ? "AMALLAR" : "PROGRESS"}
                      </span>
                      {(() => {
                        const dropdownId = group.teacher || 'unassigned';
                        const isOpen = openDropdownId === dropdownId;
                        return (
                          <div 
                            className="table-actions-dropdown-container" 
                            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            {isAdminMode && group.teacher && (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMoveTeacherTable && onMoveTeacherTable(group.teacher, 'up'); }}
                                  title="Yuqoriga"
                                  style={{
                                    background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                                    padding: '0', margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                >
                                  <ChevronUp size={16} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMoveTeacherTable && onMoveTeacherTable(group.teacher, 'down'); }}
                                  title="Pastga"
                                  style={{
                                    background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                                    padding: '0', margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                >
                                  <ChevronDown size={16} />
                                </button>
                              </div>
                            )}
                            <div
                              onMouseEnter={() => setOpenDropdownId(dropdownId)}
                              onMouseLeave={() => setOpenDropdownId(null)}
                              style={{ display: 'flex' }}
                            >
                            <button 
                              onClick={() => setOpenDropdownId(isOpen ? null : dropdownId)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                            >
                              <MoreVertical size={16} />
                            </button>
                            
                            <div 
                              className="table-actions-menu"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                paddingTop: '6px', // Continuous hover hit-box zone
                                display: isOpen ? 'flex' : 'none',
                                zIndex: 100,
                              }}
                            >
                              <div style={{
                                width: '180px',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                padding: '0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                                textAlign: 'left'
                              }}>
                                {isAdminMode && (
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      if (onRenameTeacherTable) onRenameTeacherTable(group.teacher);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '8px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: '#334155',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      transition: 'all 0.2s ease',
                                      width: '100%'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <Pencil size={12} />
                                    Tahrirlash
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleExportTableToExcel(group.teacher, group.students);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s ease',
                                    width: '100%'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  Excel Yuklash
                                </button>
                                
                                {isAdminMode && (
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      if (onDeleteTeacherTable) onDeleteTeacherTable(group.teacher);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '8px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      transition: 'all 0.2s ease',
                                      width: '100%'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <Trash2 size={12} />
                                    Jadvalni o'chirish
                                  </button>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Student rows inside this teacher's card */}
                  {group.students.map((student, idx) => {
                    const improvement = calculateImprovement(student.startingLevel, student.currentLevel);
                    const isLast = idx === group.students.length - 1;
                    
                    const weekRecord = studentWeeks?.find(sw => sw.student_id === student.id && sw.week === selectedWeek);
                    const isIdWrong = weekRecord?.id_wrong === true;
                    
                    const getTheme = () => {
                      return { 
                        primary: 'var(--accent-primary)', 
                        lightBg: 'rgba(13, 148, 136, 0.12)', 
                        text: 'var(--accent-primary)', 
                        badgeText: 'var(--accent-hover)' 
                      };
                    };
                    const theme = getTheme();

                    return (
                      <div 
                        key={student.id}
                        className="student-row"
                        draggable={isAdminMode}
                        onDragStart={(e) => handleDragStart(e, student.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, student.id)}
                        onDragEnd={() => setDraggedId(null)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: showSummerPlan ? '2.5fr 1fr 1.5fr 1.5fr 1.5fr' : '2.5fr 1.25fr 1.75fr 1.5fr',
                          alignItems: 'center',
                          padding: '1.2rem 1.5rem',
                          borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          transition: 'all 0.2s ease',
                          cursor: isAdminMode ? 'grab' : 'default',
                          opacity: draggedId === student.id ? 0.45 : 1
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
                      >
                        {/* Name block */}
                        <div className="name-block" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '1px solid var(--border-color)', height: '100%' }}>
                          <div 
                            onClick={() => {
                              if (onUpdatePhoto) {
                                if (student.pictureUrl) {
                                  setPhotoActionStudentId(student.id);
                                } else {
                                  handleAvatarClick(student.id);
                                }
                              }
                            }}
                            style={{ 
                              width: '52px', height: '52px', borderRadius: '50%', 
                              background: theme.primary, color: '#ffffff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.1rem', fontWeight: 600, flexShrink: 0,
                              cursor: onUpdatePhoto ? 'pointer' : 'default',
                              overflow: 'hidden',
                              position: 'relative'
                            }}
                            title={onUpdatePhoto ? (student.pictureUrl ? "Rasm yuklash / o'chirish" : "Rasm yuklash") : ""}
                          >
                            {student.pictureUrl ? (
                              <img src={student.pictureUrl} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getInitials(student.name, student.surname)
                            )}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span>{student.name} {student.surname}</span>
                              {isIdWrong && (
                                <span 
                                  title="Haftalik ballar yuklanganda ushbu talaba ismi/id topilmadi"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    padding: '0.1rem 0.4rem',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                                  ID Xato
                                </span>
                              )}
                            </h3>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                              SINF {student.className.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        {/* Level block */}
                        <div className="table-cell" style={{ padding: '0 1.5rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span className="mobile-label">Avvalgi daraja</span>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            {student.startingLevel}
                          </div>
                        </div>

                        {/* Current Level block */}
                        <div className="table-cell" style={{ padding: '0 1.5rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span className="mobile-label">Hozirgi daraja</span>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                            {student.currentLevel}
                          </div>
                          {improvement.includes('+') ? (
                            <div style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              background: theme.lightBg, color: theme.badgeText, 
                              padding: '0.15rem 0.4rem', borderRadius: '9999px',
                              fontSize: '0.7rem', fontWeight: 600, width: 'max-content'
                            }}>
                              <ArrowRight size={10} style={{ transform: 'rotate(-45deg)' }} />
                              {improvement}
                            </div>
                          ) : null}
                        </div>

                        {/* Yozgi Natija block */}
                        {showSummerPlan && (
                          <div className="table-cell" style={{ padding: '0 1.5rem', borderRight: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span className="mobile-label">Yozgi reja</span>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                              color: '#ea580c',
                              border: '1px dashed #fdba74',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 850,
                              boxShadow: '0 4px 10px -2px rgba(234, 88, 12, 0.15)',
                              width: 'max-content'
                            }}>
                              <span style={{ fontSize: '0.95rem' }}>☀️</span>
                              {(() => {
                                const match = (student.currentLevel || '').match(/(\d+)/);
                                if (match) {
                                  return `Level ${parseInt(match[1]) + 1}`;
                                }
                                return 'Level 2';
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Actions/Progress block */}
                        {!isAdminMode ? (
                          <div className="table-cell no-border" style={{ padding: '0 0 0 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <span className="mobile-label">Progress</span>
                            <button 
                              onClick={() => setSelectedStudent(student)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'transparent', color: theme.primary,
                                border: `1px solid ${theme.primary}`, borderRadius: '9999px',
                                padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s ease', width: 'max-content'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = theme.lightBg; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <LineChart size={14} />
                              Grafikni ko'rish
                            </button>
                          </div>
                        ) : (
                          <div className="table-cell no-border" style={{ padding: '0 0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                            <span className="mobile-label">Amallar</span>
                            <button 
                              onClick={() => setEditingStudent(student)}
                              title="Tahrirlash"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#eff6ff', color: '#2563eb',
                                border: '1px solid #bfdbfe', borderRadius: '50%',
                                width: '36px', height: '36px',
                                cursor: 'pointer', transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => setAssigningStudent({ id: student.id, currentTeacher: student.teacher || '' })}
                              title="O'qituvchi biriktirish"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#f0fdf4', color: '#16a34a',
                                border: '1px solid #bbf7d0', borderRadius: '50%',
                                width: '36px', height: '36px',
                                cursor: 'pointer', transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <Users size={16} />
                            </button>
                            <button 
                              onClick={() => onDeleteStudent && onDeleteStudent(student.id)}
                              title="O'chirib yuborish"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#fee2e2', color: '#b91c1c',
                                border: '1px solid #fca5a5', borderRadius: '50%',
                                width: '36px', height: '36px',
                                cursor: 'pointer', transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </>
        )}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />

      {selectedStudent && (
        <GraphModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          activeSubject={activeSubject}
          studentWeeks={studentWeeks}
          showSummerPlan={showSummerPlan}
        />
      )}

      {editingStudent && (
        <EditProgressModal
          student={editingStudent}
          activeSubject={activeSubject}
          onClose={() => setEditingStudent(null)}
          onSave={(sl, cl, gt, n, s, c, eng, math, att, hw, phone) => {
            if (onUpdateProgress) {
              onUpdateProgress(editingStudent.id, sl, cl, gt, n, s, c, eng, math, att, hw, phone);
            }
            setEditingStudent(null);
          }}
        />
      )}

      {/* Floating Action Banner for Unsaved Cell Changes */}
      {Object.keys(unsavedChanges).length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid #db2777',
          boxShadow: '0 10px 25px -5px rgba(219, 39, 119, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          padding: '1rem 2rem',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          zIndex: 9999,
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          whiteSpace: 'nowrap'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideUp {
              from { transform: translate(-50%, 100px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%', background: '#db2777',
              animation: 'pulse 1.5s infinite'
            }}>
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse {
                  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(219, 39, 119, 0.7); }
                  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(219, 39, 119, 0); }
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(219, 39, 119, 0); }
                }
              `}} />
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
              Tafsilotlar o'zgartirildi. Saqlashni xohlaysizmi?
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setUnsavedChanges({})}
              style={{
                background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb',
                padding: '0.5rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
            >
              Bekor qilish
            </button>
            <button
              onClick={async () => {
                if (onSaveCredentials) {
                  const success = await onSaveCredentials(unsavedChanges);
                  if (success) {
                    setUnsavedChanges({});
                  }
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #db2777, #be185d)', color: '#ffffff', border: 'none',
                padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.85rem',
                fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(219, 39, 119, 0.2)',
                display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Save size={14} />
              Saqlash
            </button>
          </div>
        </div>
      )}

      {/* Batch Credentials Rotation Modal */}
      {isRegenerateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #fbcfe8',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes modalFadeIn {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                <RotateCw size={20} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.01em' }}>
                  ID VA PAROLLARNI YANGILASH
                </h3>
              </div>
              <button 
                onClick={() => setIsRegenerateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Ushbu bo'lim orqali o'quvchilarning tizimga kirish kodlarini ommaviy ravishda avtomatik yangilashingiz mumkin.
            </p>

            {/* Checkbox Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={regenIds}
                  onChange={(e) => setRegenIds(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span>Yangi ID raqamlarini yaratish (AL + 5 ta belgi)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={regenPasscodes}
                  onChange={(e) => setRegenPasscodes(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span>Yangi parollarni yaratish (7 ta belgi)</span>
              </label>
            </div>

            {/* Target Select */}
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Yangilash doirasi (Target)
              </span>
              <select
                value={regenTarget}
                onChange={(e) => setRegenTarget(e.target.value as any)}
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid var(--border-color)',
                  fontSize: '0.9rem', fontWeight: 600, outline: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                  background: 'var(--bg-card)'
                }}
              >
                <option value="class">Faqat ushbu sinf o'quvchilari uchun</option>
                <option value="all">Barcha sinf o'quvchilari uchun</option>
              </select>
            </div>

            {/* Warning Box */}
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fee2e2', borderRadius: '16px',
              padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                  DIQQAT!
                </span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 550, lineHeight: 1.4 }}>
                  Ushbu o'zgarish o'quvchilar va ularning ota-onalari uchun kirish ma'lumotlarini darhol o'zgartiradi. Ushbu amalni ortga qaytarib bo'lmaydi.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setIsRegenerateModalOpen(false)}
                style={{
                  background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                  padding: '0.65rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem',
                  fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border-color)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
              >
                Bekor qilish
              </button>
              <button
                disabled={!regenIds && !regenPasscodes}
                onClick={async () => {
                  if (onBatchRegenerateCredentials) {
                    const firstStudentClass = students[0]?.className || '';
                    const match = firstStudentClass.match(/^(\d+)/);
                    const currentClassGroup = match ? `${match[1]}-Sinf` : null;
                    const targetClassVal = regenTarget === 'class' ? currentClassGroup : null;
                    
                    setIsRegenerateModalOpen(false);
                    const success = await onBatchRegenerateCredentials(regenIds, regenPasscodes, targetClassVal);
                    if (success) {
                      setUnsavedChanges({});
                    }
                  }
                }}
                style={{
                  background: (!regenIds && !regenPasscodes) ? '#cbd5e1' : 'var(--accent-gradient)',
                  color: '#ffffff', border: 'none',
                  padding: '0.65rem 1.5rem', borderRadius: '12px', fontSize: '0.85rem',
                  fontWeight: 700, cursor: (!regenIds && !regenPasscodes) ? 'not-allowed' : 'pointer',
                  boxShadow: (!regenIds && !regenPasscodes) ? 'none' : '0 4px 10px rgba(13, 148, 136, 0.2)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { if (regenIds || regenPasscodes) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { if (regenIds || regenPasscodes) e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {assigningStudent && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--bg-card)',
            width: '90%',
            maxWidth: '400px',
            borderRadius: '24px',
            padding: '2rem',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                O'qituvchini biriktirish
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Quyidagi ro'yxatdan o'qituvchini tanlang:
              </p>
            </div>

            <select
              value={assigningStudent.currentTeacher}
              onChange={(e) => {
                if (onAssignTeacher) {
                  onAssignTeacher(assigningStudent.id, e.target.value);
                }
                setAssigningStudent(null);
              }}
              style={{
                width: '100%',
                background: 'var(--bg-card-hover)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                outline: 'none',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238f8f98\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1em'
              }}
            >
              <option value="">-- O'qituvchi tanlanmagan --</option>
              {teachers
                .filter(t => t.subject === (activeSubject === 'MATH' ? 'MATH' : 'ENG'))
                .map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                onClick={() => setAssigningStudent(null)}
                style={{
                  background: 'transparent',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '9999px',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {photoActionStudentId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            width: '100%',
            maxWidth: '400px',
            borderRadius: '24px',
            padding: '2rem',
            border: '1.5px solid var(--border-color)',
            boxShadow: 'var(--glass-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            textAlign: 'center'
          }}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 750, color: 'var(--text-primary)' }}>
                Profil Rasmi
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Mavjud profil rasmini o'zgartirmoqchimisiz yoki butunlay o'chirmoqchimisiz?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  const sId = photoActionStudentId;
                  setPhotoActionStudentId(null);
                  handleAvatarClick(sId);
                }}
                style={{
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
              >
                Yangi rasm yuklash
              </button>
              <button
                type="button"
                onClick={async () => {
                  const sId = photoActionStudentId;
                  setPhotoActionStudentId(null);
                  if (onUpdatePhoto) {
                    onUpdatePhoto(sId, '');
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1.5px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '9999px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                Rasmni o'chirish
              </button>
              <button
                type="button"
                onClick={() => setPhotoActionStudentId(null)}
                style={{
                  background: 'transparent',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '9999px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentTable;
