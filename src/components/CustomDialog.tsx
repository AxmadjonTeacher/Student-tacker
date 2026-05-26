import React, { useState, useEffect } from 'react';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'confirm' | 'prompt' | 'date-prompt';
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
  confirmText = 'Tasdiqlash',
  cancelText = 'Bekor qilish',
  danger = false,
  onConfirm,
  onClose
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

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
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(8px)',
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
          background: '#ffffff',
          width: '100%',
          maxWidth: '460px',
          borderRadius: '24px',
          padding: '2rem',
          border: '1.5px solid #f1f5f9',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.02)',
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        {/* Header Block */}
        <div>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.25rem',
            fontWeight: 750,
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}>
            {title}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            lineHeight: '1.5',
            color: '#64748b',
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
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#0f172a',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1.5px solid #0d9488';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1.5px solid #e2e8f0';
              e.currentTarget.style.background = '#f8fafc';
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
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#0f172a',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1.5px solid #0d9488';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1.5px solid #e2e8f0';
              e.currentTarget.style.background = '#f8fafc';
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
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1.5px solid #e2e8f0',
              borderRadius: '9999px',
              padding: '0.65rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            {cancelText}
          </button>

          {/* Confirm/Submit button */}
          <button
            type="submit"
            style={{
              background: danger ? '#ef4444' : '#0d9488',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.65rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: danger 
                ? '0 4px 6px -1px rgba(239,68,68,0.2)' 
                : '0 4px 6px -1px rgba(13,148,136,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = danger ? '#dc2626' : '#0f766e';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = danger ? '#ef4444' : '#0d9488';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomDialog;
