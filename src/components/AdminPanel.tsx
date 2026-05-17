import React, { useState, useRef } from 'react';
import { UploadCloud, Settings, X, Download, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import type { Student } from '../types';

interface AdminPanelProps {
  students: Student[];
  activeClass: string;
  onStudentsUploaded: (students: Student[]) => void;
  onDeleteStudent: (id: string) => void;
  onBulkDeleteClass: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ students, activeClass, onStudentsUploaded, onBulkDeleteClass }) => {
  const [isOpen, setIsOpen] = useState(false);
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

            // Handle grand tests from the columns
            const grandTests = [];
            const term1 = row['Grant 1'] || row['grant 1'] || row['1-chorak natijasi'] || row['1-chorak'] || row['term 1 score'];
            if (term1) grandTests.push({ name: 'Grant 1', score: parseInt(term1) || 0 });
            
            const term2 = row['Grant 2'] || row['grant 2'] || row['2-chorak natijasi'] || row['2-chorak'] || row['term 2 score'];
            if (term2) grandTests.push({ name: 'Grant 2', score: parseInt(term2) || 0 });
            
            const term3 = row['Grant 3'] || row['grant 3'] || row['3-chorak natijasi'] || row['3-chorak'] || row['term 3 score'];
            if (term3) grandTests.push({ name: 'Grant 3', score: parseInt(term3) || 0 });
            
            const term4 = row['Grant 4'] || row['grant 4'] || row['4-chorak natijasi'] || row['4-chorak'] || row['term 4 score'];
            if (term4) grandTests.push({ name: 'Grant 4', score: parseInt(term4) || 0 });

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
              startingLevel: normalizeLevel(
                row['boshlang\'ich daraja'] || 
                row['Boshlang\'ich daraja'] || 
                row['avvalgi daraja'] || 
                row['Avvalgi daraja'] || 
                row['initial level'] || 
                row['Level'] || 
                row['level'] || 
                row['StartingLevel'] || ''
              ),
              currentLevel: normalizeLevel(
                row['hozirgi daraja'] || 
                row['Hozirgi daraja'] || 
                row['current level'] || 
                row['CurrentLevel'] || 
                row['currentLevel'] || ''
              ),
              pictureUrl: row['PictureUrl'] || row['pictureUrl'] || '',
              grandTests: grandTests.length > 0 ? grandTests : undefined
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
    const csvContent = "data:text/csv;charset=utf-8,O'quvchining ismi va familiyasi,sinf,qabul qilingan sana,boshlang'ich daraja,hozirgi daraja,Grant 1,Grant 2,Grant 3,Grant 4\nYodgorov Axmadjon,5A,Sentyabr 2024,1,5,70,72,90,67\nSalohiddinov Otabek,5B,Sentyabr 2024,3,5,55,40,68,90";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "o_quvchilar_namuna.csv");
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
    </>
  );
};

export default AdminPanel;

