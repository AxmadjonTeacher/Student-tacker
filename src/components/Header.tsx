import React from 'react';
import { Search, Settings, Plus, Trash2, LogOut } from 'lucide-react';

interface HeaderProps {
  classes: string[];
  activeClass: string;
  onClassSelect: (cls: string) => void;
  classCounts: Record<string, number>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenDrawer: () => void;
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  activeSubject: 'ENG' | 'MATH' | 'ALL';
  isAdminMode: boolean;
  weeksList: string[];
  onStartNewWeekClick?: () => void;
  onDeleteWeekClick?: (weekName: string) => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  classes, activeClass, onClassSelect, classCounts, searchTerm, onSearchChange, onOpenDrawer,
  selectedWeek, onWeekChange, activeSubject, isAdminMode, weeksList, onStartNewWeekClick, onDeleteWeekClick,
  onLogout
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .mobile-header-menu-container {
          display: none;
        }
        @media (max-width: 768px) {
          .desktop-header-actions {
            display: none !important;
          }
          .mobile-header-menu-container {
            display: block !important;
          }
          .admin-header-top-row {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
            gap: 0.5rem !important;
          }
          .admin-header-title {
            font-size: 1rem !important;
            text-align: left;
            max-width: 50% !important;
            line-height: 1.2 !important;
          }
          .school-logo {
            display: none !important; /* Hide full logo on mobile top row to make room for menu */
          }
          .class-selector {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            scrollbar-width: none !important; /* Firefox */
          }
          .class-selector::-webkit-scrollbar {
            display: none !important; /* Safari and Chrome */
          }
          /* Sticky Search Bar on Mobile */
          .mobile-sticky-search {
            position: sticky !important;
            top: 55px !important; /* height of sticky header top row */
            z-index: 99 !important;
            width: 100% !important;
            background: rgba(249, 248, 243, 0.96) !important;
            padding: 0.5rem 0.25rem 0.75rem !important;
            margin: 0 !important;
            border-bottom: 1px solid rgba(229, 231, 235, 0.4) !important;
            backdrop-filter: blur(16px) !important;
            WebkitBackdropFilter: blur(16px) !important;
          }
          .mobile-sticky-search > div {
            width: 100% !important;
          }
          .mobile-sticky-search input {
            font-size: 0.85rem !important;
            padding: 0.6rem 1rem 0.6rem 2.25rem !important;
          }
          .mobile-sticky-search svg {
            width: 14px !important;
            height: 14px !important;
            left: 0.75rem !important;
          }
          .admin-header-bottom-row {
            margin-top: 1rem !important;
            margin-bottom: 1.25rem !important;
            gap: 1rem !important;
          }
        }
      `}} />
      
      {/* Top Row: Heading & Logo (Sticky Transparent Header) */}
      <div className="admin-header-top-row" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: 'rgba(249, 248, 243, 0.9)', 
        backdropFilter: 'blur(16px)', 
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%', 
        flexWrap: 'wrap', 
        gap: '1rem',
        paddingTop: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
      }}>
        <h1 className="admin-header-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          O'QUVCHILAR NATIJALARI TAHLILI
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className="school-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '0', background: 'transparent', border: 'none' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.05em', color: '#0a1f2e', lineHeight: 1 }}>
              AL-XORAZMIY
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.2em', color: '#129f87' }}>
                SCHOOL
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#129f87' }}></div>
                <div style={{ width: '30px', height: '2px', backgroundColor: '#129f87', marginLeft: '6px' }}></div>
              </div>
            </div>
          </div>

          {/* Desktop buttons */}
          <div className="desktop-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Minimalist modern settings/sidebar menu button */}
            <button
              onClick={onOpenDrawer}
              title="Boshqaruv panelini ochish"
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1.5px solid #e2e8f0',
                borderRadius: '9999px',
                padding: '0.5rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                transition: 'all 0.2s ease',
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                height: '40px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.01)';
              }}
            >
              <Settings size={15} />
              <span>SOZLAMALAR</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Tizimdan chiqish"
                style={{
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1.5px solid #fee2e2',
                  borderRadius: '9999px',
                  padding: '0.5rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  height: '40px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <LogOut size={15} />
                <span>CHIQISH</span>
              </button>
            )}
          </div>

          {/* Hamburger Menu button */}
          <div className="mobile-header-menu-container" style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1.5px solid #e2e8f0',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                outline: 'none'
              }}
            >
              ☰
            </button>
            {isMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '45px',
                right: 0,
                width: '180px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                zIndex: 999
              }}>
                <button
                  onClick={() => { setIsMenuOpen(false); onOpenDrawer(); }}
                  style={{
                    background: 'transparent', border: 'none', padding: '0.6rem 0.75rem',
                    borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%'
                  }}
                >
                  <Settings size={14} />
                  <span>SOZLAMALAR</span>
                </button>
                {onLogout && (
                  <button
                    onClick={() => { setIsMenuOpen(false); onLogout(); }}
                    style={{
                      background: '#fef2f2', border: '1px solid #fee2e2', padding: '0.6rem 0.75rem',
                      borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c', cursor: 'pointer',
                      textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%'
                    }}
                  >
                    <LogOut size={14} />
                    <span>CHIQISH</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
 
      {/* Bottom Row: Classes & Search */}
      <div className="admin-header-bottom-row" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%', 
        gap: '1.5rem', 
        flexWrap: 'wrap',
        marginTop: '2rem',
        marginBottom: '2.5rem'
      }}>
        <div className="class-selector" style={{ 
          display: 'flex', 
          gap: '0.25rem', 
          background: '#ffffff', 
          padding: '0.5rem', 
          borderRadius: '9999px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
          border: '1px solid #e5e7eb',
          overflowX: 'auto',
          flex: '1 1 auto',
          maxWidth: '100%'
        }}>
          {classes.map(cls => {
            const isActive = activeClass === cls;
            return (
              <button
                key={cls}
                onClick={() => onClassSelect(cls)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: isActive ? '#0d9488' : 'transparent',
                  color: isActive ? '#ffffff' : '#6b7280',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {cls}
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                  color: isActive ? '#ffffff' : '#9ca3af',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  {classCounts[cls] || 0}
                </span>
              </button>
            );
          })}
        </div>
 
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
          {activeSubject === 'ALL' && (
            <>
              {/* Week Selector Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedWeek}
                    onChange={(e) => onWeekChange(e.target.value)}
                    style={{
                      background: '#ffffff',
                      color: '#1e293b',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '9999px',
                      padding: '0.85rem 2.25rem 0.85rem 1.25rem',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      outline: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      display: 'block',
                      lineHeight: 1.2
                    }}
                  >
                    {weeksList.length === 0 ? (
                      <option value="">Hafta yo'q</option>
                    ) : (
                      weeksList.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))
                    )}
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 1L5 5L9 1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {isAdminMode && selectedWeek && (
                  <button
                    onClick={() => onDeleteWeekClick && onDeleteWeekClick(selectedWeek)}
                    title="Ushbu haftani savatga o'chirish"
                    style={{
                      background: '#fee2e2',
                      color: '#ef4444',
                      border: '1.5px solid #fca5a5',
                      borderRadius: '9999px',
                      padding: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      height: '42px',
                      width: '42px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Start new week button for admins */}
              {isAdminMode && (
                <button
                  onClick={onStartNewWeekClick}
                  title="Yangi o'quv haftasini boshlash"
                  style={{
                    background: '#ffffff',
                    color: '#10b981',
                    border: '1.5px solid #10b981',
                    borderRadius: '9999px',
                    padding: '0.85rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s ease',
                    height: '42px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#10b981';
                  }}
                >
                  <Plus size={14} />
                  <span>YANGI HAFTA</span>
                </button>
              )}
            </>
          )}

          <div className="mobile-sticky-search" style={{ position: 'relative', width: '320px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="O'quvchilarni qidirish..." 
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 2.75rem',
                borderRadius: '9999px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                fontSize: '0.95rem',
                color: '#1a1a1a',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)'
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
