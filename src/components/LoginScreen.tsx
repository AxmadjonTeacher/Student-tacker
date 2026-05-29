import React, { useState, useRef } from 'react';
import { Lock, User, Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

interface LoginScreenProps {
  onLoginSuccess: (role: 'admin' | 'admin123' | 'publish' | 'parent' | 'testor', studentData?: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [studentId, setStudentId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const trimmedId = studentId.trim();
    const trimmedPasscode = passcode.trim();

    if (!trimmedId || !trimmedPasscode) {
      setError("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check Admin Credentials
      if (trimmedId.toLowerCase() === 'adminall') {
        if (trimmedPasscode === 'Azz21adminall') {
          // Store in LocalStorage
          localStorage.setItem('auth_role', 'admin');
          localStorage.setItem('admin_passcode', trimmedPasscode);
          onLoginSuccess('admin');
        } else {
          setError("Noto'g'ri admin paroli.");
        }
        setIsLoading(false);
        return;
      }

      // Check Limited Admin Credentials (admin123)
      if (trimmedId.toLowerCase() === 'admin123') {
        if (trimmedPasscode === 'Azz21admin') {
          localStorage.setItem('auth_role', 'admin123');
          localStorage.setItem('admin_passcode', trimmedPasscode);
          onLoginSuccess('admin123');
        } else {
          setError("Noto'g'ri admin paroli.");
        }
        setIsLoading(false);
        return;
      }

      // Check Publish Admin Credentials (publish)
      if (trimmedId.toLowerCase() === 'publish') {
        if (trimmedPasscode === 'Azz21publish') {
          localStorage.setItem('auth_role', 'publish');
          localStorage.setItem('admin_passcode', trimmedPasscode);
          onLoginSuccess('publish');
        } else {
          setError("Noto'g'ri admin paroli.");
        }
        setIsLoading(false);
        return;
      }

      // Check Testor Admin Credentials (testor)
      if (trimmedId.toLowerCase() === 'testor') {
        if (trimmedPasscode === 'Azz21testor') {
          localStorage.setItem('auth_role', 'testor');
          localStorage.setItem('admin_passcode', trimmedPasscode);
          onLoginSuccess('testor');
        } else {
          setError("Noto'g'ri admin paroli.");
        }
        setIsLoading(false);
        return;
      }

      // 2. Check Student/Parent Credentials in Supabase
      const { data, error: dbError } = await supabase
        .from('Students')
        .select('*')
        .eq('id', trimmedId)
        .eq('passcode', trimmedPasscode)
        .eq('is_deleted', false)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        // Store in LocalStorage
        localStorage.setItem('auth_role', 'parent');
        localStorage.setItem('parent_student_id', data.id);
        localStorage.setItem('parent_student_passcode', data.passcode);
        onLoginSuccess('parent', data);
      } else {
        setError("O'quvchi ID yoki paroli noto'g'ri. Qayta tekshirib ko'ring.");
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError("Tizimga ulanishda xatolik yuz berdi. Internet aloqasini tekshiring.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0d9488 100%)',
      padding: '1rem',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background shapes for aesthetic appeal */}
      <div style={{
        position: 'absolute', width: '300px', height: '300px',
        background: 'rgba(13, 148, 136, 0.15)', borderRadius: '50%',
        top: '-50px', left: '-50px', filter: 'blur(80px)'
      }} />
      <div style={{
        position: 'absolute', width: '350px', height: '350px',
        background: 'rgba(79, 70, 229, 0.15)', borderRadius: '50%',
        bottom: '-50px', right: '-50px', filter: 'blur(90px)'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '2.5rem 2rem',
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        {/* Responsive style adjustment for smaller phones */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 480px) {
            div[class*="login-container"] {
              padding: 1.75rem 1.25rem !important;
            }
          }
        `}} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 8px 16px rgba(13, 148, 136, 0.25)'
          }}>
            <GraduationCap size={32} />
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>
            AL-XORAZMIY SCHOOL
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
            Ota-onalar va o'quvchilar kabinetiga kirish
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            color: '#b91c1c',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '1.25rem',
            textAlign: 'center',
            lineHeight: 1.4
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="student-id" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              STUDENT ID
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <User size={18} />
              </span>
              <input
                id="student-id"
                type="text"
                name="username"
                autoComplete="username"
                required
                enterKeyHint="next"
                placeholder="Student ID..."
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  color: '#0f172a',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0d9488';
                  e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="current-password" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Parol (Passcode)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} />
              </span>
              <input
                id="current-password"
                type={showPasscode ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                enterKeyHint="done"
                placeholder="Parolni kiriting..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.85rem 3rem 0.85rem 2.75rem',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  color: '#0f172a',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0d9488';
                  e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            ref={submitButtonRef}
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '0.9rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(13, 148, 136, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.2)';
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-loader" style={{ animation: 'spin 1s linear infinite' }} />
                KIRILMOQDA...
              </>
            ) : (
              'TIZIMGA KIRISH'
            )}
          </button>
        </form>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoginScreen;
