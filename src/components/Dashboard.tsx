import React, { useMemo } from 'react';
import { 
  Users, Award, Calendar, Trophy, Sparkles, 
  ChevronRight, TrendingUp, ClipboardList
} from 'lucide-react';
import type { Student } from '../types';

interface DashboardProps {
  students: Student[];
  studentWeeks: any[];
  availableClasses: string[];
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  weeksList: string[];
  onSelectClass: (cls: string) => void;
}

// Helper to group classes (same as in App.tsx)
const getLocalClassGroup = (clsName: string): string => {
  const trimmed = clsName?.toString().trim() || '';
  const match = trimmed.match(/^(\d+)/);
  return match ? `${match[1]}-Sinf` : trimmed;
};

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  studentWeeks,
  availableClasses,
  selectedWeek,
  onWeekChange,
  weeksList,
  onSelectClass
}) => {
  // Get active students list
  const activeStudents = useMemo(() => {
    return students.filter(s => !s.isDeleted);
  }, [students]);

  // Calculate dynamic metrics for each student based on the selected week
  const projectedStudents = useMemo(() => {
    return activeStudents.map(student => {
      let engScore = student.engScore ?? 0;
      let mathScore = student.mathScore ?? 0;
      let attendance = student.attendance ?? 1;
      let homework = student.homework ?? 1;

      if (selectedWeek) {
        const hist = studentWeeks.find(sw => sw.student_id === student.id && sw.week === selectedWeek);
        if (hist) {
          engScore = hist.eng_score ?? student.engScore ?? 0;
          mathScore = hist.math_score ?? student.mathScore ?? 0;
          attendance = hist.attendance ?? student.attendance ?? 1;
          homework = hist.homework ?? student.homework ?? 1;
        } else {
          engScore = 0;
          mathScore = 0;
          attendance = 1;
          homework = 1;
        }
      }

      // Convert raw scores to percentages
      const engPercent = (engScore / 15) * 100;
      const mathPercent = (mathScore / 15) * 100;
      const absences = attendance < 0 ? -attendance : 0;
      const attPercent = Math.max(0, 100 - absences * 16.67);
      const missedHw = homework < 0 ? -homework : 0;
      const hwPercent = Math.max(0, 100 - missedHw * 20);
      const overallPercent = (engPercent + mathPercent + attPercent + hwPercent) / 4;

      return {
        ...student,
        engPercent,
        mathPercent,
        attPercent,
        hwPercent,
        overallPercent,
        rawEng: engScore,
        rawMath: mathScore,
        rawAtt: absences,
        rawHw: missedHw
      };
    });
  }, [activeStudents, selectedWeek, studentWeeks]);

  // Calculate overall metrics
  const totalStudentsCount = projectedStudents.length;

  const overallAvgScore = useMemo(() => {
    if (totalStudentsCount === 0) return 0;
    // Combine English and Math scores percentage
    const totalScorePercent = projectedStudents.reduce((sum, s) => sum + (s.engPercent + s.mathPercent) / 2, 0);
    return totalScorePercent / totalStudentsCount;
  }, [projectedStudents, totalStudentsCount]);

  const overallAttendance = useMemo(() => {
    if (totalStudentsCount === 0) return 0;
    const totalAttPercent = projectedStudents.reduce((sum, s) => sum + s.attPercent, 0);
    return totalAttPercent / totalStudentsCount;
  }, [projectedStudents, totalStudentsCount]);

  // Calculate class metrics
  const classMetrics = useMemo(() => {
    return availableClasses.map(clsGroup => {
      const classStudents = projectedStudents.filter(s => getLocalClassGroup(s.className.toUpperCase()) === clsGroup);
      const count = classStudents.length;

      if (count === 0) {
        return {
          name: clsGroup,
          studentCount: 0,
          engAvg: 0,
          mathAvg: 0,
          attAvg: 0,
          hwAvg: 0,
          overallAvg: 0
        };
      }

      const engAvg = classStudents.reduce((sum, s) => sum + s.engPercent, 0) / count;
      const mathAvg = classStudents.reduce((sum, s) => sum + s.mathPercent, 0) / count;
      const attAvg = classStudents.reduce((sum, s) => sum + s.attPercent, 0) / count;
      const hwAvg = classStudents.reduce((sum, s) => sum + s.hwPercent, 0) / count;
      const overallAvg = classStudents.reduce((sum, s) => sum + s.overallPercent, 0) / count;

      return {
        name: clsGroup,
        studentCount: count,
        engAvg,
        mathAvg,
        attAvg,
        hwAvg,
        overallAvg
      };
    });
  }, [projectedStudents, availableClasses]);

  // Determine best performing class
  const bestClass = useMemo(() => {
    const validClasses = classMetrics.filter(c => c.studentCount > 0);
    if (validClasses.length === 0) return { name: "Noma'lum", score: 0 };
    
    const sorted = [...validClasses].sort((a, b) => b.overallAvg - a.overallAvg);
    return {
      name: sorted[0].name,
      score: sorted[0].overallAvg
    };
  }, [classMetrics]);

  // Identify top students (limit to 5)
  const topStudents = useMemo(() => {
    return [...projectedStudents]
      .sort((a, b) => b.overallPercent - a.overallPercent)
      .slice(0, 5);
  }, [projectedStudents]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #4338ca 100%)',
        borderRadius: '24px',
        padding: '2.2rem 2.5rem',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 12px 24px -4px rgba(79, 70, 229, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 75%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: '#fcd34d' }} />
            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
              Tahliliy Dashboard
            </h2>
          </div>
          <p style={{ fontSize: '0.95rem', color: '#e0e7ff', fontWeight: 500, margin: 0, opacity: 0.9 }}>
            Maktab o'quvchilari o'zlashtirish va davomat ko'rsatkichlarining to'liq tahlili
          </p>
        </div>

        {/* Dropdown controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 2 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e0e7ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hisobot Davri:
          </span>
          <select
            value={selectedWeek}
            onChange={(e) => onWeekChange(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '14px',
              padding: '0.65rem 2.25rem 0.65rem 1rem',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23ffffff\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1.25rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
              minWidth: '160px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
          >
            <option value="" style={{ color: '#1e293b', fontWeight: 600 }}>Umumiy Natijalar</option>
            {weeksList.map(wk => (
              <option key={wk} value={wk} style={{ color: '#1e293b', fontWeight: 600 }}>{wk}-Hafta</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        width: '100%'
      }}>
        {/* KPI 1: Total Students */}
        <div 
          className="kpi-card"
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.2rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
          }}
        >
          <div style={{
            background: 'rgba(79, 70, 229, 0.1)',
            color: '#4f46e5',
            borderRadius: '16px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              O'quvchilar
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
              {totalStudentsCount}
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
              Faol ta'lim oluvchilar
            </p>
          </div>
        </div>

        {/* KPI 2: Overall Score Percentage */}
        <div 
          className="kpi-card"
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.2rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
          }}
        >
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            borderRadius: '16px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Award size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              O'zlashtirish
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
              {overallAvgScore.toFixed(1)}%
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
              <span style={{ color: '#16a34a' }}>ENG: {(projectedStudents.reduce((sum, s) => sum + s.engPercent, 0) / (totalStudentsCount || 1)).toFixed(0)}%</span>
              <span>|</span>
              <span style={{ color: '#0d9488' }}>MATH: {(projectedStudents.reduce((sum, s) => sum + s.mathPercent, 0) / (totalStudentsCount || 1)).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Attendance */}
        <div 
          className="kpi-card"
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.2rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
          }}
        >
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            borderRadius: '16px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Davomat
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
              {overallAttendance.toFixed(1)}%
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
              Darslarga qatnashish darajasi
            </p>
          </div>
        </div>

        {/* KPI 4: Best performing class */}
        <div 
          className="kpi-card"
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.2rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
          }}
        >
          <div style={{
            background: 'rgba(236, 72, 153, 0.1)',
            color: '#ec4899',
            borderRadius: '16px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Trophy size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ilg'or Sinf
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              {bestClass.name}
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              Umumiy: {bestClass.score.toFixed(1)}% o'rtacha
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout Content Area: Left = Class Comparison, Right = Top Students */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.1fr',
        gap: '1.5rem',
        width: '100%',
        alignItems: 'start'
      }}>
        {/* CSS styles to make it responsive on smaller screens */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 1024px) {
            div.dashboard-grid-content {
              grid-template-columns: 1fr !important;
            }
          }
          .dashboard-row-clickable:hover {
            background-color: #f8fafc !important;
            cursor: pointer;
          }
        `}} />

        <div className="dashboard-grid-content" style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '1.5rem', gridColumn: 'span 2' }}>
          
          {/* Left panel: Class comparison breakdown */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ClipboardList size={20} style={{ color: '#4f46e5' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Sinflar kesimida tahlil
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '20px', color: '#64748b', fontWeight: 700 }}>
                {classMetrics.filter(c => c.studentCount > 0).length} Faol sinf
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sinf</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>O'quvchi</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ingliz tili</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Matematika</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Umumiy ball</th>
                  </tr>
                </thead>
                <tbody>
                  {classMetrics.map(cls => {
                    const hasStudents = cls.studentCount > 0;
                    
                    return (
                      <tr 
                        key={cls.name} 
                        onClick={() => hasStudents && onSelectClass(cls.name)}
                        className={hasStudents ? "dashboard-row-clickable" : ""}
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                          opacity: hasStudents ? 1 : 0.5
                        }}
                      >
                        <td style={{ padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{cls.name}</span>
                          {bestClass.name === cls.name && hasStudents && (
                            <Trophy size={14} style={{ color: '#f59e0b' }} />
                          )}
                        </td>
                        <td style={{ padding: '1.1rem 1.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                          {cls.studentCount} ta o'quvchi
                        </td>
                        <td style={{ padding: '1.1rem 1.5rem' }}>
                          <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700 }}>
                            {hasStudents ? `${cls.engAvg.toFixed(0)}%` : '-'}
                          </span>
                        </td>
                        <td style={{ padding: '1.1rem 1.5rem' }}>
                          <span style={{ fontSize: '0.9rem', color: '#0d9488', fontWeight: 700 }}>
                            {hasStudents ? `${cls.mathAvg.toFixed(0)}%` : '-'}
                          </span>
                        </td>
                        <td style={{ padding: '1.1rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                            <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800, width: '40px', flexShrink: 0 }}>
                              {hasStudents ? `${cls.overallAvg.toFixed(1)}%` : '-'}
                            </span>
                            {hasStudents && (
                              <div style={{ background: '#e2e8f0', borderRadius: '9999px', height: '8px', flex: 1, overflow: 'hidden' }}>
                                <div style={{ 
                                  background: cls.overallAvg >= 80 ? 'linear-gradient(90deg, #10b981, #059669)' : cls.overallAvg >= 60 ? 'linear-gradient(90deg, #4f46e5, #6366f1)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                                  width: `${cls.overallAvg}%`, 
                                  height: '100%', 
                                  borderRadius: '9999px' 
                                }} />
                              </div>
                            )}
                            {hasStudents && (
                              <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel: Top performing students */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            padding: '1.5rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <TrendingUp size={20} style={{ color: '#10b981' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Hafta Qahramonlari
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                  Ma'lumotlar mavjud emas
                </div>
              ) : (
                topStudents.map((student, idx) => {
                  const placeColors = [
                    { border: '2.5px solid #f59e0b', badge: '#fef3c7', text: '#b45309', label: '1' },
                    { border: '2.5px solid #94a3b8', badge: '#f1f5f9', text: '#475569', label: '2' },
                    { border: '2.5px solid #b45309', badge: '#ffedd5', text: '#c2410c', label: '3' },
                    { border: '1.5px solid #e2e8f0', badge: '#f8fafc', text: '#64748b', label: '4' },
                    { border: '1.5px solid #e2e8f0', badge: '#f8fafc', text: '#64748b', label: '5' }
                  ];
                  const place = placeColors[idx] || placeColors[4];

                  // Generate Avatar Initials
                  const initials = student.name && student.surname 
                    ? `${student.name.charAt(0)}${student.surname.charAt(0)}`.toUpperCase() 
                    : student.name ? student.name.charAt(0).toUpperCase() : '?';

                  return (
                    <div 
                      key={student.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: idx === 0 ? 'linear-gradient(to right, rgba(254, 243, 199, 0.25), transparent)' : 'transparent',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '16px',
                        border: idx === 0 ? '1px dashed #fcd34d' : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {/* Place Badge */}
                        <span style={{
                          background: place.badge,
                          color: place.text,
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {place.label}
                        </span>

                        {/* Avatar */}
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: idx === 0 ? '#fcd34d' : '#6366f1',
                          color: idx === 0 ? '#78350f' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          overflow: 'hidden',
                          border: place.border,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                          flexShrink: 0
                        }}>
                          {student.pictureUrl ? (
                            <img src={student.pictureUrl} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials
                          )}
                        </div>

                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                            {student.name} {student.surname}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                            {student.className.toUpperCase()} SINF
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '1rem', color: idx === 0 ? '#b45309' : '#0f172a', fontWeight: 900 }}>
                          {student.overallPercent.toFixed(1)}%
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                          Eng: {student.rawEng} | Math: {student.rawMath}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
