import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import type { Student, ActiveSubject, Teacher } from '../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (studentData: Partial<Student>) => void;
  activeSubject: ActiveSubject;
  teachers: Teacher[];
  activeClass?: string;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onAddStudent, activeSubject: _activeSubject, teachers, activeClass }) => {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [englishTeacher, setEnglishTeacher] = useState('');
  const [mathTeacher, setMathTeacher] = useState('');
  const [parentPhone, setParentPhone] = useState('+998');
  const [selectedClass, setSelectedClass] = useState('5-Sinf');

  useEffect(() => {
    if (isOpen && activeClass) {
      setSelectedClass(activeClass);
    }
  }, [isOpen, activeClass]);

  if (!isOpen) return null;

  const engTeachers = teachers.filter(t => t.subject === 'ENG');
  const mathTeachers = teachers.filter(t => t.subject === 'MATH');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !surname.trim()) return;

    const studentData: Partial<Student> = {
      name: name.trim(),
      surname: surname.trim(),
      className: selectedClass,
      teacher: englishTeacher.trim() || undefined,
      mathTeacher: mathTeacher.trim() || undefined,
      parentPhone: parentPhone.trim() === '+998' ? '' : parentPhone.trim(),
      startingLevel: 'Level 1',
      currentLevel: 'Level 1',
      mathStartingLevel: 'Level 1',
      mathCurrentLevel: 'Level 1',
      engScore: 0,
      mathScore: 0,
      attendance: 1,
      homework: 1
    };

    onAddStudent(studentData);
    
    // Reset and close
    setName('');
    setSurname('');
    setEnglishTeacher('');
    setMathTeacher('');
    setParentPhone('+998');
    setSelectedClass('5-Sinf');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, background: 'var(--backdrop-color)', backdropFilter: 'var(--backdrop-blur-md)', WebkitBackdropFilter: 'var(--backdrop-blur-md)' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .add-modal-content {
          max-height: 90vh;
          overflow-y: auto;
        }
        @media (max-width: 600px) {
          .add-modal-content {
            padding: 1.25rem 1rem !important;
            border-radius: 20px !important;
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
          background: 'var(--bg-card)',
          backdropFilter: 'var(--backdrop-blur-md)',
          WebkitBackdropFilter: 'var(--backdrop-blur-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
          borderRadius: '32px',
          padding: '2.25rem 2.5rem'
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-hero)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
              <UserPlus size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Yangi o'quvchi qo'shish</h2>
          </div>
          <button className="close-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ism *</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Masalan: Sardor"
                required
                style={{
                  width: '100%', padding: '0.75rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)', fontSize: '0.95rem',
                  background: 'var(--bg-card-hover)', color: 'var(--text-primary)',
                  outline: 'none', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-hero)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Familiya *</label>
              <input 
                type="text" 
                value={surname}
                onChange={e => setSurname(e.target.value)}
                placeholder="Masalan: Ikromov"
                required
                style={{
                  width: '100%', padding: '0.75rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)', fontSize: '0.95rem',
                  background: 'var(--bg-card-hover)', color: 'var(--text-primary)',
                  outline: 'none', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-hero)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Sinf *
              </label>
              <select 
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)', fontSize: '0.95rem',
                  backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="1-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>1-Sinf</option>
                <option value="2-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>2-Sinf</option>
                <option value="3-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>3-Sinf</option>
                <option value="4-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>4-Sinf</option>
                <option value="5-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>5-Sinf</option>
                <option value="6-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>6-Sinf</option>
                <option value="7-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>7-Sinf</option>
                <option value="8-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>8-Sinf</option>
                <option value="9-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>9-Sinf</option>
                <option value="10-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>10-Sinf</option>
                <option value="11-Sinf" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>11-Sinf</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Ota-ona telefon raqami
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
                  width: '100%', padding: '0.75rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)', fontSize: '0.95rem',
                  background: 'var(--bg-card-hover)', color: 'var(--text-primary)',
                  outline: 'none', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-hero)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Ingliz tili o'qituvchisi
              </label>
              <select 
                value={englishTeacher}
                onChange={e => setEnglishTeacher(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)', fontSize: '0.95rem',
                  backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Tanlanmagan</option>
                {engTeachers.map(t => (
                  <option key={t.id} value={t.name} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Matematika o'qituvchisi
              </label>
              <select 
                value={mathTeacher}
                onChange={e => setMathTeacher(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1.25rem', borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)', fontSize: '0.95rem',
                  backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Tanlanmagan</option>
                {mathTeachers.map(t => (
                  <option key={t.id} value={t.name} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              Bekor qilish
            </button>
            <button 
              type="submit"
              disabled={!name.trim() || !surname.trim()}
              style={{
                padding: '0.75rem 1.75rem', borderRadius: '9999px', border: 'none',
                background: (!name.trim() || !surname.trim()) ? '#9ca3af' : 'var(--accent-hero)', 
                color: '#ffffff', fontWeight: 600, cursor: (!name.trim() || !surname.trim()) ? 'not-allowed' : 'pointer',
                boxShadow: (!name.trim() || !surname.trim()) ? 'none' : '0 8px 16px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
              onMouseEnter={e => {
                if (!(!name.trim() || !surname.trim())) {
                  e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
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
