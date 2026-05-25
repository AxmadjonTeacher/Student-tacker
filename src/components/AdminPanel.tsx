import React, { useState, useRef } from 'react';
import { UploadCloud, Settings, X, Download, Trash2, UserPlus } from 'lucide-react';
import Papa from 'papaparse';
import type { Student } from '../types';
import AddStudentModal from './AddStudentModal';

interface AdminPanelProps {
  students: Student[];
  activeClass: string;
  onStudentsUploaded: (students: Student[]) => void;
  onDeleteStudent: (id: string) => void;
  onBulkDeleteClass: () => void;
  onAddStudent: (studentData: Partial<Student>) => void;
  activeSubject: 'ENG' | 'MATH' | 'ALL';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ students, activeClass, onStudentsUploaded, onBulkDeleteClass, onAddStudent, activeSubject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize level: if user types "1", "2" etc., convert to "Level 1"
  const normalizeLevel = (raw: string): string => {
    const trimmed = raw?.toString().trim() || '';
    if (!trimmed) return '';
    // Already has "Level" prefix
    if (/^level\s*\d+$/i.test(trimmed)) {
      const num = trimmed.match(/\d+/)?.[0];
      return `Level ${num}`;
    }
    // Bare number like "1", "3", "5"
    if (/^\d+$/.test(trimmed)) return `Level ${trimmed}`;
    return trimmed;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reject non-CSV files — PapaParse cannot read .xlsx
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

            // Parse English Grand Tests
            const grandTests = [];
            const term1 = row['Grant 1 eng'] || row['Grant 1 ENG'] || row['grant 1 eng'] || row['Grant 1'] || row['grant 1'] || row['1-chorak natijasi'] || row['1-chorak'] || row['term 1 score'] || '';
            if (term1.toString().trim()) grandTests.push({ name: 'Grant 1', score: parseInt(term1) || 0 });
            
            const term2 = row['Grant 2 eng'] || row['Grant 2 ENG'] || row['grant 2 eng'] || row['Grant 2'] || row['grant 2'] || row['2-chorak natijasi'] || row['2-chorak'] || row['term 2 score'] || '';
            if (term2.toString().trim()) grandTests.push({ name: 'Grant 2', score: parseInt(term2) || 0 });
            
            const term3 = row['Grant 3 eng'] || row['Grant 3 ENG'] || row['grant 3 eng'] || row['Grant 3'] || row['grant 3'] || row['3-chorak natijasi'] || row['3-chorak'] || row['term 3 score'] || '';
            if (term3.toString().trim()) grandTests.push({ name: 'Grant 3', score: parseInt(term3) || 0 });
            
            const term4 = row['Grant 4 eng'] || row['Grant 4 ENG'] || row['grant 4 eng'] || row['Grant 4'] || row['grant 4'] || row['4-chorak natijasi'] || row['4-chorak'] || row['term 4 score'] || '';
            if (term4.toString().trim()) grandTests.push({ name: 'Grant 4', score: parseInt(term4) || 0 });

            // Parse Math Grand Tests
            const mathGrandTests = [];
            const mTerm1 = row['Grant 1 math'] || row['Grant 1 MATH'] || row['grant 1 math'] || row['1-chorak matematika'] || row['math term 1 score'] || '';
            if (mTerm1.toString().trim()) mathGrandTests.push({ name: 'Grant 1', score: parseInt(mTerm1) || 0 });
            
            const mTerm2 = row['Grant 2 math'] || row['Grant 2 MATH'] || row['grant 2 math'] || row['2-chorak matematika'] || row['math term 2 score'] || '';
            if (mTerm2.toString().trim()) mathGrandTests.push({ name: 'Grant 2', score: parseInt(mTerm2) || 0 });
            
            const mTerm3 = row['Grant 3 math'] || row['Grant 3 MATH'] || row['grant 3 math'] || row['3-chorak matematika'] || row['math term 3 score'] || '';
            if (mTerm3.toString().trim()) mathGrandTests.push({ name: 'Grant 3', score: parseInt(mTerm3) || 0 });
            
            const mTerm4 = row['Grant 4 math'] || row['Grant 4 MATH'] || row['grant 4 math'] || row['4-chorak matematika'] || row['math term 4 score'] || '';
            if (mTerm4.toString().trim()) mathGrandTests.push({ name: 'Grant 4', score: parseInt(mTerm4) || 0 });

            // Parse Levels
            const rawEngStarting = row['boshlang\'ich daraja eng'] || row['Boshlang\'ich daraja eng'] || row['StartingLevelENG'] || row['boshlang\'ich daraja'] || row['Boshlang\'ich daraja'] || row['avvalgi daraja'] || row['Avvalgi daraja'] || row['initial level'] || row['initial level eng'] || row['Level'] || row['level'] || row['StartingLevel'] || '';
            const rawEngCurrent = row['hozirgi daraja eng'] || row['Hozirgi daraja eng'] || row['CurrentLevelENG'] || row['hozirgi daraja'] || row['Hozirgi daraja'] || row['current level'] || row['CurrentLevel'] || row['currentLevel'] || row['current level eng'] || '';

            const rawMathStarting = row['boshlang\'ich daraja math'] || row['Boshlang\'ich daraja math'] || row['StartingLevelMATH'] || row['initial level math'] || row['avvalgi daraja math'] || row['Avvalgi daraja math'] || '';
            const rawMathCurrent = row['hozirgi daraja math'] || row['Hozirgi daraja math'] || row['CurrentLevelMATH'] || row['current level math'] || '';

            const normEngStarting = normalizeLevel(rawEngStarting);
            const normEngCurrent = normalizeLevel(rawEngCurrent);
            const normMathStarting = normalizeLevel(rawMathStarting);
            const normMathCurrent = normalizeLevel(rawMathCurrent);

            // Self-healing / Active-subject resolution logic for backward compatibility
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

            // Parse raw scores, attendance, homework for ALL mode
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
              // Math fields mapping
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
        setTimeout(() => setIsOpen(false), 1500);
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
      {/* Admin Section Card */}
      <div style={{
        marginTop: '1.5rem',
        background: '#ffffff',
        border: '1.5px solid #0d9488',
        borderRadius: '20px',
        padding: '1.5rem 2rem',
        boxShadow: '0 4px 6px -1px rgba(13,148,136,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: '#ccfbf1', borderRadius: '10px',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Settings size={18} color="#0d9488" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>Admin panel</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Jami {students.length} ta o'quvchi · Guruhli yuklash yoki boshqarish
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onBulkDeleteClass}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#fee2e2', color: '#b91c1c',
                border: '1px solid #fca5a5', borderRadius: '10px',
                padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
            >
              <Trash2 size={16} />
              {activeClass} sinfini butunlay o'chirish
            </button>

            <button
              onClick={() => setIsAddStudentOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#f8fafc', color: '#0d9488',
                border: '1px solid #ccfbf1', borderRadius: '10px',
                padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            >
              <UserPlus size={16} />
              Yangi o'quvchi qo'shish
            </button>

            <button
              onClick={() => { setUploadStatus(null); setIsOpen(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#0d9488', color: '#ffffff',
                border: 'none', borderRadius: '10px',
                padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#0f766e'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0d9488'; }}
            >
              <UploadCloud size={16} />
              O'quvchilarni guruhli yuklash
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Admin panel — O'quvchilarni yuklash</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              CSV fayli orqali o'quvchilarni ommaviy ravishda yuklang. To'g'ri format uchun pastdagi namunaviy faylni yuklab oling.
            </p>

            <div style={{ 
              background: '#f0fdf4', border: '1px solid #bbf7d0', 
              borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem',
              fontSize: '0.82rem', color: '#166534', lineHeight: 1.5
            }}>
              <strong>⚠️ Muhim:</strong> Yuklanadigan fayl faqat <strong>.CSV</strong> formatida bo'lishi lozim.<br />
              Google Sheets'da: <em>Fayl → Yuklab olish → Vergul bilan ajratilgan qiymatlar (.csv)</em><br />
              Excel'da: <em>Fayl → Saqlash → CSV (Vergul bilan ajratilgan)</em>
            </div>

            <button 
              className="admin-btn" 
              style={{ marginBottom: '1rem', width: '100%', justifyContent: 'center' }}
              onClick={downloadTemplate}
            >
              <Download size={18} />
              Namunaviy CSV faylini yuklab olish
            </button>

            {uploadStatus && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
                fontSize: '0.85rem', fontWeight: 500,
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
            >
              <UploadCloud className="icon" />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Yuklash uchun <strong>.CSV</strong> faylini bosing</p>
                <p>yoki faylni sudrab bu yerga tashlang — faqat CSV formatda, .xlsx emas</p>
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

      <AddStudentModal 
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onAddStudent={onAddStudent}
        activeSubject={activeSubject}
      />
    </>
  );
};

export default AdminPanel;

