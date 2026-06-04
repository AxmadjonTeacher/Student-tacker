import React, { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, LabelList, LineChart, Legend
} from 'recharts';
import type { Student, ActiveSubject } from '../types';

const formatXAxisWeek = (tick: string) => {
  if (tick === "Faol hafta") return "Faol";
  return tick;
};

const formatXAxisTerm = (tick: string) => {
  if (tick && tick.includes('Chorak')) {
    return tick.replace('Chorak', 'Ch.');
  }
  if (tick === 'Yozgi Reja') {
    return 'Yozgi R.';
  }
  return tick;
};

interface GraphModalProps {
  student: Student;
  onClose: () => void;
  activeSubject: ActiveSubject;
  studentWeeks: any[];
  isInline?: boolean;
  showSummerPlan?: boolean;
}

const GraphModal: React.FC<GraphModalProps> = ({ 
  student, 
  onClose, 
  activeSubject, 
  studentWeeks, 
  isInline = false,
  showSummerPlan = true
}) => {
  const [isComparing, setIsComparing] = useState(false);
  const [allActiveTab, setAllActiveTab] = useState<'current' | 'progression' | 'terms'>('current');

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: '0.85rem',
        listStyle: 'none',
        padding: 0,
        margin: 0,
        paddingTop: '15px',
        fontSize: '0.75rem',
        fontWeight: 700,
        width: '100%',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        boxSizing: 'border-box'
      }}>
        {payload.map((entry: any, index: number) => {
          let dotColor = entry.color;
          if (entry.dataKey === 'hwPercent' || entry.value === 'Vazifalar') {
            dotColor = '#10b981';
          }
          return (
            <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }} />
              <span style={{ color: 'var(--text-secondary)' }}>{entry.value}</span>
            </li>
          );
        })}
      </ul>
    );
  };

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
    const tests = isMath 
      ? (student.mathGrandTests || student.grandTests) 
      : (student.englishGrandTests || student.grandTests);

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
  if (showSummerPlan && combinedData.length > 0) {
    combinedData.push({
      date: 'Yozgi Reja',
      engVal: null,
      mathVal: null,
      engEstimate: lastEngIdx >= 0 ? Math.min(100, lastEngVal + 5) : null,
      mathEstimate: lastMathIdx >= 0 ? Math.min(100, lastMathVal + 5) : null
    });
  }

  // Decide dynamically which scores are visible to scale Y-axis domain
  const allVisibleScores = (isComparing || activeSubject === 'ALL' || activeSubject === 'PRIMARY')
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

  const activeThemeColor = 'var(--accent-primary)';

  // Calculate percentages for ALL section
  const engPercent = student.engScore !== null && student.engScore !== undefined ? (student.engScore / 15 * 100) : 0;
  const mathPercent = student.mathScore !== null && student.mathScore !== undefined ? (student.mathScore / 15 * 100) : 0;
  const attVal = student.attendance ?? 1;
  const attPercent = attVal < 0 ? Math.max(0, 100 + attVal * 16.67) : (attVal === 1 ? 100 : attVal);
  const hwVal = student.homework ?? 1;
  const hwPercent = hwVal < 0 ? Math.max(0, 100 + hwVal * 20) : (hwVal === 1 ? 100 : hwVal);

  const barData = [
    {
      name: 'Ingliz tili',
      value: Math.round(engPercent * 100) / 100,
      color: 'var(--accent-primary)'
    },
    {
      name: 'Matematika',
      value: Math.round(mathPercent * 100) / 100,
      color: '#f97316'
    },
    {
      name: 'Davomat',
      value: Math.round(attPercent * 100) / 100,
      color: '#3b82f6'
    },
    {
      name: 'Vazifalar',
      value: Math.round(hwPercent * 100) / 100,
      color: '#10b981'
    }
  ];

  // Compile weekly progression data for line chart
  const progressionData = (() => {
    const historicalWeeks = studentWeeks.filter(sw => sw.student_id === student.id);
    const compiledHistorical = historicalWeeks.map(sw => {
      const attVal = sw.attendance ?? 1;
      const attPercent = attVal < 0 ? Math.max(0, 100 + attVal * 16.67) : (attVal === 1 ? 100 : attVal);
      const hwVal = sw.homework ?? 1;
      const hwPercent = hwVal < 0 ? Math.max(0, 100 + hwVal * 20) : (hwVal === 1 ? 100 : hwVal);
      const eScore = sw.eng_score !== null && sw.eng_score !== undefined ? Math.round((sw.eng_score / 15 * 100) * 100) / 100 : null;
      const mScore = sw.math_score !== null && sw.math_score !== undefined ? Math.round((sw.math_score / 15 * 100) * 100) / 100 : null;
      return {
        week: sw.week,
        engPercent: eScore,
        mathPercent: mScore,
        attPercent: Math.round(attPercent * 100) / 100,
        hwPercent: Math.round(hwPercent * 100) / 100
      };
    });

    compiledHistorical.sort((a, b) => {
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
      return parseWeekVal(a.week) - parseWeekVal(b.week);
    });

    const allWeeks = [
      ...compiledHistorical,
      {
        week: "Faol hafta",
        engPercent: Math.round(((student.engScore || 0) / 15 * 100) * 100) / 100,
        mathPercent: Math.round(((student.mathScore || 0) / 15 * 100) * 100) / 100,
        attPercent: Math.round(attPercent * 100) / 100,
        hwPercent: Math.round(hwPercent * 100) / 100
      }
    ];
    return allWeeks.slice(-4);
  })();

  const ProgressionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-card)',
          padding: '12px 16px',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: 'var(--glass-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
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
        fill="var(--text-primary)" 
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
          background: 'var(--bg-card)',
          padding: '10px 14px',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: 'var(--glass-shadow)',
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
          background: 'var(--bg-card)', 
          padding: '12px 16px', 
          border: '1px solid var(--border-color)', 
          borderRadius: '16px', 
          boxShadow: 'var(--glass-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            {label === 'Yozgi Reja' ? '☀️ Yozgi Reja (Kutilmoqda)' : label}
          </p>
          {filteredPayload.map((item: any, idx: number) => {
            const isMath = item.dataKey === 'mathVal' || item.dataKey === 'mathEstimate';
            const isEstimate = item.dataKey === 'engEstimate' || item.dataKey === 'mathEstimate';
            const subjectLabel = isMath ? 'Matematika' : 'Ingliz tili';
            const labelText = isEstimate && label === 'Yozgi Reja' ? `${subjectLabel} (Prognoz)` : subjectLabel;
            const color = isMath 
              ? (isEstimate && label === 'Yozgi Reja' ? '#c2410c' : '#f97316') 
              : (isEstimate && label === 'Yozgi Reja' ? 'var(--accent-hover)' : 'var(--accent-primary)');
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
    <div className="chart-container" style={{ height: '350px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={combinedData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorMath" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            interval={0}
            tickFormatter={formatXAxisTerm}
            tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            domain={[domainMin, domainMax]} 
            ticks={ticks}
            tickFormatter={(val) => `${val}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1.5 }} />
          
          {domainMin <= 50 && domainMax >= 50 && (
            <ReferenceLine y={50} stroke="var(--border-color)" strokeWidth={1.5} strokeDasharray="3 3" />
          )}
          
          {/* English Score Area (Teal) */}
          {(isComparing || activeSubject === 'ENG' || activeSubject === 'ALL' || activeSubject === 'PRIMARY') && (
            <Area 
              type="monotone" 
              dataKey="engVal" 
              stroke="var(--accent-primary)" 
              strokeWidth={4.5} 
              fillOpacity={1}
              fill="url(#colorEng)"
              dot={{ r: 5, fill: '#ffffff', stroke: 'var(--accent-primary)', strokeWidth: 3 }}
              activeDot={{ r: 7, fill: 'var(--accent-primary)', stroke: '#ffffff', strokeWidth: 3 }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          )}

          {/* English Summer Estimate Segment (Dark Green Long Dashed Line) */}
          {(isComparing || activeSubject === 'ENG' || activeSubject === 'ALL' || activeSubject === 'PRIMARY') && (
            <Line 
              type="monotone" 
              dataKey="engEstimate" 
              stroke="var(--accent-hover)" 
              strokeWidth={5.5} 
              strokeDasharray="35 3"
              connectNulls={true}
              dot={{ r: 7, fill: 'var(--bg-card-hover)', stroke: 'var(--accent-hover)', strokeWidth: 4 }}
              activeDot={{ r: 9, fill: 'var(--accent-hover)', stroke: '#ffffff', strokeWidth: 3.5 }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          )}
          
          {/* Math Score Area (Orange) */}
          {(isComparing || activeSubject === 'MATH' || activeSubject === 'ALL' || activeSubject === 'PRIMARY') && (
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
          {(isComparing || activeSubject === 'MATH' || activeSubject === 'ALL' || activeSubject === 'PRIMARY') && (
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

  const modalContentStyle = {
    maxWidth: isInline ? '100%' : '820px', 
    width: '100%',
    background: 'var(--bg-card)', 
    backdropFilter: isInline ? 'none' : 'var(--backdrop-blur-md)',
    WebkitBackdropFilter: isInline ? 'none' : 'var(--backdrop-blur-md)',
    borderRadius: isInline ? '24px' : '32px',
    padding: isInline ? '1.5rem 1rem' : '2.5rem',
    border: '1px solid var(--border-subtle)',
    boxShadow: isInline ? 'none' : 'var(--glass-shadow-soft), inset 0 1px 0 var(--border-highlight)',
    boxSizing: 'border-box' as const
  };

  const styleRules = `
    .modal-content {
      padding: 2rem !important;
      max-height: 90vh;
      overflow-y: auto;
    }
    @media (max-width: 600px) {
      .modal-content {
        padding: 1.25rem 1rem !important;
        border-radius: 20px !important;
      }
      .modal-title {
        font-size: 1.1rem !important;
        text-align: center;
      }
      .modal-tabs {
        flex-direction: column !important;
        border-radius: 20px !important;
        width: 100% !important;
        max-width: none !important;
        gap: 4px !important;
      }
      .modal-tabs button {
        width: 100% !important;
        justify-content: center !important;
        padding: 0.5rem !important;
        font-size: 0.75rem !important;
      }
      .modal-compare-btn {
        width: 100% !important;
        padding: 0.6rem 1rem !important;
        font-size: 0.75rem !important;
        text-align: center !important;
        justify-content: center !important;
      }
      .chart-container {
        height: 240px !important;
      }
      .level-info {
        flex-direction: column !important;
        align-items: center !important;
        gap: 0.5rem !important;
        margin-bottom: 1rem !important;
      }
      .level-info div {
        text-align: center !important;
      }
      .modal-tags-container {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        gap: 0.4rem !important;
        width: 100% !important;
        justify-content: space-between !important;
      }
      .modal-tag {
        flex: 1 !important;
        justify-content: center !important;
        font-size: 0.65rem !important;
        padding: 0.25rem 0.4rem !important;
        white-space: nowrap !important;
        text-align: center !important;
      }
    }
  `;

  const contentJSX = (
    <div 
      className={isInline ? "" : "modal-content"} 
      onClick={e => e.stopPropagation()} 
      style={modalContentStyle}
    >
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TrendingUp size={26} color={activeThemeColor} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <h2 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {student.name} {student.surname} — {
                (activeSubject === 'ALL' || activeSubject === 'PRIMARY') 
                  ? "Haftalik ko'rsatkichlar"
                  : isComparing 
                    ? 'Fanlar taqqoslovi' 
                    : (activeSubject === 'MATH' ? 'Matematika natijalari' : 'Ingliz tili natijalari')
              }
            </h2>
          </div>
          
          {!isInline && (
            <button 
              onClick={onClose}
              style={{ 
                background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', 
                borderRadius: '50%', padding: '6px', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = '#fca5a5';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sinf: {student.className}</span>
          <span style={{ color: 'var(--border-subtle)' }}>·</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sana: {student.dateJoined}</span>
        </div>

        <div className="modal-tags-container" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
          {/* English Improvement Tag */}
          {(isComparing || activeSubject === 'ENG' || activeSubject === 'ALL' || activeSubject === 'PRIMARY') && (
            <span className="modal-tag" style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(56, 189, 248, 0.1)', color: '#0284c7', border: '1px solid rgba(56, 189, 248, 0.2)',
              padding: '0.3rem 0.75rem', borderRadius: '999px',
              fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.03em'
            }}>
              INGLIZ TILI: {engImproved > 0 ? `+${engImproved} daraja` : engImproved < 0 ? `${engImproved} daraja` : 'barqaror'}
            </span>
          )}

          {/* Math Improvement Tag */}
          {(isComparing || activeSubject === 'MATH' || activeSubject === 'ALL' || activeSubject === 'PRIMARY') && (
            <span className="modal-tag" style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(249, 115, 22, 0.1)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.2)',
              padding: '0.3rem 0.75rem', borderRadius: '999px',
              fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.03em'
            }}>
              MATEMATIKA: {mathImproved > 0 ? `+${mathImproved} daraja` : mathImproved < 0 ? `${mathImproved} daraja` : 'barqaror'}
            </span>
          )}
        </div>
      </div>

      {/* Real-time Switcher Buttons */}
      {(activeSubject !== 'ALL' && activeSubject !== 'PRIMARY') ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          marginBottom: '1.5rem' 
        }}>
          <button
            className="modal-compare-btn"
            onClick={() => setIsComparing(!isComparing)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: isComparing ? 'var(--accent-hero)' : 'var(--bg-card-hover)',
              color: isComparing ? '#ffffff' : 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '0.6rem 1.5rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: 'var(--glass-shadow-soft)',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
              if (!isComparing) e.currentTarget.style.borderColor = activeThemeColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              if (!isComparing) e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            {isComparing ? '📊 YAKKA KO\'RINISH' : '🆚 MATEMATIKA VA INGLIZ TILI BILAN TAQQOSLASH'}
          </button>
        </div>
      ) : (
        <div className="modal-tabs" style={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'var(--bg-card-hover)',
          padding: '4px',
          borderRadius: '9999px',
          maxWidth: 'fit-content',
          margin: '0 auto 1.5rem',
          border: '1px solid var(--border-subtle)'
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
                  ? 'var(--accent-hero)' 
                  : 'transparent',
                color: allActiveTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.6rem 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: allActiveTab === tab.id ? '0 8px 16px var(--accent-glow)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                letterSpacing: '0.03em'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }}>
        {(activeSubject === 'ALL' || activeSubject === 'PRIMARY') ? (
          allActiveTab === 'progression' ? (
            <div className="chart-container" style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressionData} margin={{ top: 15, right: 15, left: -5, bottom: 10 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="week" 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    tickFormatter={formatXAxisWeek}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `${val}%`}
                    width={35}
                  />
                  <Tooltip content={<ProgressionTooltip />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1.5 }} />
                  <Legend content={renderLegend} />
                  <Line 
                    type="monotone" 
                    dataKey="engPercent" 
                    name="Ingliz tili" 
                    stroke="var(--accent-primary)" 
                    strokeWidth={3.5} 
                    dot={{ r: 4, fill: '#ffffff', stroke: 'var(--accent-primary)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mathPercent" 
                    name="Matematika" 
                    stroke="#f97316" 
                    strokeWidth={3.5} 
                    dot={{ r: 4, fill: '#ffffff', stroke: '#f97316', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attPercent" 
                    name="Davomat" 
                    stroke="#3b82f6" 
                    strokeWidth={3.5} 
                    dot={{ r: 4, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
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
            <div className="chart-container" style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 25, right: 15, left: -5, bottom: 10 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `${val}%`}
                    width={35}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]} maxBarSize={50}>
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
  );

  if (isInline) {
    return (
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        <style dangerouslySetInnerHTML={{ __html: styleRules }} />
        {contentJSX}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'var(--backdrop-blur-md)', WebkitBackdropFilter: 'var(--backdrop-blur-md)', background: 'var(--backdrop-color)', zIndex: 9999 }}>
      <style dangerouslySetInnerHTML={{ __html: styleRules }} />
      {contentJSX}
    </div>
  );
};

export default GraphModal;
