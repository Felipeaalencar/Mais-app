import Logo from './Logo';
import { fmt } from '../config';

export function buildReport(data, paciente, createdAt) {
  const now = createdAt ? fmt(createdAt) : new Date().toLocaleString('pt-BR');
  const sv = data.paciente?.sinais_vitais || {};
  const sbar = data.sbar || {};
  const L = [];
  L.push('MAIS — inteligencia clinica');
  L.push('================================');
  if (paciente) {
    L.push('Paciente: ' + (paciente.nome || ''));
    if (paciente.leito) L.push('Leito: ' + paciente.leito);
    if (paciente.setor) L.push('Setor: ' + paciente.setor);
  }
  L.push('Data: ' + now); L.push('');
  if (data.resumo) { L.push('RESUMO'); L.push(data.resumo); L.push(''); }
  if (Object.keys(sv).length > 0) { L.push('SINAIS VITAIS'); Object.entries(sv).forEach(([k, v]) => L.push(k + ': ' + v)); L.push(''); }
  const q = data.sepse?.qsofa;
  const ic = data.sepse?.indice_choque;
  if (q) { L.push('qSOFA: ' + (q.pontos ?? 0) + '/3 — ' + (q.risco || '')); L.push(''); }
  if ((data.hipoteses || []).length > 0) { L.push('HIPOTESES'); (data.hipoteses || []).forEach((h, i) => L.push((i + 1) + '. ' + h.nome + ' (' + h.prob + ')')); L.push(''); }
  if ((data.red_flags || []).length > 0) { L.push('RED FLAGS'); (data.red_flags || []).forEach(f => L.push('! ' + f)); L.push(''); }
  if ((data.passos || []).length > 0) { L.push('PROXIMOS PASSOS'); (data.passos || []).forEach((p, i) => L.push((i + 1) + '. ' + p)); L.push(''); }
  if (sbar.situacao || sbar.background) {
    L.push('SBAR');
    if (sbar.situacao) L.push('S: ' + sbar.situacao);
    if (sbar.background) L.push('B: ' + sbar.background);
    if (sbar.avaliacao) L.push('A: ' + sbar.avaliacao);
    if (sbar.recomendacao) L.push('R: ' + sbar.recomendacao);
    L.push('');
  }
  if ((data.checklist || []).length > 0) { L.push('CHECKLIST'); (data.checklist || []).forEach(c => L.push('☐ ' + c)); L.push(''); }
  if (data._notas) { L.push('NOTAS DO PLANTAO'); L.push(data._notas); L.push(''); }
  L.push('================================');
  L.push('Nao substitui julgamento medico.');
  return L.join('\n');
}

export default function PrintView({ data, paciente, createdAt, onClose }) {
  const now = createdAt ? fmt(createdAt) : new Date().toLocaleString('pt-BR');
  const sv = data.paciente?.sinais_vitais || {};
  const sbar = data.sbar || {};
  const report = buildReport(data, paciente, createdAt);

  function sendWA() { window.open('https://wa.me/?text=' + encodeURIComponent(report), '_blank'); }
  function savePDF() {
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>MAIS - ' + (paciente?.nome || 'Relatorio') + '</title><style>body{font-family:monospace;font-size:13px;padding:24px;white-space:pre-wrap;line-height:1.8;color:#111}@media print{body{padding:10px}}</style></head><body>' + report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</body></html>');
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#020617', zIndex: 9999, overflowY: 'auto', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '13px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px' }}>
        <div style={{ background: '#0a0f1e', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1D9E75', letterSpacing: '4px' }}>MAIS</div>
            <div style={{ fontSize: '9px', color: '#475569' }}>inteligencia clinica.</div>
          </div>
          <button onClick={onClose} className="sbtn">Voltar</button>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div><div style={{ fontSize: '9px', color: '#64748b', marginBottom: '2px' }}>PACIENTE</div><div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>{paciente?.nome || '—'}</div></div>
            <div><div style={{ fontSize: '9px', color: '#64748b', marginBottom: '2px' }}>LEITO / SETOR</div><div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>{[paciente?.leito, paciente?.setor].filter(Boolean).join(' · ') || '—'}</div></div>
          </div>
          <div style={{ fontSize: '10px', color: '#475569' }}>{now}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <button onClick={sendWA} style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)', border: 'none', cursor: 'pointer', padding: '13px', borderRadius: '9px', color: '#fff', fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>
            WhatsApp
          </button>
          <button onClick={savePDF} style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', border: 'none', cursor: 'pointer', padding: '13px', borderRadius: '9px', color: '#fff', fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>
            Salvar PDF
          </button>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '10px' }}>PREVIEW DO RELATORIO</div>
          {data.resumo && <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>RESUMO</div><p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.7 }}>{data.resumo}</p></div>}
          {Object.keys(sv).length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>SINAIS VITAIS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {Object.entries(sv).map(([k, v]) => (
                  <div key={k} style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '5px', padding: '4px 9px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{k}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(data.red_flags || []).length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700, marginBottom: '4px' }}>RED FLAGS</div>
              {(data.red_flags || []).map((f, i) => <div key={i} style={{ fontSize: '11px', color: '#fca5a5', padding: '2px 0' }}>! {f}</div>)}
            </div>
          )}
          {(sbar.situacao || sbar.background) && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '9px', color: '#a78bfa', fontWeight: 700, marginBottom: '6px' }}>SBAR</div>
              {[['S', sbar.situacao], ['B', sbar.background], ['A', sbar.avaliacao], ['R', sbar.recomendacao]].map(([l, v]) => v && (
                <div key={l} style={{ display: 'flex', gap: '7px', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ background: '#a78bfa', color: '#fff', borderRadius: '3px', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {data._notas && (
            <div>
              <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700, marginBottom: '4px' }}>NOTAS</div>
              <p style={{ fontSize: '11px', color: '#fcd34d', lineHeight: 1.6 }}>{data._notas}</p>
            </div>
          )}
        </div>

        <div style={{ fontSize: '10px', color: '#334155', textAlign: 'center', lineHeight: 1.7 }}>
          Nao substitui julgamento clinico. Nao fecha diagnosticos.
        </div>
      </div>
    </div>
  );
}
