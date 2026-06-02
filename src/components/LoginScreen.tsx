import React, { useState, useRef } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, Phone, X } from 'lucide-react';
import { supabase } from '../supabase';
import iconLight from '../assets/icon-light.png';
import iconDark from '../assets/icon-dark.png';

interface LoginScreenProps {
  onLoginSuccess: (role: 'admin' | 'admin123' | 'publish' | 'parent' | 'testor', studentData?: any) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginSuccess, 
  isDarkMode = false,
  onToggleDarkMode 
}) => {
  const [studentId, setStudentId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  
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

  const handleSupportClick = () => {
    setShowSupport(true);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      fontFamily: "'Inter', sans-serif",
      background: 'var(--bg-main)',
      color: 'var(--text-primary)',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .login-split-container {
          display: flex;
          width: 100%;
          min-height: 100vh;
        }
        .login-left-panel {
          width: 50%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3.5rem;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          border-right: 1px solid var(--border-color);
        }
        .login-right-panel {
          width: 50%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2rem;
          box-sizing: border-box;
          position: relative;
        }
        @media (max-width: 900px) {
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            width: 100% !important;
            padding: 1.5rem !important;
          }
        }
        .login-input-field:focus {
          border-color: var(--accent-primary) !important;
          box-shadow: 0 0 0 3px var(--accent-border-focus) !important;
        }
        .theme-indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }
      `}} />

      <div className="login-split-container">
        {/* LEFT SIDE PANEL (Desktop Only) */}
        <div 
          className="login-left-panel"
          style={{
            background: isDarkMode ? '#09090b' : '#f8fafc',
            backgroundImage: isDarkMode 
              ? 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.18) 0%, transparent 70%)' 
              : 'radial-gradient(circle at 50% 30%, rgba(13, 148, 136, 0.18) 0%, transparent 70%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'center',
            padding: '4rem 2rem'
          }}
        >
          {/* Top Spacer to push content to center */}
          <div style={{ flex: 1 }} />

          {/* Center Content Group */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', maxWidth: '440px' }}>
            {/* Logo Container */}
            <div style={{
              background: 'var(--bg-card)',
              width: '90px',
              height: '90px',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--glass-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img 
                src={isDarkMode ? iconDark : iconLight} 
                alt="Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} 
              />
            </div>

            {/* Slogan Text Area */}
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 900, 
                lineHeight: 1.15,
                margin: 0,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-primary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Al-Xorazmiy School
              </h1>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 900, 
                lineHeight: 1.15,
                margin: '0 0 1.25rem 0',
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)'
              }}>
                Ta'limda Innovatsiya
              </h1>
              <h2 style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--accent-primary)', margin: '0 0 0.75rem 0', letterSpacing: '-0.01em' }}>
                O'quvchilar o'zlashtirishi va davomati monitoringi platformasi
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
                Tizim orqali haftalik test natijalari, choraklik natijalar hamda darslardagi davomatni real vaqt rejimida kuzatib boring.
              </p>
            </div>
          </div>

          {/* Bottom Spacer */}
          <div style={{ flex: 1 }} />

          {/* Pagination/Theme Indicator Dots */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div 
              onClick={onToggleDarkMode}
              className="theme-indicator-dot"
              style={{
                background: isDarkMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                opacity: isDarkMode ? 1 : 0.35,
                transform: isDarkMode ? 'scale(1.2)' : 'scale(1)',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Qorong'u mavzu"
            />
            <div 
              onClick={onToggleDarkMode}
              className="theme-indicator-dot"
              style={{
                background: !isDarkMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                opacity: !isDarkMode ? 1 : 0.35,
                transform: !isDarkMode ? 'scale(1.2)' : 'scale(1)',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Yorug' mavzu"
            />
          </div>
        </div>

        {/* RIGHT SIDE FORM SCREEN */}
        <div className="login-right-panel" style={{ background: 'var(--bg-main)' }}>
          {/* Top Row: Logo & Bog'lanish */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={isDarkMode ? iconDark : iconLight} 
                alt="Logo Small" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} 
              />
            </div>
            
            <div style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-secondary)' }}>
              Kabinetga kirishda muammo?{' '}
              <button 
                onClick={handleSupportClick}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-primary)', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Bog'lanish
              </button>
            </div>
          </div>

          {/* Center Form Container */}
          <div style={{ width: '100%', maxWidth: '380px', margin: 'auto', padding: '1rem 0' }}>
            <div style={{ marginBottom: '2.2rem' }}>
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.035em' }}>
                Xush Kelibsiz!
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
                Iltimos kabinetga kirish uchun ID raqami va Parolni kiriting
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                color: '#ef4444',
                fontSize: '0.78rem',
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
                <label 
                  htmlFor="student-id" 
                  style={{ 
                    display: 'block', 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    color: 'var(--text-secondary)', 
                    letterSpacing: '0.04em', 
                    marginBottom: '0.45rem', 
                    textTransform: 'uppercase' 
                  }}
                >
                  Student/Admin ID
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: 0.75 }}>
                    <User size={18} />
                  </span>
                  <input
                    id="student-id"
                    type="text"
                    name="username"
                    autoComplete="username"
                    required
                    enterKeyHint="next"
                    placeholder="ID kiriting..."
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={isLoading}
                    className="login-input-field"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2.75rem',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-card)',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                      '--accent-border-focus': isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(13, 148, 136, 0.15)'
                    } as any}
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="current-password" 
                  style={{ 
                    display: 'block', 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    color: 'var(--text-secondary)', 
                    letterSpacing: '0.04em', 
                    marginBottom: '0.45rem', 
                    textTransform: 'uppercase' 
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: 0.75 }}>
                    <Lock size={18} />
                  </span>
                  <input
                    id="current-password"
                    type={showPasscode ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    enterKeyHint="done"
                    placeholder="Parol kiriting..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={isLoading}
                    className="login-input-field"
                    style={{
                      width: '100%',
                      padding: '0.85rem 3rem 0.85rem 2.75rem',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-card)',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                      '--accent-border-focus': isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(13, 148, 136, 0.15)'
                    } as any}
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
                      color: 'var(--text-secondary)',
                      opacity: 0.7,
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
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.9rem',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: isDarkMode ? '0 4px 12px rgba(139, 92, 246, 0.2)' : '0 4px 12px rgba(13, 148, 136, 0.2)',
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
                    e.currentTarget.style.boxShadow = isDarkMode ? '0 6px 16px rgba(139, 92, 246, 0.3)' : '0 6px 16px rgba(13, 148, 136, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDarkMode ? '0 4px 12px rgba(139, 92, 246, 0.2)' : '0 4px 12px rgba(13, 148, 136, 0.2)';
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    KIRILMOQDA...
                  </>
                ) : (
                  'TIZIMGA KIRISH'
                )}
              </button>
            </form>
          </div>

          {/* Footer links */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <div>
              © Al-Xorazmiy School 2026
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
              <span>|</span>
              <span onClick={handleSupportClick} style={{ cursor: 'pointer', color: 'var(--accent-primary)' }}>Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Support Details Dialog */}
      {showSupport && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--glass-shadow)',
            borderRadius: '24px',
            padding: '2rem',
            width: '90%',
            maxWidth: '360px',
            textAlign: 'center',
            position: 'relative',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            <button 
              onClick={() => setShowSupport(false)}
              style={{
                position: 'absolute', right: '15px', top: '15px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={18} />
            </button>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <Phone size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Texnik Yordam
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Tizimga kirishda muammolar yuzaga kelsa, quyidagi aloqa kanallari orqali administrator bilan bog'laning:
            </p>
            <div style={{ 
              background: 'var(--bg-card-hover)', 
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                TELEGRAM: <strong style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontFamily: 'monospace' }}>@alxorazmiysupport</strong>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                TELEFON: <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'monospace' }}>+998 90 123 45 67</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
