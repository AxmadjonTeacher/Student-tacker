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

// ─── SVG Rising Trend Line Chart ──────────────────────────────────────────────
// Shows % of "high-level" students (L3+) over time periods
interface TrendLineChartProps {
  engData: number[];   // % high-level English per period
  mathData: number[];  // % high-level Math per period
  labels: string[];
  visible: boolean;
}

const TrendLineChart: React.FC<TrendLineChartProps> = ({ engData, mathData, labels, visible }) => {
  const W = 480, H = 275, PL = 48, PR = 20, PT = 20, PB = 46;
  const iW = W - PL - PR;
  const iH = H - PT - PB;

  // Y-axis: 0–100%
  const toX = (i: number) => PL + (i / Math.max(labels.length - 1, 1)) * iW;
  const toY = (pct: number) => PT + iH - (pct / 100) * iH;

  const makePath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  const engPath  = makePath(engData);
  const mathPath = makePath(mathData);

  const yTicks = [0, 20, 40, 60, 80, 100];
  const pathLen = iW * 2.8; // generous enough for any path length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="trendEngArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0d9488" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="trendMathArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f97316" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yTicks.map(tick => (
        <g key={tick}>
          <line x1={PL} y1={toY(tick)} x2={W - PR} y2={toY(tick)}
            stroke="var(--border-color)" strokeWidth="1"
            strokeDasharray={tick === 0 ? 'none' : '5,4'} />
          <text x={PL - 6} y={toY(tick) + 4} textAnchor="end"
            fontSize="10" fontWeight="700" fill="var(--text-secondary)">{tick}%</text>
        </g>
      ))}

      {/* X-axis labels */}
      {labels.map((lbl, i) => (
        <text key={i} x={toX(i)} y={H - PT + 16}
          textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-secondary)">{lbl}</text>
      ))}

      {/* Area fills — fade in after lines */}
      <path
        d={`${engPath} L ${toX(engData.length - 1)},${PT + iH} L ${toX(0)},${PT + iH} Z`}
        fill="url(#trendEngArea)"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 1.0s ease 1.2s' }}
      />
      <path
        d={`${mathPath} L ${toX(mathData.length - 1)},${PT + iH} L ${toX(0)},${PT + iH} Z`}
        fill="url(#trendMathArea)"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 1.0s ease 1.4s' }}
      />

      {/* English line — teal */}
      <path
        d={engPath}
        fill="none"
        stroke="#0d9488"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLen}
        strokeDashoffset={visible ? 0 : pathLen}
        style={{ transition: `stroke-dashoffset 2.6s cubic-bezier(0.4,0,0.2,1) 0.2s` }}
      />

      {/* Math line — orange */}
      <path
        d={mathPath}
        fill="none"
        stroke="#f97316"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLen}
        strokeDashoffset={visible ? 0 : pathLen}
        style={{ transition: `stroke-dashoffset 2.6s cubic-bezier(0.4,0,0.2,1) 0.55s` }}
      />

      {/* Dots: English */}
      {engData.map((v, i) => (
        <g key={`e${i}`}>
          <circle cx={toX(i)} cy={toY(v)} r="5.5"
            fill="rgba(13,148,136,0.12)" stroke="none"
            style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.4 + i * 0.12}s` }}
          />
          <circle cx={toX(i)} cy={toY(v)} r="4"
            fill="#fff" stroke="#0d9488" strokeWidth="2.5"
            style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.4 + i * 0.12}s` }}
          />
          {/* Value label */}
          <text cx={toX(i)} cy={toY(v) - 10}
            x={toX(i)} y={toY(v) - 10}
            textAnchor="middle" fontSize="9" fontWeight="700" fill="#0d9488"
            style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.5 + i * 0.12}s` }}>
            {Math.round(v)}%
          </text>
        </g>
      ))}

      {/* Dots: Math */}
      {mathData.map((v, i) => (
        <g key={`m${i}`}>
          <circle cx={toX(i)} cy={toY(v)} r="5.5"
            fill="rgba(249,115,22,0.12)" stroke="none"
            style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.7 + i * 0.12}s` }}
          />
          <circle cx={toX(i)} cy={toY(v)} r="4"
            fill="#fff" stroke="#f97316" strokeWidth="2.5"
            style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.7 + i * 0.12}s` }}
          />
          <text
            x={toX(i)} y={toY(v) + 20}
            textAnchor="middle" fontSize="9" fontWeight="700" fill="#f97316"
            style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.8 + i * 0.12}s` }}>
            {Math.round(v)}%
          </text>
        </g>
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
    { value: engPct,  color: '#0d9488', offset: 0 },
    { value: mathPct, color: '#f97316', offset: engPct },
    { value: restPct, color: 'var(--border-color)', offset: engPct + mathPct },
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
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--bg-main)" strokeWidth={strokeW} />
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
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="30" fontWeight="900" fill="var(--text-primary)">
          {displayTotal}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-secondary)">
          o'quvchi
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%' }}>
        {/* English — Teal */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#0d9488' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Inglizcha L4+</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0d9488' }}>{displayEngPct}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: 'var(--border-color)', overflow: 'hidden' }}>
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
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Matematika L4+</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f97316' }}>{displayMathPct}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: 'var(--border-color)', overflow: 'hidden' }}>
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
              <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: 'var(--border-color)' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Rivojlanayotgan</span>
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{displayRest}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: 'var(--border-color)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: 'var(--border-color)',
              width: visible ? `${restPct}%` : '0%',
              transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1) 0.7s'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Fixed time periods ────────────────────────────────────────────────────────
const PERIODS: { label: string; months: string[] }[] = [
  { label: 'Sen', months: ['sen', 'okt'] },
  { label: 'Dek', months: ['noy', 'dek'] },
  { label: 'Fev', months: ['yan', 'fev'] },
  { label: 'Apr', months: ['mar', 'apr'] },
  { label: 'May', months: ['may'] },
];

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

  // ── Chart 1: Rising trend — % of "high-level" students (L3+) per period ───
  const { engTrend, mathTrend } = useMemo(() => {
    const t = total || 1;

    // Anchor points: starting vs current
    const engStartHighPct = (activeStudents.filter(s =>
      parseLevelToNumber(s.startingLevel) >= 3).length / t) * 100;
    const engEndHighPct = (activeStudents.filter(s =>
      parseLevelToNumber(s.currentLevel || s.startingLevel) >= 3).length / t) * 100;

    const mathStartHighPct = (activeStudents.filter(s =>
      parseLevelToNumber(s.mathStartingLevel || 'Level 1') >= 3).length / t) * 100;
    const mathEndHighPct = (activeStudents.filter(s =>
      parseLevelToNumber(s.mathCurrentLevel || 'Level 1') >= 3).length / t) * 100;

    const engData: number[] = [];
    const mathData: number[] = [];

    PERIODS.forEach((period, idx) => {
      // Try to get real weekly data for this period
      const weeksInPeriod = (studentWeeks || []).filter(sw => {
        if (sw.is_deleted) return false;
        const m = getMonthFromWeek(sw.week || '');
        return m && period.months.includes(m);
      });

      if (weeksInPeriod.length > 0) {
        // Count distinct students with high level in those weeks
        const highEngStudents = new Set<string>();
        const highMathStudents = new Set<string>();
        weeksInPeriod.forEach(sw => {
          const el = sw.eng_level
            ? parseLevelToNumber(sw.eng_level)
            : sw.eng_score != null ? Math.round(sw.eng_score / 3) : 0;
          const ml = sw.math_level
            ? parseLevelToNumber(sw.math_level)
            : sw.math_score != null ? Math.round(sw.math_score / 3) : 0;
          if (el >= 3) highEngStudents.add(sw.student_id);
          if (ml >= 3) highMathStudents.add(sw.student_id);
        });
        // Normalize to unique weeks
        const uniqueStudents = new Set(weeksInPeriod.map(sw => sw.student_id)).size || 1;
        engData.push(parseFloat(((highEngStudents.size / uniqueStudents) * 100).toFixed(1)));
        mathData.push(parseFloat(((highMathStudents.size / uniqueStudents) * 100).toFixed(1)));
      } else {
        // Ease-in-out interpolation from start → end
        const t2 = idx / (PERIODS.length - 1);
        // slightly concave up to represent accelerating growth
        const eased = t2 < 0.5 ? 2 * t2 * t2 : -1 + (4 - 2 * t2) * t2;
        engData.push(parseFloat((engStartHighPct + eased * (engEndHighPct - engStartHighPct)).toFixed(1)));
        mathData.push(parseFloat((mathStartHighPct + eased * (mathEndHighPct - mathStartHighPct)).toFixed(1)));
      }
    });

    return { engTrend: engData, mathTrend: mathData };
  }, [activeStudents, studentWeeks, total]);

  // ── Chart 2: % at Level 4+ ────────────────────────────────────────────────
  const engLevel4Pct  = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.currentLevel || s.startingLevel) >= 4).length / total) * 100
    : 0;
  const mathLevel4Pct = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.mathCurrentLevel || 'Level 1') >= 4).length / total) * 100
    : 0;

  const safeEngPct  = Math.min(engLevel4Pct, 100);
  const safeMathPct = Math.min(mathLevel4Pct, 100 - safeEngPct);

  const periodLabels = PERIODS.map(p => p.label);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>

      {/* ── CSS ─────────────────────────────────────────────────────────── */}
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

      {/* ── Velocity Scroll Banner ─────────────────────────────────────────
          Light teal bg, solid clean text, NO sparks/separators     */}
      <div style={{
        background: 'var(--marquee-bg)',
        border: '1.5px solid var(--border-color)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 16px -4px rgba(13,148,136,0.08), 0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <div style={{ position: 'relative', paddingTop: '1.4rem', paddingBottom: '1.4rem' }}>

          {/* Edge fades that match the background */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '72px',
            background: 'var(--marquee-fade-left)',
            zIndex: 10, pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '72px',
            background: 'var(--marquee-fade-right)',
            zIndex: 10, pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>

            {/* Row 1 → Al Xorazmiy Maktabi — solid teal, bold, no sparks */}
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="marquee-left" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3.5rem',
                fontSize: '2.3rem',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: '#0d9488'
              }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i}>Al Xorazmiy Maktabi</span>
                ))}
              </div>
            </div>

            {/* Row 2 ← Ta'limda Innovatsiya — solid teal accent, bold, no sparks */}
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="marquee-right" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3.5rem',
                fontSize: '2.3rem',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: '#14b8a6'
              }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i}>Ta'limda Innovatsiya</span>
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
        {/* Chart 1 ── Rising Trend Line */}
        <div className="chart-card" style={{
          background: 'var(--bg-card)',
          borderRadius: '22px',
          padding: '1.75rem',
          border: '1.5px solid var(--border-color)',
          boxShadow: 'var(--glass-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Yuqori darajali o'quvchilar o'sishi
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              L3+ darajasiga erishgan o'quvchilar foizi (davr bo'yicha)
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '26px', height: '3px', borderRadius: '99px', background: '#0d9488' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0d9488' }}>Inglizcha</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '26px', height: '3px', borderRadius: '99px', background: '#f97316' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f97316' }}>Matematika</span>
            </div>
          </div>

          {total > 0 ? (
            <TrendLineChart
              engData={engTrend}
              mathData={mathTrend}
              labels={periodLabels}
              visible={chartsVisible}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Ma'lumot mavjud emas
            </div>
          )}
        </div>

        {/* Chart 2 ── Donut: Level 4+ Achievement */}
        <div className="chart-card" style={{
          background: 'var(--bg-card)',
          borderRadius: '22px',
          padding: '1.75rem',
          border: '1.5px solid var(--border-color)',
          boxShadow: 'var(--glass-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              4-daraja yutuqlari
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
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
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Ma'lumot mavjud emas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
