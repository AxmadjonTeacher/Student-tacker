import React, { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { Student } from '../types';

interface GraphModalProps {
  student: Student;
  onClose: () => void;
  activeSubject: 'ENG' | 'MATH';
}

const GraphModal: React.FC<GraphModalProps> = ({ student, onClose, activeSubject }) => {
  const [isComparing, setIsComparing] = useState(false);

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

  const renameTestName = (name: string): string => {
    const trimmed = name.toString().trim().toLowerCase();
    if (trimmed === 'grant 1') return '1-Chorak';
    if (trimmed === 'grant 2') return '2-Chorak';
    if (trimmed === 'grant 3') return '3-Chorak';
    if (trimmed === 'grant 4') return '4-Chorak';
    const match = trimmed.match(/(\d+)/);
    if (match) {
      return `${match[1]}-Chorak`;
    }
    return name;
  };

  // Helper to extract or generate clean test curves for both subjects
  const getSubjectData = (subject: 'ENG' | 'MATH') => {
    const isMath = subject === 'MATH';
    const startLevel = getLevelValue(isMath ? (student.mathStartingLevel || 'Level 1') : (student.englishStartingLevel || student.startingLevel || 'Level 1'));
    const endLevel = getLevelValue(isMath ? (student.mathCurrentLevel || 'Level 1') : (student.englishCurrentLevel || student.currentLevel || 'Level 1'));
    const tests = isMath ? student.mathGrandTests : student.englishGrandTests;

    if (tests && tests.length > 0) {
      return tests.map(test => ({
        name: renameTestName(test.name),
        score: test.score
      }));
    }

    // Fallback/Mock generation with high aesthetic variation
    const mockData = [];
    const testNames = ['1-Chorak', '2-Chorak', '3-Chorak', '4-Chorak'];
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
    const mathPoint = mathData[index] || { score: 50 };
    return {
      date: d.name,
      engVal: d.score as number | null,
      mathVal: mathPoint.score as number | null,
      engEstimate: null as number | null,
      mathEstimate: null as number | null
    };
  });

  // Append 5th point (Yozgi Reja) as +10% estimated raise
  if (combinedData.length > 0) {
    const lastIdx = combinedData.length - 1;
    const lastEng = combinedData[lastIdx].engVal || 50;
    const lastMath = combinedData[lastIdx].mathVal || 50;

    // Connect the 4th point to the estimate line
    combinedData[lastIdx].engEstimate = lastEng;
    combinedData[lastIdx].mathEstimate = lastMath;

    // Add 5th point (Yozgi Reja)
    combinedData.push({
      date: 'Yozgi Reja',
      engVal: null,
      mathVal: null,
      engEstimate: Math.min(100, lastEng + 5),
      mathEstimate: Math.min(100, lastMath + 5)
    });
  }

  // Decide dynamically which scores are visible to scale Y-axis domain
  const allVisibleScores = isComparing 
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

  const activeThemeColor = activeSubject === 'MATH' ? '#0d9488' : '#166534';

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
              ? (isEstimate && label === 'Yozgi Reja' ? '#2563eb' : '#f97316') 
              : (isEstimate && label === 'Yozgi Reja' ? '#d97706' : '#129f87');
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
              {student.name} {student.surname} — {isComparing ? 'Fanlar taqqoslovi' : (activeSubject === 'MATH' ? 'Matematika natijalari' : 'Ingliz tili natijalari')}
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Sinf: {student.className}</span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Sana: {student.dateJoined}</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
            {/* English Improvement Tag */}
            {(isComparing || activeSubject === 'ENG') && (
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
            {(isComparing || activeSubject === 'MATH') && (
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

        {/* Real-time English & Math Switcher Button */}
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

        <div style={{ 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          background: '#ffffff',
          padding: '2rem 1.5rem 1.25rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)'
        }}>
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
                {(isComparing || activeSubject === 'ENG') && (
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

                {/* English Summer Estimate Segment (Gold/Amber Bold Solid Line) */}
                {(isComparing || activeSubject === 'ENG') && (
                  <Line 
                    type="monotone" 
                    dataKey="engEstimate" 
                    stroke="#d97706" 
                    strokeWidth={6.5} 
                    dot={{ r: 7, fill: '#fffbeb', stroke: '#d97706', strokeWidth: 4 }}
                    activeDot={{ r: 9, fill: '#d97706', stroke: '#ffffff', strokeWidth: 3.5 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                  />
                )}
                
                {/* Math Score Area (Orange) */}
                {(isComparing || activeSubject === 'MATH') && (
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

                {/* Math Summer Estimate Segment (Royal Blue Bold Solid Line) */}
                {(isComparing || activeSubject === 'MATH') && (
                  <Line 
                    type="monotone" 
                    dataKey="mathEstimate" 
                    stroke="#2563eb" 
                    strokeWidth={6.5} 
                    dot={{ r: 7, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 4 }}
                    activeDot={{ r: 9, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 3.5 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphModal;
