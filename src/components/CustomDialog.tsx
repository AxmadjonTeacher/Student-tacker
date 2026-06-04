import React, { useState, useEffect } from 'react';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'confirm' | 'prompt' | 'date-prompt' | 'alert';
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: (value?: string) => void;
  onClose: () => void;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  type,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  confirmText,
  cancelText = 'Bekor qilish',
  danger = false,
  onConfirm,
  onClose
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const finalConfirmText = confirmText || (type === 'alert' ? 'OK' : 'Tasdiqlash');

  // Sync state if default value changes
  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(inputValue);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'var(--backdrop-color)',
      backdropFilter: 'var(--backdrop-blur-md)',
      WebkitBackdropFilter: 'var(--backdrop-blur-md)',
      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      <form 
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'var(--backdrop-blur-md)',
          WebkitBackdropFilter: 'var(--backdrop-blur-md)',
          width: '100%',
          maxWidth: '460px',
          borderRadius: '32px',
          padding: '2.25rem 2.5rem',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
          animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        {/* Header Block */}
        <div>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em'
          }}>
            {title}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            lineHeight: '1.5',
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            {message}
          </p>
        </div>

        {/* Conditional Input Field for Prompt */}
        {type === 'prompt' && (
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            style={{
              width: '100%',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '0.85rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid var(--accent-hero)';
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid var(--border-subtle)';
              e.currentTarget.style.background = 'var(--bg-card-hover)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        )}

        {/* Conditional Input Field for Date Prompt */}
        {type === 'date-prompt' && (
          <input 
            type="date"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '0.85rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid var(--accent-hero)';
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid var(--border-subtle)';
              e.currentTarget.style.background = 'var(--bg-card-hover)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        )}

        {/* Actions Button Panel */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginTop: '0.5rem',
          justifyContent: 'flex-end'
        }}>
          {/* Cancel button */}
          {type !== 'alert' && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '9999px',
                padding: '0.65rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {cancelText}
            </button>
          )}

          {/* Confirm/Submit button */}
          <button
            type="submit"
            style={{
              background: danger ? '#dc2626' : 'var(--accent-hero)',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.65rem 1.75rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: danger 
                ? '0 8px 16px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' 
                : '0 8px 16px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = danger ? '#b91c1c' : 'var(--accent-hero)';
              e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = danger ? '#dc2626' : 'var(--accent-hero)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {finalConfirmText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomDialog;
