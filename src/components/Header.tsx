import React from 'react';
import { Search, Settings } from 'lucide-react';
import iconLight from '../assets/icon-light.png';
import type { ActiveSubject } from '../types';

interface HeaderProps {
  classes: string[];
  activeClass: string;
  onClassSelect: (cls: string) => void;
  classCounts: Record<string, number>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenDrawer: () => void;
  activeSubject: ActiveSubject;
  activeAdminTab?: 'home' | 'search' | 'stats' | 'settings' | 'news' | 'teachers' | 'trash';
}

const Header: React.FC<HeaderProps> = ({ 
  classes, activeClass, onClassSelect, classCounts, searchTerm, onSearchChange, onOpenDrawer,
  activeSubject,
  activeAdminTab = 'home'
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <header className="sticky-header-container" style={{
      position: 'sticky',
      top: 0,
      zIndex: 999,
      background: 'rgba(249, 248, 243, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      marginTop: '0',
      paddingLeft: '0.25rem',
      paddingRight: '0.25rem'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
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
            background: #ffffff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            color: #475569;
          }
          .class-selector button.active-pill {
            color: #ffffff !important;
            /* background, border and box-shadow are now set dynamically inline */
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
            src={iconLight} 
            alt="Logo" 
            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} 
          />
          <div>
            <h1 className="cabinet-header-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, textAlign: 'left' }}>
              AL-XORAZMIY SCHOOL
            </h1>
            <p className="cabinet-header-subtitle" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, margin: 0, textAlign: 'left' }}>
              ADMIN KABINETI
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

          {/* Settings button removed on desktop - moved to left sidebar */}

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
              </div>
            )}
          </div>

        </div>
      </div>
 
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
            
            const getSubjectColor = (subj: ActiveSubject) => {
              switch(subj) {
                case 'ENG': return '#166534'; // green
                case 'MATH': return '#0d9488'; // teal
                case 'ALL': return '#4f46e5'; // indigo
                case 'DETAILS': return '#db2777'; // pink
                default: return '#0d9488';
              }
            };
            const subjectColor = getSubjectColor(activeSubject);

            return (
              <button
                key={cls}
                onClick={() => onClassSelect(cls)}
                className={`class-pill-btn ${isActive ? 'active-pill' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: isActive ? subjectColor : '#ffffff',
                  color: isActive ? '#ffffff' : '#6b7280',
                  border: isActive ? `1px solid ${subjectColor}` : '1px solid #e2e8f0',
                  boxShadow: isActive ? `0 4px 10px ${subjectColor}40` : '0 1px 2px rgba(0,0,0,0.02)',
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
 
        <div className="admin-controls-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
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

    </header>
  );
};

export default Header;
