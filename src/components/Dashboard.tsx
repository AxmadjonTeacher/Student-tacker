import React, { useMemo, useState } from 'react';
import type { Student } from '../types';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, BarChart, Bar
} from 'recharts';
import { Award, Calendar, User, TrendingUp } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  studentWeeks: any[];
  availableClasses: string[];
  onSelectClass: (cls: string) => void;
  authRole?: string | null;
}

// Helper to extract numeric grade from class name (e.g., "5A" -> 5)
const getGradeNumber = (className: string): number => {
  const match = className?.toString().match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Evaluate overall performance index for a student (0 - 100)
// Calculates the average of latest term scores and weekly tests for both math and english.
const getStudentPerformance = (s: Student): number => {
  const weeklyEngPct = s.engScore != null ? (s.engScore / 15) * 100 : 0;
  const weeklyMathPct = s.mathScore != null ? (s.mathScore / 15) * 100 : 0;

  // Latest English Term Score
  const engTests = s.englishGrandTests || s.grandTests || [];
  const validEngTests = engTests.filter(t => t.score !== null && t.score !== undefined);
  const latestEngTermPct = validEngTests.length > 0
    ? parseFloat(validEngTests[validEngTests.length - 1].score as any)
    : weeklyEngPct;

  // Latest Math Term Score
  const mathTests = s.mathGrandTests || [];
  const validMathTests = mathTests.filter(t => t.score !== null && t.score !== undefined);
  const latestMathTermPct = validMathTests.length > 0
    ? parseFloat(validMathTests[validMathTests.length - 1].score as any)
    : weeklyMathPct;

  return (latestEngTermPct + latestMathTermPct + weeklyEngPct + weeklyMathPct) / 4;
};

// Helper to parse week sorting index
const parseWeekValue = (weekStr: string): number => {
  if (!weekStr) return 0;
  const match = weekStr.match(/^(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 0;
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  students, 
  studentWeeks, 
  authRole = null
}) => {
  // Active/non-deleted students
  const activeStudents = useMemo(() => students.filter(s => !s.isDeleted), [students]);

  // Extract unique weeks in sorted order
  const sortedWeeks = useMemo(() => {
    const weeksSet = new Set<string>();
    studentWeeks.forEach(sw => {
      if (sw.week && !sw.is_deleted) weeksSet.add(sw.week);
    });
    return Array.from(weeksSet).sort((a, b) => parseWeekValue(a) - parseWeekValue(b));
  }, [studentWeeks]);

  const last4Weeks = useMemo(() => sortedWeeks.slice(-4), [sortedWeeks]);

  // Chart States
  const [chartSubject, setChartSubject] = useState<'ENG' | 'MATH'>('ENG');
  const [chartClassGroup, setChartClassGroup] = useState<'5-6' | '7-8' | '9-11'>('5-6');

  // Role Formatted Display
  const roleDisplay = useMemo(() => {
    switch (authRole) {
      case 'admin': return 'Admin Pro';
      case 'admin123': return 'Admin';
      case 'parent': return 'Parent';
      case 'publish': return 'Publisher';
      case 'testor': return 'Testor';
      default: return 'Mehmon';
    }
  }, [authRole]);

  // Role initials placeholder
  const avatarInitials = useMemo(() => {
    if (authRole === 'admin') return 'AP';
    if (authRole === 'admin123') return 'AD';
    if (authRole === 'parent') return 'PT';
    if (authRole === 'publish') return 'PB';
    if (authRole === 'testor') return 'TS';
    return 'G';
  }, [authRole]);

  // Compute Top 3 Students
  const topStudents = useMemo(() => {
    const getTopInRange = (min: number, max: number) => {
      const candidates = activeStudents.filter(s => {
        const grade = getGradeNumber(s.className);
        return grade >= min && grade <= max;
      });
      if (candidates.length === 0) return null;
      return candidates.reduce((best, s) => {
        const score = getStudentPerformance(s);
        const bestScore = getStudentPerformance(best);
        return score > bestScore ? s : best;
      }, candidates[0]);
    };

    return {
      grades5_6: getTopInRange(5, 6),
      grades7_8: getTopInRange(7, 8),
      grades9_11: getTopInRange(9, 11)
    };
  }, [activeStudents]);

  // Compute Weekly Leaders across the last 4 weeks (cumulative score)
  const weeklyLeaders = useMemo(() => {
    if (last4Weeks.length === 0) return [];
    
    const leaders = activeStudents.map(student => {
      // Find all records for this student in the last 4 weeks
      const records = studentWeeks.filter(sw => 
        sw.student_id === student.id && 
        last4Weeks.includes(sw.week) && 
        !sw.is_deleted
      );
      
      if (records.length === 0) return null;
      
      const engSum = records.reduce((sum, r) => sum + (r.eng_score || 0), 0);
      const mathSum = records.reduce((sum, r) => sum + (r.math_score || 0), 0);
      
      const maxScorePerSubject = 15 * last4Weeks.length;
      
      const engPct = Math.round((engSum / maxScorePerSubject) * 100);
      const mathPct = Math.round((mathSum / maxScorePerSubject) * 100);
      const avgPct = (engPct + mathPct) / 2;

      return {
        id: student.id,
        name: student.name,
        surname: student.surname,
        pictureUrl: student.pictureUrl,
        eng: engPct,
        math: mathPct,
        avg: avgPct
      };
    }).filter(Boolean) as any[];

    // Sort descending by average percentage and take top 10
    return leaders.sort((a, b) => b.avg - a.avg).slice(0, 10);
  }, [activeStudents, studentWeeks, last4Weeks]);

  // Compute Term Mastery Line Chart data
  const termMasteryData = useMemo(() => {
    const terms = ['1-Chorak', '2-Chorak', '3-Chorak', '4-Chorak'];
    
    // Determine class filter range
    const [minGrade, maxGrade] = chartClassGroup === '5-6' ? [5, 6] : chartClassGroup === '7-8' ? [7, 8] : [9, 11];
    
    // Filter active students in this range
    const rangeStudents = activeStudents.filter(s => {
      const gr = getGradeNumber(s.className);
      return gr >= minGrade && gr <= maxGrade;
    });

    return terms.map((term, index) => {
      const termNum = index + 1;
      let scoresSum = 0;
      let scoresCount = 0;

      rangeStudents.forEach(s => {
        // Query corresponding tests based on selected subject
        const tests = chartSubject === 'MATH'
          ? (s.mathGrandTests || [])
          : (s.englishGrandTests || s.grandTests || []);

        const namesToTry = [
          `grant ${termNum}`, 
          `${termNum}-chorak`, 
          `${termNum} chorak`, 
          `${termNum}-term`, 
          `${termNum} term`,
          `chorak ${termNum}`,
          `g${termNum}`,
          termNum.toString()
        ].map(n => n.toLowerCase());
        
        const found = tests.find(t => namesToTry.includes(t?.name?.toLowerCase()));

        if (found && found.score !== null && found.score !== undefined && found.score.toString().trim() !== '-') {
          const scoreVal = parseInt(found.score.toString(), 10);
          if (!isNaN(scoreVal)) {
            scoresSum += scoreVal;
            scoresCount++;
          }
        }
      });

      // Returns null if no term scores exist to show blank/available points only
      const average = scoresCount > 0 ? Math.round(scoresSum / scoresCount) : null;

      return {
        name: term,
        Natija: average
      };
    });
  }, [activeStudents, chartSubject, chartClassGroup]);

  // Compute Average Attendance History Bar Chart (last 4 weeks) across all classes
  const attendanceHistoryData = useMemo(() => {
    const activeStudentIds = new Set(activeStudents.map(s => s.id));
    return last4Weeks.map(week => {
      const weekRecords = studentWeeks.filter(sw => 
        sw.week === week && 
        !sw.is_deleted && 
        activeStudentIds.has(sw.student_id)
      );
      let attendanceSum = 0;
      let count = 0;

      weekRecords.forEach(sw => {
        const val = sw.attendance ?? 1;
        const absences = val < 0 ? -val : 0;
        const attPercent = Math.max(0, 100 - absences * 16.67);
        attendanceSum += attPercent;
        count++;
      });

      const average = count > 0 ? Math.round(attendanceSum / count) : 100;
      return {
        name: week,
        Davomat: average
      };
    });
  }, [activeStudents, studentWeeks, last4Weeks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', animation: 'fadeIn 0.4s ease-out', marginTop: '-0.85rem' }}>
      
      {/* ── STYLES ────────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profile-badge {
          background: var(--bg-card);
          border: 1.5px solid var(--border-color);
          transition: all 0.25s ease;
        }
        .profile-container {
          position: relative;
        }
        .profile-hover-popup {
          display: none;
          position: absolute;
          top: 105%;
          right: 0;
          z-index: 100;
          width: 180px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          box-shadow: var(--glass-shadow);
          border-radius: 12px;
          padding: 0.85rem;
          animation: fadeIn 0.15s ease-out;
        }
        .profile-container:hover .profile-hover-popup {
          display: block;
        }
        .top3-card {
          background: var(--bg-card);
          border: 1.5px solid var(--border-color);
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .top3-card:hover {
          transform: translateY(-3px);
          border-color: var(--accent-primary);
          box-shadow: 0 10px 20px rgba(139, 92, 246, 0.08);
        }
        .tab-pill {
          background: var(--bg-card);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        .tab-pill.active {
          background: var(--accent-primary);
          color: #ffffff;
          border-color: var(--accent-primary);
        }
        .toggle-btn {
          background: var(--bg-card);
          color: var(--text-secondary);
          border: 1.5px solid var(--border-color);
          transition: all 0.2s;
        }
        .toggle-btn.active {
          background: var(--accent-gradient);
          color: white;
          border-color: transparent;
        }
        .leaders-table-row {
          border-bottom: 1.5px dashed var(--border-color);
          transition: background 0.2s;
        }
        .leaders-table-row:hover {
          background: var(--bg-card-hover);
        }
        .leaders-table-row:last-child {
          border-bottom: none;
        }
        @media (max-width: 768px) {
          .top3-grid {
            grid-template-columns: 1fr !important;
          }
          .dashboard-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />

      {/* ── HEADER ROW ────────────────────────────────────────────────────── */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        width: '100%', 
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '0.65rem' 
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
          Bosh Sahifa
        </h1>

        {/* Profile Container */}
        <div className="profile-container">
          <div className="profile-badge" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.45rem 1rem',
            borderRadius: '9999px',
            cursor: 'pointer'
          }}>
            {/* Avatar circular badge */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 900
            }}>
              {avatarInitials}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{roleDisplay}</span>
          </div>
          
          {/* Hover popup */}
          <div className="profile-hover-popup">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <User size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Faol Rol:</span>
              </div>
              <div style={{ 
                fontSize: '0.85rem', 
                fontWeight: 900, 
                color: 'var(--text-primary)',
                background: 'var(--bg-card-hover)',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                textAlign: 'center'
              }}>
                {roleDisplay}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP 3 STUDENTS SECTION ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Award size={15} color="var(--accent-primary)" strokeWidth={2.5} />
          Top 3 O'quvchilar
        </h2>
        
        <div className="top3-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {/* Card 1: 5-6 Grades */}
          <div className="top3-card" style={{ borderRadius: '16px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '0.55rem', right: '0.75rem', fontSize: '0.5rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.12rem 0.4rem', borderRadius: '999px', letterSpacing: '0.04em' }}>5-6 SINFLAR</span>
            <div style={{ flexShrink: 0 }}>
              {topStudents.grades5_6?.pictureUrl ? (
                <img src={topStudents.grades5_6.pictureUrl} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 850 }}>
                  {topStudents.grades5_6 ? (topStudents.grades5_6.name[0] + topStudents.grades5_6.surname[0]) : '—'}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {topStudents.grades5_6 ? `${topStudents.grades5_6.surname} ${topStudents.grades5_6.name}` : "Aniqlanmagan"}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {topStudents.grades5_6 ? `Sinf: ${topStudents.grades5_6.className}` : "O'quvchi yo'q"}
              </p>
            </div>
          </div>

          {/* Card 2: 7-8 Grades */}
          <div className="top3-card" style={{ borderRadius: '16px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '0.55rem', right: '0.75rem', fontSize: '0.5rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.12rem 0.4rem', borderRadius: '999px', letterSpacing: '0.04em' }}>7-8 SINFLAR</span>
            <div style={{ flexShrink: 0 }}>
              {topStudents.grades7_8?.pictureUrl ? (
                <img src={topStudents.grades7_8.pictureUrl} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 850 }}>
                  {topStudents.grades7_8 ? (topStudents.grades7_8.name[0] + topStudents.grades7_8.surname[0]) : '—'}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {topStudents.grades7_8 ? `${topStudents.grades7_8.surname} ${topStudents.grades7_8.name}` : "Aniqlanmagan"}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {topStudents.grades7_8 ? `Sinf: ${topStudents.grades7_8.className}` : "O'quvchi yo'q"}
              </p>
            </div>
          </div>

          {/* Card 3: 9-11 Grades */}
          <div className="top3-card" style={{ borderRadius: '16px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '0.55rem', right: '0.75rem', fontSize: '0.5rem', fontWeight: 800, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '0.12rem 0.4rem', borderRadius: '999px', letterSpacing: '0.04em' }}>9-11 SINFLAR</span>
            <div style={{ flexShrink: 0 }}>
              {topStudents.grades9_11?.pictureUrl ? (
                <img src={topStudents.grades9_11.pictureUrl} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 850 }}>
                  {topStudents.grades9_11 ? (topStudents.grades9_11.name[0] + topStudents.grades9_11.surname[0]) : '—'}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {topStudents.grades9_11 ? `${topStudents.grades9_11.surname} ${topStudents.grades9_11.name}` : "Aniqlanmagan"}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {topStudents.grades9_11 ? `Sinf: ${topStudents.grades9_11.className}` : "O'quvchi yo'q"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM DOUBLE COLUMN LAYOUT ──────────────────────────────────── */}
      <div className="dashboard-columns" style={{ display: 'grid', gridTemplateColumns: '4.5fr 5.5fr', gap: '1rem', width: '100%' }}>
        
        {/* LEFT COLUMN: Hafta Liderlari */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-color)',
          borderRadius: '24px',
          padding: '0.85rem 1.15rem',
          boxShadow: 'var(--glass-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxSizing: 'border-box'
        }}>
          {/* Header & Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Hafta Liderlari
            </h2>
            
            {/* Last 4 weeks indicators */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
              <span style={{
                background: 'var(--accent-primary)',
                color: '#ffffff',
                padding: '0.35rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 750,
                whiteSpace: 'nowrap'
              }}>
                So'nggi 4 hafta jami
              </span>
              {last4Weeks.map(week => (
                <span
                  key={week}
                  style={{
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-secondary)',
                    border: '1.5px solid var(--border-color)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {week}
                </span>
              ))}
            </div>
          </div>

          {/* Leaders Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {weeklyLeaders.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Natijalar topilmadi
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border-color)' }}>
                    <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>O'QUVCHI</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>ENG</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>MATH</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyLeaders.map((lead, idx) => (
                    <tr key={lead.id || idx} className="leaders-table-row">
                      <td style={{ padding: '0.45rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', width: '12px' }}>{idx + 1}</span>
                        {lead.pictureUrl ? (
                          <img src={lead.pictureUrl} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--bg-card-hover)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.62rem',
                            fontWeight: 800
                          }}>
                            {lead.name[0]}{lead.surname[0]}
                          </div>
                        )}
                        <span style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {lead.surname} {lead.name}
                        </span>
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', fontWeight: 850, color: 'var(--accent-primary)', textAlign: 'center' }}>
                        {lead.eng}%
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', fontWeight: 850, color: '#f97316', textAlign: 'center' }}>
                        {lead.math}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHARTS STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Chart 1: Average Term Mastery Index */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '24px',
            padding: '0.85rem 1.15rem',
            boxShadow: 'var(--glass-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxSizing: 'border-box'
          }}>
            {/* Header filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <TrendingUp size={14} color="var(--accent-primary)" />
                  O'rtacha o'zlashtirish
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Choraklik o'rtacha natijalar dinamikasi
                </p>
              </div>

              {/* Subject toggle (Eng / Math) */}
              <div style={{ display: 'flex', background: 'var(--bg-card-hover)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setChartSubject('ENG')}
                  className={`toggle-btn ${chartSubject === 'ENG' ? 'active' : ''}`}
                  style={{
                    padding: '0.25rem 0.65rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Eng
                </button>
                <button
                  onClick={() => setChartSubject('MATH')}
                  className={`toggle-btn ${chartSubject === 'MATH' ? 'active' : ''}`}
                  style={{
                    padding: '0.25rem 0.65rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Math
                </button>
              </div>
            </div>

            {/* Class range toggle (5-6, 7-8, 9-11) */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { id: '5-6', label: '5-6 Sinflar' },
                { id: '7-8', label: '7-8 Sinflar' },
                { id: '9-11', label: '9-11 Sinflar' }
              ].map(grp => (
                <button
                  key={grp.id}
                  onClick={() => setChartClassGroup(grp.id as any)}
                  className={`tab-pill ${chartClassGroup === grp.id ? 'active' : ''}`}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  {grp.label}
                </button>
              ))}
            </div>

            {/* Recharts Line Chart */}
            <div style={{ height: '160px', width: '100%', marginTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={termMasteryData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    ticks={[0, 30, 60, 90]}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Natija" 
                    stroke={chartSubject === 'MATH' ? '#f97316' : 'var(--accent-primary)'} 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Attendance History Rate */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '24px',
            padding: '0.85rem 1.15rem',
            boxShadow: 'var(--glass-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxSizing: 'border-box'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} color="#3b82f6" />
                Haftalik Davomat
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Oxirgi 4 haftalik davomat dinamikasi (o'rtacha)
              </p>
            </div>

            {/* Recharts Attendance Bar Chart */}
            <div style={{ height: '150px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceHistoryData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    ticks={[0, 30, 60, 90]}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar 
                    dataKey="Davomat" 
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
