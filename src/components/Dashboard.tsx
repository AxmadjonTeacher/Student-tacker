import React, { useMemo } from 'react';
import { 
  Trophy, Sparkles, ChevronRight, TrendingUp, ClipboardList, Award, CheckCircle
} from 'lucide-react';
import type { Student } from '../types';

interface DashboardProps {
  students: Student[];
  studentWeeks: any[];
  availableClasses: string[];
  onSelectClass: (cls: string) => void;
}

// Helpers to parse level strings to integers
const parseLevelToNumber = (lvl: string): number => {
  if (!lvl) return 1;
  const cleaned = lvl.toString().trim().toUpperCase();
  if (cleaned.includes('LEVEL')) {
    const match = cleaned.match(/LEVEL\s*(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  if (cleaned.includes('A1')) return 1;
  if (cleaned.includes('A2')) return 2;
  if (cleaned.includes('B1')) return 3;
  if (cleaned.includes('B2')) return 4;
  if (cleaned.includes('C1')) return 5;
  if (cleaned.includes('C2')) return 6;
  
  const digitMatch = cleaned.match(/(\d+)/);
  if (digitMatch) return parseInt(digitMatch[1], 10);
  return 1; // Default fallback
};

// Helper to format average index back to a readable CEFR/Level tag
const formatLevelName = (val: number): string => {
  if (val <= 0) return 'L0';
  const integerPart = Math.floor(val);
  const fraction = val - integerPart;
  let baseLabel = '';
  
  if (integerPart <= 1) baseLabel = 'L1 (A1)';
  else if (integerPart === 2) baseLabel = 'L2 (A2)';
  else if (integerPart === 3) baseLabel = 'L3 (B1)';
  else if (integerPart === 4) baseLabel = 'L4 (B2)';
  else if (integerPart === 5) baseLabel = 'L5 (C1)';
  else baseLabel = `L${integerPart} (C2)`;
  
  if (fraction >= 0.75) return `L${integerPart + 1}`;
  if (fraction >= 0.25) return `${baseLabel}+`;
  return baseLabel;
};

// Helper to group classes (same as in App.tsx)
const getLocalClassGroup = (clsName: string): string => {
  const trimmed = clsName?.toString().trim() || '';
  const match = trimmed.match(/^(\d+)/);
  return match ? `${match[1]}-Sinf` : trimmed;
};

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  availableClasses,
  onSelectClass
}) => {
  // Get active students list
  const activeStudents = useMemo(() => {
    return students.filter(s => !s.isDeleted);
  }, [students]);

  // Calculate dynamic metrics for each student based on current/latest levels
  const studentsWithMetrics = useMemo(() => {
    return activeStudents.map(student => {
      const engStart = parseLevelToNumber(student.startingLevel);
      const engCurr = parseLevelToNumber(student.currentLevel || student.startingLevel);
      const mathStart = parseLevelToNumber(student.mathStartingLevel || 'Level 1');
      const mathCurr = parseLevelToNumber(student.mathCurrentLevel || 'Level 1');

      const engGrowth = Math.max(0, engCurr - engStart);
      const mathGrowth = Math.max(0, mathCurr - mathStart);
      const combinedGrowth = engGrowth + mathGrowth;

      const hasEngCert = engCurr >= 3;  // Level 3 (B1) or higher
      const hasMathCert = mathCurr >= 3; // Level 3 or higher
      const hasCert = hasEngCert || hasMathCert;

      return {
        ...student,
        engStart,
        engCurr,
        mathStart,
        mathCurr,
        engGrowth,
        mathGrowth,
        combinedGrowth,
        hasEngCert,
        hasMathCert,
        hasCert
      };
    });
  }, [activeStudents]);

  // Total Students Count
  const totalStudentsCount = studentsWithMetrics.length;

  // KPI 1: Certified Students
  const totalCertificatesCount = useMemo(() => {
    return studentsWithMetrics.filter(s => s.hasCert).length;
  }, [studentsWithMetrics]);

  // KPI 2: English Certificate Count (CEFR B1+)
  const engCertificatesCount = useMemo(() => {
    return studentsWithMetrics.filter(s => s.hasEngCert).length;
  }, [studentsWithMetrics]);

  // KPI 3: Math Certificate Count
  const mathCertificatesCount = useMemo(() => {
    return studentsWithMetrics.filter(s => s.hasMathCert).length;
  }, [studentsWithMetrics]);

  // KPI 4: Average Level Growth
  const averageGrowth = useMemo(() => {
    if (totalStudentsCount === 0) return 0;
    const totalGrowth = studentsWithMetrics.reduce((sum, s) => sum + (s.engGrowth + s.mathGrowth) / 2, 0);
    return totalGrowth / totalStudentsCount;
  }, [studentsWithMetrics, totalStudentsCount]);

  // Calculate class metrics
  const classMetrics = useMemo(() => {
    return availableClasses.map(clsGroup => {
      const classStudents = studentsWithMetrics.filter(s => getLocalClassGroup(s.className.toUpperCase()) === clsGroup);
      const count = classStudents.length;

      if (count === 0) {
        return {
          name: clsGroup,
          studentCount: 0,
          engAvgLvl: 0,
          mathAvgLvl: 0,
          maxGrowth: 0,
          maxGrowthStudentName: '-'
        };
      }

      // Calculate overall average level indices
      const engAvgLvl = classStudents.reduce((sum, s) => sum + s.engCurr, 0) / count;
      const mathAvgLvl = classStudents.reduce((sum, s) => sum + s.mathCurr, 0) / count;

      // Find highest rise in this class
      let maxGrowth = 0;
      let topStudent: typeof classStudents[0] | null = null;
      classStudents.forEach(s => {
        if (s.combinedGrowth >= maxGrowth) {
          maxGrowth = s.combinedGrowth;
          topStudent = s;
        }
      });

      return {
        name: clsGroup,
        studentCount: count,
        engAvgLvl,
        mathAvgLvl,
        maxGrowth,
        maxGrowthStudentName: topStudent ? `${(topStudent as any).name} ${(topStudent as any).surname.charAt(0)}.` : '-'
      };
    });
  }, [studentsWithMetrics, availableClasses]);

  // Determine top growth students (limit to 5)
  const topGrowthLeaders = useMemo(() => {
    return [...studentsWithMetrics]
      .filter(s => s.combinedGrowth > 0)
      .sort((a, b) => b.combinedGrowth - a.combinedGrowth)
      .slice(0, 5);
  }, [studentsWithMetrics]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Dynamic Marquee Keyframe Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes draw-line {
          to { stroke-dashoffset: 0; }
        }
        @keyframes float-up {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .marquee-content-left {
          display: inline-flex;
          animation: scroll-left 25s linear infinite;
        }
        .marquee-content-right {
          display: inline-flex;
          animation: scroll-right 25s linear infinite;
        }
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08) !important;
        }
        .dashboard-row-clickable:hover {
          background-color: #f8fafc !important;
          cursor: pointer;
        }
      `}} />

      {/* Standalone Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={22} style={{ color: '#6366f1' }} />
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
            Bosh Sahifa
          </h2>
        </div>
        <span style={{ fontSize: '0.8rem', background: '#e0e7ff', color: '#4f46e5', padding: '0.35rem 0.8rem', borderRadius: '20px', fontWeight: 800 }}>
          {totalStudentsCount} ta o'quvchi monitoringi
        </span>
      </div>

      {/* Velocity Scroll Banner Box */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '1.75rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Continuous Marquees */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          {/* Edge Fading Mask */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '60px',
            background: 'linear-gradient(to right, #ffffff, transparent)',
            zIndex: 10,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '60px',
            background: 'linear-gradient(to left, #ffffff, transparent)',
            zIndex: 10,
            pointerEvents: 'none'
          }} />

          {/* Lane 1: AL-XORAZMIY MAKTABI (Gray/Teal scrolling left) */}
          <div className="marquee-container" style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', display: 'flex' }}>
            <div className="marquee-content-left" style={{
              display: 'inline-flex',
              gap: '2.5rem',
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#0d9488', // Teal
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>AL-XORAZMIY MAKTABI</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
            </div>
          </div>

          {/* Lane 2: TA'LIMDA INNOVATSIYA (Indigo-Violet scrolling right) */}
          <div className="marquee-container" style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', display: 'flex' }}>
            <div className="marquee-content-right" style={{
              display: 'inline-flex',
              gap: '2.5rem',
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#6366f1', // Indigo-Violet
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
              <span>TA'LIMDA INNOVATSIYA</span>
              <span style={{ color: '#c7d2fe' }}>•</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        width: '100%'
      }}>
        {/* KPI 1: Total Certificates */}
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
            cursor: 'default',
            position: 'relative'
          }}
        >
          <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
            {/* Animated Pulsing Ring */}
            <div style={{
              position: 'absolute',
              top: '-4px', left: '-4px', right: '-4px', bottom: '-4px',
              borderRadius: '16px',
              border: '2px solid #6366f1',
              animation: 'pulse-ring 2s infinite'
            }} />
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              borderRadius: '16px',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={26} />
            </div>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sertifikatlar
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
              {totalCertificatesCount} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>o'quvchi</span>
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              CEFR B1+ / Milliy daraja
            </p>
          </div>
        </div>

        {/* KPI 2: English Certificate count */}
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
            <CheckCircle size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ingliz tili
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
              {engCertificatesCount}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>B1 / B2 / C1 (L3+)</span>
              {/* Animated SVG trend line */}
              <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
                <path 
                  d="M 2 18 Q 15 15 30 8 T 58 2" 
                  stroke="#10b981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeDasharray="80"
                  strokeDashoffset="80"
                  style={{ animation: 'draw-line 2.5s ease-out infinite' }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 3: Math Certificate count */}
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
        >
          <div style={{
            background: 'rgba(13, 148, 136, 0.1)',
            color: '#0d9488',
            borderRadius: '16px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Matematika
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
              {mathCertificatesCount}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Milliy daraja (L3+)</span>
              {/* Animated SVG trend line */}
              <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
                <path 
                  d="M 2 18 Q 15 15 30 8 T 58 2" 
                  stroke="#0d9488" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeDasharray="80"
                  strokeDashoffset="80"
                  style={{ animation: 'draw-line 2.5s ease-out infinite' }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 4: Growth Velocity */}
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
            {/* Animated bouncing arrow */}
            <TrendingUp size={26} style={{ animation: 'float-up 1.8s ease-in-out infinite' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              O'rtacha O'sish
            </p>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
              +{averageGrowth.toFixed(1)} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>daraja</span>
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              Sinflar bo'yicha daraja o'sishi
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout Content Area: Left = Class Comparison, Right = Growth Leaders */}
      <div className="dashboard-grid-content" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.1fr',
        gap: '1.5rem',
        width: '100%',
        alignItems: 'start'
      }}>
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
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ingliz tili (Daraja)</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Matematika (Daraja)</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Eng Yuqori O'sish</th>
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
                        {cls.maxGrowth >= 3 && hasStudents && (
                          <Trophy size={14} style={{ color: '#f59e0b' }} />
                        )}
                      </td>
                      <td style={{ padding: '1.1rem 1.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                        {cls.studentCount} ta o'quvchi
                      </td>
                      <td style={{ padding: '1.1rem 1.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700 }}>
                          {hasStudents ? formatLevelName(cls.engAvgLvl) : '-'}
                        </span>
                      </td>
                      <td style={{ padding: '1.1rem 1.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#0d9488', fontWeight: 700 }}>
                          {hasStudents ? formatLevelName(cls.mathAvgLvl) : '-'}
                        </span>
                      </td>
                      <td style={{ padding: '1.1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                          {hasStudents && cls.maxGrowth > 0 ? (
                            <>
                              <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800, flexShrink: 0 }}>
                                +{cls.maxGrowth} d.
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ({cls.maxGrowthStudentName})
                              </span>
                            </>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                          )}
                          {hasStudents && (
                            <ChevronRight size={16} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
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

        {/* Right panel: Top growth students */}
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
              Eng Yuqori O'sish
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topGrowthLeaders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                O'sish ko'rsatkichlari mavjud emas
              </div>
            ) : (
              topGrowthLeaders.map((student, idx) => {
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
                        +{student.combinedGrowth} d.
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                        Eng: +{student.engGrowth} | Math: +{student.mathGrowth}
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
  );
};
