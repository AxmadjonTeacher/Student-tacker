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
  const [selectedLeaderWeek, setSelectedLeaderWeek] = useState<string>(() => {
    return last4Weeks.length > 0 ? last4Weeks[last4Weeks.length - 1] : '';
  });

  const activeLeaderWeek = selectedLeaderWeek || (last4Weeks.length > 0 ? last4Weeks[last4Weeks.length - 1] : '');

  // Chart States
  const [chartSubject, setChartSubject] = useState<'ENG' | 'MATH'>('ENG');
  const [chartClassGroup, setChartClassGroup] = useState<'5-6' | '7-8' | '9-11'>('5-6');
  
  // Weekly Leaders State
  const [leaderClassGroup, setLeaderClassGroup] = useState<'5-6' | '7-8' | '9-11'>('5-6');

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

  // Compute Weekly Leaders for the selected week & selected class range
  const weeklyLeaders = useMemo(() => {
    if (!activeLeaderWeek) return [];
    
    const [minGrade, maxGrade] = leaderClassGroup === '5-6' ? [5, 6] : leaderClassGroup === '7-8' ? [7, 8] : [9, 11];
    const weekRecords = studentWeeks.filter(sw => sw.week === activeLeaderWeek && !sw.is_deleted);
    
    const leaders = weekRecords.map(sw => {
      const student = activeStudents.find(s => s.id === sw.student_id);
      if (!student) return null;
      
      const gr = getGradeNumber(student.className);
      if (gr < minGrade || gr > maxGrade) return null;
      
      const engPct = sw.eng_score != null ? Math.round((sw.eng_score / 15) * 100) : 0;
      const mathPct = sw.math_score != null ? Math.round((sw.math_score / 15) * 100) : 0;
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

    // Sort descending by average percentage and take top 5
    return leaders.sort((a, b) => b.avg - a.avg).slice(0, 5);
  }, [activeStudents, studentWeeks, activeLeaderWeek, leaderClassGroup]);

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
        const attPercent = val < 0 ? Math.max(0, 100 + val * 16.67) : (val === 1 ? 100 : val);
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
          backdrop-filter: var(--backdrop-blur-md);
          -webkit-backdrop-filter: var(--backdrop-blur-md);
          border: 1px solid var(--border-subtle);
          border-radius: 9999px;
          box-shadow: var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight);
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .profile-badge:hover {
          background: var(--bg-card-hover);
          transform: translateY(-1px);
        }
        .profile-container {
          position: relative;
        }
        .profile-hover-popup {
          display: none;
          position: absolute;
          top: 110%;
          right: 0;
          z-index: 100;
          width: 200px;
          background: var(--bg-card);
          backdrop-filter: var(--backdrop-blur-md);
          -webkit-backdrop-filter: var(--backdrop-blur-md);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--glass-shadow-soft);
          border-radius: 20px;
          padding: 1rem;
          animation: premiumScaleIn 0.3s forwards cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .profile-container:hover .profile-hover-popup {
          display: block;
        }
        .top3-card {
          background: var(--bg-card);
          backdrop-filter: var(--backdrop-blur-md);
          -webkit-backdrop-filter: var(--backdrop-blur-md);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight);
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .top3-card:hover {
          transform: scale(1.02) translateY(-3px);
          border-color: var(--text-primary);
          box-shadow: 0 16px 36px var(--accent-glow), inset 0 1px 0 var(--border-highlight);
        }
        .tab-pill {
          background: var(--bg-card);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 9999px !important;
          box-shadow: var(--glass-shadow-soft);
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .tab-pill.active {
          background: var(--accent-hero);
          color: #ffffff;
          border-color: var(--accent-hero);
          box-shadow: 0 4px 12px var(--accent-glow);
        }
        .toggle-btn {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid transparent;
          border-radius: 9999px !important;
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .toggle-btn.active {
          background: var(--text-primary);
          color: var(--bg-main);
          box-shadow: var(--glass-shadow-soft);
        }
        .leaders-table-row {
          border-bottom: 1px solid var(--border-subtle);
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .leaders-table-row:hover {
          background: var(--bg-card-hover);
          transform: translateX(4px);
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
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '1rem' 
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Award size={16} color="var(--accent-hero)" strokeWidth={2.5} />
          Top 3 O'quvchilar
        </h2>
        
        <div className="top3-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {/* Card 1: 5-6 Grades */}
          <div className="top3-card" style={{ borderRadius: '24px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '0.75rem', right: '1rem', fontSize: '0.55rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.15rem 0.5rem', borderRadius: '999px', letterSpacing: '0.04em' }}>5-6 SINFLAR</span>
            <div style={{ flexShrink: 0 }}>
              {topStudents.grades5_6?.pictureUrl ? (
                <img src={topStudents.grades5_6.pictureUrl} alt="avatar" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-subtle)' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-hero)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 850 }}>
                  {topStudents.grades5_6 ? (topStudents.grades5_6.name[0] + topStudents.grades5_6.surname[0]) : '—'}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {topStudents.grades5_6 ? `${topStudents.grades5_6.surname} ${topStudents.grades5_6.name}` : "Aniqlanmagan"}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {topStudents.grades5_6 ? `Sinf: ${topStudents.grades5_6.className}` : "O'quvchi yo'q"}
              </p>
            </div>
          </div>

          {/* Card 2: 7-8 Grades */}
          <div className="top3-card" style={{ borderRadius: '24px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '0.75rem', right: '1rem', fontSize: '0.55rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.5rem', borderRadius: '999px', letterSpacing: '0.04em' }}>7-8 SINFLAR</span>
            <div style={{ flexShrink: 0 }}>
              {topStudents.grades7_8?.pictureUrl ? (
                <img src={topStudents.grades7_8.pictureUrl} alt="avatar" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-subtle)' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-hero)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 850 }}>
                  {topStudents.grades7_8 ? (topStudents.grades7_8.name[0] + topStudents.grades7_8.surname[0]) : '—'}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {topStudents.grades7_8 ? `${topStudents.grades7_8.surname} ${topStudents.grades7_8.name}` : "Aniqlanmagan"}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {topStudents.grades7_8 ? `Sinf: ${topStudents.grades7_8.className}` : "O'quvchi yo'q"}
              </p>
            </div>
          </div>

          {/* Card 3: 9-11 Grades */}
          <div className="top3-card" style={{ borderRadius: '24px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '0.75rem', right: '1rem', fontSize: '0.55rem', fontWeight: 800, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '0.15rem 0.5rem', borderRadius: '999px', letterSpacing: '0.04em' }}>9-11 SINFLAR</span>
            <div style={{ flexShrink: 0 }}>
              {topStudents.grades9_11?.pictureUrl ? (
                <img src={topStudents.grades9_11.pictureUrl} alt="avatar" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-subtle)' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-hero)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 850 }}>
                  {topStudents.grades9_11 ? (topStudents.grades9_11.name[0] + topStudents.grades9_11.surname[0]) : '—'}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {topStudents.grades9_11 ? `${topStudents.grades9_11.surname} ${topStudents.grades9_11.name}` : "Aniqlanmagan"}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {topStudents.grades9_11 ? `Sinf: ${topStudents.grades9_11.className}` : "O'quvchi yo'q"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM DOUBLE COLUMN LAYOUT ──────────────────────────────────── */}
      <div className="dashboard-columns" style={{ display: 'grid', gridTemplateColumns: '4.5fr 5.5fr', gap: '1.25rem', width: '100%' }}>
        
        {/* LEFT COLUMN: Hafta Liderlari */}
        <div style={{
          background: 'var(--bg-card)',
          backdropFilter: 'var(--backdrop-blur-md)',
          WebkitBackdropFilter: 'var(--backdrop-blur-md)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '32px',
          padding: '1.75rem 2rem',
          boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxSizing: 'border-box'
        }}>
          {/* Header & Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Hafta Liderlari
            </h2>
            
            {/* Week Dropdown & Grade Filter Toggles */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem' }}>
              {/* Week Dropdown */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={activeLeaderWeek}
                  onChange={(e) => setSelectedLeaderWeek(e.target.value)}
                  style={{
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '9999px',
                    padding: '0.45rem 2rem 0.45rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {last4Weeks.map(week => (
                    <option key={week} value={week}>{week}</option>
                  ))}
                </select>
                {/* Custom Chevron indicator */}
                <div style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  borderTop: '5px solid var(--text-secondary)',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent'
                }} />
              </div>
              
              {/* Grade Toggles */}
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[
                  { id: '5-6', label: '5-6' },
                  { id: '7-8', label: '7-8' },
                  { id: '9-11', label: '9-11' }
                ].map(grp => (
                  <button
                    key={grp.id}
                    onClick={() => setLeaderClassGroup(grp.id as any)}
                    className={`tab-pill ${leaderClassGroup === grp.id ? 'active' : ''}`}
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.68rem',
                      fontWeight: 750,
                      cursor: 'pointer'
                    }}
                  >
                    {grp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaders Cards */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {weeklyLeaders.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Natijalar topilmadi
              </div>
            ) : (
              weeklyLeaders.map((lead, idx) => (
                <div 
                  key={lead.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    boxShadow: 'var(--glass-shadow-soft)',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01) translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Left Side: Avatar & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--bg-card)',
                      border: '1.5px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 900
                    }}>
                      {idx + 1}
                    </div>

                    {lead.pictureUrl ? (
                      <img 
                        src={lead.pictureUrl} 
                        alt="avatar" 
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-color)' }} 
                      />
                    ) : (
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'var(--bg-card)',
                        color: 'var(--text-secondary)',
                        border: '1.5px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 800
                      }}>
                        {lead.name[0]}{lead.surname[0]}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {lead.surname} {lead.name}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Score Metrics */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '42px' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>ENG</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{lead.eng}%</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '42px' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>MATH</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#f97316' }}>{lead.math}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHARTS STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Chart 1: Average Term Mastery Index */}
          <div style={{
            background: 'var(--bg-card)',
            backdropFilter: 'var(--backdrop-blur-md)',
            WebkitBackdropFilter: 'var(--backdrop-blur-md)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '32px',
            padding: '1.75rem 2rem',
            boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
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
              <div style={{
                display: 'flex',
                background: 'var(--bg-card-hover)',
                padding: '3px',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--inner-inset)'
              }}>
                <button
                  onClick={() => setChartSubject('ENG')}
                  className={`toggle-btn ${chartSubject === 'ENG' ? 'active' : ''}`}
                  style={{
                    padding: '0.35rem 0.85rem',
                    border: 'none',
                    borderRadius: '9999px',
                    fontSize: '0.68rem',
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
                    padding: '0.35rem 0.85rem',
                    border: 'none',
                    borderRadius: '9999px',
                    fontSize: '0.68rem',
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
            backdropFilter: 'var(--backdrop-blur-md)',
            WebkitBackdropFilter: 'var(--backdrop-blur-md)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '32px',
            padding: '1.75rem 2rem',
            boxShadow: 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
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
