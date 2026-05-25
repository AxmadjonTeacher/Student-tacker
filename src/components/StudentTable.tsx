import React, { useState } from 'react';
import type { Student } from '../types';
import { Inbox, LineChart, ArrowRight, Trash2, Pencil, Users, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';
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
  activeSubject?: 'ENG' | 'MATH';
  onUpdateProgress?: (
    studentId: string,
    startingLevel: string,
    currentLevel: string,
    grandTests: { name: string; score: number }[],
    newName?: string,
    newSurname?: string,
    newClassName?: string
  ) => void;
  onRenameTeacherTable?: (oldName: string) => void;
  onDeleteTeacherTable?: (teacherName: string) => void;
  onMoveTeacherTable?: (teacherName: string, direction: 'up' | 'down') => void;
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
  onMoveTeacherTable
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [uploadingStudentId, setUploadingStudentId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
        {students.length === 0 ? (
          <div className="empty-state">
            <Inbox size={48} />
            <p>Ushbu sinfda o'quvchilar topilmadi.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>O'quvchilar ma'lumotlarini yuklash uchun admin paneldan foydalaning.</p>
          </div>
        ) : (
          <>
            {/* Group students by teacher block to render single unified table per teacher */}
            {(() => {
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
                // Determine group order based on the first student's teacherOrder
                const orderIndex = groupsMap[teacher][0]?.teacherOrder ?? 0;
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

              // Sort students inside each group by orderIndex
              groups.forEach(g => {
                g.students.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
              });

              return groups.map((group, groupIdx) => (
                <div 
                  key={group.teacher || `unassigned-${groupIdx}`}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)',
                    overflow: 'hidden',
                    marginBottom: '2rem'
                  }}
                >
                  {/* Clean and Small but Noticeable Column Headers (With Integrated Teacher Name in All Caps) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1fr 1.5fr 1.5fr 1.5fr',
                    alignItems: 'center',
                    padding: '0.9rem 1.5rem',
                    borderBottom: '1px solid #f1f5f9',
                    background: '#fafaf9',
                    color: '#64748b',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em'
                  }}>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.85rem', letterSpacing: '0.04em' }}>
                      {group.teacher ? `O'QITUVCHI: ${group.teacher.toUpperCase()}` : "O'QITUVCHI BIRIKTIRILMAGAN"}
                    </div>
                    <div style={{ padding: '0 1.5rem' }}>AVVALGI DARAJA</div>
                    <div style={{ padding: '0 1.5rem' }}>HOZIRGI DARAJA</div>
                    <div style={{ padding: '0 1.5rem', color: '#ea580c', fontWeight: 800 }}>☀️ YOZGI REJA</div>
                    <div style={{ 
                      padding: '0 1.5rem', 
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
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#334155'; }}
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
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#334155'; }}
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

                    return (
                      <div 
                        key={student.id}
                        draggable={isAdminMode}
                        onDragStart={(e) => handleDragStart(e, student.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, student.id)}
                        onDragEnd={() => setDraggedId(null)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2.5fr 1fr 1.5fr 1.5fr 1.5fr',
                          alignItems: 'center',
                          padding: '1.2rem 1.5rem',
                          borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                          background: '#ffffff',
                          transition: 'all 0.2s ease',
                          cursor: isAdminMode ? 'grab' : 'default',
                          opacity: draggedId === student.id ? 0.45 : 1
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fafaf9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                      >
                        {/* Name block */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '1px solid #e5e7eb', height: '100%' }}>
                          <div 
                            onClick={() => onUpdatePhoto && handleAvatarClick(student.id)}
                            style={{ 
                              width: '52px', height: '52px', borderRadius: '50%', 
                              background: '#0d9488', color: '#ffffff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.1rem', fontWeight: 600, flexShrink: 0,
                              cursor: onUpdatePhoto ? 'pointer' : 'default',
                              overflow: 'hidden',
                              position: 'relative'
                            }}
                            title={onUpdatePhoto ? "Rasm yuklash" : ""}
                          >
                            {student.pictureUrl ? (
                              <img src={student.pictureUrl} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getInitials(student.name, student.surname)
                            )}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' }}>
                              {student.name} {student.surname}
                            </h3>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em' }}>
                              SINF {student.className.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        {/* Level block */}
                        <div style={{ padding: '0 1.5rem', borderRight: '1px solid #e5e7eb', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontWeight: 600, color: '#6b7280', fontSize: '0.95rem' }}>
                            {student.startingLevel}
                          </div>
                        </div>

                        {/* Current Level block */}
                        <div style={{ padding: '0 1.5rem', borderRight: '1px solid #e5e7eb', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                            {student.currentLevel}
                          </div>
                          {improvement.includes('+') ? (
                            <div style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              background: '#ccfbf1', color: '#0f766e', 
                              padding: '0.15rem 0.4rem', borderRadius: '9999px',
                              fontSize: '0.7rem', fontWeight: 600, width: 'max-content'
                            }}>
                              <ArrowRight size={10} style={{ transform: 'rotate(-45deg)' }} />
                              {improvement}
                            </div>
                          ) : null}
                        </div>

                        {/* Yozgi Natija block */}
                        <div style={{ padding: '0 1.5rem', borderRight: '1px solid #e5e7eb', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

                        {/* Actions/Progress block */}
                        {!isAdminMode ? (
                          <div style={{ padding: '0 0 0 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <button 
                              onClick={() => setSelectedStudent(student)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'transparent', color: '#0d9488',
                                border: '1px solid #0d9488', borderRadius: '9999px',
                                padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s ease', width: 'max-content'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#ccfbf1'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <LineChart size={14} />
                              Grafikni ko'rish
                            </button>
                          </div>
                        ) : (
                          <div style={{ padding: '0 0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
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
                              onClick={() => onAssignTeacher && onAssignTeacher(student.id, student.teacher || '')}
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
        />
      )}

      {editingStudent && (
        <EditProgressModal
          student={editingStudent}
          activeSubject={activeSubject}
          onClose={() => setEditingStudent(null)}
          onSave={(start, curr, tests) => {
            if (onUpdateProgress) {
              onUpdateProgress(editingStudent.id, start, curr, tests);
            }
            setEditingStudent(null);
          }}
        />
      )}
    </>
  );
};

export default StudentTable;
