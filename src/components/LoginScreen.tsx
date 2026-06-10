import React, { useState, useRef, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, Phone, X, Moon, Sun } from 'lucide-react';
import { supabase } from '../supabase';
import iconLight from '../assets/icon-light.png';
import iconDark from '../assets/icon-dark.png';
import {
  isBiometricAvailable,
  isBiometricEnrolled,
  authenticateWithBiometric,
  saveBiometricCredentials,
  clearBiometricCredentials,
} from '../utils/biometric';
import { haptics } from '../utils/haptics';

interface LoginScreenProps {
  onLoginSuccess: (role: 'admin' | 'admin123' | 'publish' | 'parent' | 'testor' | 'teacher', studentData?: any) => void;
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
  const [showBiometricBtn, setShowBiometricBtn] = useState(false);
  const [biometricOffer, setBiometricOffer] = useState(false);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    isBiometricAvailable().then((available) => {
      setShowBiometricBtn(available && isBiometricEnrolled());
    });
  }, []);

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
          offerBiometricEnrollment(trimmedId, trimmedPasscode);
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
          offerBiometricEnrollment(trimmedId, trimmedPasscode);
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

      // 1.5. Check Teacher Credentials in Supabase
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('login_id', trimmedId.toLowerCase())
        .eq('passcode', trimmedPasscode)
        .maybeSingle();

      if (teacherError) throw teacherError;

      if (teacherData) {
        localStorage.setItem('auth_role', 'teacher');
        localStorage.setItem('teacher_id', teacherData.id.toString());
        localStorage.setItem('teacher_name', teacherData.name);
        localStorage.setItem('teacher_subject', teacherData.subject);
        offerBiometricEnrollment(trimmedId, trimmedPasscode);
        onLoginSuccess('teacher');
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
        setError("ID yoki parol noto'g'ri. Qayta tekshirib ko'ring.");
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

  const offerBiometricEnrollment = async (id: string, pc: string) => {
    const available = await isBiometricAvailable();
    if (!available || isBiometricEnrolled()) return;
    setBiometricOffer(true);
    // Store temporarily so the confirm handler can save
    (window as any).__pendingBioId = id;
    (window as any).__pendingBioPc = pc;
  };

  const handleBiometricConfirm = async () => {
    const id = (window as any).__pendingBioId as string | undefined;
    const pc = (window as any).__pendingBioPc as string | undefined;
    if (id && pc) {
      await saveBiometricCredentials(id, pc);
      setShowBiometricBtn(true);
    }
    setBiometricOffer(false);
  };

  const handleBiometricLogin = async () => {
    haptics.medium();
    const result = await authenticateWithBiometric();
    if (result.success && result.username && result.password) {
      setStudentId(result.username);
      setPasscode(result.password);
      // Re-use the form submit path by triggering submit manually
      setIsLoading(true);
      setStudentId(result.username);
      setPasscode(result.password);
      // Allow state to settle, then submit
      setTimeout(() => submitButtonRef.current?.click(), 80);
    } else if (result.error === 'not_enrolled') {
      clearBiometricCredentials();
      setShowBiometricBtn(false);
    } else if (result.error !== 'cancelled') {
      haptics.error();
      setError('Biometrik tekshirish muvaffaqiyatsiz tugadi. Parol bilan kiring.');
    }
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

          {/* Theme Toggle */}
          <div 
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Yorug' mavzuga o'tish" : "Qorong'u mavzuga o'tish"}
            style={{
              width: '120px',
              height: '42px',
              borderRadius: '42px',
              background: isDarkMode 
                ? '#1e2024' 
                : '#e6e9ef',
              boxShadow: isDarkMode 
                ? 'inset 4px 4px 8px rgba(0,0,0,0.6), inset -4px -4px 8px rgba(255,255,255,0.03)'
                : 'inset 4px 4px 8px rgba(180,190,205,0.6), inset -4px -4px 8px rgba(255,255,255,0.9)',
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease',
              margin: '10px 0'
            }}
          >
            {/* Dark Text */}
            <div style={{
              position: 'absolute',
              left: '20px',
              fontSize: '1rem',
              fontWeight: 600,
              color: isDarkMode ? '#8a8d93' : 'transparent',
              transition: 'color 0.3s ease',
              pointerEvents: 'none',
              fontFamily: "'Inter', sans-serif"
            }}>
              Dark
            </div>

            {/* Light Text */}
            <div style={{
              position: 'absolute',
              right: '20px',
              fontSize: '1rem',
              fontWeight: 600,
              color: isDarkMode ? 'transparent' : '#8892b0',
              transition: 'color 0.3s ease',
              pointerEvents: 'none',
              fontFamily: "'Inter', sans-serif"
            }}>
              Light
            </div>

            {/* Oversized Glass Knob */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(40,42,48,0.9) 0%, rgba(20,21,24,0.9) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,242,245,0.9) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: isDarkMode 
                ? '0 10px 20px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1), inset -1px -1px 2px rgba(0,0,0,0.5)'
                : '0 10px 20px rgba(180,190,205,0.4), inset 0 1px 1px rgba(255,255,255,1), inset -1px -1px 2px rgba(0,0,0,0.05)',
              position: 'absolute',
              top: '50%',
              left: '-2px',
              transform: isDarkMode 
                ? 'translate(68px, -50%)' 
                : 'translate(0px, -50%)',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2
            }}>
              {isDarkMode ? (
                <Moon size={22} color="#ffffff" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }} />
              ) : (
                <Sun size={22} color="#fbbf24" strokeWidth={2.5} />
              )}
            </div>
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

            {/* Face ID / Touch ID button — shown only if enrolled */}
            {showBiometricBtn && (
              <button
                onClick={handleBiometricLogin}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <span style={{ fontSize: '1.2rem' }}>󠁧</span>
                Face ID bilan kirish
              </button>
            )}
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

      {/* Face ID enrollment offer */}
      {biometricOffer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--glass-thick-bg, rgba(255,255,255,0.88))',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: 28,
            padding: '2rem',
            width: '88%',
            maxWidth: 360,
            boxShadow: '0 32px 64px rgba(0,0,0,0.20)',
            textAlign: 'center',
            color: 'var(--text-primary)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Face ID yoqilsinmi?
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Keyingi safar Face ID bilan bir zumda kirishingiz mumkin.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setBiometricOffer(false)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                Yo'q
              </button>
              <button
                onClick={handleBiometricConfirm}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none', background: 'var(--accent-gradient, #000)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                Yoqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
