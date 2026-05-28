import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Student, ActiveSubject } from '../types';

interface EditProgressModalProps {
  student: Student;
  onClose: () => void;
  onSave: (
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
  activeSubject: ActiveSubject;
}

const EditProgressModal: React.FC<EditProgressModalProps> = ({ 
  student, 
  onClose, 
  onSave, 
  activeSubject 
}) => {
  const isMath = activeSubject === 'MATH';
  const isAll = activeSubject === 'ALL';
  const subjectName = isMath ? 'Matematika' : isAll ? 'Barcha natijalar' : 'Ingliz tili';
  const activeThemeColor = isMath ? '#0d9488' : isAll ? '#4f46e5' : '#166534';

  const [name, setName] = useState(student.name);
  const [surname, setSurname] = useState(student.surname);
  const [className, setClassName] = useState(student.className);
  const [parentPhone, setParentPhone] = useState(
    student.parentPhone && student.parentPhone.trim() !== '' 
      ? student.parentPhone 
      : '+998'
  );

  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // ALL subject fields
  const [engScore, setEngScore] = useState(student.engScore?.toString() || '0');
  const [mathScore, setMathScore] = useState(student.mathScore?.toString() || '0');
  const [attendance, setAttendance] = useState(student.attendance?.toString() || '1');
  const [homework, setHomework] = useState(student.homework?.toString() || '1');

  // Get initial values from student based on selected subject
  const initialStartingLevel = isMath 
    ? (student.mathStartingLevel || 'Level 1') 
    : (student.englishStartingLevel || student.startingLevel || 'Level 1');

  const initialCurrentLevel = isMath 
    ? (student.mathCurrentLevel || 'Level 1') 
    : (student.englishCurrentLevel || student.currentLevel || 'Level 1');

  const initialTests = isMath 
    ? (student.mathGrandTests || []) 
    : (student.englishGrandTests || student.grandTests || []);

  const [startingLevel, setStartingLevel] = useState(initialStartingLevel);
  const [currentLevel, setCurrentLevel] = useState(initialCurrentLevel);

  // pre-fill four test scores checking both Grant and Chorak naming patterns
  const getScoreForTest = (testNum: number): string => {
    const namesToTry = [`grant ${testNum}`, `${testNum}-chorak`, `${testNum} chorak`].map(n => n.toLowerCase());
    const found = initialTests.find(t => namesToTry.includes(t.name.toLowerCase()));
    return found ? (found.score === null || found.score === undefined || found.score.toString().trim() === '-' ? '-' : found.score.toString()) : '-';
  };

  const [grant1, setGrant1] = useState(getScoreForTest(1));
  const [grant2, setGrant2] = useState(getScoreForTest(2));
  const [grant3, setGrant3] = useState(getScoreForTest(3));
  const [grant4, setGrant4] = useState(getScoreForTest(4));

  const handleScoreChange = (val: string, setter: (v: string) => void) => {
    const trimmed = val.trim();
    if (trimmed === '-') {
      setter('-');
      return;
    }
    if (trimmed === '') {
      setter('');
      return;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits === '') {
      setter('');
      return;
    }
    const parsed = parseInt(digits, 10);
    if (parsed >= 0 && parsed <= 100) {
      setter(parsed.toString());
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedEngScore = isNaN(parseInt(engScore)) ? 0 : Math.min(15, Math.max(0, parseInt(engScore)));
    const parsedMathScore = isNaN(parseInt(mathScore)) ? 0 : Math.min(15, Math.max(0, parseInt(mathScore)));
    const parsedAttendance = isNaN(parseInt(attendance)) ? 1 : parseInt(attendance);
    const parsedHomework = isNaN(parseInt(homework)) ? 1 : parseInt(homework);

    const finalParentPhone = parentPhone.trim() === '+998' ? '' : parentPhone.trim();

    if (isAll) {
      onSave(
        '',
        '',
        [],
        name.trim(),
        surname.trim(),
        className.trim(),
        parsedEngScore,
        parsedMathScore,
        parsedAttendance,
        parsedHomework,
        finalParentPhone
      );
    } else {
      const parseScore = (val: string): number | null => {
        if (!val || val.trim() === '' || val.trim() === '-') return null;
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
      };

      const grandTestsArray = [
        { name: 'Grant 1', score: parseScore(grant1) },
        { name: 'Grant 2', score: parseScore(grant2) },
        { name: 'Grant 3', score: parseScore(grant3) },
        { name: 'Grant 4', score: parseScore(grant4) },
      ];

      onSave(
        startingLevel,
        currentLevel,
        grandTestsArray,
        name.trim(),
        surname.trim(),
        className.trim(),
        activeSubject === 'ENG' ? parsedEngScore : undefined,
        activeSubject === 'MATH' ? parsedMathScore : undefined,
        parsedAttendance,
        parsedHomework,
        finalParentPhone
      );
    }
  };

  const levelOptions = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(6px)', background: 'rgba(0, 0, 0, 0.45)', zIndex: 1000 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .edit-modal-content {
          max-height: 90vh;
          overflow-y: auto;
        }
        @media (max-width: 600px) {
          .edit-modal-content {
            padding: 1.5rem 1.25rem !important;
            border-radius: 16px !important;
          }
          .edit-modal-content form {
            gap: 0.85rem !important;
          }
          .edit-modal-content label {
            margin-bottom: 0.25rem !important;
            font-size: 0.7rem !important;
          }
          .edit-modal-content input, .edit-modal-content select {
            padding: 0.6rem 0.85rem !important;
            font-size: 0.85rem !important;
            border-radius: 10px !important;
          }
        }
      `}} />
      <div 
        className="modal-content edit-modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '500px', 
          width: '90%',
          background: '#fcfcf9', 
          borderRadius: '24px',
          padding: '2rem 2.5rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <button 
            onClick={onClose}
            style={{ 
              position: 'absolute', right: '-15px', top: '-15px', 
              background: 'transparent', border: `2px solid ${activeThemeColor}`, 
              borderRadius: '50%', padding: '4px', cursor: 'pointer',
              color: activeThemeColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.background = `${activeThemeColor}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>
          
          <h2 style={{ fontSize: '1.3rem', fontWeight: 850, color: '#1e293b', margin: 0 }}>
            O'quvchini tahrirlash
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: activeThemeColor, fontWeight: 700, letterSpacing: '0.05em' }}>
            {subjectName.toUpperCase()} MA'LUMOTLARI
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                ISM *
              </label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                  borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                  color: '#1e293b', background: '#ffffff', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                FAMILIYA *
              </label>
              <input 
                type="text" 
                value={surname}
                onChange={e => setSurname(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                  borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                  color: '#1e293b', background: '#ffffff', outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              SINF / GURUH *
            </label>
            <input 
              type="text" 
              value={className}
              onChange={e => setClassName(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                color: '#1e293b', background: '#ffffff', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              OTA-ONA TELEFON RAQAMI
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
                width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                border: '1.5px solid #e2e8f0', fontSize: '0.95rem',
                outline: 'none', transition: 'all 0.2s ease',
                backgroundColor: '#ffffff'
              }}
              onFocus={e => e.currentTarget.style.borderColor = activeThemeColor}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Kirish ma'lumotlari (ota-onalar uchun) */}
          <div style={{ 
            background: '#f8fafc', 
            borderRadius: '12px', 
            padding: '1rem', 
            marginBottom: '1rem',
            border: '1.5px dashed #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Kirish Ma'lumotlari (Ota-onalar uchun)
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  STUDENT ID: <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.95rem' }}>{student.id}</strong>
                </span>
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(student.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  style={{
                    fontSize: '0.75rem', 
                    color: copiedId ? '#16a34a' : activeThemeColor, 
                    background: 'transparent', 
                    border: 'none', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {copiedId ? "Nusxalandi!" : "Nusxalash"}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  PAROL (PASSCODE): <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.95rem' }}>{student.passcode || '—'}</strong>
                </span>
                <button 
                  type="button"
                  onClick={() => {
                    if (student.passcode) {
                      navigator.clipboard.writeText(student.passcode);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    }
                  }}
                  disabled={!student.passcode}
                  style={{
                    fontSize: '0.75rem', 
                    color: !student.passcode ? '#94a3b8' : copiedPass ? '#16a34a' : activeThemeColor, 
                    background: 'transparent', 
                    border: 'none', 
                    fontWeight: 700, 
                    cursor: student.passcode ? 'pointer' : 'not-allowed',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {copiedPass ? "Nusxalandi!" : "Nusxalash"}
                </button>
              </div>
            </div>
          </div>

          {isAll ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    ENG SCORE (0-15) *
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="15"
                    value={engScore}
                    onChange={e => setEngScore(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                      color: '#1e293b', background: '#ffffff', outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    MATH SCORE (0-15) *
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="15"
                    value={mathScore}
                    onChange={e => setMathScore(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                      color: '#1e293b', background: '#ffffff', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    ATTENDANCE (1, -1, -2...) *
                  </label>
                  <input 
                    type="number" 
                    max="1"
                    value={attendance}
                    onChange={e => setAttendance(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                      color: '#1e293b', background: '#ffffff', outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.3 }}>
                    1 = 100% · -1 = 83.3% · -2 = 66.7%
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    HOMEWORK (1, -1, -2...) *
                  </label>
                  <input 
                    type="number" 
                    max="1"
                    value={homework}
                    onChange={e => setHomework(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                      color: '#1e293b', background: '#ffffff', outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.3 }}>
                    1 = 100% · -1 = 80.0% · -2 = 60.0%
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Starting Level selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  BOSHLANG'ICH DARAJA
                </label>
                <select 
                  value={startingLevel}
                  onChange={(e) => setStartingLevel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {levelOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Current Level selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  HOZIRGI DARAJA
                </label>
                <select 
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {levelOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Test Scores */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  CHORAK NATIJALARI (%)
                </label>
                
                {(() => {
                  const inputStyle = {
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#1e293b',
                    background: '#ffffff'
                  };

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>1-Chorak</label>
                        <input 
                          type="text"
                          value={grant1}
                          onChange={(e) => handleScoreChange(e.target.value, setGrant1)}
                          placeholder="-"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>2-Chorak</label>
                        <input 
                          type="text"
                          value={grant2}
                          onChange={(e) => handleScoreChange(e.target.value, setGrant2)}
                          placeholder="-"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>3-Chorak</label>
                        <input 
                          type="text"
                          value={grant3}
                          onChange={(e) => handleScoreChange(e.target.value, setGrant3)}
                          placeholder="-"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>4-Chorak</label>
                        <input 
                          type="text"
                          value={grant4}
                          onChange={(e) => handleScoreChange(e.target.value, setGrant4)}
                          placeholder="-"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Weekly Subject Score, Attendance, and Homework */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    {activeSubject === 'ENG' ? 'ENG SCORE (0-15) *' : 'MATH SCORE (0-15) *'}
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="15"
                    value={activeSubject === 'ENG' ? engScore : mathScore}
                    onChange={e => activeSubject === 'ENG' ? setEngScore(e.target.value) : setMathScore(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                      color: '#1e293b', background: '#ffffff', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    ATTENDANCE (1, -1, -2...) *
                  </label>
                  <input 
                    type="number" 
                    max="1"
                    value={attendance}
                    onChange={e => setAttendance(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                      color: '#1e293b', background: '#ffffff', outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.3 }}>
                    1 = 100% · -1 = 83.3% · -2 = 66.7%
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    HOMEWORK (1, -1, -2...) *
                  </label>
                  <input 
                    type="number" 
                    max="1"
                    value={homework}
                    onChange={e => setHomework(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0',
                      borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                      color: '#1e293b', background: '#ffffff', outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.3 }}>
                    1 = 100% · -1 = 80.0% · -2 = 60.0%
                  </div>
                </div>
              </div>
            </>
          )}

          <button 
            type="submit"
            style={{
              width: '100%',
              background: activeThemeColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '0.85rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              marginTop: '0.5rem',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
            }}
          >
            <Save size={16} />
            NATIJALARNI SAQLASH
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProgressModal;
