import React, { useState } from 'react';
import type { Student } from '../types';
import { Inbox, LineChart, ArrowRight, Trash2 } from 'lucide-react';
import GraphModal from './GraphModal';

interface StudentTableProps {
  students: Student[];
  onUpdatePhoto?: (studentId: string, photoUrl: string) => void;
  onDeleteStudent?: (studentId: string) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({ students, onUpdatePhoto, onDeleteStudent }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [uploadingStudentId, setUploadingStudentId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    // If the level contains a number (e.g. "Level 1"), use that
    const match = levelStr.match(/\d+/);
    if (match) return parseInt(match[0], 10);

    // Legacy fallback for text-based levels
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

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
        {students.length === 0 ? (
          <div className="empty-state">
            <Inbox size={48} />
            <p>Ushbu sinfda o'quvchilar topilmadi.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>O'quvchilar ma'lumotlarini yuklash uchun admin paneldan foydalaning.</p>
          </div>
        ) : (
          <>
            {/* Master Table Header Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1.5fr 1fr 1.5fr 1fr',
              alignItems: 'center',
              padding: '0.5rem 1.5rem',
              marginBottom: '-0.25rem',
              color: '#9ca3af',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              <div>O'QUVCHI</div>
              <div style={{ padding: '0 1.5rem' }}>QABUL QILINGAN SANA</div>
              <div style={{ padding: '0 1.5rem' }}>AVVALGI DARAJA</div>
              <div style={{ padding: '0 1.5rem' }}>HOZIRGI DARAJA</div>
              <div style={{ padding: '0 1.5rem' }}>
                {onDeleteStudent ? "O'CHIRISH" : "PROGRESS"}
              </div>
            </div>

            {students.map(student => {
              const improvement = calculateImprovement(student.startingLevel, student.currentLevel);
              
              return (
                <div key={student.id} style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.5fr 1fr 1.5fr 1fr',
                  alignItems: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                  border: '1px solid #e5e7eb'
                }}>
                  {/* Name block */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderRight: '1px solid #e5e7eb', height: '100%' }}>
                    <div 
                      onClick={() => onUpdatePhoto && handleAvatarClick(student.id)}
                      style={{ 
                        width: '64px', height: '64px', borderRadius: '50%', 
                        background: '#0d9488', color: '#ffffff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', fontWeight: 600, flexShrink: 0,
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
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1a1a1a' }}>
                        {student.name} {student.surname}
                      </h3>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>
                        SINF {student.className.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* When block */}
                  <div style={{ padding: '0 1.5rem', borderRight: '1px solid #e5e7eb', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '1rem' }}>
                      {student.dateJoined}
                    </div>
                  </div>

                  {/* Level block */}
                  <div style={{ padding: '0 1.5rem', borderRight: '1px solid #e5e7eb', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#6b7280', fontSize: '1rem' }}>
                      {student.startingLevel}
                    </div>
                  </div>

                  {/* Current Level block */}
                  <div style={{ padding: '0 1.5rem', borderRight: '1px solid #e5e7eb', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '1rem', marginBottom: '0.4rem' }}>
                      {student.currentLevel}
                    </div>
                    {improvement.includes('+') ? (
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        background: '#ccfbf1', color: '#0f766e', 
                        padding: '0.2rem 0.5rem', borderRadius: '9999px',
                        fontSize: '0.75rem', fontWeight: 600, width: 'max-content'
                      }}>
                        <ArrowRight size={12} style={{ transform: 'rotate(-45deg)' }} />
                        {improvement}
                      </div>
                    ) : null}
                  </div>

                  {/* Column 5: Graph Button / Delete Button */}
                  {!onDeleteStudent ? (
                    <div style={{ padding: '0 0 0 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          background: 'transparent', color: '#0d9488',
                          border: '1px solid #0d9488', borderRadius: '9999px',
                          padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s ease', width: 'max-content'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ccfbf1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <LineChart size={16} />
                        Grafikni ko'rish
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '0 0 0 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <button 
                        onClick={() => onDeleteStudent(student.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          background: '#fee2e2', color: '#b91c1c',
                          border: '1px solid #fca5a5', borderRadius: '9999px',
                          padding: '0.4rem 1.2rem', fontSize: '0.85rem', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s ease', width: 'max-content'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                      >
                        <Trash2 size={16} />
                        O'chirish
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
        />
      )}
    </>
  );
};

export default StudentTable;
