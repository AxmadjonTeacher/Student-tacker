import React from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { Student } from '../types';

interface GraphModalProps {
  student: Student;
  onClose: () => void;
}





const GraphModal: React.FC<GraphModalProps> = ({ student, onClose }) => {
  // Normalize levels to a number for graphing
  const getLevelValue = (levelStr: string): number => {
    const trimmed = levelStr?.toString().trim() || '';
    // Handle "Level 1", "Level 2", "level3" etc.
    const numMatch = trimmed.match(/\d+/);
    if (numMatch) return parseInt(numMatch[0], 10);
    // Legacy text-based fallback
    const l = trimmed.toLowerCase();
    if (l.includes('adv') || l.includes('c1') || l.includes('c2')) return 6;
    if (l.includes('up')) return 5;
    if (l.includes('pre')) return 3;
    if (l.includes('int') || l.includes('b1') || l.includes('b2')) return 4;
    if (l.includes('ele') || l.includes('a2')) return 2;
    return 1;
  };

  const startValue = getLevelValue(student.startingLevel);
  const endValue = getLevelValue(student.currentLevel);
  
  const levelsImproved = endValue - startValue;

  // Use grand test data if available, otherwise generate some mock data based on levels
  const data = student.grandTests ? student.grandTests.map(test => ({
    date: test.name,
    val: test.score
  })) : (() => {
    const mockData = [];
    const totalPoints = 4;
    const testNames = ['Grant 1', 'Grant 2', 'Grant 3', 'Grant 4'];
    
    // Create a mock curve of scores from 40 to 90 depending on level improvement
    for (let i = 0; i < totalPoints; i++) {
      const progress = i / (totalPoints - 1);
      const baseScore = 50 + (startValue * 5); // Just a mock math
      const targetScore = 50 + (endValue * 5) + 15;
      const currentVal = baseScore + (targetScore - baseScore) * progress;
      
      mockData.push({
        date: testNames[i],
        val: Math.round(currentVal)
      });
    }
    return mockData;
  })();

  // Calculate dynamic, dramatic Y-axis domain boundaries to show impressive progress
  const scores = data.map(d => d.val);
  const minVal = scores.length > 0 ? Math.min(...scores) : 0;
  const maxVal = scores.length > 0 ? Math.max(...scores) : 100;
  const valRange = maxVal - minVal;
  // If progress is relatively narrow, compress domain so the mountain looks steeper and dramatic
  const padding = valRange < 15 ? 10 : 8; 
  const domainMin = Math.max(0, Math.floor((minVal - padding) / 5) * 5);
  const domainMax = Math.min(100, Math.ceil((maxVal + padding) / 5) * 5);

  // Generate clean tick marks dynamically
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#0a1f2e', fontSize: '0.9rem' }}>{label}</p>
          <p style={{ margin: '4px 0 0', color: '#129f87', fontSize: '0.85rem', fontWeight: 500 }}>
            Natija : {payload[0].payload.val}%
          </p>
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
          maxWidth: '800px', 
          width: '95%',
          background: '#fcfcf9', 
          borderRadius: '20px',
          padding: '2rem 2.5rem'
        }}
      >
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <button 
            onClick={onClose}
            style={{ 
              position: 'absolute', right: '-10px', top: '-10px', 
              background: 'transparent', border: '2px solid #129f87', 
              borderRadius: '50%', padding: '4px', cursor: 'pointer',
              color: '#129f87', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={26} color="#129f87" strokeWidth={2.5} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0a1f2e', margin: 0 }}>
              {student.name} {student.surname} — Progress
            </h2>
          </div>
          
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>Sinf {student.className}</span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span>Qabul qilingan: {student.dateJoined}</span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            {levelsImproved > 0 
              ? (
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  background: '#ccfbf1', color: '#0f766e',
                  padding: '0.2rem 0.65rem', borderRadius: '999px',
                  fontWeight: 600, fontSize: '0.9rem'
                }}>
                  <TrendingUp size={14} strokeWidth={2.5} />
                  {levelsImproved} darajaga ko'tarildi
                </span>
              ) : levelsImproved < 0 ? (
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  background: '#fee2e2', color: '#b91c1c',
                  padding: '0.2rem 0.65rem', borderRadius: '999px',
                  fontWeight: 600, fontSize: '0.9rem'
                }}>
                  <TrendingDown size={14} strokeWidth={2.5} />
                  {Math.abs(levelsImproved)} darajaga tushdi
                </span>
              ) : (
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  background: '#f1f5f9', color: '#64748b',
                  padding: '0.2rem 0.65rem', borderRadius: '999px',
                  fontWeight: 600, fontSize: '0.9rem'
                }}>
                  <Minus size={14} strokeWidth={2.5} />
                  Daraja saqlandi
                </span>
              )
            }
          </p>
        </div>

        <div style={{ 
          border: '1px solid #e2e8f0', 
          borderRadius: '20px', 
          background: '#ffffff',
          padding: '2rem 1.5rem 1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.1em' }}>
              BOSHLANG'ICH DARAJA: {student.startingLevel.toUpperCase()}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.1em' }}>
              HOZIRGI DARAJA: {student.currentLevel.toUpperCase()}
            </div>
          </div>

          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#129f87" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#129f87" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
                  dy={15}
                />
                <YAxis 
                  domain={[domainMin, domainMax]} 
                  ticks={ticks}
                  tickFormatter={(val) => `${val}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                
                {/* Reference line at 50% for passing mark if visible within domain */}
                {domainMin <= 50 && domainMax >= 50 && (
                  <ReferenceLine y={50} stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="3 3" />
                )}
                
                <Area 
                  type="monotone" 
                  dataKey="val" 
                  stroke="#129f87" 
                  strokeWidth={4} 
                  fillOpacity={1}
                  fill="url(#colorProgress)"
                  dot={{ r: 6, fill: '#ffffff', stroke: '#129f87', strokeWidth: 3 }}
                  activeDot={{ r: 8, fill: '#129f87', stroke: '#ffffff', strokeWidth: 3 }}
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphModal;
