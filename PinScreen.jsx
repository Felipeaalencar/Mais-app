import { useState } from 'react';
import { PIN } from '../config';
import Logo from './Logo';

export default function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);

  function press(d) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setErr(false);
    if (next.length === 4) {
      if (next === PIN) { onUnlock(); }
      else { setTimeout(() => { setPin(''); setErr(true); }, 400); }
    }
  }

  function del() { setPin(p => p.slice(0, -1)); setErr(false); }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <Logo size={56} />
      <div style={{ fontWeight: 700, fontSize: '20px', color: '#1D9E75', letterSpacing: '6px', margin: '12px 0 4px' }}>MAIS</div>
      <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.2em', marginBottom: '40px' }}>inteligencia clinica.</div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '32px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: '14px', height: '14px', borderRadius: '50%',
            background: pin.length > i ? (err ? '#ef4444' : '#1D9E75') : '#1e293b',
            border: `2px solid ${pin.length > i ? (err ? '#ef4444' : '#1D9E75') : '#334155'}`,
            transition: 'all 0.15s'
          }} />
        ))}
      </div>

      {err && <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '16px' }}>Senha incorreta</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', width: '240px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'x'].map((d, i) => {
          if (d === '') return <div key={i} />;
          return (
            <button key={i} onClick={() => d === 'x' ? del() : press(String(d))}
              style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', height: '64px', fontSize: d === 'x' ? '20px' : '22px', fontWeight: 600, color: '#f1f5f9', cursor: 'pointer', fontFamily: 'monospace' }}>
              {d === 'x' ? '<' : d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
