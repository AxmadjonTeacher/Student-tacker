import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, TrendingUp, Bell, Home, BarChart2, Settings, Plus, Trash2 } from 'lucide-react';
import type { Student, NewsEvent } from '../types';
import { supabase, mapDbToStudent } from '../supabase';
import GraphModal from './GraphModal';
import iconLight from '../assets/icon-light.png';

interface ParentCabinetProps {
  student: Student;
  studentWeeks: any[];
  parentStudents: Student[];
  onSwitchChild: (childId: string) => void;
  onAddChild: (newStudent: Student) => void;
  onLogout: () => void;
  onRemoveChild: (childId: string) => void;
}

const ParentCabinet: React.FC<ParentCabinetProps> = ({ 
  student, 
  studentWeeks, 
  parentStudents, 
  onSwitchChild, 
  onAddChild, 
  onLogout,
  onRemoveChild
}) => {
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'stats' | 'settings'>('home');
  
  // Add child states
  const [addChildId, setAddChildId] = useState('');
  const [addChildPasscode, setAddChildPasscode] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);


  const handleAddChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!addChildId.trim() || !addChildPasscode.trim()) {
      setAddError("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }
    
    // Check if child already added
    const alreadyAdded = parentStudents.some(s => s.id === addChildId.trim());
    if (alreadyAdded) {
      setAddError("Ushbu o'quvchi allaqachon qo'shilgan.");
      return;
    }

    setAddLoading(true);
    try {
      const { data, error } = await supabase
        .from('Students')
        .select('*')
        .eq('id', addChildId.trim())
        .eq('passcode', addChildPasscode.trim())
        .eq('is_deleted', false)
        .maybeSingle();

      if (error || !data) {
        setAddError("Student ID yoki parol noto'g'ri.");
      } else {
        const newStudent = mapDbToStudent(data);
        onAddChild(newStudent);
        setAddSuccess(`${newStudent.name} muvaffaqiyatli qo'shildi!`);
        setAddChildId('');
        setAddChildPasscode('');
        setTimeout(() => {
          setActiveTab('home');
        }, 1500);
      }
    } catch (err) {
      setAddError("Aloqa o'rnatishda xatolik yuz berdi.");
    } finally {
      setAddLoading(false);
    }
  };

  // News filtered list is just all news

  // Find the latest week's record from studentWeeks (sorted by academic week order)
  const latestWeekRecord = useMemo(() => {
    if (!studentWeeks || studentWeeks.length === 0) return null;
    return [...studentWeeks].sort((a, b) => {
      const parseWeekVal = (weekStr: string): number => {
        if (!weekStr) return 0;
        if (weekStr.toLowerCase().endsWith('hafta')) {
          const num = parseInt(weekStr, 10);
          return isNaN(num) ? 0 : num;
        }
        const parts = weekStr.split('-');
        if (parts.length !== 2) return 9999;
        const day = parseInt(parts[0], 10);
        if (isNaN(day)) return 9999;
        const monthStr = parts[1].toLowerCase();
        
        const academicMonths = ['sen', 'okt', 'noy', 'dek', 'yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg'];
        const monthIdx = academicMonths.indexOf(monthStr);
        if (monthIdx === -1) return 1000 + day;
        
        return 1000 + monthIdx * 100 + day;
      };
      return parseWeekVal(b.week) - parseWeekVal(a.week);
    })[0];
  }, [studentWeeks]);

  const getInitials = (nameStr: string, surnameStr: string) => {
    const first = nameStr ? nameStr.charAt(0).toUpperCase() : '';
    const last = surnameStr ? surnameStr.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  };

  const englishStartingLevel = latestWeekRecord?.starting_level || student.englishStartingLevel || student.startingLevel || 'Level 1';
  const englishCurrentLevel = latestWeekRecord?.current_level || student.englishCurrentLevel || student.currentLevel || 'Level 1';
  const mathStartingLevel = latestWeekRecord?.math_starting_level || student.mathStartingLevel || 'Level 1';
  const mathCurrentLevel = latestWeekRecord?.math_current_level || student.mathCurrentLevel || 'Level 1';

  // Fetch announcements/news
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const { data, error } = await supabase
          .from('news_events')
          .select('*')
          .order('date', { ascending: false });
        
        if (!error && data) {
          setNews(data);
        }
      } catch (err) {
        console.error('Error loading news for parent cabinet:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, []);

  // Format dateUz helper
  const formatDateUz = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const monthIdx = d.getMonth();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const monthsUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
      return `${day}-${monthsUz[monthIdx]}, soat ${hours}:${minutes}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Score metrics calculations
  const engPercentage = Math.round(((student.engScore || 0) / 15 * 100) * 10) / 10;
  const mathPercentage = Math.round(((student.mathScore || 0) / 15 * 100) * 10) / 10;

  const absences = (student.attendance ?? 1) < 0 ? -(student.attendance ?? 1) : 0;
  const attPercentage = Math.max(0, Math.round((100 - absences * 16.67) * 10) / 10);
  
  const missedHw = (student.homework ?? 1) < 0 ? -(student.homework ?? 1) : 0;
  const hwPercentage = Math.max(0, Math.round((100 - missedHw * 20) * 10) / 10);

  const getUrgencyColor = (val: string) => {
    switch (val) {
      case 'low': return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
      case 'high': return { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' };
      case 'critical': return { bg: '#fef2f2', text: '#b91c1c', border: '#fee2e2' };
      case 'medium':
      default:
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' };
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      boxSizing: 'border-box'
    }}>
      {/* Dynamic Styling and Sizing rules for responsiveness */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cabinet-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          box-sizing: border-box;
        }
        .cabinet-grid {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 2rem;
          margin-top: 2rem;
        }
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          margin-top: 1.5rem;
        }
        .tab-content-settings {
          display: none;
        }
        .tab-content-stats {
          display: none;
        }
        .mobile-tab-bar {
          display: none;
        }
        @media (max-width: 900px) {
          .cabinet-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-only-btn {
            display: none !important;
          }
          .mobile-tab-bar {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
            justify-content: space-around;
            align-items: center;
            z-index: 998;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.04);
            padding-bottom: env(safe-area-inset-bottom);
          }
          .mobile-tab-bar .tab-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            font-size: 0.7rem;
            font-weight: 700;
            gap: 0.25rem;
            flex: 1;
            height: 100%;
            transition: all 0.15s ease;
          }
          .mobile-tab-bar .tab-item.active {
            color: #0d9488;
          }
          .cabinet-grid {
            margin-bottom: 80px !important;
          }
          .tab-content-home {
            display: ${activeTab === 'home' ? 'block' : 'none'} !important;
          }
          .tab-content-search {
            display: ${activeTab === 'search' ? 'block' : 'none'} !important;
          }
          .tab-content-stats {
            display: ${activeTab === 'stats' ? 'block' : 'none'} !important;
          }
          .tab-content-settings {
            display: ${activeTab === 'settings' ? 'block' : 'none'} !important;
          }
        }
        @media (max-width: 600px) {
          .metric-grid {
            grid-template-columns: 1fr !important;
          }
          .cabinet-container {
            padding: 1rem 0.75rem !important;
          }
        }
        @media (max-width: 500px) {
          .cabinet-header {
            padding: 0.75rem 1rem !important;
          }
          .cabinet-header-logo {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
          .cabinet-header-logo svg {
            width: 18px !important;
            height: 18px !important;
          }
          .cabinet-header-title {
            font-size: 1rem !important;
          }
          .cabinet-header-subtitle {
            font-size: 0.65rem !important;
          }
          .cabinet-header-btn {
            padding: 0.4rem 0.75rem !important;
            font-size: 0.75rem !important;
            border-radius: 8px !important;
          }
          .cabinet-header-btn svg {
            width: 14px !important;
            height: 14px !important;
          }
          .cabinet-banner {
            flex-direction: column-reverse !important;
            align-items: center !important;
            text-align: center !important;
            padding: 1.5rem 1rem !important;
            gap: 1rem !important;
          }
          .cabinet-banner-text {
            align-items: center !important;
          }
          .cabinet-banner-title {
            font-size: 1.5rem !important;
          }
        }
      `}} />

      {/* Modern Symmetrical Header */}
      <header className="cabinet-header" style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="cabinet-header-logo" style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src={iconLight} 
              alt="Logo" 
              style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'contain' }} 
            />
          </div>
          <div>
            <h1 className="cabinet-header-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              AL-XORAZMIY SCHOOL
            </h1>
            <p className="cabinet-header-subtitle" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, margin: 0 }}>
              OTA-ONALAR KABINETI
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="cabinet-header-btn desktop-only-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fee2e2',
            borderRadius: '12px',
            padding: '0.6rem 1.25rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
        >
          <LogOut size={16} />
          <span>CHIQISH</span>
        </button>
      </header>

      <main className="cabinet-container">
        {/* Child Switcher Pill Bar */}
        {parentStudents.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            {parentStudents.map((child) => {
              const isActive = child.id === student.id;
              return (
                <button
                  key={child.id}
                  onClick={() => onSwitchChild(child.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: isActive ? '2px solid #0d9488' : '1px solid #e2e8f0',
                    background: isActive ? '#f0fdfa' : '#ffffff',
                    color: isActive ? '#0f766e' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 4px 6px -1px rgba(13, 148, 136, 0.1)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isActive ? '#0d9488' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 800
                  }}>
                    {getInitials(child.name, child.surname)}
                  </span>
                  <span>{child.name}</span>
                </button>
              );
            })}
            
            <button
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setActiveTab('settings');
                  setTimeout(() => {
                    const input = document.getElementById('add-child-id-input');
                    if (input) {
                      input.focus();
                      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                } else {
                  setIsAddModalOpen(true);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px dashed #0d9488',
                background: '#f0fdfa',
                color: '#0d9488',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Yangi farzand qo'shish"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
        {/* Child Banner */}
        <div className="cabinet-banner" style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0d9488 100%)',
          borderRadius: '24px',
          padding: '2rem',
          color: '#ffffff',
          boxShadow: '0 10px 15px -3px rgba(13, 148, 136, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="cabinet-banner-text" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em', color: '#ccfbf1', textTransform: 'uppercase' }}>
              O'quvchi ma'lumotlari
            </span>
            <h2 className="cabinet-banner-title" style={{ fontSize: '2rem', fontWeight: 850, margin: 0, letterSpacing: '-0.02em' }}>
              {student.name} {student.surname}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 550 }}>
              <span>Sinf: <strong>{student.className}</strong></span>
              <span>•</span>
              <span>Student ID: <strong style={{ color: '#fed7aa', letterSpacing: '0.05em' }}>{student.id}</strong></span>
            </div>
          </div>

          {/* Profile Picture */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#ffffff',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {student.pictureUrl ? (
              <img src={student.pictureUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(student.name, student.surname)
            )}
          </div>
        </div>

        <div className="cabinet-grid">
          {/* Left Column: Metrics & Charts */}
          <section className="tab-content-home">
            {/* Info Cards */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Fan o'qituvchilari va darajalar
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.25rem' }}>INGLIZ TILI</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{student.englishTeacher || student.teacher || "O'qituvchi belgilanmagan"}</div>
                  </div>
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 650, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Avvalgi daraja:</span>
                      <span style={{ color: '#475569', fontWeight: 800 }}>{englishStartingLevel}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 650, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hozirgi daraja:</span>
                      <span style={{ color: '#0d9488', fontWeight: 800 }}>{englishCurrentLevel}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.25rem' }}>MATEMATIKA</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{student.mathTeacher || "O'qituvchi belgilanmagan"}</div>
                  </div>
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 650, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Avvalgi daraja:</span>
                      <span style={{ color: '#475569', fontWeight: 800 }}>{mathStartingLevel}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 650, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hozirgi daraja:</span>
                      <span style={{ color: '#0d9488', fontWeight: 800 }}>{mathCurrentLevel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance metrics breakdown */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              marginTop: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Haftalik ko'rsatkichlar tahlili
                </h3>
                
                <button
                  onClick={() => setIsGraphOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(13, 148, 136, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <TrendingUp size={16} />
                  <span>BATAFSIL GRAFIKLAR</span>
                </button>
              </div>

              <div className="metric-grid">
                {/* Metric Item: English */}
                <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}>INGLIZ TILI</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#4f46e5' }}>{student.engScore || 0}/15</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${engPercentage}%`, height: '100%', background: '#4f46e5', borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '0.5rem', textAlign: 'right' }}>
                    {engPercentage}% progress
                  </div>
                </div>

                {/* Metric Item: Math */}
                <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}>MATEMATIKA</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0d9488' }}>{student.mathScore || 0}/15</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${mathPercentage}%`, height: '100%', background: '#0d9488', borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '0.5rem', textAlign: 'right' }}>
                    {mathPercentage}% progress
                  </div>
                </div>

                {/* Metric Item: Attendance */}
                <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}>DAVOMAT (ATTENDANCE)</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: absences > 0 ? '#b91c1c' : '#166534' }}>
                      {absences === 0 ? "100%" : `-${absences} dars`}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${attPercentage}%`, height: '100%', background: '#f97316', borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{absences > 0 ? `${absences} ta dars qoldirilgan` : "Barcha darslarda qatnashgan"}</span>
                    <span>{attPercentage}%</span>
                  </div>
                </div>

                {/* Metric Item: Homework */}
                <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}>UY VAZIFALARI (HOMEWORK)</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: missedHw > 0 ? '#b91c1c' : '#166534' }}>
                      {missedHw === 0 ? "100%" : `-${missedHw} ta`}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${hwPercentage}%`, height: '100%', background: '#15803d', borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{missedHw > 0 ? `${missedHw} ta vazifa bajarilmagan` : "Barcha vazifalar bajarilgan"}</span>
                    <span>{hwPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: News & Announcements Feed */}
          <section className="tab-content-search">
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '400px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <Bell size={20} color="#0d9488" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Maktab yangiliklari & E'lonlar
                </h3>
              </div>

              {newsLoading ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    border: '3px solid #ccfbf1',
                    borderTop: '3px solid #0d9488',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              ) : news.length === 0 ? (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '3rem 0', textAlign: 'center' }}>
                  <Bell size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>E'lonlar topilmadi.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '550px', paddingRight: '0.25rem' }}>
                  {news.map((item) => {
                    const badge = getUrgencyColor(item.urgency || 'medium');
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: '#f8fafc',
                          border: `1px solid #e2e8f0`,
                          borderRadius: '16px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          transition: 'transform 0.2s',
                          cursor: 'default'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {item.label || "E'lon"}
                          </span>
                          
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 650 }}>
                            {formatDateUz(item.date)}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
                          {item.title}
                        </h4>

                        <p style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500, lineHeight: 1.4, whiteSpace: 'pre-wrap', margin: 0 }}>
                          {item.message}
                        </p>

                        {item.picture_urls && item.picture_urls.length > 0 && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: '0.5rem',
                            marginTop: '0.5rem',
                            borderRadius: '12px',
                            overflow: 'hidden'
                          }}>
                            {item.picture_urls.map((url, idx) => (
                              <div key={idx} style={{ position: 'relative', paddingBottom: '75%', background: '#eaeaea', overflow: 'hidden' }}>
                                <img
                                  src={url}
                                  alt={`News Media ${idx + 1}`}
                                  style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    top: 0,
                                    left: 0
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Stats Section (Mobile Only) */}
          <section className="tab-content-stats">
            <GraphModal
              student={student}
              activeSubject="ALL"
              studentWeeks={studentWeeks}
              onClose={() => {}}
              isInline={true}
            />
          </section>

          {/* Settings Section (Mobile Only) */}
          <section className="tab-content-settings">
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                SOZLAMALAR
              </h3>
              
              {/* Linked Children Card */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem' }}>ULANGAN FARZANDLAR</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {parentStudents.map(child => (
                    <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                          {getInitials(child.name, child.surname)}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{child.name} {child.surname}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>ID: {child.id}</span>
                        <button
                          onClick={() => onRemoveChild(child.id)}
                          title="Farzandni o'chirish"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.25rem',
                            borderRadius: '6px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Child Form */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1.5px dashed #cbd5e1' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '0.25rem' }}>YANGI FARZAND QO'SHISH</div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem 0' }}>Boshqa farzandingiz ma'lumotlarini ko'rish uchun uning ID va parolini kiriting.</p>
                
                <form onSubmit={handleAddChildSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label htmlFor="add-child-id-input" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Student ID</label>
                    <input
                      id="add-child-id-input"
                      type="text"
                      placeholder="Student ID kiriting"
                      value={addChildId}
                      onChange={(e) => setAddChildId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Parol (Passcode)</label>
                    <input
                      type="password"
                      placeholder="Parolni kiriting"
                      value={addChildPasscode}
                      onChange={(e) => setAddChildPasscode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  {addError && <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 700 }}>{addError}</div>}
                  {addSuccess && <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>{addSuccess}</div>}

                  <button
                    type="submit"
                    disabled={addLoading}
                    style={{
                      background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {addLoading ? "Kutilmoqda..." : (
                      <>
                        <Plus size={16} />
                        <span>Farzandni ulash</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
              
              {/* Contact Card */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ fontWeight: 800, color: '#1e293b' }}>MAKTAB BILAN BOG'LANISH</div>
                <div>Savollar va takliflar uchun maktab ma'muriyati bilan bog'laning.</div>
                <div style={{ fontWeight: 700, color: '#0d9488', marginTop: '0.25rem' }}>Tel: +998 94 303 07 07</div>
              </div>

              {/* Mobile Logout Button */}
              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
              >
                <LogOut size={16} />
                <span>TIZIMDAN CHIQISH</span>
              </button>

              {/* Small footer text inside settings only */}
              <div style={{
                marginTop: '1.5rem',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                lineHeight: 1.4,
                textTransform: 'uppercase'
              }}>
                © 2026 AL-XORAZMIY SCHOOL. BARCHA HUQUQLAR HIMOYALANGAN.<br />Created by Axmadjon
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Tab Bar for Mobile viewports */}
      <div className="mobile-tab-bar">
        <button 
          onClick={() => setActiveTab('home')}
          className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
        >
          <Home size={20} />
          <span>Bosh sahifa</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('search')}
          className={`tab-item ${activeTab === 'search' ? 'active' : ''}`}
        >
          <Bell size={20} />
          <span>Yangiliklar</span>
        </button>
        
        <button 
          onClick={() => {
            setActiveTab('stats');
          }}
          className={`tab-item ${activeTab === 'stats' ? 'active' : ''}`}
        >
          <BarChart2 size={20} />
          <span>Statistika</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('settings')}
          className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Sozlamalar</span>
        </button>
      </div>

      {/* Desktop/Mobile Modal Dialog for Adding Child */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            width: '100%',
            maxWidth: '440px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setAddError('');
                setAddSuccess('');
              }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}
            >
              ✕
            </button>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                Farzand qo'shish
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Yangi farzand ulash uchun maktab tomonidan berilgan Student ID va parolni kiriting.
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAddError('');
              setAddSuccess('');
              if (!addChildId.trim() || !addChildPasscode.trim()) {
                setAddError("Iltimos, barcha maydonlarni to'ldiring.");
                return;
              }
              const alreadyAdded = parentStudents.some(s => s.id === addChildId.trim());
              if (alreadyAdded) {
                setAddError("Ushbu o'quvchi allaqachon qo'shilgan.");
                return;
              }

              setAddLoading(true);
              try {
                const { data, error } = await supabase
                  .from('Students')
                  .select('*')
                  .eq('id', addChildId.trim())
                  .eq('passcode', addChildPasscode.trim())
                  .eq('is_deleted', false)
                  .maybeSingle();

                if (error || !data) {
                  setAddError("Student ID yoki parol noto'g'ri.");
                } else {
                  const newStudent = mapDbToStudent(data);
                  onAddChild(newStudent);
                  setAddSuccess(`${newStudent.name} muvaffaqiyatli qo'shildi!`);
                  setAddChildId('');
                  setAddChildPasscode('');
                  setTimeout(() => {
                    setIsAddModalOpen(false);
                    setAddSuccess('');
                  }, 1500);
                }
              } catch (err) {
                setAddError("Aloqa o'rnatishda xatolik yuz berdi.");
              } finally {
                setAddLoading(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Student ID</label>
                <input
                  type="text"
                  placeholder="Student ID kiriting"
                  value={addChildId}
                  onChange={(e) => setAddChildId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Parol (Passcode)</label>
                <input
                  type="password"
                  placeholder="Parolni kiriting"
                  value={addChildPasscode}
                  onChange={(e) => setAddChildPasscode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {addError && <div style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 700 }}>{addError}</div>}
              {addSuccess && <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>{addSuccess}</div>}

              <button
                type="submit"
                disabled={addLoading}
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                {addLoading ? "Kutilmoqda..." : "Farzandni ulash"}
              </button>
            </form>
          </div>
        </div>
      )}



      {/* Render detailed graph charts in a modal */}
      {isGraphOpen && (
        <GraphModal
          student={student}
          activeSubject="ALL"
          studentWeeks={studentWeeks}
          onClose={() => {
            setIsGraphOpen(false);
            setActiveTab('home');
          }}
        />
      )}
    </div>
  );
};

export default ParentCabinet;
