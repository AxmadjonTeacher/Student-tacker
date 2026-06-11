import React from 'react';

// Amber warning chip for "Maktab qoidalari" violations, modeled on the red
// "ID Xato" chip in StudentTable. Renders nothing when there are no violations.
const RulesViolationChip: React.FC<{ count: number }> = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <span
      title={`Maktab qoidalari buzilishi: ${count} marta (har biri -2 ball jarima)`}
      style={{
        background: 'rgba(245, 158, 11, 0.15)',
        color: '#d97706',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '6px',
        padding: '0.1rem 0.4rem',
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}></span>
      Qoida ×{count}
    </span>
  );
};

export default RulesViolationChip;
