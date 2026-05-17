import React from 'react';
import { Search, Settings, X } from 'lucide-react';

interface HeaderProps {
  classes: string[];
  activeClass: string;
  onClassSelect: (cls: string) => void;
  classCounts: Record<string, number>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isAdminMode: boolean;
  onToggleAdmin: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  classes, activeClass, onClassSelect, classCounts, searchTerm, onSearchChange, isAdminMode, onToggleAdmin 
}) => {
  return (
    <header className="header" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'stretch', /* Override global align-items: center */
      width: '100%',
      gap: '2rem', /* Give more breathing room between rows */
      marginBottom: '2.5rem', 
      padding: '0', 
      background: 'transparent', 
      border: 'none', 
      boxShadow: 'none' 
    }}>
      
      {/* Top Row: Heading & Logo (Sticky Transparent Header) */}
      <div style={{ 
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
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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

          {/* Small Gear Settings Button */}
          <button
            onClick={onToggleAdmin}
            title={isAdminMode ? "Admin panelini yopish" : "Admin panelini ochish"}
            style={{
              background: isAdminMode ? '#0d9488' : '#ffffff',
              color: isAdminMode ? '#ffffff' : '#475569',
              border: '1.5px solid #e2e8f0',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.borderColor = '#0d9488';
              if (!isAdminMode) e.currentTarget.style.color = '#0d9488';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = '#e2e8f0';
              if (!isAdminMode) e.currentTarget.style.color = '#475569';
            }}
          >
            {isAdminMode ? <X size={18} /> : <Settings size={18} />}
          </button>
        </div>
      </div>
 
      {/* Bottom Row: Classes & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1.5rem', flexWrap: 'wrap' }}>
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
 
        <div style={{ position: 'relative', width: '320px', flex: '0 0 auto' }}>
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

    </header>
  );
};

export default Header;
