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

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, trigger = true) {
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

// ─── SVG Bar Chart: % of students at each level ───────────────────────────────
interface BarChartProps {
  // engBars[i] = % of students at level i (0..5) for English
  engBars: number[];
  // mathBars[i] = % of students at level i (0..5) for Math
  mathBars: number[];
  visible: boolean;
}

const LevelBarChart: React.FC<BarChartProps> = ({ engBars, mathBars, visible }) => {
  const W = 480, H = 280, PL = 50, PR = 16, PT = 16, PB = 48;
  const iW = W - PL - PR;
  const iH = H - PT - PB;

  const levels = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
  const n = levels.length;            // 6 groups
  const groupW = iW / n;
  const barW = groupW * 0.32;
  const gap = groupW * 0.06;

  // Y-axis: 0–100%
  const toY = (pct: number) => PT + iH - (pct / 100) * iH;
  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="barEngGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="1" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="barMathGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
          <stop offset="100%" stopColor="#fdba74" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yTicks.map(tick => (
        <g key={tick}>
          <line x1={PL} y1={toY(tick)} x2={W - PR} y2={toY(tick)}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray={tick === 0 ? 'none' : '5,4'} />
          <text x={PL - 6} y={toY(tick) + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#94a3b8">
            {tick}%
          </text>
        </g>
      ))}

      {/* Bars + X labels */}
      {levels.map((lbl, i) => {
        const groupX = PL + i * groupW;
        const engH = visible ? (engBars[i] / 100) * iH : 0;
        const mathH = visible ? (mathBars[i] / 100) * iH : 0;
        const engX = groupX + groupW / 2 - barW - gap / 2;
        const mathX = groupX + groupW / 2 + gap / 2;

        return (
          <g key={lbl}>
            {/* English bar */}
            <rect
              x={engX} y={toY(engBars[i])}
              width={barW}
              height={engH}
              rx={4} ry={4}
              fill="url(#barEngGrad)"
              style={{
                transition: `y 1.8s cubic-bezier(0.4,0,0.2,1) ${0.1 + i * 0.07}s, height 1.8s cubic-bezier(0.4,0,0.2,1) ${0.1 + i * 0.07}s`,
                transformOrigin: `${engX}px ${PT + iH}px`
              }}
            />
            {/* Math bar */}
            <rect
              x={mathX} y={toY(mathBars[i])}
              width={barW}
              height={mathH}
              rx={4} ry={4}
              fill="url(#barMathGrad)"
              style={{
                transition: `y 1.8s cubic-bezier(0.4,0,0.2,1) ${0.25 + i * 0.07}s, height 1.8s cubic-bezier(0.4,0,0.2,1) ${0.25 + i * 0.07}s`,
              }}
            />
            {/* Value labels on top of bars */}
            {engBars[i] > 3 && (
              <text x={engX + barW / 2} y={toY(engBars[i]) - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0d9488"
                style={{ opacity: visible ? 1 : 0, transition: `opacity 0.5s ease ${0.3 + i * 0.07}s` }}>
                {Math.round(engBars[i])}%
              </text>
            )}
            {mathBars[i] > 3 && (
              <text x={mathX + barW / 2} y={toY(mathBars[i]) - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#f97316"
                style={{ opacity: visible ? 1 : 0, transition: `opacity 0.5s ease ${0.45 + i * 0.07}s` }}>
                {Math.round(mathBars[i])}%
              </text>
            )}
            {/* X-axis label */}
            <text x={groupX + groupW / 2} y={H - PT + 16} textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569">
              {lbl}
            </text>
          </g>
        );
      })}
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
    { value: engPct,   color: '#0d9488', offset: 0 },           // Teal for English
    { value: mathPct,  color: '#f97316', offset: engPct },       // Orange for Math
    { value: restPct,  color: '#e2e8f0', offset: engPct + mathPct },
  ];

  const dashFor = (pct: number) => (pct / 100) * circ;

  const displayEngPct  = useCountUp(Math.round(engPct),  1400, visible);
  const displayMathPct = useCountUp(Math.round(mathPct), 1600, visible);
  const displayTotal   = useCountUp(total,               1800, visible);
  const displayRest    = useCountUp(Math.round(restPct), 1400, visible);

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
          const gap  = circ - dash;
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
        {/* Animated total count in centre */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="30" fontWeight="900" fill="#0f172a">
          {displayTotal}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
          o'quvchi
        </text>
      </svg>

      {/* Legend + progress bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%' }}>
        {/* English — Teal */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#0d9488' }} />
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>Inglizcha L4+</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0d9488' }}>{displayEngPct}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'linear-gradient(90deg,#2dd4bf,#0d9488)',
              width: visible ? `${engPct}%` : '0%',
              transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1) 0.3s'
            }} />
          </div>
        </div>
        {/* Math — Orange */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#f97316' }} />
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>Matematika L4+</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f97316' }}>{displayMathPct}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'linear-gradient(90deg,#fdba74,#f97316)',
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

  // ── Chart 1: % of students at each level (L0–L5) ──────────────────────────
  const { engBars, mathBars } = useMemo(() => {
    const engCount = [0, 0, 0, 0, 0, 0]; // index = level 0..5
    const mathCount = [0, 0, 0, 0, 0, 0];

    activeStudents.forEach(s => {
      const el = Math.min(5, Math.max(0, parseLevelToNumber(s.currentLevel || s.startingLevel)));
      const ml = Math.min(5, Math.max(0, parseLevelToNumber(s.mathCurrentLevel || 'Level 1')));
      engCount[el]++;
      mathCount[ml]++;
    });

    const t = total || 1;
    return {
      engBars:  engCount.map(c => parseFloat(((c / t) * 100).toFixed(1))),
      mathBars: mathCount.map(c => parseFloat(((c / t) * 100).toFixed(1))),
    };
  }, [activeStudents, total]);

  // ── Chart 2: % at Level 4+ ─────────────────────────────────────────────────
  const engLevel4Pct = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.currentLevel || s.startingLevel) >= 4).length / total) * 100
    : 0;
  const mathLevel4Pct = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.mathCurrentLevel || 'Level 1') >= 4).length / total) * 100
    : 0;

  const safeEngPct  = Math.min(engLevel4Pct, 100);
  const safeMathPct = Math.min(mathLevel4Pct, 100 - safeEngPct);

  // Suppress unused warning — studentWeeks kept for future use
  void studentWeeks;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>

      {/* ── CSS ──────────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chart-card { animation: fade-up 0.65s ease both; }
        .chart-card:nth-child(2) { animation-delay: 0.18s; }
        .marquee-left  { display: inline-flex; animation: scroll-left  32s linear infinite; }
        .marquee-right { display: inline-flex; animation: scroll-right 32s linear infinite; }
      `}} />

      {/* ── Velocity Scroll Banner ────────────────────────────────────────── */}
      {/*  Light, clean — no blur, no gradient text, solid colours only       */}
      <div style={{
        background: 'linear-gradient(160deg, #edfafa 0%, #eff6ff 100%)',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 16px -4px rgba(13,148,136,0.08), 0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <div style={{ position: 'relative', paddingTop: '1.4rem', paddingBottom: '1.4rem' }}>
          {/* Edge fades that match the background */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '72px',
            background: 'linear-gradient(to right, #edfafa, transparent)',
            zIndex: 10, pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '72px',
            background: 'linear-gradient(to left, #eff6ff, transparent)',
            zIndex: 10, pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

            {/* Row 1 → AL-XORAZMIY MAKTABI — solid teal */}
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="marquee-left" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2.5rem',
                fontSize: '2.25rem',
                fontWeight: 900,
                letterSpacing: '0.01em',
                color: '#0d9488',          /* solid teal, no gradient, no filter */
                textTransform: 'uppercase'
              }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <span>Al Xorazmiy Maktabi</span>
                    <span style={{ color: '#99f6e4', fontWeight: 400, fontSize: '1.2rem' }}>✦</span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Row 2 ← TA'LIMDA INNOVATSIYA — solid indigo */}
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="marquee-right" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2.5rem',
                fontSize: '2.25rem',
                fontWeight: 900,
                letterSpacing: '0.01em',
                color: '#6366f1',          /* solid indigo, no gradient, no filter */
                textTransform: 'uppercase'
              }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <span>Ta'limda Innovatsiya</span>
                    <span style={{ color: '#c7d2fe', fontWeight: 400, fontSize: '1.2rem' }}>✦</span>
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
        {/* Chart 1 ── Grouped Bar: % of students per level */}
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
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Darajalar bo'yicha taqsimot
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
              Har bir daraja (L0–L5) bo'yicha o'quvchilar foizi
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '12px', borderRadius: '3px', background: '#0d9488' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0d9488' }}>Inglizcha</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '12px', borderRadius: '3px', background: '#f97316' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f97316' }}>Matematika</span>
            </div>
          </div>

          {total > 0 ? (
            <LevelBarChart engBars={engBars} mathBars={mathBars} visible={chartsVisible} />
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>
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
          boxShadow: '0 10px 40px -10px rgba(249,115,22,0.09), 0 4px 6px -2px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              4-daraja yutuqlari
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
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
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              Ma'lumot mavjud emas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
