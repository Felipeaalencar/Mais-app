import { RANGES } from '../config';

export default function VitalChart({ sv }) {
  const items = Object.keys(RANGES).map(key => {
    const raw = sv[key];
    if (!raw) return null;
    const val = parseFloat(String(raw).replace(/,/g, '.').match(/\d+\.?\d*/)?.[0] || 'NaN');
    if (isNaN(val)) return null;
    const range = RANGES[key];
    const { min, max } = range;
    const span = max - min || 1;
    const pct = Math.min(Math.max((val - min) / span * 100, 0), 130);
    const normal = val >= min && val <= max;
    const color = normal ? '#22c55e' : val < min ? '#f59e0b' : '#ef4444';
    return { key, label: range.label, unit: range.unit, val, min, max, pct, color, normal };
  }).filter(Boolean);

  if (!items.length) return null;

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
      <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '14px' }}>PARAMETROS vs REFERENCIA NORMAL</div>
      {items.map(item => (
        <div key={item.key} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{item.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: item.color }}>{item.val}</span>
              <span style={{ fontSize: '9px', color: '#475569' }}>{item.unit}</span>
              <span style={{ fontSize: '9px', color: '#334155' }}>ref: {item.min}-{item.max}</span>
            </div>
          </div>
          <div style={{ position: 'relative', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: `${(item.min / (item.max * 1.5)) * 100}%`, top: '-1px',
              height: '10px', width: `${((item.max - item.min) / (item.max * 1.5)) * 100}%`,
              background: '#22c55e20', border: '1px solid #22c55e40'
            }} />
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${Math.min(item.pct / 130 * 100, 100)}%`,
              background: item.color, borderRadius: '4px',
              transition: 'width 0.5s ease',
              minWidth: item.val > 0 ? '3px' : '0'
            }} />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
        {[['#22c55e', 'Normal'], ['#f59e0b', 'Abaixo'], ['#ef4444', 'Acima']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '4px', background: c, borderRadius: '2px' }} />
            <span style={{ fontSize: '9px', color: '#475569' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
