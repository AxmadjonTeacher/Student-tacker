import React from 'react';
import { Search, Settings, ChevronDown, Users, User, Filter } from 'lucide-react';
import iconLight from '../assets/icon-light.png';
import iconDark from '../assets/icon-dark.png';
import type { ActiveSubject } from '../types';

interface HeaderProps {
  classes: string[];
  activeClass: string;
  onClassSelect: (cls: string) => void;
  classCounts: Record<string, number>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchFilter?: 'both' | 'student' | 'teacher';
  onSearchFilterChange?: (filter: 'both' | 'student' | 'teacher') => void;
  onOpenDrawer: () => void;
  activeSubject: ActiveSubject;
  activeAdminTab?: 'home' | 'search' | 'stats' | 'settings' | 'news' | 'teachers' | 'trash';
  isDarkMode?: boolean;
  authRole?: string | null;

  // Hoisted States & Actions for ENG_MATH & GRANT
  engMathGradeRange?: '5-6' | '7-8' | '9-11';
  setEngMathGradeRange?: (range: '5-6' | '7-8' | '9-11') => void;
  engMathSubSubject?: 'ENG' | 'MATH';
  setEngMathSubSubject?: (subject: 'ENG' | 'MATH') => void;
  grantSubject?: 'ENG' | 'MATH';
  setGrantSubject?: (subject: 'ENG' | 'MATH') => void;
  onExportExcel?: (() => void) | null;
  selectedWeek?: string;
  onWeekChange?: (week: string) => void;
  weeksList?: string[];
  studentCount?: number;
}

const Header: React.FC<HeaderProps> = ({ 
  classes, activeClass, onClassSelect, classCounts, searchTerm, onSearchChange,
  searchFilter = 'both',
  onSearchFilterChange = () => {},
  onOpenDrawer,
  activeSubject,
  activeAdminTab = 'home',
  isDarkMode = false,
  authRole,
  engMathGradeRange,
  setEngMathGradeRange,
  engMathSubSubject,
  setEngMathSubSubject,
  grantSubject,
  setGrantSubject,
  onExportExcel: _onExportExcel,
  selectedWeek,
  onWeekChange,
  weeksList,
  studentCount
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = React.useState({
    left: 0,
    right: 0,
    height: 0,
    top: 0,
    opacity: 0,
    prevLeft: 0
  });

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateSlider = () => {
      const activeEl = containerRef.current?.querySelector('.active-pill') as HTMLElement | null;
      if (activeEl && containerRef.current) {
        const containerWidth = containerRef.current.scrollWidth;
        const newLeft = activeEl.offsetLeft;
        const newRight = containerWidth - (activeEl.offsetLeft + activeEl.offsetWidth);
        
        setSliderStyle(prev => {
          return {
            left: newLeft,
            right: newRight,
            height: activeEl.offsetHeight,
            top: activeEl.offsetTop,
            opacity: 1,
            prevLeft: prev.left
          };
        });
      } else {
        setSliderStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };
    
    // Initial run
    updateSlider();

    // Re-run after a small delay to handle parent layout shifts
    const timer = setTimeout(updateSlider, 50);

    window.addEventListener('resize', updateSlider);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSlider);
    };
  }, [activeClass, classes, activeSubject]);

  return (
    <header className={`sticky-header-container${activeSubject === 'DASHBOARD' ? ' sticky-header-dashboard' : ''}`} style={{
      position: 'sticky',
      top: 0,
      zIndex: 999,
      background: 'var(--bg-header-rgba)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: activeSubject === 'DASHBOARD' ? 'none' : '1px solid var(--border-subtle)',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      marginTop: '0',
      paddingLeft: activeSubject === 'DASHBOARD' ? '0.25rem' : '2.5rem',
      paddingRight: activeSubject === 'DASHBOARD' ? '0.25rem' : '2.5rem',
      paddingTop: activeSubject === 'DASHBOARD' ? '0' : '1.5rem',
      paddingBottom: activeSubject === 'DASHBOARD' ? '0' : '0.5rem'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .sticky-header-container {
          box-sizing: border-box;
        }
        .class-selector {
          scrollbar-width: none !important;
        }
        .class-selector::-webkit-scrollbar {
          display: none !important;
        }
        .mobile-header-menu-container {
          display: none;
        }
        .school-logo {
          display: none !important;
        }
        @media (max-width: 768px) {
          .desktop-header-actions {
            display: none !important;
          }
          .mobile-header-menu-container {
            display: none !important;
          }
          .admin-header-top-row {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
            gap: 0.5rem !important;
          }
          .admin-header-title {
            font-size: 1.15rem !important;
            text-align: left;
            max-width: 65% !important;
            line-height: 1.2 !important;
          }
          .school-logo {
            display: flex !important; /* Show logo on mobile top row */
          }
          .school-logo img {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
          .cabinet-header-title {
            font-size: 1rem !important;
          }
          .cabinet-header-subtitle {
            font-size: 0.65rem !important;
          }
          .class-selector {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            scrollbar-width: none !important; /* Firefox */
            padding: 0.25rem 1.5rem 0.25rem 0.25rem !important;
            -webkit-overflow-scrolling: touch;
            width: 100% !important;
            mask-image: linear-gradient(to right, black 85%, transparent 100%) !important;
            -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%) !important;
          }
          .class-selector::-webkit-scrollbar {
            display: none !important; /* Safari and Chrome */
          }
          .class-selector button {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            color: var(--text-secondary);
          }
          .class-selector button.active-pill {
            color: var(--text-primary) !important;
          }
          .admin-header-bottom-row {
            margin-top: 1rem !important;
            margin-bottom: 1.25rem !important;
            gap: 1rem !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .admin-controls-wrapper {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            width: 100% !important;
            align-items: stretch !important;
          }
          .admin-week-actions {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
            width: 100% !important;
            align-items: center !important;
          }
          .admin-week-actions > div {
            width: auto !important;
          }
          /* Sticky Search Bar on Mobile - nested styling override */
          .mobile-sticky-search {
            position: relative !important;
            top: auto !important;
            z-index: 1 !important;
            width: 100% !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            border-bottom: none !important;
            backdrop-filter: none !important;
            WebkitBackdropFilter: none !important;
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

          /* Tab visibility and single-row optimizations on Mobile */
          .admin-tab-home .admin-controls-wrapper {
            display: none !important;
          }
          .admin-tab-home .class-selector {
            display: flex !important;
          }

          .admin-tab-search .admin-week-actions {
            display: none !important;
          }
          .admin-tab-search .class-selector {
            display: flex !important;
          }
          .admin-tab-search .mobile-sticky-search {
            display: block !important;
          }

          .admin-tab-stats {
            margin-top: 1rem !important;
            margin-bottom: 1.25rem !important;
          }
          .admin-tab-stats .class-selector {
            display: none !important;
          }
          .admin-tab-stats .admin-controls-wrapper {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 0.35rem !important;
            width: 100% !important;
          }
          .admin-tab-stats .admin-week-actions {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: auto !important;
            gap: 0.35rem !important;
            align-items: center !important;
            flex-shrink: 0 !important;
          }
          .admin-tab-stats .admin-week-actions select {
            padding: 0.6rem 1.75rem 0.6rem 0.75rem !important;
            font-size: 0.8rem !important;
          }
          .admin-tab-stats .admin-week-actions button {
            padding: 0.6rem !important;
            height: 34px !important;
            width: auto !important;
          }
          .admin-tab-stats .admin-week-actions button.delete-week-btn {
            width: 34px !important;
          }
          .admin-tab-stats .mobile-sticky-search {
            flex-grow: 1 !important;
            width: auto !important;
          }
          .admin-tab-stats .week-btn-text {
            display: none !important;
          }

          .admin-tab-settings {
            display: none !important;
          }
          .sticky-header-container {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
        }
      `}} />
      {/* Top Row: Heading & Logo */}
      <div className="admin-header-top-row" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%', 
        flexWrap: 'wrap', 
        gap: '1rem',
        paddingTop: '1.25rem',
        paddingBottom: '0.75rem'
      }}>
        <div className="school-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0', background: 'transparent', border: 'none' }}>
          <img 
            src={isDarkMode ? iconDark : iconLight} 
            alt="Logo" 
            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} 
          />
          <div>
            <h1 className="cabinet-header-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textAlign: 'left' }}>
              AL-XORAZMIY SCHOOL
            </h1>
            <p className="cabinet-header-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0, textAlign: 'left' }}>
              {authRole === 'teacher' ? 'O\'QITUVCHI KABINETI' : 'ADMIN KABINETI'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Hamburger Menu button */}
          <div className="mobile-header-menu-container" style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1.5px solid var(--border-subtle)',
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
                background: 'var(--bg-card)',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--glass-shadow-soft)',
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
                    borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%'
                  }}
                >
                  <Settings size={14} />
                  <span>SOZLAMALAR</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
 
      {activeSubject !== 'DASHBOARD' && (
        <div className={`admin-header-bottom-row admin-tab-${activeAdminTab}`} style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%', 
          gap: '1.5rem', 
          flexWrap: 'nowrap',
          marginTop: '0.5rem',
          marginBottom: '1rem'
        }}>
          
          {/* Left Side: Contextual Toggles / Class Selectors */}
          <div className="header-context-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '0 1 auto' }}>
            {/* If Subject is ENG_MATH and teacher */}
            {activeSubject === 'ENG_MATH' && authRole === 'teacher' && (() => {
              const teacherName = localStorage.getItem('teacher_name') || 'O\'qituvchi';
              const teacherSubject = localStorage.getItem('teacher_subject') || 'ENG';
              const cabinetTitle = teacherSubject === 'MATH' ? `Matematika kabineti: ${teacherName}` : `Ingliz tili kabineti: ${teacherName}`;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: '1.2' }}>
                      {cabinetTitle}
                    </h2>
                    <p style={{ margin: '0.2rem 0 0', opacity: 0.8, fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-secondary)' }}>
                      Kundalik dars davomati va uyga vazifalarni tekshirish paneli
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--border-subtle)', padding: '0.4rem 0.8rem', borderRadius: '10px' }}>
                    <Users size={15} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                      {studentCount ?? 0} nafar o'quvchi
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* If Subject is ENG_MATH */}
            {activeSubject === 'ENG_MATH' && authRole !== 'teacher' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Grade Range Selector */}
                {engMathGradeRange !== undefined && setEngMathGradeRange && (() => {
                  const rangeIndex = engMathGradeRange === '5-6' ? 0 : engMathGradeRange === '7-8' ? 1 : 2;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>SINF:</span>
                      <div style={{ 
                        display: 'flex', 
                        background: 'var(--border-subtle)', 
                        boxShadow: 'var(--inner-inset)', 
                        borderRadius: '9999px', 
                        padding: '2px',
                        position: 'relative',
                        width: '180px',
                        height: '32px',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          bottom: '2px',
                          left: `calc(2px + (100% - 4px) / 3 * ${rangeIndex})`,
                          width: 'calc((100% - 4px) / 3)',
                          background: 'var(--bg-card)',
                          borderRadius: '9999px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }} />
                        {(['5-6', '7-8', '9-11'] as const).map(range => {
                          const active = engMathGradeRange === range;
                          return (
                            <button
                              key={range}
                              onClick={() => setEngMathGradeRange(range)}
                              style={{
                                flex: 1,
                                background: 'transparent',
                                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '9999px',
                                padding: 0,
                                fontSize: '0.8rem',
                                fontWeight: active ? 800 : 500,
                                cursor: 'pointer',
                                zIndex: 1,
                                transition: 'color 0.25s ease',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {range}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-Subject Selector (ENG vs MATH) */}
                {authRole !== 'teacher' && engMathSubSubject !== undefined && setEngMathSubSubject && (() => {
                  const subIndex = engMathSubSubject === 'ENG' ? 0 : 1;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>FAN:</span>
                      <div style={{ 
                        display: 'flex', 
                        background: 'var(--border-subtle)', 
                        boxShadow: 'var(--inner-inset)', 
                        borderRadius: '9999px', 
                        padding: '2px',
                        position: 'relative',
                        width: '180px',
                        height: '32px',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          bottom: '2px',
                          left: `calc(2px + (100% - 4px) / 2 * ${subIndex})`,
                          width: 'calc((100% - 4px) / 2)',
                          background: 'var(--bg-card)',
                          borderRadius: '9999px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }} />
                        {(['ENG', 'MATH'] as const).map(sub => {
                          const active = engMathSubSubject === sub;
                          return (
                            <button
                              key={sub}
                              onClick={() => setEngMathSubSubject(sub)}
                              style={{
                                flex: 1,
                                background: 'transparent',
                                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '9999px',
                                padding: 0,
                                fontSize: '0.8rem',
                                fontWeight: active ? 800 : 500,
                                cursor: 'pointer',
                                zIndex: 1,
                                transition: 'color 0.25s ease',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {sub === 'ENG' ? 'Ingliz tili' : 'Matematika'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Week Selector Dropdown */}
                {onWeekChange && weeksList && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>HAFTA:</span>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <select
                        value={selectedWeek}
                        onChange={(e) => onWeekChange(e.target.value)}
                        style={{
                          appearance: 'none',
                          background: 'var(--bg-card-hover)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '9999px',
                          padding: '0.45rem 2rem 0.45rem 1.0rem',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          outline: 'none',
                          cursor: 'pointer',
                          lineHeight: 1.2,
                          boxShadow: 'var(--glass-shadow-soft)',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
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
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If Subject is GRANT */}
            {activeSubject === 'GRANT' && authRole !== 'teacher' && grantSubject !== undefined && setGrantSubject && (() => {
              const grantIndex = grantSubject === 'ENG' ? 0 : 1;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>FAN:</span>
                  <div style={{ 
                    display: 'flex', 
                    background: 'var(--border-subtle)', 
                    boxShadow: 'var(--inner-inset)', 
                    borderRadius: '9999px', 
                    padding: '2px',
                    position: 'relative',
                    width: '180px',
                    height: '32px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      bottom: '2px',
                      left: `calc(2px + (100% - 4px) / 2 * ${grantIndex})`,
                      width: 'calc((100% - 4px) / 2)',
                      background: 'var(--bg-card)',
                      borderRadius: '9999px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} />
                    {(['ENG', 'MATH'] as const).map(sub => {
                      const active = grantSubject === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => setGrantSubject(sub)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: 0,
                            fontSize: '0.8rem',
                            fontWeight: active ? 800 : 500,
                            cursor: 'pointer',
                            zIndex: 1,
                            transition: 'color 0.25s ease',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {sub === 'ENG' ? 'Ingliz tili' : 'Matematika'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Standard Class Selector for other subjects */}
            {activeSubject !== 'ENG_MATH' && (
              <div className="class-selector" ref={containerRef} style={{ 
                display: 'flex', 
                gap: '0.25rem', 
                background: 'var(--bg-card-hover)', 
                padding: '0.35rem', 
                borderRadius: '9999px',
                boxShadow: 'var(--glass-shadow-soft)',
                border: '1px solid var(--border-subtle)',
                overflowX: 'auto',
                flex: '0 1 auto',
                maxWidth: '100%',
                position: 'relative'
              }}>
                {/* 1. Gooey Background Layer */}
                <div className="class-selector-gooey-bg" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  minWidth: 'max-content',
                  width: '100%',
                  filter: 'url(#liquid-gooey-filter)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  display: 'flex',
                  gap: '0.25rem',
                  padding: '0.35rem',
                  boxSizing: 'border-box'
                }}>
                  {classes.map(cls => (
                    <div
                      key={`bg-${cls}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'transparent',
                        padding: '0.4rem 1.25rem',
                        borderRadius: '9999px',
                        color: 'transparent',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                        position: 'relative'
                      }}
                    >
                      <span style={{ opacity: 0, userSelect: 'none' }}>{cls} ({classCounts[cls] ?? 0})</span>
                      {/* Small liquid dot centered inside the slot */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--bg-card)',
                        opacity: 0.25
                      }} />
                    </div>
                  ))}

                  {/* Sliding active pill indicator */}
                  <div style={{
                    position: 'absolute',
                    left: sliderStyle.left,
                    right: sliderStyle.right,
                    height: sliderStyle.height,
                    top: sliderStyle.top,
                    opacity: sliderStyle.opacity,
                    background: 'var(--bg-card)',
                    borderRadius: '9999px',
                    boxShadow: '0 4px 12px var(--accent-glow)',
                    transition: sliderStyle.left > sliderStyle.prevLeft 
                      ? 'left 0.42s cubic-bezier(0.25, 1, 0.35, 1) 0.08s, right 0.28s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.3s ease'
                      : sliderStyle.left < sliderStyle.prevLeft
                        ? 'left 0.28s cubic-bezier(0.2, 1, 0.3, 1), right 0.42s cubic-bezier(0.25, 1, 0.35, 1) 0.08s, opacity 0.3s ease'
                        : 'left 0.35s ease, right 0.35s ease, opacity 0.3s ease',
                    pointerEvents: 'none'
                  }} />
                </div>

                {/* 2. Foreground Crisp Text Buttons */}
                {classes.map(cls => {
                  const isActive = activeClass === cls;
                  return (
                    <button
                      key={cls}
                      onClick={() => onClassSelect(cls)}
                      className={`class-pill-btn ${isActive ? 'active-pill' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        border: '1px solid transparent',
                        boxShadow: 'none',
                        padding: '0.4rem 1.25rem',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.85rem',
                        transition: 'color 0.35s ease',
                        whiteSpace: 'nowrap',
                        zIndex: 1
                      }}
                    >
                      {cls} ({classCounts[cls] ?? 0})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
    
          {/* Right Side: Integrated Search Bar & Excel Export Button */}
          <div className="admin-controls-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 auto', justifyContent: 'flex-end', minWidth: 0 }}>
            <div className="mobile-sticky-search" style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '0.25rem 0.5rem',
              boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
              width: '100%',
              maxWidth: '380px',
              boxSizing: 'border-box'
            }}>
              <Search size={18} style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', flexShrink: 0 }} />
              <input 
                type="text" 
                placeholder={
                  activeSubject === 'DETAILS' ? (
                    searchFilter === 'student' ? "Ism bo'yicha qidirish..." :
                    searchFilter === 'teacher' ? "ID bo'yicha qidirish..." :
                    "Ism yoki ID bo'yicha qidirish..."
                  ) : (
                    searchFilter === 'student' ? "O'quvchini qidirish..." :
                    searchFilter === 'teacher' ? "O'qituvchini qidirish..." :
                    "Qidirish..."
                  )
                }
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
              {authRole !== 'teacher' && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {activeSubject === 'GRANT' || activeSubject === 'DETAILS' ? (
                    <div 
                      title={activeSubject === 'DETAILS' ? "ID yoki Ism bo'yicha qidiruv filtri" : "Qidiruv filtri"}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        background: 'var(--bg-card-hover)', 
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer', 
                        position: 'relative',
                        flexShrink: 0
                      }}
                    >
                      {activeSubject === 'DETAILS' ? (
                        searchFilter === 'student' ? <User size={15} style={{ color: 'var(--text-secondary)' }} /> :
                        searchFilter === 'teacher' ? <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>ID</span> :
                        <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                      )}
                      <select
                        value={searchFilter}
                        onChange={(e) => onSearchFilterChange(e.target.value as any)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer',
                          appearance: 'none'
                        }}
                      >
                        <option value="both">Barchasi</option>
                        <option value="student">
                          {activeSubject === 'DETAILS' ? "Ism va familiya" : "O'quvchilar"}
                        </option>
                        <option value="teacher">
                          {activeSubject === 'DETAILS' ? "ID" : "O'qituvchilar"}
                        </option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <select
                        value={searchFilter}
                        onChange={(e) => onSearchFilterChange(e.target.value as any)}
                        style={{
                          appearance: 'none',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          border: 'none',
                          padding: '0.5rem 1.5rem 0.5rem 0.5rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          outline: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <option value="both">Barchasi</option>
                        <option value="student">O'quvchilar</option>
                        <option value="teacher">O'qituvchilar</option>
                      </select>
                      <div style={{
                        position: 'absolute',
                        right: '0.25rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <ChevronDown size={14} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
