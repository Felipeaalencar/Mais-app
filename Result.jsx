import { useState } from 'react';

function Sec({ title, icon, accent = '#38bdf8', children }) {
  return (
    <div style={{ background: '#0f172a', border: `1px solid ${accent}30`, borderLeft: `3px solid ${accent}`, borderRadius: '9px', padding: '14px', marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '10px' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function MetasItem({ m }) {
  const [ok, setOk] = useState(false);
  return (
    <div onClick={() => setOk(!ok)} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1e293b', cursor: 'pointer' }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '3px', border: `2px solid ${ok ? '#0ea5e9' : '#334155'}`, background: ok ? '#0ea5e9' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {ok && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>v</span>}
      </div>
      <span style={{ color: ok ? '#475569' : '#7dd3fc', fontSize: '12px', textDecoration: ok ? 'line-through' : 'none' }}>{m}</span>
    </div>
  );
}

function CheckItem({ c }) {
  const [done, setDone] = useState(false);
  return (
    <div onClick={() => setDone(!done)} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1e293b', cursor: 'pointer' }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '3px', border: `2px solid ${done ? '#34d399' : '#334155'}`, background: done ? '#34d399' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {done && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>v</span>}
      </div>
      <span style={{ color: done ? '#475569' : '#86efac', fontSize: '12px', textDecoration: done ? 'line-through' : 'none' }}>{c}</span>
    </div>
  );
}

const TABS = [
  { id: 'resumo', l: 'Resumo', i: '📋' },
  { id: 'hip', l: 'Diferenciais', i: '🔬' },
  { id: 'sepse', l: 'Sepse', i: '🚨' },
  { id: 'flags', l: 'Red Flags', i: '⚑' },
  { id: 'passos', l: 'Passos', i: '🗺' },
  { id: 'scores', l: 'Scores', i: '📊' },
  { id: 'plantao', l: 'Plantao', i: '📝' },
  { id: 'familia', l: 'Familia', i: '👪' },
  { id: 'metas', l: 'Metas', i: '🎯' },
  { id: 'check', l: 'Checklist', i: 'OK' },
];

export default function Result({ data, onPDF }) {
  const [tab, setTab] = useState('resumo');
  const sv = data.paciente?.sinais_vitais || {};
  const qsofa = data.sepse?.qsofa || {};
  const ic = data.sepse?.indice_choque || {};

  return (
    <div>
      {data.urgente && (
        <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ef4444', fontSize: '14px' }}>🚨</span>
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em' }}>ATENCAO IMEDIATA</span>
          <span style={{ color: '#fca5a5', fontSize: '11px' }}>Avaliacao urgente recomendada.</span>
        </div>
      )}

      {(qsofa.pontos >= 2 || parseFloat(ic.valor) >= 1) && (
        <div style={{ background: '#450a0a', border: '1px solid #ef444460', borderRadius: '8px', padding: '8px 14px', marginBottom: '10px' }}>
          <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
            SEPSE — qSOFA: {qsofa.pontos} pts — {qsofa.risco} {ic.valor ? `— Ind.Choque: ${ic.valor}` : ''}
          </span>
        </div>
      )}

      {Object.keys(sv).length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '9px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>SINAIS VITAIS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(sv).filter(([, v]) => v).map(([k, v]) => {
              const isIc = k === 'IND.CHOQUE';
              const num = parseFloat(String(v));
              let color = '#94a3b8';
              if (k === 'FC' && (num > 100 || num < 50)) color = '#ef4444';
              else if (k === 'PAS' && num < 90) color = '#ef4444';
              else if (k === 'FR' && num >= 22) color = '#ef4444';
              else if (k === 'SpO2' && num < 90) color = '#ef4444';
              else if (k === 'Glasgow' && num < 13) color = '#ef4444';
              else if (isIc && num >= 1) color = '#ef4444';
              const isCritVal = color === '#ef4444';
              return (
                <div key={k} style={{ background: '#020617', border: `1px solid ${isCritVal ? '#ef444430' : '#1e293b'}`, borderRadius: '6px', padding: '5px 10px', textAlign: 'center', minWidth: '60px' }}>
                  <div style={{ fontSize: '8px', color: '#64748b', marginBottom: '2px' }}>{k}</div>
                  <div style={{ fontSize: String(v).length > 6 ? '10px' : '13px', fontWeight: 700, color }}>{v}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? '#1e3a5f' : 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #0ea5e9' : '2px solid transparent', cursor: 'pointer', padding: '6px 10px', color: tab === t.id ? '#0ea5e9' : '#64748b', fontFamily: 'monospace', fontSize: '11px', fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap' }}>
            {t.i} {t.l}
          </button>
        ))}
        <button onClick={onPDF} style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#059669,#0d9488)', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', color: '#fff', fontWeight: 700, fontSize: '11px', fontFamily: 'monospace' }}>PDF</button>
      </div>

      {tab === 'resumo' && (
        <div>
          {data.resumo && <Sec title="Resumo" icon="📋" accent="#38bdf8"><p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.7 }}>{data.resumo}</p></Sec>}
          {data.paciente && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Sec title="Paciente" icon="👤" accent="#818cf8">
                {data.paciente.idade && <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Idade: <b style={{ color: '#f1f5f9' }}>{data.paciente.idade}</b></div>}
                {data.paciente.setor && <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Setor: <b style={{ color: '#f1f5f9' }}>{data.paciente.setor}</b></div>}
                {(data.paciente.comorbidades || []).length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>COMORBIDADES</div>
                    <div>{(data.paciente.comorbidades || []).map((c, i) => <span key={i} className="tag">{c}</span>)}</div>
                  </div>
                )}
              </Sec>
              <Sec title="Queixa" icon="💬" accent="#f472b6">
                {data.paciente.queixa && <p style={{ fontSize: '12px', color: '#f9a8d4', fontWeight: 600, marginBottom: '6px' }}>{data.paciente.queixa}</p>}
                <div>{(data.paciente.sintomas || []).map((s, i) => <span key={i} className="tag">{s}</span>)}</div>
              </Sec>
            </div>
          )}
          {data.tendencias && <Sec title="Tendencias" icon="📈" accent="#34d399"><p style={{ fontSize: '12px', color: '#86efac', lineHeight: 1.7 }}>{data.tendencias}</p></Sec>}
        </div>
      )}

      {tab === 'hip' && (
        <Sec title="Hipoteses Diferenciais" icon="🔬" accent="#818cf8">
          {(data.hipoteses || []).map((h, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '13px' }}>{i + 1}. {h.nome}</span>
                <span style={{ fontSize: '10px', background: h.prob === 'Alta' ? '#ef444420' : h.prob === 'Media' ? '#f59e0b20' : '#22c55e20', color: h.prob === 'Alta' ? '#ef4444' : h.prob === 'Media' ? '#f59e0b' : '#22c55e', borderRadius: '4px', padding: '2px 8px', fontWeight: 700 }}>{h.prob}</span>
              </div>
              {h.risco && <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>Risco: {h.risco}</div>}
              {(h.favor || []).length > 0 && <div style={{ fontSize: '11px', color: '#94a3b8' }}>A favor: {h.favor.join(', ')}</div>}
              {(h.contra || []).length > 0 && <div style={{ fontSize: '11px', color: '#64748b' }}>Contra: {h.contra.join(', ')}</div>}
            </div>
          ))}
        </Sec>
      )}

      {tab === 'sepse' && (
        <div>
          <Sec title="qSOFA" icon="🔴" accent="#ef4444">
            <div style={{ fontSize: '32px', fontWeight: 700, color: qsofa.pontos >= 2 ? '#ef4444' : '#22c55e', marginBottom: '4px' }}>{qsofa.pontos ?? 0}/3</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>{qsofa.risco}</div>
            {(qsofa.criterios || []).map((c, i) => <div key={i} style={{ fontSize: '11px', color: '#fca5a5', padding: '3px 0' }}>• {c}</div>)}
          </Sec>
          {ic.valor && (
            <Sec title="Indice de Choque" icon="💔" accent="#f59e0b">
              <div style={{ fontSize: '28px', fontWeight: 700, color: parseFloat(ic.valor) >= 1 ? '#ef4444' : '#22c55e', marginBottom: '4px' }}>{ic.valor}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ic.interpretacao}</div>
            </Sec>
          )}
        </div>
      )}

      {tab === 'flags' && (
        <Sec title="Red Flags" icon="⚑" accent="#ef4444">
          {(data.red_flags || []).map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#ef4444' }}>!</span>
              <span style={{ fontSize: '12px', color: '#fca5a5', lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </Sec>
      )}

      {tab === 'passos' && (
        <Sec title="Proximos Passos" icon="🗺" accent="#0ea5e9">
          {(data.passos || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#0ea5e9', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ fontSize: '12px', color: '#7dd3fc', lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </Sec>
      )}

      {tab === 'scores' && (
        <Sec title="Scores Clinicos" icon="📊" accent="#a78bfa">
          {(data.scores || []).map((s, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '12px' }}>{s.nome}</span>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{s.valor}</span>
              </div>
              {s.interpretacao && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.interpretacao}</div>}
              {(s.faltam || []).length > 0 && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>Faltam: {s.faltam.join(', ')}</div>}
            </div>
          ))}
        </Sec>
      )}

      {tab === 'plantao' && data.sbar && (
        <Sec title="Passagem de Plantao (SBAR)" icon="📝" accent="#f59e0b">
          {[['S', 'Situacao', data.sbar.situacao, '#fbbf24'], ['B', 'Background', data.sbar.background, '#a78bfa'], ['A', 'Avaliacao', data.sbar.avaliacao, '#34d399'], ['R', 'Recomendacao', data.sbar.recomendacao, '#f472b6']].map(([letter, title, text, color]) => text && (
            <div key={letter} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#000', flexShrink: 0 }}>{letter}</div>
              <div>
                <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: '#f1f5f9', lineHeight: 1.6 }}>{text}</div>
              </div>
            </div>
          ))}
        </Sec>
      )}

      {tab === 'familia' && (
        <Sec title="Resumo para Familia" icon="👪" accent="#f472b6">
          <p style={{ fontSize: '12px', color: '#f9a8d4', lineHeight: 1.7 }}>{data.resumo_familiar}</p>
        </Sec>
      )}

      {tab === 'metas' && (
        <Sec title="Metas UTI" icon="🎯" accent="#0ea5e9">
          {(data.metas_uti || []).map((m, i) => <MetasItem key={i} m={m} />)}
        </Sec>
      )}

      {tab === 'check' && (
        <Sec title="Checklist" icon="OK" accent="#34d399">
          {(data.checklist || []).map((c, i) => <CheckItem key={i} c={c} />)}
        </Sec>
      )}
    </div>
  );
}
