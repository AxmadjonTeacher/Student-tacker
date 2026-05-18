import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Student } from '../types';

interface EditProgressModalProps {
  student: Student;
  onClose: () => void;
  onSave: (
    startingLevel: string,
    currentLevel: string,
    grandTests: { name: string; score: number }[]
  ) => void;
  activeSubject: 'ENG' | 'MATH';
}

const EditProgressModal: React.FC<EditProgressModalProps> = ({ 
  student, 
  onClose, 
  onSave, 
  activeSubject 
}) => {
  const isMath = activeSubject === 'MATH';
  const subjectName = isMath ? 'Matematika' : 'Ingliz tili';
  const activeThemeColor = isMath ? '#0d9488' : '#166534';

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
    return found ? found.score.toString() : '';
  };

  const [grant1, setGrant1] = useState(getScoreForTest(1));
  const [grant2, setGrant2] = useState(getScoreForTest(2));
  const [grant3, setGrant3] = useState(getScoreForTest(3));
  const [grant4, setGrant4] = useState(getScoreForTest(4));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const grandTestsArray = [
      { name: 'Grant 1', score: Math.min(100, Math.max(0, parseInt(grant1) || 0)) },
      { name: 'Grant 2', score: Math.min(100, Math.max(0, parseInt(grant2) || 0)) },
      { name: 'Grant 3', score: Math.min(100, Math.max(0, parseInt(grant3) || 0)) },
      { name: 'Grant 4', score: Math.min(100, Math.max(0, parseInt(grant4) || 0)) },
    ].filter(t => t.score > 0 || grant1 || grant2 || grant3 || grant4); // keep if entered

    onSave(startingLevel, currentLevel, grandTestsArray);
  };

  const levelOptions = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(6px)', background: 'rgba(0, 0, 0, 0.45)', zIndex: 1000 }}>
      <div 
        className="modal-content" 
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
            {student.name} {student.surname}
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: activeThemeColor, fontWeight: 700, letterSpacing: '0.05em' }}>
            {subjectName.toUpperCase()} MULTIMEDIA TARIXI
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>1-Chorak</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  placeholder="Foiz (masalan: 75)"
                  value={grant1}
                  onChange={(e) => setGrant1(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#1e293b'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>2-Chorak</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  placeholder="Foiz (masalan: 80)"
                  value={grant2}
                  onChange={(e) => setGrant2(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#1e293b'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>3-Chorak</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  placeholder="Foiz (masalan: 85)"
                  value={grant3}
                  onChange={(e) => setGrant3(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#1e293b'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>4-Chorak</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  placeholder="Foiz (masalan: 90)"
                  value={grant4}
                  onChange={(e) => setGrant4(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>
          </div>

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
