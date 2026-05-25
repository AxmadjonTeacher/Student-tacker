import React, { useState, useRef } from 'react';
import { UploadCloud, X, Download, Trash2, UserPlus, Settings } from 'lucide-react';
import Papa from 'papaparse';
import type { Student } from '../types';
import AddStudentModal from './AddStudentModal';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: 'ENG' | 'MATH' | 'ALL';
  onSubjectChange: (subj: 'ENG' | 'MATH' | 'ALL') => void;
  isAdminMode: boolean;
  onToggleAdmin: () => void;
  students: Student[];
  activeClass: string;
  onStudentsUploaded: (students: Student[]) => void;
  onBulkDeleteClass: () => void;
  onAddStudent: (studentData: Partial<Student>) => void;
}

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeSubject,
  onSubjectChange,
  isAdminMode,
  onToggleAdmin,
  students,
  activeClass,
  onStudentsUploaded,
  onBulkDeleteClass,
  onAddStudent
}) => {
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize level helper
  const normalizeLevel = (raw: string): string => {
    const trimmed = raw?.toString().trim() || '';
    if (!trimmed) return '';
    if (/^level\s*\d+$/i.test(trimmed)) {
      const num = trimmed.match(/\d+/)?.[0];
      return `Level ${num}`;
    }
    if (/^\d+$/.test(trimmed)) return `Level ${trimmed}`;
    return trimmed;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus({ 
        type: 'error', 
        message: '⚠️ Iltimos, faqat .CSV faylini yuklang. Agar namunani Google Sheets yoki Excel\'da ochgan bo\'lsangiz, uni birinchi bo\'lib CSV formatida yuklab oling.' 
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedStudents: Student[] = (results.data as any[])
          .map((row: any) => {
            const rawNameStr = (
              row['O\'quvchining ismi va familiyasi'] || 
              row['Ism va familiya'] || 
              row['Students name surname'] || 
              row['Name'] || 
              row['name'] || ''
            ).toString().trim();
            
            const nameParts = rawNameStr.split(' ').filter(Boolean);
            let name = '';
            let surname = '';

            if (nameParts.length > 1) {
              surname = nameParts.pop() || '';
              name = nameParts.join(' ');
            } else {
              name = rawNameStr;
            }

            const grandTests = [];
            const term1 = row['Grant 1 eng'] || row['Grant 1 ENG'] || row['grant 1 eng'] || row['Grant 1'] || row['grant 1'] || row['1-chorak natijasi'] || row['1-chorak'] || row['term 1 score'] || '';
            if (term1.toString().trim()) grandTests.push({ name: 'Grant 1', score: parseInt(term1) || 0 });
            
            const term2 = row['Grant 2 eng'] || row['Grant 2 ENG'] || row['grant 2 eng'] || row['Grant 2'] || row['grant 2'] || row['2-chorak natijasi'] || row['2-chorak'] || row['term 2 score'] || '';
            if (term2.toString().trim()) grandTests.push({ name: 'Grant 2', score: parseInt(term2) || 0 });
            
            const term3 = row['Grant 3 eng'] || row['Grant 3 ENG'] || row['grant 3 eng'] || row['Grant 3'] || row['grant 3'] || row['3-chorak natijasi'] || row['3-chorak'] || row['term 3 score'] || '';
            if (term3.toString().trim()) grandTests.push({ name: 'Grant 3', score: parseInt(term3) || 0 });
            
            const term4 = row['Grant 4 eng'] || row['Grant 4 ENG'] || row['grant 4 eng'] || row['Grant 4'] || row['grant 4'] || row['4-chorak natijasi'] || row['4-chorak'] || row['term 4 score'] || '';
            if (term4.toString().trim()) grandTests.push({ name: 'Grant 4', score: parseInt(term4) || 0 });

            const mathGrandTests = [];
            const mTerm1 = row['Grant 1 math'] || row['Grant 1 MATH'] || row['grant 1 math'] || row['1-chorak matematika'] || row['math term 1 score'] || '';
            if (mTerm1.toString().trim()) mathGrandTests.push({ name: 'Grant 1', score: parseInt(mTerm1) || 0 });
            
            const mTerm2 = row['Grant 2 math'] || row['Grant 2 MATH'] || row['grant 2 math'] || row['2-chorak matematika'] || row['math term 2 score'] || '';
            if (mTerm2.toString().trim()) mathGrandTests.push({ name: 'Grant 2', score: parseInt(mTerm2) || 0 });
            
            const mTerm3 = row['Grant 3 math'] || row['Grant 3 MATH'] || row['grant 3 math'] || row['3-chorak matematika'] || row['math term 3 score'] || '';
            if (mTerm3.toString().trim()) mathGrandTests.push({ name: 'Grant 3', score: parseInt(mTerm3) || 0 });
            
            const mTerm4 = row['Grant 4 math'] || row['Grant 4 MATH'] || row['grant 4 math'] || row['4-chorak matematika'] || row['math term 4 score'] || '';
            if (mTerm4.toString().trim()) mathGrandTests.push({ name: 'Grant 4', score: parseInt(mTerm4) || 0 });

            const rawEngStarting = row['boshlang\'ich daraja eng'] || row['Boshlang\'ich daraja eng'] || row['StartingLevelENG'] || row['boshlang\'ich daraja'] || row['Boshlang\'ich daraja'] || row['avvalgi daraja'] || row['Avvalgi daraja'] || row['initial level'] || row['initial level eng'] || row['Level'] || row['level'] || row['StartingLevel'] || '';
            const rawEngCurrent = row['hozirgi daraja eng'] || row['Hozirgi daraja eng'] || row['CurrentLevelENG'] || row['hozirgi daraja'] || row['Hozirgi daraja'] || row['current level'] || row['CurrentLevel'] || row['currentLevel'] || row['current level eng'] || '';

            const rawMathStarting = row['boshlang\'ich daraja math'] || row['Boshlang\'ich daraja math'] || row['StartingLevelMATH'] || row['initial level math'] || row['avvalgi daraja math'] || row['Avvalgi daraja math'] || '';
            const rawMathCurrent = row['hozirgi daraja math'] || row['Hozirgi daraja math'] || row['CurrentLevelMATH'] || row['current level math'] || '';

            const normEngStarting = normalizeLevel(rawEngStarting);
            const normEngCurrent = normalizeLevel(rawEngCurrent);
            const normMathStarting = normalizeLevel(rawMathStarting);
            const normMathCurrent = normalizeLevel(rawMathCurrent);

            const hasExplicitMathColumns = !!(rawMathStarting || rawMathCurrent || mTerm1 || mTerm2 || mTerm3 || mTerm4);

            let finalEngStarting = normEngStarting || 'Level 1';
            let finalEngCurrent = normEngCurrent || 'Level 1';
            let finalEngTests: { name: string; score: number }[] | undefined = grandTests.length > 0 ? grandTests : undefined;

            let finalMathStarting = normMathStarting || 'Level 1';
            let finalMathCurrent = normMathCurrent || 'Level 1';
            let finalMathTests: { name: string; score: number }[] | undefined = mathGrandTests.length > 0 ? mathGrandTests : undefined;

            if (!hasExplicitMathColumns && activeSubject === 'MATH') {
              finalMathStarting = normEngStarting || 'Level 1';
              finalMathCurrent = normEngCurrent || 'Level 1';
              finalMathTests = grandTests.length > 0 ? grandTests : undefined;

              finalEngStarting = 'Level 1';
              finalEngCurrent = 'Level 1';
              finalEngTests = undefined;
            }

            const rawEngScore = row['Eng score'] || row['English score'] || row['eng_score'] || row['eng score'] || '';
            const engScore = rawEngScore !== '' ? Math.min(15, Math.max(0, parseInt(rawEngScore) || 0)) : 0;

            const rawMathScore = row['Math score'] || row['math_score'] || row['math score'] || '';
            const mathScore = rawMathScore !== '' ? Math.min(15, Math.max(0, parseInt(rawMathScore) || 0)) : 0;

            const rawAttendance = row['Attendance'] || row['attendance'] || '';
            const attendance = rawAttendance !== '' ? parseInt(rawAttendance) || 1 : 1;

            const rawHomework = row['Homework'] || row['homework'] || '';
            const homework = rawHomework !== '' ? parseInt(rawHomework) || 1 : 1;

            return {
              id: Math.random().toString(36).substr(2, 9),
              name,
              surname,
              className: (
                row['sinf'] || 
                row['Sinf'] || 
                row['class'] || 
                row['Class'] || 
                row['className'] || '5A'
              ).toString().trim().toUpperCase(),
              dateJoined: (
                row['qabul qilingan sana'] || 
                row['Qabul qilingan sana'] || 
                row['when'] || 
                row['When'] || 
                row['date joined'] || 'Sentyabr 2024'
              ).toString().trim(),
              startingLevel: finalEngStarting,
              currentLevel: finalEngCurrent,
              grandTests: finalEngTests,
              pictureUrl: row['PictureUrl'] || row['pictureUrl'] || '',
              mathStartingLevel: finalMathStarting,
              mathCurrentLevel: finalMathCurrent,
              mathGrandTests: finalMathTests,
              engScore,
              mathScore,
              attendance,
              homework,
            };
          })
          .filter((s: Student) => s.name.trim() !== '' || s.surname.trim() !== '');

        if (parsedStudents.length === 0) {
          setUploadStatus({ type: 'error', message: '❌ Yaroqli o\'quvchilar topilmadi. Faylingiz namunadagi kabi ustun nomlariga ega ekanligini tekshiring.' });
          return;
        }

        onStudentsUploaded(parsedStudents);
        setUploadStatus({ type: 'success', message: `✅ ${parsedStudents.length} ta o'quvchi muvaffaqiyatli yuklandi!` });
        setTimeout(() => setIsCsvModalOpen(false), 1500);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setUploadStatus({ type: 'error', message: '❌ Faylni o\'qib bo\'lmadi. Bu .CSV formatidagi fayl ekanligini tekshiring.' });
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    if (activeSubject === 'ALL') {
      const headers = [
        "O'quvchining ismi va familiyasi",
        "sinf",
        "Eng score",
        "Math score",
        "Attendance",
        "Homework"
      ].join(",");

      const row1 = [
        "Yodgorov Axmadjon",
        "5A",
        "14",
        "11",
        "1",
        "1"
      ].join(",");

      const row2 = [
        "Salohiddinov Otabek",
        "5B",
        "8",
        "10",
        "-1",
        "-2"
      ].join(",");

      const csvContent = headers + "\n" + row1 + "\n" + row2;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "o_quvchilar_all_namuna.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      "O'quvchining ismi va familiyasi",
      "sinf",
      "boshlang'ich daraja eng",
      "hozirgi daraja eng",
      "Grant 1 eng",
      "Grant 2 eng",
      "Grant 3 eng",
      "Grant 4 eng",
      "boshlang'ich daraja math",
      "hozirgi daraja math",
      "Grant 1 math",
      "Grant 2 math",
      "Grant 3 math",
      "Grant 4 math"
    ].join(",");

    const row1 = [
      "Yodgorov Axmadjon",
      "5A",
      "1",
      "5",
      "70", "72", "90", "67",
      "2",
      "4",
      "60", "68", "75", "82"
    ].join(",");

    const row2 = [
      "Salohiddinov Otabek",
      "5B",
      "3",
      "5",
      "55", "40", "68", "90",
      "1",
      "3",
      "45", "55", "62", "70"
    ].join(",");

    const csvContent = headers + "\n" + row1 + "\n" + row2;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "o_quvchilar_kombinatsiyalangan_namuna.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Dark Overlay backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 999,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all 0.30s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />

      {/* Slide-in Drawer Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '390px',
          maxWidth: '100%',
          background: '#fcfcf9',
          boxShadow: '-10px 0 40px -10px rgba(15, 23, 42, 0.08)',
          zIndex: 1000,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e5e7eb'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '1.75rem 1.5rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(229, 231, 235, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={18} color="var(--accent-primary)" strokeWidth={2.5} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#0f172a', margin: 0, letterSpacing: '0.02em' }}>
              BOSHQARUV PANELI
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              borderRadius: '50%',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* Section 1: Subject Select */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              FAOL FAN KO'RINISHI
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { id: 'ENG', title: 'Ingliz Tili', desc: 'Sinflarning darajalari va grand testlari', color: '#166534', bg: '#f0fdf4' },
                { id: 'MATH', title: 'Matematika', desc: 'Matematika darajalari va grand testlari', color: '#0d9488', bg: '#f0fdfa' },
                { id: 'ALL', title: 'Umumiy Tahlil', desc: 'Foizlarda natijalar, davomat va vazifalar', color: '#4f46e5', bg: '#e0e7ff' }
              ].map(subj => {
                const isSelected = activeSubject === subj.id;
                return (
                  <button
                    key={subj.id}
                    onClick={() => onSubjectChange(subj.id as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      width: '100%',
                      padding: '0.9rem 1.1rem',
                      borderRadius: '16px',
                      background: isSelected ? subj.bg : '#ffffff',
                      border: isSelected ? `2.2px solid ${subj.color}` : '1.5px solid #e2e8f0',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected ? '0 4px 12px -3px rgba(0,0,0,0.04)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = subj.color;
                        e.currentTarget.style.background = `${subj.bg}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                      }
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: subj.color,
                      flexShrink: 0
                    }} />
                    <div>
                      <div style={{ fontWeight: 850, fontSize: '0.8rem', color: isSelected ? subj.color : '#334155', letterSpacing: '0.02em' }}>
                        {subj.title.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {subj.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: '1px', background: '#e2e8f0', margin: '1.5rem 0' }} />

          {/* Section 2: Admin Mode Toggle */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e293b', letterSpacing: '0.01em' }}>
                  ADMIN REJIMI
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem', maxWidth: '240px', lineHeight: 1.4 }}>
                  O'quvchi qo'shish, o'chirish va tahrirlash imkoniyatlari
                </div>
              </div>
              <button 
                onClick={onToggleAdmin}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '9999px',
                  background: isAdminMode ? 'var(--accent-primary)' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 0,
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  left: isAdminMode ? '24px' : '4px',
                  transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                }} />
              </button>
            </div>
          </div>

          {/* Section 3: Admin Actions (Only visible in Admin Mode) */}
          {isAdminMode && (
            <div style={{ 
              marginTop: '2rem', 
              animation: 'fadeIn 0.25s ease-out',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '0' }} />
              
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  ADMIN AMALLARI
                </div>
                
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '0.9rem 1.1rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Faol sinf:</span>
                    <strong style={{ color: '#0f172a' }}>{activeClass}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                    <span>Jami o'quvchilar:</span>
                    <strong style={{ color: '#0f172a' }}>{students.length} ta</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Add Student Button */}
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: 'var(--accent-primary)',
                      border: '1.5px solid var(--accent-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                  >
                    <UserPlus size={15} />
                    <span>YANGI O'QUVCHI QO'SHISH</span>
                  </button>

                  {/* Bulk Upload Button */}
                  <button
                    onClick={() => { setUploadStatus(null); setIsCsvModalOpen(true); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '12px',
                      background: 'var(--accent-primary)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'translateY(-0.5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <UploadCloud size={15} />
                    <span>GURUHLI YUKLASH (CSV)</span>
                  </button>

                  {/* Delete Class Button */}
                  <button
                    onClick={onBulkDeleteClass}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '12px',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      border: '1.5px solid #fca5a5',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginTop: '0.75rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                  >
                    <Trash2 size={15} />
                    <span>{activeClass} SINFINI O'CHIRISH</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload CSV Modal overlay (renders on top of everything) */}
      {isCsvModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCsvModalOpen(false)} style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '24px', padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 850 }}>O'quvchilarni guruhli yuklash</h2>
              <button 
                onClick={() => setIsCsvModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Sinf o'quvchilarini ommaviy CSV fayl orqali tizimga yuklang. To'g'ri ustunlar mos kelishi uchun quyidagi namunani yuklab oling.
            </p>

            <div style={{ 
              background: '#f0fdf4', border: '1px solid #bbf7d0', 
              borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.8rem', color: '#166534', lineHeight: 1.5
            }}>
              <strong>⚠️ Diqqat:</strong> Yuklanadigan fayl faqat <strong>.CSV</strong> formatida bo'lishi shart.<br />
              Excel yoki Google Sheets da tahrirlab bo'lgach, <em>Vergul bilan ajratilgan qiymatlar (.csv)</em> sifatida yuklab oling.
            </div>

            <button 
              className="admin-btn" 
              style={{
                marginBottom: '1.5rem', width: '100%', justifyContent: 'center',
                background: '#ffffff', color: '#0d9488', border: '1.5px solid #0d9488',
                borderRadius: '12px', padding: '0.75rem 1.25rem', fontSize: '0.82rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdfa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
              onClick={downloadTemplate}
            >
              <Download size={16} />
              Namunaviy CSV faylini yuklab olish
            </button>

            {uploadStatus && (
              <div style={{
                padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
                fontSize: '0.82rem', fontWeight: 600,
                background: uploadStatus.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: uploadStatus.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${uploadStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`
              }}>
                {uploadStatus.message}
              </div>
            )}

            <div 
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#fafaf9',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fafaf9'; }}
            >
              <UploadCloud className="icon" size={32} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
              <div>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', margin: 0 }}>Faylni tanlash uchun bosing</p>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>yoki faylni sudrab bu yerga tashlang (.csv formatda)</p>
              </div>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal overlay (renders on top of everything) */}
      <AddStudentModal 
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onAddStudent={onAddStudent}
        activeSubject={activeSubject}
      />
    </>
  );
};

export default SidebarDrawer;
