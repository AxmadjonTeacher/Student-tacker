import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';


interface PasscodeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PasscodeModal: React.FC<PasscodeModalProps> = ({ onClose, onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeThemeColor = 'var(--accent-primary)';

  useEffect(() => {
    // Autofocus input on open
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCorrect = passcode === 'Azz21admin';

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
        backdropFilter: 'var(--backdrop-blur-md)', 
        WebkitBackdropFilter: 'var(--backdrop-blur-md)', 
        background: 'var(--backdrop-color)', 
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
          background: 'var(--bg-card)', 
          backdropFilter: 'var(--backdrop-blur-md)',
          WebkitBackdropFilter: 'var(--backdrop-blur-md)',
          borderRadius: '32px',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
          border: '1px solid var(--border-subtle)',
          position: 'relative',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
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
            cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            padding: '6px', borderRadius: '50%',
            transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '20px', 
            backgroundColor: 'rgba(139, 92, 246, 0.12)', 
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: activeThemeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Lock size={26} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            Admin Tizimiga Kirish
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>
            Ushbu bo'lim faqat administratorlar uchun mo'ljallangan. Iltimos, kirish parolini kiriting.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
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
                padding: '0.8rem 1.25rem 0.8rem 2.85rem',
                border: error ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                borderRadius: '9999px',
                fontSize: '0.95rem',
                fontWeight: 600,
                outline: 'none',
                color: 'var(--text-primary)',
                background: 'var(--bg-card-hover)',
                boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
              onFocus={e => {
                if (!error) {
                  e.currentTarget.style.borderColor = 'var(--accent-hero)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)';
                }
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = error ? '#ef4444' : 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
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
              background: 'var(--accent-hero)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.85rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 8px 16px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
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
