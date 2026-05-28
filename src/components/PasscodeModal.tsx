import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';

import type { ActiveSubject } from '../types';

interface PasscodeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  activeSubject: ActiveSubject;
}

const PasscodeModal: React.FC<PasscodeModalProps> = ({ onClose, onSuccess, activeSubject }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMath = activeSubject === 'MATH';
  const isAll = activeSubject === 'ALL';
  const activeThemeColor = isMath ? '#0d9488' : isAll ? '#4f46e5' : '#166534';

  useEffect(() => {
    // Autofocus input on open
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let isCorrect = false;
    if (activeSubject === 'ENG' && passcode === 'Azz21eng') {
      isCorrect = true;
    } else if (activeSubject === 'MATH' && passcode === 'Azz21math') {
      isCorrect = true;
    } else if (activeSubject === 'ALL' && passcode === 'Azz21all') {
      isCorrect = true;
    }

    if (isCorrect) {
      onSuccess();
    } else {
      setError(true);
      setIsShaking(true);
      setPasscode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backdropFilter: 'blur(8px)', 
        background: 'rgba(0, 0, 0, 0.45)', 
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className={`modal-content ${isShaking ? 'shake-animation' : ''}`}
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '400px', 
          width: '90%',
          background: '#fcfcf9', 
          borderRadius: '24px',
          padding: '2.2rem 2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          position: 'relative',
          transition: 'transform 0.3s ease'
        }}
      >
        {/* Style injection for shaking effect */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          .shake-animation {
            animation: shake 0.4s ease-in-out;
          }
        `}} />

        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', right: '15px', top: '15px', 
            background: 'transparent', border: 'none', 
            cursor: 'pointer', color: '#64748b', display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            padding: '6px', borderRadius: '50%',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '16px', 
            backgroundColor: `${activeThemeColor}12`, 
            color: activeThemeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Lock size={26} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Admin Tizimiga Kirish
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500, lineHeight: 1.4 }}>
            Ushbu bo'lim faqat administratorlar uchun mo'ljallangan. Iltimos, kirish parolini kiriting.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <KeyRound size={18} />
            </span>
            <input 
              ref={inputRef}
              type="password" 
              placeholder="Parolni kiriting..."
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) setError(false);
              }}
              style={{
                width: '100%',
                padding: '0.8rem 1rem 0.8rem 2.75rem',
                border: error ? '2px solid #ef4444' : `1.5px solid #e2e8f0`,
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 600,
                outline: 'none',
                color: '#0f172a',
                background: '#ffffff',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {error && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#ef4444', 
              fontWeight: 700, 
              textAlign: 'center',
              margin: '-0.25rem 0 0.25rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}>
              ⚠️ Noto'g'ri parol! Qayta urinib ko'ring.
            </div>
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
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
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
            TASDIQLASH
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasscodeModal;
