import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import type { Student } from '../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (studentData: Partial<Student>) => void;
  activeSubject: 'ENG' | 'MATH' | 'ALL';
}

const LEVELS = [
  'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5',
  'Level 6', 'Level 7', 'Level 8', 'Level 9', 'Level 10',
  'Level 11', 'Level 12', 'Level 13', 'Level 14', 'Level 15'
];

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onAddStudent, activeSubject }) => {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [startingLevel, setStartingLevel] = useState('Level 1');
  const [currentLevel, setCurrentLevel] = useState('Level 1');
  const [teacher, setTeacher] = useState('');
  const [parentPhone, setParentPhone] = useState('+998');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !surname.trim()) return;

    const studentData: Partial<Student> = {
      name: name.trim(),
      surname: surname.trim(),
      parentPhone: parentPhone.trim() === '+998' ? '' : parentPhone.trim(),
    };

    if (activeSubject === 'MATH') {
      studentData.mathStartingLevel = startingLevel;
      studentData.mathCurrentLevel = currentLevel;
      studentData.mathTeacher = teacher.trim();
      studentData.startingLevel = 'Level 1';
      studentData.currentLevel = 'Level 1';
    } else if (activeSubject === 'ENG') {
      studentData.startingLevel = startingLevel;
      studentData.currentLevel = currentLevel;
      studentData.teacher = teacher.trim();
      studentData.mathStartingLevel = 'Level 1';
      studentData.mathCurrentLevel = 'Level 1';
    } else {
      studentData.startingLevel = 'Level 1';
      studentData.currentLevel = 'Level 1';
      studentData.mathStartingLevel = 'Level 1';
      studentData.mathCurrentLevel = 'Level 1';
      studentData.engScore = 0;
      studentData.mathScore = 0;
      studentData.attendance = 1;
      studentData.homework = 1;
    }

    onAddStudent(studentData);
    
    // Reset and close
    setName('');
    setSurname('');
    setStartingLevel('Level 1');
    setCurrentLevel('Level 1');
    setTeacher('');
    setParentPhone('+998');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .add-modal-content {
          max-height: 90vh;
          overflow-y: auto;
        }
        @media (max-width: 600px) {
          .add-modal-content {
            padding: 1.25rem 1rem !important;
            border-radius: 16px !important;
          }
          .add-modal-content form {
            gap: 0.85rem !important;
          }
          .add-modal-content label {
            margin-bottom: 0.25rem !important;
            font-size: 0.75rem !important;
          }
          .add-modal-content input, .add-modal-content select {
            padding: 0.6rem 0.85rem !important;
            font-size: 0.85rem !important;
          }
        }
      `}} />
      <div 
        className="modal-content add-modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '90%',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: '24px',
          padding: '2rem'
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#dcfce7', color: '#166534', padding: '0.5rem', borderRadius: '10px' }}>
              <UserPlus size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0 }}>Yangi o'quvchi qo'shish</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Ism *</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Masalan: Sardor"
                required
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '0.95rem',
                  outline: 'none', transition: 'border-color 0.2s ease'
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#0d9488'}
                onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Familiya *</label>
              <input 
                type="text" 
                value={surname}
                onChange={e => setSurname(e.target.value)}
                placeholder="Masalan: Ikromov"
                required
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '0.95rem',
                  outline: 'none', transition: 'border-color 0.2s ease'
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#0d9488'}
                onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Avvalgi daraja</label>
              <select 
                value={startingLevel}
                onChange={e => setStartingLevel(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '0.95rem',
                  backgroundColor: '#fff', cursor: 'pointer', outline: 'none'
                }}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Hozirgi daraja</label>
              <select 
                value={currentLevel}
                onChange={e => setCurrentLevel(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '0.95rem',
                  backgroundColor: '#fff', cursor: 'pointer', outline: 'none'
                }}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
              O'qituvchi <span style={{ color: '#94a3b8', fontWeight: 400 }}>(ixtiyoriy)</span>
            </label>
            <input 
              type="text" 
              value={teacher}
              onChange={e => setTeacher(e.target.value)}
              placeholder="O'qituvchi ismini kiriting..."
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '10px',
                border: '1px solid #cbd5e1', fontSize: '0.95rem',
                outline: 'none', transition: 'border-color 0.2s ease'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#0d9488'}
              onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
              Ota-ona telefon raqami <span style={{ color: '#94a3b8', fontWeight: 400 }}>(ixtiyoriy)</span>
            </label>
            <input 
              type="text" 
              value={parentPhone}
              onChange={e => {
                const val = e.target.value;
                if (!val.startsWith('+998')) {
                  setParentPhone('+998');
                } else {
                  setParentPhone(val);
                }
              }}
              placeholder="+998 90 123 45 67"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '10px',
                border: '1px solid #cbd5e1', fontSize: '0.95rem',
                outline: 'none', transition: 'border-color 0.2s ease'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#0d9488'}
              onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem', borderRadius: '10px', border: '1px solid #cbd5e1',
                background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
            >
              Bekor qilish
            </button>
            <button 
              type="submit"
              disabled={!name.trim() || !surname.trim()}
              style={{
                padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none',
                background: (!name.trim() || !surname.trim()) ? '#9ca3af' : 'var(--accent-gradient)', 
                color: '#ffffff', fontWeight: 600, cursor: (!name.trim() || !surname.trim()) ? 'not-allowed' : 'pointer',
                boxShadow: (!name.trim() || !surname.trim()) ? 'none' : '0 4px 6px -1px rgba(13, 148, 136, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              Qo'shish
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;
