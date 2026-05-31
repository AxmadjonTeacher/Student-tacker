import React, { useMemo, useEffect, useRef, useState } from 'react';
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
  return 1;
};

const getLocalClassGroup = (clsName: string): string => {
  const trimmed = clsName?.toString().trim() || '';
  const match = trimmed.match(/^(\d+)/);
  return match ? `${match[1]}-Sinf` : trimmed;
};

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, trigger: boolean = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
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
  engData: number[];
  mathData: number[];
  labels: string[];
  visible: boolean;
}

const LineChart: React.FC<LineChartProps> = ({ engData, mathData, labels, visible }) => {
  const W = 480, H = 260, PL = 44, PR = 16, PT = 16, PB = 44;
  const iW = W - PL - PR;
  const iH = H - PT - PB;

  const allVals = [...engData, ...mathData];
  const minV = Math.max(0, Math.min(...allVals) - 0.5);
  const maxV = Math.max(...allVals) + 0.5;
  const range = maxV - minV || 1;

  const toX = (i: number) => PL + (i / Math.max(labels.length - 1, 1)) * iW;
  const toY = (v: number) => PT + iH - ((v - minV) / range) * iH;

  const makePath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  const engPath = makePath(engData);
  const mathPath = makePath(mathData);

  // Y-axis labels: 5 ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => minV + (range / 4) * i);

  // Compute path length heuristic for animation
  const pathLen = iW * 2.5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mathGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
        </linearGradient>
        <filter id="glow-eng">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-math">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PL} y1={toY(tick)} x2={W - PR} y2={toY(tick)}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"
          />
          <text x={PL - 6} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {tick.toFixed(1)}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {labels.map((lbl, i) => (
        <text key={i} x={toX(i)} y={H - PT + 14} textAnchor="middle" fontSize="10" fill="#64748b">
          {lbl}
        </text>
      ))}

      {/* Area fills */}
      {engData.length > 1 && (
        <path
          d={`${engPath} L ${toX(engData.length - 1)},${PT + iH} L ${toX(0)},${PT + iH} Z`}
          fill="url(#engGrad)"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.5s' }}
        />
      )}
      {mathData.length > 1 && (
        <path
          d={`${mathPath} L ${toX(mathData.length - 1)},${PT + iH} L ${toX(0)},${PT + iH} Z`}
          fill="url(#mathGrad)"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.5s' }}
        />
      )}

      {/* English line */}
      {engData.length > 1 && (
        <path
          d={engPath}
          fill="none"
          stroke="#6366f1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow-eng)"
          strokeDasharray={pathLen}
          strokeDashoffset={visible ? 0 : pathLen}
          style={{ transition: `stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1) 0.2s` }}
        />
      )}

      {/* Math line */}
      {mathData.length > 1 && (
        <path
          d={mathPath}
          fill="none"
          stroke="#0d9488"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow-math)"
          strokeDasharray={pathLen}
          strokeDashoffset={visible ? 0 : pathLen}
          style={{ transition: `stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1) 0.5s` }}
        />
      )}

      {/* Data points */}
      {engData.map((v, i) => (
        <circle
          key={`e${i}`}
          cx={toX(i)} cy={toY(v)} r="4"
          fill="#fff" stroke="#6366f1" strokeWidth="2.5"
          style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.2 + i * 0.08}s` }}
        />
      ))}
      {mathData.map((v, i) => (
        <circle
          key={`m${i}`}
          cx={toX(i)} cy={toY(v)} r="4"
          fill="#fff" stroke="#0d9488" strokeWidth="2.5"
          style={{ opacity: visible ? 1 : 0, transition: `opacity 0.3s ease ${0.5 + i * 0.08}s` }}
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

  // We show: Eng L4+, Math L4+, neither (rest)
  // counts for display in center

  const segments = [
    { label: 'Inglizcha L4+', value: engPct, color: '#6366f1', offset: 0 },
    { label: 'Matematika L4+', value: mathPct, color: '#0d9488', offset: engPct },
    { label: "Rivojlanayotgan", value: Math.max(0, 100 - engPct - mathPct), color: '#e2e8f0', offset: engPct + mathPct },
  ];

  const dashFor = (pct: number) => (pct / 100) * circ;
  // rotate so first segment starts at top
  const startAngle = -90;

  const displayEngPct = useCountUp(Math.round(engPct), 1200, visible);
  const displayMathPct = useCountUp(Math.round(mathPct), 1400, visible);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
      <svg viewBox="0 0 260 260" style={{ width: '220px', height: '220px', flexShrink: 0 }}>
        <defs>
          <filter id="donut-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.12" />
          </filter>
        </defs>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />

        {/* Segments */}
        {segments.map((seg, i) => {
          const dash = dashFor(visible ? seg.value : 0);
          const gap = circ - dash;
          const rotation = startAngle + (seg.offset / 100) * 360;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeW}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              filter="url(#donut-shadow)"
              style={{ transition: `stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) ${0.1 + i * 0.15}s` }}
            />
          );
        })}

        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="28" fontWeight="800" fill="#0f172a">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">
          o'quvchi
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#6366f1', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Inglizcha L4+</span>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6366f1' }}>{displayEngPct}%</span>
        </div>
        <div style={{ height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #818cf8, #6366f1)',
            width: visible ? `${engPct}%` : '0%',
            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s'
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0d9488', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Matematika L4+</span>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d9488' }}>{displayMathPct}%</span>
        </div>
        <div style={{ height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #2dd4bf, #0d9488)',
            width: visible ? `${mathPct}%` : '0%',
            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1) 0.5s'
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#cbd5e1', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Rivojlanayotgan</span>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#94a3b8' }}>{Math.max(0, 100 - Math.round(engPct) - Math.round(mathPct))}%</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const Dashboard: React.FC<DashboardProps> = ({ students, availableClasses }) => {
  const [chartsVisible, setChartsVisible] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setChartsVisible(true); },
      { threshold: 0.2 }
    );
    if (chartsRef.current) obs.observe(chartsRef.current);
    return () => obs.disconnect();
  }, []);

  // Active students
  const activeStudents = useMemo(() => students.filter(s => !s.isDeleted), [students]);

  // Compute per-class avg English and Math current levels
  const classChartData = useMemo(() => {
    // Sort class groups numerically
    const sorted = [...availableClasses].sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
    });

    return sorted.map(clsGroup => {
      const cls = activeStudents.filter(s => getLocalClassGroup(s.className.toUpperCase()) === clsGroup);
      if (cls.length === 0) return { label: clsGroup, eng: 0, math: 0 };
      const engAvg = cls.reduce((s, st) => s + parseLevelToNumber(st.currentLevel || st.startingLevel), 0) / cls.length;
      const mathAvg = cls.reduce((s, st) => s + parseLevelToNumber(st.mathCurrentLevel || 'Level 1'), 0) / cls.length;
      return { label: clsGroup, eng: parseFloat(engAvg.toFixed(2)), math: parseFloat(mathAvg.toFixed(2)) };
    });
  }, [activeStudents, availableClasses]);

  const lineLabels = classChartData.map(d => d.label.replace('-Sinf', ''));
  const engLineData = classChartData.map(d => d.eng);
  const mathLineData = classChartData.map(d => d.math);

  // Donut: % of students at level 4+ (B2 / Level 4 or higher)
  const total = activeStudents.length;
  const engLevel4Pct = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.currentLevel || s.startingLevel) >= 4).length / total) * 100
    : 0;
  const mathLevel4Pct = total > 0
    ? (activeStudents.filter(s => parseLevelToNumber(s.mathCurrentLevel || 'Level 1') >= 4).length / total) * 100
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>

      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chart-card {
          animation: fade-up 0.6s ease both;
        }
        .chart-card:nth-child(2) {
          animation-delay: 0.15s;
        }
        .marquee-content-left {
          display: inline-flex;
          animation: scroll-left 28s linear infinite;
        }
        .marquee-content-right {
          display: inline-flex;
          animation: scroll-right 28s linear infinite;
        }
      `}} />

      {/* ── Premium Velocity Scroll Banner ───────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        borderRadius: '24px',
        padding: '0',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.07)'
      }}>
        {/* Noise texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
          opacity: 0.5, pointerEvents: 'none', zIndex: 1
        }} />

        {/* Glowing orbs */}
        <div style={{
          position: 'absolute', width: '280px', height: '280px',
          borderRadius: '50%', top: '-80px', left: '20%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0
        }} />
        <div style={{
          position: 'absolute', width: '200px', height: '200px',
          borderRadius: '50%', bottom: '-60px', right: '15%',
          background: 'radial-gradient(circle, rgba(13,148,136,0.22) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, paddingTop: '1.75rem', paddingBottom: '1.75rem' }}>
          {/* Mask edges */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '80px',
            background: 'linear-gradient(to right, #0f172a, transparent)',
            zIndex: 10, pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '80px',
            background: 'linear-gradient(to left, #0f172a, transparent)',
            zIndex: 10, pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Lane 1: AL-XORAZMIY MAKTABI → */}
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="marquee-content-left" style={{
                display: 'inline-flex', gap: '3rem',
                fontSize: '2.4rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase'
              }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <span style={{
                      background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 40%, #6366f1 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>AL-XORAZMIY MAKTABI</span>
                    <span style={{ color: 'rgba(99,102,241,0.35)', fontSize: '1.5rem' }}>✦</span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Lane 2: TA'LIMDA INNOVATSIYA ← */}
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="marquee-content-right" style={{
                display: 'inline-flex', gap: '3rem',
                fontSize: '2.4rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase'
              }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <span style={{
                      background: 'linear-gradient(135deg, #5eead4 0%, #2dd4bf 40%, #0d9488 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>TA'LIMDA INNOVATSIYA</span>
                    <span style={{ color: 'rgba(13,148,136,0.35)', fontSize: '1.5rem' }}>✦</span>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          width: '100%'
        }}
      >
        {/* Chart 1: Line Chart – English & Math Growth by Class */}
        <div
          className="chart-card"
          style={{
            background: '#ffffff',
            borderRadius: '22px',
            padding: '1.75rem',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 10px 40px -10px rgba(99,102,241,0.10), 0 4px 6px -2px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Sinf kesimida o'rtacha daraja
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
              Inglizcha va Matematika – joriy darajalar taqqoslash
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '28px', height: '3px', borderRadius: '99px', background: '#6366f1' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6366f1' }}>Inglizcha</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '28px', height: '3px', borderRadius: '99px', background: '#0d9488' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0d9488' }}>Matematika</span>
            </div>
          </div>

          {/* SVG Chart */}
          {lineLabels.length > 0 ? (
            <LineChart
              engData={engLineData}
              mathData={mathLineData}
              labels={lineLabels}
              visible={chartsVisible}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              Ma'lumot mavjud emas
            </div>
          )}
        </div>

        {/* Chart 2: Donut – Level 4+ Achievement */}
        <div
          className="chart-card"
          style={{
            background: '#ffffff',
            borderRadius: '22px',
            padding: '1.75rem',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 10px 40px -10px rgba(13,148,136,0.10), 0 4px 6px -2px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              4-daraja yutuqlari
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
              B2/Level 4 yoki undan yuqori darajaga erishgan o'quvchilar foizi
            </p>
          </div>

          {/* Donut */}
          {total > 0 ? (
            <DonutChart
              engPct={Math.min(engLevel4Pct, 100 - mathLevel4Pct)}
              mathPct={Math.min(mathLevel4Pct, 100 - Math.min(engLevel4Pct, 100 - mathLevel4Pct))}
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
