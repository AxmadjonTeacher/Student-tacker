import React, { useState, useEffect } from 'react';
import { LogOut, TrendingUp, Bell, Award } from 'lucide-react';
import type { Student, NewsEvent } from '../types';
import { supabase } from '../supabase';
import GraphModal from './GraphModal';

interface ParentCabinetProps {
  student: Student;
  studentWeeks: any[];
  onLogout: () => void;
}

const ParentCabinet: React.FC<ParentCabinetProps> = ({ student, studentWeeks, onLogout }) => {
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [isGraphOpen, setIsGraphOpen] = useState(false);

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
        @media (max-width: 900px) {
          .cabinet-grid {
            grid-template-columns: 1fr !important;
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
      `}} />

      {/* Modern Symmetrical Header */}
      <header style={{
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
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              AL-XORAZMIY SCHOOL
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, margin: 0 }}>
              OTA-ONALAR KABINETI
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
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
        {/* Child Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0d9488 100%)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          color: '#ffffff',
          boxShadow: '0 10px 15px -3px rgba(13, 148, 136, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em', color: '#ccfbf1', textTransform: 'uppercase' }}>
            O'quvchi ma'lumotlari
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 850, margin: 0, letterSpacing: '-0.02em' }}>
            {student.name} {student.surname}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 550 }}>
            <span>Sinf: <strong>{student.className}</strong></span>
            <span>•</span>
            <span>Qo'shilgan sana: <strong>{student.dateJoined}</strong></span>
            <span>•</span>
            <span>Student ID: <strong style={{ color: '#fed7aa', letterSpacing: '0.05em' }}>{student.id}</strong></span>
          </div>
        </div>

        <div className="cabinet-grid">
          {/* Left Column: Metrics & Charts */}
          <section>
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
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.35rem' }}>INGLIZ TILI</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{student.englishTeacher || student.teacher || "O'qituvchi belgilanmagan"}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '0.5rem' }}>
                    Daraja: {student.englishStartingLevel || student.startingLevel || 'Level 1'} ➔ {student.englishCurrentLevel || student.currentLevel || 'Level 1'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.35rem' }}>MATEMATIKA</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{student.mathTeacher || "O'qituvchi belgilanmagan"}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '0.5rem' }}>
                    Daraja: {student.mathStartingLevel || 'Level 1'} ➔ {student.mathCurrentLevel || 'Level 1'}
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
                    <div style={{ width: `${hwPercentage}%`, height: '100%', background: '#10b981', borderRadius: '4px' }} />
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
          <section>
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
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hozircha e'lonlar mavjud emas.</p>
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
        </div>
      </main>

      {/* Symmetrical Footer */}
      <footer style={{
        marginTop: '3rem',
        padding: '2.5rem 1.5rem 1.5rem 1.5rem',
        textAlign: 'center',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
        color: '#64748b',
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        alignItems: 'center'
      }}>
        <div style={{ textTransform: 'uppercase' }}>
          © 2026 Al-Xorazmiy School. Barcha huquqlar himoyalangan.
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
          Created by Axmadjon
        </div>
      </footer>

      {/* Render detailed graph charts in a modal */}
      {isGraphOpen && (
        <GraphModal
          student={student}
          activeSubject="ALL"
          studentWeeks={studentWeeks}
          onClose={() => setIsGraphOpen(false)}
        />
      )}
    </div>
  );
};

export default ParentCabinet;
