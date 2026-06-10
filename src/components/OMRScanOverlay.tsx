import React, { useEffect, useState } from 'react';

export type ScanState = 'idle' | 'aligned' | 'captured' | 'processing';

interface Props {
  state: ScanState;
  onCapture: () => void;
  onClose: () => void;
}

const STATE_COLORS: Record<ScanState, string> = {
  idle:       'rgba(255,255,255,0.70)',
  aligned:    'rgba(52,199,89,0.95)',
  captured:   'rgba(0,122,255,0.95)',
  processing: 'rgba(255,159,10,0.95)',
};

interface FrameRect { top: number; left: number; width: number; height: number; }

export const OMRScanOverlay: React.FC<Props> = ({ state, onCapture, onClose }) => {
  const [frame, setFrame] = useState<FrameRect>({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const compute = () => {
      const safeTop = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--sat') || '44'
      ) || 44;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w  = vw * 0.86;
      const h  = w / 0.7071; // A4 ratio
      const top  = safeTop + (vh - safeTop - h) * 0.38;
      const left = (vw - w) / 2;
      setFrame({ top, left, width: w, height: h });

      // Expose frame height as CSS variable for scanLine animation
      document.documentElement.style.setProperty('--omr-frame-height', `${h}px`);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(document.documentElement);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--omr-frame-height');
    };
  }, []);

  const color   = STATE_COLORS[state];
  const ARM     = 28;
  const THICK   = 3;
  const HALF    = THICK / 2;
  const showScan = state === 'idle' || state === 'aligned';

  const cornerStyle = (pos: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'absolute', pointerEvents: 'none' };
    if (pos === 'tl') return { ...base, top: frame.top - HALF,  left: frame.left - HALF };
    if (pos === 'tr') return { ...base, top: frame.top - HALF,  left: frame.left + frame.width - ARM - HALF, transform: 'rotate(90deg)', transformOrigin: 'top left' };
    if (pos === 'bl') return { ...base, top: frame.top + frame.height - ARM - HALF, left: frame.left - HALF, transform: 'rotate(-90deg)', transformOrigin: 'top left' };
    return {              ...base, top: frame.top + frame.height - ARM - HALF, left: frame.left + frame.width - ARM - HALF, transform: 'rotate(180deg)', transformOrigin: 'top left' };
  };

  const BracketSVG: React.FC<{ pos: 'tl' | 'tr' | 'bl' | 'br' }> = ({ pos }) => (
    <svg
      width={ARM + THICK}
      height={ARM + THICK}
      style={cornerStyle(pos)}
    >
      <path
        d={`M ${HALF} ${ARM + HALF} L ${HALF} ${HALF} L ${ARM + HALF} ${HALF}`}
        fill="none"
        stroke={color}
        strokeWidth={THICK}
        strokeLinecap="round"
        style={{ transition: 'stroke 200ms ease' }}
      />
    </svg>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 900,
      pointerEvents: 'none',
    }}>
      {/* Vignette — dims everything outside the A4 frame */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="omr-frame-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={frame.left} y={frame.top}
              width={frame.width} height={frame.height}
              rx={4} fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.50)" mask="url(#omr-frame-mask)" />
      </svg>

      {/* Scanning line */}
      {showScan && frame.width > 0 && (
        <div style={{
          position: 'absolute',
          top: frame.top,
          left: frame.left,
          width: frame.width,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation: 'scanLine 1.8s linear infinite',
          opacity: 0.80,
          pointerEvents: 'none',
        }} />
      )}

      {/* Corner brackets */}
      {frame.width > 0 && (
        <>
          <BracketSVG pos="tl" />
          <BracketSVG pos="tr" />
          <BracketSVG pos="bl" />
          <BracketSVG pos="br" />
        </>
      )}

      {/* Status label */}
      {frame.width > 0 && (
        <div style={{
          position: 'absolute',
          top: frame.top - 40,
          left: frame.left,
          width: frame.width,
          textAlign: 'center',
          color,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          transition: 'color 200ms ease',
          pointerEvents: 'none',
        }}>
          {state === 'idle'       && 'Varaqni kadrga joylashtiring'}
          {state === 'aligned'    && 'Tayyor — skanerlash uchun bosing'}
          {state === 'captured'   && 'Tahlil qilinmoqda…'}
          {state === 'processing' && 'Javoblar aniqlanmoqda…'}
        </div>
      )}

      {/* Capture button */}
      <div style={{
        position: 'absolute',
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 48px)`,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        <button
          onClick={onCapture}
          disabled={state === 'processing' || state === 'captured'}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: `3px solid ${color}`,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: 'pointer',
            transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: `0 4px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.30)`,
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.40)',
            border: '1px solid rgba(255,255,255,0.20)',
            color: '#fff',
            borderRadius: 9999,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          Yopish
        </button>
      </div>
    </div>
  );
};
