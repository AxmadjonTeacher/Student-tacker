import React, { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, LabelList, LineChart, Legend
} from 'recharts';
import type { Student } from '../types';

interface GraphModalProps {
  student: Student;
  onClose: () => void;
  activeSubject: 'ENG' | 'MATH' | 'ALL';
  studentWeeks: any[];
}

const GraphModal: React.FC<GraphModalProps> = ({ student, onClose, activeSubject, studentWeeks }) => {
  const [isComparing, setIsComparing] = useState(false);
  const [allActiveTab, setAllActiveTab] = useState<'current' | 'progression' | 'terms'>('current');

  // Normalize levels to a number for graphing
  const getLevelValue = (levelStr: string): number => {
    const trimmed = levelStr?.toString().trim() || '';
    const numMatch = trimmed.match(/\d+/);
    if (numMatch) return parseInt(numMatch[0], 10);
    const l = trimmed.toLowerCase();
    if (l.includes('adv') || l.includes('c1') || l.includes('c2')) return 6;
    if (l.includes('up')) return 5;
    if (l.includes('pre')) return 3;
    if (l.includes('int') || l.includes('b1') || l.includes('b2')) return 4;
    if (l.includes('ele') || l.includes('a2')) return 2;
    return 1;
  };



  // Helper to extract or generate clean test curves for both subjects
  const getSubjectData = (subject: 'ENG' | 'MATH') => {
    const isMath = subject === 'MATH';
    const startLevel = getLevelValue(isMath ? (student.mathStartingLevel || 'Level 1') : (student.englishStartingLevel || student.startingLevel || 'Level 1'));
    const endLevel = getLevelValue(isMath ? (student.mathCurrentLevel || 'Level 1') : (student.englishCurrentLevel || student.currentLevel || 'Level 1'));
    const tests = isMath ? student.mathGrandTests : student.englishGrandTests;

    const testNames = ['1-Chorak', '2-Chorak', '3-Chorak', '4-Chorak'];

    if (tests && tests.length > 0) {
      return testNames.map((name, index) => {
        const termNum = index + 1;
        const namesToTry = [`grant ${termNum}`, `${termNum}-chorak`, `${termNum} chorak`].map(n => n.toLowerCase());
        const found = tests.find(t => namesToTry.includes(t.name.toLowerCase()));
        
        let score: number | null = null;
        if (found && found.score !== null && found.score !== undefined && found.score.toString().trim() !== '-') {
          const parsed = parseInt(found.score.toString());
          score = isNaN(parsed) ? null : parsed;
        }

        return {
          name,
          score
        };
      });
    }

    // Fallback/Mock generation with high aesthetic variation
    const mockData = [];
    for (let i = 0; i < 4; i++) {
      const progress = i / 3;
      const baseScore = 45 + (startLevel * 6);
      const targetScore = 45 + (endLevel * 6) + 12;
      const variance = isMath ? (i === 1 ? -4 : i === 2 ? 3 : 0) : (i === 1 ? 2 : i === 2 ? -2 : 0);
      mockData.push({
        name: testNames[i],
        score: Math.min(100, Math.max(0, Math.round(baseScore + (targetScore - baseScore) * progress + variance)))
      });
    }
    return mockData;
  };

  const engData = getSubjectData('ENG');
  const mathData = getSubjectData('MATH');

  // Combine into single dataset for chart rendering
  const combinedData: any[] = engData.map((d, index) => {
    const mathPoint = mathData[index] || { score: null };
    return {
      date: d.name,
      engVal: d.score as number | null,
      mathVal: mathPoint.score as number | null,
      engEstimate: null as number | null,
      mathEstimate: null as number | null
    };
  });

  // Find last valid actual indices and values
  let lastEngIdx = -1;
  let lastEngVal = 50; // default fallback if none valid
  let lastMathIdx = -1;
  let lastMathVal = 50;

  combinedData.forEach((d, idx) => {
    if (d.engVal !== null && d.engVal !== undefined) {
      lastEngIdx = idx;
      lastEngVal = d.engVal;
    }
    if (d.mathVal !== null && d.mathVal !== undefined) {
      lastMathIdx = idx;
      lastMathVal = d.mathVal;
    }
  });

  // Connect the last valid point to the estimate line
  if (lastEngIdx >= 0) {
    combinedData[lastEngIdx].engEstimate = lastEngVal;
  }
  if (lastMathIdx >= 0) {
    combinedData[lastMathIdx].mathEstimate = lastMathVal;
  }

  // Add 5th point (Yozgi Reja) if we have any valid data points
  if (combinedData.length > 0) {
    combinedData.push({
      date: 'Yozgi Reja',
      engVal: null,
      mathVal: null,
      engEstimate: lastEngIdx >= 0 ? Math.min(100, lastEngVal + 5) : null,
      mathEstimate: lastMathIdx >= 0 ? Math.min(100, lastMathVal + 5) : null
    });
  }

  // Decide dynamically which scores are visible to scale Y-axis domain
  const allVisibleScores = (isComparing || activeSubject === 'ALL')
    ? [
        ...combinedData.map(d => d.engVal).filter(v => v !== null && v !== undefined),
        ...combinedData.map(d => d.mathVal).filter(v => v !== null && v !== undefined),
        ...combinedData.map(d => d.engEstimate).filter(v => v !== null && v !== undefined),
        ...combinedData.map(d => d.mathEstimate).filter(v => v !== null && v !== undefined)
      ]
    : (activeSubject === 'MATH' 
        ? [
            ...combinedData.map(d => d.mathVal).filter(v => v !== null && v !== undefined),
            ...combinedData.map(d => d.mathEstimate).filter(v => v !== null && v !== undefined)
          ]
        : [
            ...combinedData.map(d => d.engVal).filter(v => v !== null && v !== undefined),
            ...combinedData.map(d => d.engEstimate).filter(v => v !== null && v !== undefined)
          ]
      );

  const minVal = allVisibleScores.length > 0 ? Math.min(...allVisibleScores) : 0;
  const maxVal = allVisibleScores.length > 0 ? Math.max(...allVisibleScores) : 100;
  const valRange = maxVal - minVal;
  const padding = valRange < 15 ? 10 : 8; 
  const domainMin = Math.max(0, Math.floor((minVal - padding) / 5) * 5);
  const domainMax = Math.min(100, Math.ceil((maxVal + padding) / 5) * 5);

  const ticks: number[] = [];
  const tickStep = Math.max(5, Math.ceil((domainMax - domainMin) / 4 / 5) * 5);
  for (let val = domainMin; val <= domainMax; val += tickStep) {
    if (!ticks.includes(val)) {
      ticks.push(val);
    }
  }
  if (ticks[ticks.length - 1] < domainMax && domainMax <= 100) {
    ticks.push(domainMax);
  }

  // Calculate subject-specific level changes
  const engStart = getLevelValue(student.englishStartingLevel || student.startingLevel || 'Level 1');
  const engEnd = getLevelValue(student.englishCurrentLevel || student.currentLevel || 'Level 1');
  const engImproved = engEnd - engStart;

  const mathStart = getLevelValue(student.mathStartingLevel || 'Level 1');
  const mathEnd = getLevelValue(student.mathCurrentLevel || 'Level 1');
  const mathImproved = mathEnd - mathStart;

  const activeThemeColor = activeSubject === 'MATH' ? '#0d9488' : activeSubject === 'ALL' ? '#4f46e5' : '#166534';

  // Calculate percentages for ALL section
  const engPercent = ((student.engScore || 0) / 15 * 100);
  const mathPercent = ((student.mathScore || 0) / 15 * 100);
  const absences = (student.attendance ?? 1) < 0 ? -(student.attendance ?? 1) : 0;
  const attPercent = Math.max(0, 100 - absences * 16.67);
  const missedHw = (student.homework ?? 1) < 0 ? -(student.homework ?? 1) : 0;
  const hwPercent = Math.max(0, 100 - missedHw * 20);

  const barData = [
    {
      name: 'Eng Score',
      value: Math.round(engPercent * 100) / 100,
      color: '#6366f1' // Indigo
    },
    {
      name: 'Math Score',
      value: Math.round(mathPercent * 100) / 100,
      color: '#14b8a6' // Teal
    },
    {
      name: 'Attendance',
      value: Math.round(attPercent * 100) / 100,
      color: '#f97316' // Orange
    },
    {
      name: 'Homework',
      value: Math.round(hwPercent * 100) / 100,
      color: '#10b981' // Emerald
    }
  ];

  // Compile weekly progression data for line chart
  const progressionData = (() => {
    const historicalWeeks = studentWeeks.filter(sw => sw.student_id === student.id);
    const compiledHistorical = historicalWeeks.map(sw => {
      const absences = sw.attendance < 0 ? -sw.attendance : 0;
      const attPercent = Math.max(0, 100 - absences * 16.67);
      const missedHw = sw.homework < 0 ? -sw.homework : 0;
      const hwPercent = Math.max(0, 100 - missedHw * 20);
      return {
        week: sw.week,
        engPercent: Math.round(((sw.eng_score || 0) / 15 * 100) * 100) / 100,
        mathPercent: Math.round(((sw.math_score || 0) / 15 * 100) * 100) / 100,
        attPercent: Math.round(attPercent * 100) / 100,
        hwPercent: Math.round(hwPercent * 100) / 100
      };
    });

    compiledHistorical.sort((a, b) => {
      const numA = parseInt(a.week);
      const numB = parseInt(b.week);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.week.localeCompare(b.week);
    });

    return [
      ...compiledHistorical,
      {
        week: "Faol hafta",
        engPercent: Math.round(((student.engScore || 0) / 15 * 100) * 100) / 100,
        mathPercent: Math.round(((student.mathScore || 0) / 15 * 100) * 100) / 100,
        attPercent: Math.round(attPercent * 100) / 100,
        hwPercent: Math.round(hwPercent * 100) / 100
      }
    ];
  })();

  const ProgressionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#ffffff',
          padding: '12px 16px',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <p style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
            {label === 'Faol hafta' ? '🔄 Hozirgi Faol Hafta' : label}
          </p>
          {payload.map((item: any, idx: number) => (
            <p key={idx} style={{ margin: 0, color: item.color, fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block' }}></span>
              {item.name}: {item.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 12} 
        fill="#1e293b" 
        textAnchor="middle" 
        style={{ fontSize: '0.85rem', fontWeight: 850 }}
      >
        {value}%
      </text>
    );
  };

  const renderInsideLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const name = value || '';
    
    if (height < 70) return null;
    
    const anchorY = y + height - 20;
    const anchorX = x + width / 2;
    
    return (
      <text
        x={anchorX}
        y={anchorY}
        fill="#ffffff"
        textAnchor="start"
        transform={`rotate(-90, ${anchorX}, ${anchorY})`}
        style={{ 
          fontSize: '0.75rem', 
          fontWeight: 800, 
          letterSpacing: '0.04em',
          fontFamily: 'inherit'
        }}
      >
        {name}
      </text>
    );
  };

  const BarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: '#ffffff',
          padding: '10px 14px',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
        }}>
          <p style={{ margin: 0, fontWeight: 800, color: data.color, fontSize: '0.85rem' }}>
            {data.name}: {data.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const shownKeys = new Set<string>();
      const filteredPayload = payload.filter((item: any) => {
        if (item.value === null || item.value === undefined) return false;
        
        const isEng = item.dataKey === 'engVal' || item.dataKey === 'engEstimate';
        const typeKey = isEng ? 'ENG' : 'MATH';
        
        if (shownKeys.has(typeKey)) return false;
        shownKeys.add(typeKey);
        return true;
      });

      return (
        <div style={{ 
          background: '#ffffff', 
          padding: '12px 16px', 
          border: '1.5px solid #e2e8f0', 
          borderRadius: '16px', 
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <p style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            {label === 'Yozgi Reja' ? '☀️ Yozgi Reja (Kutilmoqda)' : label}
          </p>
          {filteredPayload.map((item: any, idx: number) => {
            const isMath = item.dataKey === 'mathVal' || item.dataKey === 'mathEstimate';
            const isEstimate = item.dataKey === 'engEstimate' || item.dataKey === 'mathEstimate';
            const subjectLabel = isMath ? 'Matematika' : 'Ingliz tili';
            const labelText = isEstimate && label === 'Yozgi Reja' ? `${subjectLabel} (Prognoz)` : subjectLabel;
            const color = isMath 
              ? (isEstimate && label === 'Yozgi Reja' ? '#c2410c' : '#f97316') 
              : (isEstimate && label === 'Yozgi Reja' ? '#166534' : '#129f87');
            return (
              <p key={idx} style={{ margin: 0, color: color, fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                {labelText}: {item.value}%
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderAreaChart = () => (
    <div style={{ height: '350px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={combinedData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#129f87" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#129f87" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorMath" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
            dy={15}
          />
          <YAxis 
            domain={[domainMin, domainMax]} 
            ticks={ticks}
            tickFormatter={(val) => `${val}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1.5 }} />
          
          {domainMin <= 50 && domainMax >= 50 && (
            <ReferenceLine y={50} stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="3 3" />
          )}
          
          {/* English Score Area (Teal) */}
          {(isComparing || activeSubject === 'ENG' || activeSubject === 'ALL') && (
            <Area 
              type="monotone" 
              dataKey="engVal" 
              stroke="#129f87" 
              strokeWidth={4.5} 
              fillOpacity={1}
              fill="url(#colorEng)"
              dot={{ r: 5, fill: '#ffffff', stroke: '#129f87', strokeWidth: 3 }}
              activeDot={{ r: 7, fill: '#129f87', stroke: '#ffffff', strokeWidth: 3 }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          )}

          {/* English Summer Estimate Segment (Dark Green Long Dashed Line) */}
          {(isComparing || activeSubject === 'ENG' || activeSubject === 'ALL') && (
            <Line 
              type="monotone" 
              dataKey="engEstimate" 
              stroke="#166534" 
              strokeWidth={5.5} 
              strokeDasharray="35 3"
              connectNulls={true}
              dot={{ r: 7, fill: '#f0fdf4', stroke: '#166534', strokeWidth: 4 }}
              activeDot={{ r: 9, fill: '#166534', stroke: '#ffffff', strokeWidth: 3.5 }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          )}
          
          {/* Math Score Area (Orange) */}
          {(isComparing || activeSubject === 'MATH' || activeSubject === 'ALL') && (
            <Area 
              type="monotone" 
              dataKey="mathVal" 
              stroke="#f97316" 
              strokeWidth={4.5} 
              fillOpacity={1}
              fill="url(#colorMath)"
              dot={{ r: 5, fill: '#ffffff', stroke: '#f97316', strokeWidth: 3 }}
              activeDot={{ r: 7, fill: '#f97316', stroke: '#ffffff', strokeWidth: 3 }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          )}

          {/* Math Summer Estimate Segment (Dark Orange Long Dashed Line) */}
          {(isComparing || activeSubject === 'MATH' || activeSubject === 'ALL') && (
            <Line 
              type="monotone" 
              dataKey="mathEstimate" 
              stroke="#c2410c" 
              strokeWidth={5.5} 
              strokeDasharray="35 3"
              connectNulls={true}
              dot={{ r: 7, fill: '#fff7ed', stroke: '#c2410c', strokeWidth: 4 }}
              activeDot={{ r: 9, fill: '#c2410c', stroke: '#ffffff', strokeWidth: 3.5 }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(4px)', background: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '820px', 
          width: '95%',
          background: '#fcfcf9', 
          borderRadius: '24px',
          padding: '2.5rem'
        }}
      >
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <button 
            onClick={onClose}
            style={{ 
              position: 'absolute', right: '-15px', top: '-15px', 
              background: 'transparent', border: `2px solid ${activeThemeColor}`, 
              borderRadius: '50%', padding: '4px', cursor: 'pointer',
              color: activeThemeColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.background = `${activeThemeColor}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={26} color={activeThemeColor} strokeWidth={2.5} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 850, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
              {student.name} {student.surname} — {
                activeSubject === 'ALL' 
                  ? "Umumiy ko'rsatkichlar"
                  : isComparing 
                    ? 'Fanlar taqqoslovi' 
                    : (activeSubject === 'MATH' ? 'Matematika natijalari' : 'Ingliz tili natijalari')
              }
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Sinf: {student.className}</span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Sana: {student.dateJoined}</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
            {/* English Improvement Tag */}
            {(isComparing || activeSubject === 'ENG' || activeSubject === 'ALL') && (
              <span style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: '#e0f2fe', color: '#0369a1',
                padding: '0.3rem 0.75rem', borderRadius: '999px',
                fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.03em'
              }}>
                INGLIZ TILI: {engImproved > 0 ? `+${engImproved} daraja` : engImproved < 0 ? `${engImproved} daraja` : 'barqaror'}
              </span>
            )}

            {/* Math Improvement Tag */}
            {(isComparing || activeSubject === 'MATH' || activeSubject === 'ALL') && (
              <span style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: '#ffedd5', color: '#c2410c',
                padding: '0.3rem 0.75rem', borderRadius: '999px',
                fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.03em'
              }}>
                MATEMATIKA: {mathImproved > 0 ? `+${mathImproved} daraja` : mathImproved < 0 ? `${mathImproved} daraja` : 'barqaror'}
              </span>
            )}
          </div>
        </div>

        {/* Real-time Switcher Buttons */}
        {activeSubject !== 'ALL' ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginBottom: '1.5rem' 
          }}>
            <button
              onClick={() => setIsComparing(!isComparing)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: isComparing ? 'linear-gradient(135deg, #129f87, #f97316)' : '#ffffff',
                color: isComparing ? '#ffffff' : '#475569',
                border: '1.5px solid #e2e8f0',
                borderRadius: '9999px',
                padding: '0.6rem 1.5rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1.5px)';
                if (!isComparing) e.currentTarget.style.borderColor = activeThemeColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (!isComparing) e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {isComparing ? '📊 YAKKA KO\'RINISH' : '🆚 MATEMATIKA VA INGLIZ TILI BILAN TAQQOSLASH'}
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '9999px',
            maxWidth: 'fit-content',
            margin: '0 auto 1.5rem'
          }}>
            {[
              { id: 'current', label: '📊 JORIY HAFTA' },
              { id: 'progression', label: '📈 HAFTALIK O\'ZGARISH' },
              { id: 'terms', label: '🏆 CHORAKLIK NATIJALAR' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAllActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: allActiveTab === tab.id 
                    ? 'linear-gradient(135deg, #4f46e5, #4338ca)' 
                    : 'transparent',
                  color: allActiveTab === tab.id ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: allActiveTab === tab.id ? '0 4px 6px -1px rgba(79, 70, 229, 0.2)' : 'none',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.03em'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          background: '#ffffff',
          padding: '2rem 1.5rem 1.25rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)'
        }}>
          {activeSubject !== 'ALL' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                  BOSHLANG'ICH DARAJA
                </div>
                <div style={{ color: '#1e293b', fontSize: '0.9rem', fontWeight: 700 }}>
                  {isComparing 
                    ? `ENG: ${(student.englishStartingLevel || student.startingLevel || 'Level 1').toUpperCase()} | MATH: ${(student.mathStartingLevel || 'Level 1').toUpperCase()}`
                    : (activeSubject === 'MATH' ? (student.mathStartingLevel || 'Level 1').toUpperCase() : (student.englishStartingLevel || student.startingLevel || 'Level 1').toUpperCase())
                  }
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                  HOZIRGI DARAJA
                </div>
                <div style={{ color: '#1e293b', fontSize: '0.9rem', fontWeight: 700 }}>
                  {isComparing 
                    ? `ENG: ${(student.englishCurrentLevel || student.currentLevel || 'Level 1').toUpperCase()} | MATH: ${(student.mathCurrentLevel || 'Level 1').toUpperCase()}`
                    : (activeSubject === 'MATH' ? (student.mathCurrentLevel || 'Level 1').toUpperCase() : (student.englishCurrentLevel || student.currentLevel || 'Level 1').toUpperCase())
                  }
                </div>
              </div>
            </div>
          )}

          {activeSubject === 'ALL' ? (
            allActiveTab === 'progression' ? (
              <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData} margin={{ top: 15, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="week" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
                      tickFormatter={(val) => `${val}%`}
                      width={50}
                    />
                    <Tooltip content={<ProgressionTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1.5 }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem', fontWeight: 700 }} />
                    <Line 
                      type="monotone" 
                      dataKey="engPercent" 
                      name="Ingliz tili" 
                      stroke="#6366f1" 
                      strokeWidth={3.5} 
                      dot={{ r: 4, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mathPercent" 
                      name="Matematika" 
                      stroke="#14b8a6" 
                      strokeWidth={3.5} 
                      dot={{ r: 4, fill: '#ffffff', stroke: '#14b8a6', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="attPercent" 
                      name="Davomat" 
                      stroke="#f97316" 
                      strokeWidth={3.5} 
                      dot={{ r: 4, fill: '#ffffff', stroke: '#f97316', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hwPercent" 
                      name="Vazifalar" 
                      stroke="#10b981" 
                      strokeWidth={3.5} 
                      dot={{ r: 4, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : allActiveTab === 'current' ? (
              <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 25, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
                      tickFormatter={(val) => `${val}%`}
                      width={50}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={55}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" content={renderCustomizedLabel} />
                      <LabelList dataKey="name" content={renderInsideLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              renderAreaChart()
            )
          ) : (
            renderAreaChart()
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphModal;
