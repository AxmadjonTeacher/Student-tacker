import React, { useMemo, useEffect, useRef, useState } from 'react';
import type { Student } from '../types';

interface DashboardProps {
  students: Student[];
  studentWeeks: any[];
  availableClasses: string[];
  onSelectClass: (cls: string) => void;
}

// ─── Level Parsing ────────────────────────────────────────────────────────────
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
  return 1;
};

/** Extract Uzbek month abbreviation from a week string like "15-sen" */
const getMonthFromWeek = (weekStr: string): string | null => {
  if (!weekStr) return null;
  const parts = weekStr.split('-');
  if (parts.length < 2) return null;
  return parts[parts.length - 1].toLowerCase();
};

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, trigger: boolean = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger || target === 0) return;
    setValue(0);
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);
  return value;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
interface LineChartProps {
  engData: (number | null)[];
  mathData: (number | null)[];
  labels: string[];
  visible: boolean;
}

const LineChart: React.FC<LineChartProps> = ({ engData, mathData, labels, visible }) => {
  const W = 480, H = 270, PL = 44, PR = 20, PT = 20, PB = 44;
  const iW = W - PL - PR;
  const iH = H - PT - PB;

  // Fixed Y-axis 0 to 5
  const minV = 0;
  const maxV = 5;
  const range = maxV - minV;

  const toX = (i: number) => PL + (i / Math.max(labels.length - 1, 1)) * iW;
  const toY = (v: number) => PT + iH - ((v - minV) / range) * iH;

  // Build path only through non-null points
  const makePath = (data: (number | null)[]) => {
    let path = '';
    let started = false;
    data.forEach((v, i) => {
      if (v === null) return;
      path += `${started ? ' L' : 'M'} ${toX(i).toFixed(1)},${toY(v).toFixed(1)}`;
      started = true;
    });
    return path;
  };

  const engPath = makePath(engData);
  const mathPath = makePath(mathData);

  // Y-axis: 6 ticks from 0 to 5
  const yTicks = [0, 1, 2, 3, 4, 5];
  const yTickLabels: Record<number, string> = { 0: 'L0', 1: 'L1', 2: 'L2', 3: 'L3', 4: 'L4', 5: 'L5' };

  // Heuristic path length for animation
  const pathLen = iW * 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="engAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mathAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
        </linearGradient>
        <filter id="glowEng"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glowMath"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Horizontal grid lines */}
      {yTicks.map(tick => (
        <g key={tick}>
          <line x1={PL} y1={toY(tick)} x2={W - PR} y2={toY(tick)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,4" />
          <text x={PL - 7} y={toY(tick) + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#94a3b8">
            {yTickLabels[tick]}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {labels.map((lbl, i) => (
        <text key={i} x={toX(i)} y={H - PT + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
          {lbl}
        </text>
      ))}

      {/* Area fills */}
      {engPath && (() => {
        const firstE = engData.findIndex(v => v !== null);
        const lastE = engData.reduce<number>((li, v, i) => (v !== null ? i : li), 0);
        return (
          <path
            d={`${engPath} L ${toX(lastE)},${PT + iH} L ${toX(firstE)},${PT + iH} Z`}
            fill="url(#engAreaGrad)"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s ease 0.8s' }}
          />
        );
      })()}
      {mathPath && (() => {
        const firstM = mathData.findIndex(v => v !== null);
        const lastM = mathData.reduce<number>((li, v, i) => (v !== null ? i : li), 0);
        return (
          <path
            d={`${mathPath} L ${toX(lastM)},${PT + iH} L ${toX(firstM)},${PT + iH} Z`}
            fill="url(#mathAreaGrad)"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s ease 0.8s' }}
          />
        );
      })()}

      {/* English line */}
      {engPath && (
        <path
          d={engPath}
          fill="none"
          stroke="#6366f1"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowEng)"
          strokeDasharray={pathLen}
          strokeDashoffset={visible ? 0 : pathLen}
          style={{ transition: `stroke-dashoffset 2.5s cubic-bezier(0.4,0,0.2,1) 0.2s` }}
        />
      )}

      {/* Math line */}
      {mathPath && (
        <path
          d={mathPath}
          fill="none"
          stroke="#0d9488"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowMath)"
          strokeDasharray={pathLen}
          strokeDashoffset={visible ? 0 : pathLen}
          style={{ transition: `stroke-dashoffset 2.5s cubic-bezier(0.4,0,0.2,1) 0.55s` }}
        />
      )}

      {/* Data point dots */}
      {engData.map((v, i) => v === null ? null : (
        <circle key={`e${i}`} cx={toX(i)} cy={toY(v)} r="4.5"
          fill="#fff" stroke="#6366f1" strokeWidth="2.5"
          style={{ opacity: visible ? 1 : 0, transition: `opacity 0.35s ease ${0.3 + i * 0.12}s` }}
        />
      ))}
      {mathData.map((v, i) => v === null ? null : (
        <circle key={`m${i}`} cx={toX(i)} cy={toY(v)} r="4.5"
          fill="#fff" stroke="#0d9488" strokeWidth="2.5"
          style={{ opacity: visible ? 1 : 0, transition: `opacity 0.35s ease ${0.6 + i * 0.12}s` }}
        />
      ))}
    </svg>
  );
};

// ─── Animated Donut Chart ─────────────────────────────────────────────────────
interface DonutChartProps {
  engPct: number;
  mathPct: number;
  total: number;
  visible: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({ engPct, mathPct, total, visible }) => {
  const R = 90, cx = 130, cy = 130, strokeW = 22;
  const circ = 2 * Math.PI * R;

  const restPct = Math.max(0, 100 - engPct - mathPct);
  const segments = [
    { value: engPct, color: '#6366f1', offset: 0 },
    { value: mathPct, color: '#0d9488', offset: engPct },
    { value: restPct, color: '#e2e8f0', offset: engPct + mathPct },
  ];

  const dashFor = (pct: number) => (pct / 100) * circ;

  // Animated counters
  const displayEngPct = useCountUp(Math.round(engPct), 1400, visible);
  const displayMathPct = useCountUp(Math.round(mathPct), 1600, visible);
  const displayTotal = useCountUp(total, 1800, visible);
  const displayRest = useCountUp(Math.round(restPct), 1400, visible);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
      <svg viewBox="0 0 260 260" style={{ width: '220px', height: '220px', flexShrink: 0 }}>
        <defs>
          <filter id="donut-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="5" floodOpacity="0.13" />
          </filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {/* Segments */}
        {segments.map((seg, i) => {
          const dash = dashFor(visible ? seg.value : 0);
          const gap = circ - dash;
          const rotation = -90 + (seg.offset / 100) * 360;
          return (
            <circle key={i} cx={cx} cy={cy} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeW}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              filter="url(#donut-shadow)"
              style={{ transition: `stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1) ${0.1 + i * 0.18}s` }}
            />
          );
        })}
        {/* Center: animated total count */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="30" fontWeight="900" fill="#0f172a">
          {displayTotal}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
          o'quvchi
        </text>
      </svg>

      {/* Legend + progress bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%' }}>
        {/* English */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#6366f1' }} />
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>Inglizcha L4+</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#6366f1' }}>{displayEngPct}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'linear-gradient(90deg,#818cf8,#6366f1)',
              width: visible ? `${engPct}%` : '0%',
              transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1) 0.3s'
            }} />
          </div>
        </div>
        {/* Math */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#0d9488' }} />
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>Matematika L4+</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0d9488' }}>{displayMathPct}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'linear-gradient(90deg,#2dd4bf,#0d9488)',
              width: visible ? `${mathPct}%` : '0%',
              transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1) 0.5s'
            }} />
          </div>
        </div>
        {/* Rest */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#cbd5e1' }} />
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>Rivojlanayotgan</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#94a3b8' }}>{displayRest}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
// Fixed period definitions for X-axis
const PERIODS: { label: string; months: string[] }[] = [
  { label: 'Sen',  months: ['sen', 'okt'] },
  { label: 'Dek',  months: ['noy', 'dek'] },
  { label: 'Fev',  months: ['yan', 'fev'] },
  { label: 'Apr',  months: ['mar', 'apr'] },
  { label: 'May',  months: ['may'] },
  { label: 'Iyu',  months: ['iyun', 'iyul'] },
];

export const Dashboard: React.FC<DashboardProps> = ({ students, studentWeeks }) => {
  const [chartsVisible, setChartsVisible] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setChartsVisible(true); },
      { threshold: 0.15 }
    );
    if (chartsRef.current) obs.observe(chartsRef.current);
    return () => obs.disconnect();
  }, []);

  const activeStudents = useMemo(() => students.filter(s => !s.isDeleted), [students]);
  const total = activeStudents.length;

  // ── Chart 1: Overall level growth over time periods ─────────────────────────
  // For each period, collect weekly records that fall within those months
  // and compute the average English & Math level for ALL students that week.
  // If no weekly data for a period, we fall back to interpolation from
  // startingLevel → currentLevel anchored at first and last period.
  const { engLineData, mathLineData } = useMemo(() => {
    const engStartAvg = total > 0
      ? activeStudents.reduce((s, st) => s + parseLevelToNumber(st.startingLevel), 0) / total
      : 1;
    const engEndAvg = total > 0
      ? activeStudents.reduce((s, st) => s + parseLevelToNumber(st.currentLevel || st.startingLevel), 0) / total
      : 1;
    const mathStartAvg = total > 0
      ? activeStudents.reduce((s, st) => s + parseLevelToNumber(st.mathStartingLevel || 'Level 1'), 0) / total
      : 1;
    const mathEndAvg = total > 0
      ? activeStudents.reduce((s, st) => s + parseLevelToNumber(st.mathCurrentLevel || 'Level 1'), 0) / total
      : 1;

    const engData: (number | null)[] = [];
    const mathData: (number | null)[] = [];

    PERIODS.forEach((period, idx) => {
      // Gather all non-deleted weekly records in this period's months
      const weeksInPeriod = (studentWeeks || []).filter(sw => {
        if (sw.is_deleted) return false;
        const m = getMonthFromWeek(sw.week || '');
        return m && period.months.includes(m);
      });

      if (weeksInPeriod.length > 0) {
        // Compute average eng and math level from weekly data
        // studentWeeks records have eng_level / math_level or we fallback to scores → level
        const engLevels = weeksInPeriod
          .map(sw => {
            if (sw.eng_level) return parseLevelToNumber(sw.eng_level);
            if (sw.eng_score != null) return Math.max(1, Math.min(5, Math.round(sw.eng_score / 3)));
            return null;
          })
          .filter((v): v is number => v !== null);

        const mathLevels = weeksInPeriod
          .map(sw => {
            if (sw.math_level) return parseLevelToNumber(sw.math_level);
            if (sw.math_score != null) return Math.max(1, Math.min(5, Math.round(sw.math_score / 3)));
            return null;
          })
          .filter((v): v is number => v !== null);

        engData.push(engLevels.length > 0 ? parseFloat((engLevels.reduce((a, b) => a + b, 0) / engLevels.length).toFixed(2)) : null);
        mathData.push(mathLevels.length > 0 ? parseFloat((mathLevels.reduce((a, b) => a + b, 0) / mathLevels.length).toFixed(2)) : null);
      } else {
        // Interpolate linearly between start and end based on period index
        const t = idx / (PERIODS.length - 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad
        engData.push(parseFloat((engStartAvg + eased * (engEndAvg - engStartAvg)).toFixed(2)));
        mathData.push(parseFloat((mathStartAvg + eased * (mathEndAvg - mathStartAvg)).toFixed(2)));
      }
    });

    return { engLineData: engData, mathLineData: mathData };
  }, [activeStudents, studentWeeks, total]);

  // ── Chart 2: % at Level 4+ ─────────────────────────────────────────────────
  const engLevel4Pct = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.currentLevel || s.startingLevel) >= 4).length / total) * 100
    : 0;
  const mathLevel4Pct = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.mathCurrentLevel || 'Level 1') >= 4).length / total) * 100
    : 0;

  const safeEngPct = Math.min(engLevel4Pct, 100);
  const safeMathPct = Math.min(mathLevel4Pct, 100 - safeEngPct);

  const periodLabels = PERIODS.map(p => p.label);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>

      {/* ── CSS ──────────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chart-card { animation: fade-up 0.65s ease both; }
        .chart-card:nth-child(2) { animation-delay: 0.18s; }
        .marquee-left  { display: inline-flex; animation: scroll-left  30s linear infinite; }
        .marquee-right { display: inline-flex; animation: scroll-right 30s linear infinite; }
      `}} />

      {/* ── Premium White Velocity Scroll ────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 30px -8px rgba(99,102,241,0.10), 0 2px 8px -2px rgba(0,0,0,0.04)'
      }}>
        {/* Subtle top accent line */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, #6366f1 0%, #0d9488 50%, #6366f1 100%)',
          width: '100%'
        }} />

        <div style={{ position: 'relative', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
          {/* Edge fades */}
          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:'70px', background:'linear-gradient(to right,#fff,transparent)', zIndex:10, pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:0, right:0, bottom:0, width:'70px', background:'linear-gradient(to left,#fff,transparent)', zIndex:10, pointerEvents:'none' }} />

          <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
            {/* Row 1: AL-XORAZMIY MAKTABI → teal */}
            <div style={{ overflow:'hidden', whiteSpace:'nowrap' }}>
              <div className="marquee-left" style={{
                display:'inline-flex', gap:'3rem',
                fontSize:'2.3rem', fontWeight:900, letterSpacing:'0.06em', textTransform:'uppercase'
              }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <span style={{ color: '#0d9488' }}>AL-XORAZMIY MAKTABI</span>
                    <span style={{ color:'#99f6e4', fontSize:'1.4rem' }}>✦</span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Row 2: TA'LIMDA INNOVATSIYA ← indigo */}
            <div style={{ overflow:'hidden', whiteSpace:'nowrap' }}>
              <div className="marquee-right" style={{
                display:'inline-flex', gap:'3rem',
                fontSize:'2.3rem', fontWeight:900, letterSpacing:'0.06em', textTransform:'uppercase'
              }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <span style={{ color: '#6366f1' }}>TA'LIMDA INNOVATSIYA</span>
                    <span style={{ color:'#c7d2fe', fontSize:'1.4rem' }}>✦</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two Charts Side by Side ───────────────────────────────────────── */}
      <div
        ref={chartsRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '1.5rem',
          width: '100%'
        }}
      >
        {/* Chart 1 ── Line: Level Growth by Period */}
        <div className="chart-card" style={{
          background: '#ffffff',
          borderRadius: '22px',
          padding: '1.75rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 10px 40px -10px rgba(99,102,241,0.09), 0 4px 6px -2px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.05rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' }}>
              Umumiy daraja o'sishi
            </h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.78rem', color:'#94a3b8', fontWeight:500 }}>
              Barcha o'quvchilar bo'yicha o'rtacha daraja (L0–L5)
            </p>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
              <div style={{ width:'26px', height:'3px', borderRadius:'99px', background:'#6366f1' }} />
              <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#6366f1' }}>Inglizcha</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
              <div style={{ width:'26px', height:'3px', borderRadius:'99px', background:'#0d9488' }} />
              <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#0d9488' }}>Matematika</span>
            </div>
          </div>

          {total > 0 ? (
            <LineChart
              engData={engLineData}
              mathData={mathLineData}
              labels={periodLabels}
              visible={chartsVisible}
            />
          ) : (
            <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8', fontSize:'0.9rem' }}>
              Ma'lumot mavjud emas
            </div>
          )}
        </div>

        {/* Chart 2 ── Donut: Level 4+ Achievement */}
        <div className="chart-card" style={{
          background: '#ffffff',
          borderRadius: '22px',
          padding: '1.75rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 10px 40px -10px rgba(13,148,136,0.09), 0 4px 6px -2px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.05rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' }}>
              4-daraja yutuqlari
            </h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.78rem', color:'#94a3b8', fontWeight:500 }}>
              B2 / Level 4+ ga erishgan o'quvchilar foizi
            </p>
          </div>

          {total > 0 ? (
            <DonutChart
              engPct={safeEngPct}
              mathPct={safeMathPct}
              total={total}
              visible={chartsVisible}
            />
          ) : (
            <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8', fontSize:'0.9rem' }}>
              Ma'lumot mavjud emas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
