import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

//
const SYSTEM_PROMPT = `Voce e um assistente medico de suporte a decisao clinica hospitalar para uso em UTI. Responda SOMENTE com JSON valido, sem markdown, sem texto fora do JSON.

Estrutura obrigatoria:
{
  "resumo": "resumo clinico 3-4 linhas",
  "paciente": {
    "idade":"","sexo":"","setor":"","queixa":"","evolucao":"",
    "comorbidades":[],"sinais_vitais":{},"exames":[],"intervencoes":[],"sintomas":[]
  },
  "hipoteses": [{"nome":"","prob":"Alta/Media/Baixa","favor":[],"contra":[],"risco":""}],
  "red_flags": [],
  "lacunas": [],
  "passos": [],
  "scores": [{"nome":"","valor":"","interpretacao":"","faltam":[]}],
  "sepse": {
    "qsofa": {"pontos": 0, "criterios": [], "risco": ""},
    "criterios_berlin": {"pao2_fio2": "", "classificacao": "", "aplicavel": false},
    "indice_choque": {"valor": "", "interpretacao": ""},
    "criterios_extubacao": []
  },
  "balanco_meta": {"meta_diaria_ml": "", "observacao": ""},
  "ajuste_renal": {"egfr_estimado": "", "alertas": []},
  "resumo_familiar": "",
  "metas_uti": [],
  "tendencias": "",
  "urgente": true,
  "sbar": {"situacao":"","background":"","avaliacao":"","recomendacao":""},
  "checklist": [],
  "checklist_procedimento": []
}

Regras: Max 4 hipoteses. Max 6 itens por array. NAO prescreva tratamentos. NAO feche diagnosticos. Calcule qSOFA (FR>=22=1pt, Glasgow<15=1pt, PAS<=100=1pt). Calcule indice de choque (FC/PAS). Estime eGFR se creatinina disponivel.`

//
const rc  = p => p==='Alta'?'#ef4444':p==='Media'?'#f59e0b':'#22c55e'
const fmt = d => new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})

function repairJSON(str) {
  str = str.replace(/```json/gi,'').replace(/```/gi,'').trim()
  try { return JSON.parse(str) } catch(e) {}
  const lc = Math.max(str.lastIndexOf(',"'), str.lastIndexOf(',\n'))
  if (lc > str.length * 0.5) str = str.substring(0, lc)
  const st=[]; let inS=false,es=false
  for(let i=0;i<str.length;i++){const c=str[i];if(es){es=false;continue}if(c==='\\'&&inS){es=true;continue}if(c==='"'){inS=!inS;continue}if(!inS){if(c==='{'||c==='[')st.push(c==='{'?'}':']');if(c==='}'||c===']')st.pop()}}
  while(st.length)str+=st.pop()
  try{return JSON.parse(str)}catch(e){return null}
}

//
const Logo = ({size=36}) => (
  <svg width={size} height={size} viewBox="0 0 90 90">
    <rect width="90" height="90" rx="20" fill="#0f172a"/>
    <path d="M 6,45 L 12,45 L 15,25 L 25,56 L 35,25 L 45,45 L 50,45 L 54,38 L 57,18 L 62,72 L 66,38 L 70,45 L 82,45"
      fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="57" cy="18" r="3.5" fill="#EF9F27"/>
  </svg>
)

//
const Sec = ({title,icon,accent='#38bdf8',children}) => (
  <div style={{background:'#0f172a',border:`1px solid #1e293b`,borderLeft:`3px solid ${accent}`,borderRadius:'8px',padding:'12px 14px',marginBottom:'10px'}}>
    <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'9px'}}>
      <span>{icon}</span><span style={{color:accent,fontWeight:700,fontSize:'10px',letterSpacing:'0.1em',textTransform:'uppercase'}}>{title}</span>
    </div>
    {children}
  </div>
)

const Tag = ({children,color='#38bdf8'}) => (
  <span style={{display:'inline-block',margin:'2px',padding:'2px 8px',background:color+'18',color,border:`1px solid ${color}35`,borderRadius:'4px',fontSize:'11px'}}>{children}</span>
)

const KV = ({label,value}) => !value||value==='null'?null:(
  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1e293b15'}}>
    <span style={{color:'#64748b',fontSize:'11px'}}>{label}</span>
    <span style={{color:'#e2e8f0',fontSize:'11px',maxWidth:'55%',textAlign:'right'}}>{value}</span>
  </div>
)

//
function PrintView({data,paciente,createdAt,onClose}) {
  const sv=data.paciente?.sinais_vitais||{}, sbar=data.sbar||{}
  const now=createdAt?fmt(createdAt):new Date().toLocaleString('pt-BR')
  return (
    <div style={{position:'fixed',inset:0,background:'#fff',zIndex:9999,overflowY:'auto',color:'#111',fontFamily:'Arial,sans-serif',fontSize:'13px'}}>
      <style>{`@media print{.np{display:none!important}}.ps{border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:10px}.pl{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;margin-bottom:5px;letter-spacing:.1em}`}</style>
      <div style={{maxWidth:'720px',margin:'0 auto',padding:'20px'}}>
        <div className="np" style={{display:'flex',gap:'8px',marginBottom:'16px',justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'7px 14px',cursor:'pointer'}}>Voltar</button>
          <button onClick={()=>window.print()} style={{background:'#0ea5e9',border:'none',borderRadius:'6px',padding:'7px 18px',cursor:'pointer',color:'#fff',fontWeight:700}}>Salvar PDF</button>
        </div>
        <div style={{background:'#0f172a',borderRadius:'8px',padding:'14px 18px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'14px'}}>
          <Logo size={40}/>
          <div>
            <div style={{display:'flex',alignItems:'baseline',gap:'8px'}}><span style={{fontSize:'20px',fontWeight:700,color:'#1D9E75',letterSpacing:'5px'}}>MAIS</span><span style={{fontSize:'10px',color:'#475569'}}>inteligencia clinica.</span></div>
            <div style={{fontSize:'10px',color:'#94a3b8',marginTop:'3px'}}>Passagem de Plantao · {now}{paciente&&` · ${paciente.nome}`}</div>
          </div>
        </div>
        {Object.keys(sv).length>0&&(<div className="ps"><div className="pl">Sinais Vitais</div><div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>{Object.entries(sv).map(([k,v])=>(<div key={k} style={{background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:'5px',padding:'5px 10px',textAlign:'center',minWidth:'60px'}}><div style={{fontSize:'9px',color:'#666'}}>{k.toUpperCase()}</div><div style={{fontSize:'15px',fontWeight:700,color:'#0284c7'}}>{v}</div></div>))}</div></div>)}
        {data.sepse?.qsofa&&(<div className="ps" style={{background:data.sepse.qsofa.pontos>=2?'#fff5f5':'#f8fafc',border:data.sepse.qsofa.pontos>=2?'1px solid #fecdd3':'1px solid #ddd'}}><div className="pl" style={{color:data.sepse.qsofa.pontos>=2?'#dc2626':'#666'}}>qSOFA: {data.sepse.qsofa.pontos} pontos — {data.sepse.qsofa.risco}</div>{data.sepse.qsofa.criterios?.map((c,i)=><div key={i} style={{fontSize:'12px',padding:'2px 0'}}>• {c}</div>)}</div>)}
        {(sbar.situacao||sbar.background)&&(<div className="ps"><div className="pl">SBAR</div>{[{l:'S',label:'Situacao',val:sbar.situacao,bg:'#0ea5e9'},{l:'B',label:'Background',val:sbar.background,bg:'#8b5cf6'},{l:'A',label:'Avaliacao',val:sbar.avaliacao,bg:'#f59e0b'},{l:'R',label:'Recomendacao',val:sbar.recomendacao,bg:'#22c55e'}].map(item=>item.val&&(<div key={item.l} style={{display:'flex',gap:'10px',padding:'7px 0',borderBottom:'1px solid #eee'}}><div style={{width:'26px',height:'26px',borderRadius:'6px',background:item.bg,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'13px',color:'#fff',flexShrink:0}}>{item.l}</div><div><div style={{fontSize:'9px',color:'#666',fontWeight:700,marginBottom:'2px'}}>{item.label}</div><div style={{lineHeight:1.5,fontSize:'12px'}}>{item.val}</div></div></div>))}</div>)}
        {data.red_flags?.length>0&&(<div className="ps" style={{background:'#fff5f5',border:'1px solid #fecdd3'}}><div className="pl" style={{color:'#dc2626'}}>Red Flags</div>{data.red_flags.map((f,i)=><div key={i} style={{display:'flex',gap:'7px',padding:'4px 0',fontSize:'12px'}}><span style={{color:'#dc2626'}}>!</span><span>{f}</span></div>)}</div>)}
        {data.passos?.length>0&&(<div className="ps"><div className="pl">Proximos Passos</div>{data.passos.map((p,i)=><div key={i} style={{display:'flex',gap:'8px',padding:'4px 0',fontSize:'12px'}}><span style={{background:'#0ea5e9',color:'#fff',borderRadius:'3px',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,flexShrink:0}}>{i+1}</span><span>{p}</span></div>)}</div>)}
        {data.resumo_familiar&&(<div className="ps" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}><div className="pl" style={{color:'#16a34a'}}>Resumo para a Familia</div><div style={{fontSize:'12px',lineHeight:1.7,color:'#166534'}}>{data.resumo_familiar}</div></div>)}
        {data.checklist?.length>0&&(<div className="ps"><div className="pl">Checklist do Plantao</div>{data.checklist.map((c,i)=><div key={i} style={{display:'flex',gap:'8px',padding:'4px 0',fontSize:'12px'}}><span style={{width:'14px',height:'14px',border:'1.5px solid #94a3b8',borderRadius:'3px',flexShrink:0,display:'inline-block',marginTop:'2px'}}/><span>{c}</span></div>)}</div>)}
        <div style={{marginTop:'12px',padding:'8px',background:'#f8fafc',borderRadius:'5px',fontSize:'10px',color:'#94a3b8',textAlign:'center'}}>Nao substitui julgamento medico. Nao fecha diagnosticos. Nao prescreve tratamentos.</div>
      </div>
    </div>
  )
}

//
function BalancoHidrico({pacienteId}) {
  const [items,setItems] = useState([])
  const [tipo,setTipo] = useState('entrada')
  const [desc,setDesc] = useState('')
  const [vol,setVol] = useState('')
  const [loading,setLoading] = useState(false)

  useEffect(()=>{ if(pacienteId) loadBalanco() },[pacienteId])

  async function loadBalanco() {
    const today = new Date(); today.setHours(0,0,0,0)
    const {data} = await supabase.from('balanco_hidrico').select('*')
      .eq('paciente_id',pacienteId).gte('created_at',today.toISOString()).order('created_at')
    setItems(data||[])
  }

  async function addItem() {
    if(!vol||!desc) return
    setLoading(true)
    await supabase.from('balanco_hidrico').insert({paciente_id:pacienteId,tipo,descricao:desc,volume_ml:parseInt(vol)})
    setDesc(''); setVol(''); await loadBalanco(); setLoading(false)
  }

  async function removeItem(id) {
    await supabase.from('balanco_hidrico').delete().eq('id',id)
    await loadBalanco()
  }

  const entradas = items.filter(i=>i.tipo==='entrada').reduce((s,i)=>s+i.volume_ml,0)
  const saidas   = items.filter(i=>i.tipo==='saida').reduce((s,i)=>s+i.volume_ml,0)
  const balanco  = entradas - saidas
  const balColor = balanco>0?'#38bdf8':balanco<0?'#ef4444':'#22c55e'

  const inp = {width:'100%',background:'#020617',border:'1px solid #1e293b',borderRadius:'5px',padding:'7px 9px',color:'#cbd5e1',fontSize:'12px',fontFamily:'monospace'}

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}}>
        {[['Entradas','#22c55e',entradas],['Saidas','#ef4444',saidas],['Balanco',balColor,balanco]].map(([l,c,v])=>(
          <div key={l} style={{background:'#020617',border:`1px solid ${c}30`,borderRadius:'7px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'9px',color:c,letterSpacing:'0.1em',marginBottom:'4px'}}>{l.toUpperCase()}</div>
            <div style={{fontSize:'18px',fontWeight:700,color:c}}>{v>0?'+':''}{v} ml</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
        <div>
          <div style={{fontSize:'9px',color:'#64748b',marginBottom:'3px'}}>TIPO</div>
          <select value={tipo} onChange={e=>setTipo(e.target.value)} style={{...inp}}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saida</option>
          </select>
        </div>
        <div>
          <div style={{fontSize:'9px',color:'#64748b',marginBottom:'3px'}}>VOLUME (ml)</div>
          <input type="number" value={vol} onChange={e=>setVol(e.target.value)} placeholder="500" style={inp}/>
        </div>
      </div>
      <div style={{marginBottom:'8px'}}>
        <div style={{fontSize:'9px',color:'#64748b',marginBottom:'3px'}}>DESCRICAO</div>
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: SF 0.9%, Diurese, Dreno..." style={inp}/>
      </div>
      <button onClick={addItem} disabled={loading||!vol||!desc}
        style={{width:'100%',background:'linear-gradient(135deg,#1D9E75,#0d9488)',border:'none',cursor:'pointer',padding:'9px',borderRadius:'7px',color:'#fff',fontWeight:700,fontSize:'12px',fontFamily:'monospace',marginBottom:'12px',opacity:(!vol||!desc)?0.4:1}}>
        + Adicionar
      </button>
      {items.length>0&&(
        <div>
          <div style={{fontSize:'9px',color:'#64748b',letterSpacing:'0.1em',marginBottom:'6px'}}>REGISTROS DE HOJE</div>
          {items.map(item=>(
            <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #1e293b'}}>
              <div>
                <span style={{color:item.tipo==='entrada'?'#22c55e':'#ef4444',fontSize:'10px',fontWeight:700,marginRight:'6px'}}>{item.tipo==='entrada'?'+':'-'}</span>
                <span style={{fontSize:'12px',color:'#94a3b8'}}>{item.descricao}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'12px',fontWeight:700,color:item.tipo==='entrada'?'#22c55e':'#ef4444'}}>{item.volume_ml}ml</span>
                <button onClick={()=>removeItem(item.id)} style={{background:'none',border:'none',color:'#334155',cursor:'pointer',fontSize:'14px'}}>x</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

//
function AnalysisResult({data,paciente,createdAt,onShowPrint}) {
  const [tab,setTab] = useState('resumo')
  const tabs = [
    {id:'resumo',l:'Resumo',i:'📋'},{id:'hipoteses',l:'Diferenciais',i:'🔬'},
    {id:'sepse',l:'Sepse/UTI',i:'🚨'},{id:'alertas',l:'Red Flags',i:'⚑'},
    {id:'passos',l:'Passos',i:'🗺'},{id:'scores',l:'Scores',i:'📊'},
    {id:'lacunas',l:'Lacunas',i:'⚠'},{id:'plantao',l:'Plantao',i:'📝'},
    {id:'familia',l:'Familia',i:'👨‍👩‍👧'},{id:'metas',l:'Metas UTI',i:'🎯'},
    {id:'checklist',l:'Checklist',i:'✅'},
  ]
  const sv = data.paciente?.sinais_vitais||{}
  const sepse = data.sepse||{}
  const qsofa = sepse.qsofa||{}

  return (
    <div>
      {data.urgente&&(
        <div style={{background:'linear-gradient(135deg,#450a0a,#3b0764)',border:'1px solid #ef4444',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'18px'}}>🚨</span>
          <div><div style={{color:'#ef4444',fontWeight:700,fontSize:'11px'}}>ATENCAO IMEDIATA NECESSARIA</div><div style={{color:'#fca5a5',fontSize:'11px'}}>Avaliacao urgente recomendada.</div></div>
        </div>
      )}
      {qsofa.pontos>=2&&(
        <div style={{background:'#450a0a',border:'1px solid #ef4444',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px'}}>
          <div style={{color:'#ef4444',fontWeight:700,fontSize:'11px',marginBottom:'4px'}}>CRITERIOS DE SEPSE — qSOFA: {qsofa.pontos} pontos</div>
          <div style={{color:'#fca5a5',fontSize:'11px'}}>{qsofa.risco}</div>
        </div>
      )}
      {Object.keys(sv).length>0&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px',background:'#0f172a',border:'1px solid #1e293b',borderRadius:'7px',padding:'10px 12px'}}>
          <div style={{fontSize:'9px',color:'#475569',width:'100%',letterSpacing:'0.1em',marginBottom:'3px'}}>SINAIS VITAIS</div>
          {Object.entries(sv).map(([k,v])=>(
            <div key={k} style={{background:'#020617',border:'1px solid #1e293b',borderRadius:'5px',padding:'5px 10px',textAlign:'center',minWidth:'58px'}}>
              <div style={{fontSize:'8px',color:'#64748b'}}>{k.toUpperCase()}</div>
              <div style={{fontSize:'12px',fontWeight:700,color:'#38bdf8'}}>{v}</div>
            </div>
          ))}
          {sepse.indice_choque?.valor&&(
            <div style={{background:'#1c0a0a',border:`1px solid ${parseFloat(sepse.indice_choque.valor)>=1?'#ef4444':'#334155'}`,borderRadius:'5px',padding:'5px 10px',textAlign:'center',minWidth:'80px'}}>
              <div style={{fontSize:'8px',color:'#64748b'}}>INDICE CHOQUE</div>
              <div style={{fontSize:'12px',fontWeight:700,color:parseFloat(sepse.indice_choque?.valor)>=1?'#ef4444':'#22c55e'}}>{sepse.indice_choque.valor}</div>
            </div>
          )}
        </div>
      )}
      <div style={{display:'flex',flexWrap:'wrap',gap:'3px',marginBottom:'12px',background:'#0f172a',border:'1px solid #1e293b',borderRadius:'7px',padding:'5px'}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#0ea5e9':'none',border:'none',cursor:'pointer',padding:'5px 8px',borderRadius:'5px',color:tab===t.id?'#fff':'#64748b',fontFamily:'monospace',fontSize:'10px',whiteSpace:'nowrap'}}>{t.i} {t.l}</button>)}
      </div>

      {tab==='resumo'&&(
        <div>
          <Sec title="Resumo Executivo" icon="📋" accent="#38bdf8"><p style={{lineHeight:'1.7',color:'#94a3b8',fontSize:'12px'}}>{data.resumo}</p></Sec>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <Sec title="Paciente" icon="👤" accent="#818cf8">
              <KV label="Idade" value={data.paciente?.idade}/><KV label="Sexo" value={data.paciente?.sexo}/>
              <KV label="Setor" value={data.paciente?.setor}/><KV label="Evolucao" value={data.paciente?.evolucao}/>
              {data.paciente?.comorbidades?.length>0&&<div style={{marginTop:'6px'}}><div style={{fontSize:'9px',color:'#64748b',marginBottom:'3px'}}>COMORBIDADES</div>{data.paciente.comorbidades.map(c=><Tag key={c} color="#a78bfa">{c}</Tag>)}</div>}
            </Sec>
            <Sec title="Queixa" icon="🩺" accent="#f472b6">
              <p style={{color:'#f9a8d4',fontWeight:600,marginBottom:'7px',lineHeight:'1.4',fontSize:'12px'}}>{data.paciente?.queixa}</p>
              {data.paciente?.sintomas?.length>0&&<>{data.paciente.sintomas.map(s=><Tag key={s} color="#22d3ee">{s}</Tag>)}</>}
            </Sec>
          </div>
          {data.paciente?.intervencoes?.length>0&&<Sec title="Intervencoes" icon="💊" accent="#fb923c">{data.paciente.intervencoes.map(iv=><Tag key={iv} color="#fb923c">{iv}</Tag>)}</Sec>}
          {data.tendencias&&<Sec title="Tendencias" icon="📈" accent="#34d399"><p style={{color:'#94a3b8',lineHeight:'1.6',fontSize:'12px'}}>{data.tendencias}</p></Sec>}
        </div>
      )}

      {tab==='hipoteses'&&(
        <div>
          {(data.hipoteses||[]).map((h,i)=>(
            <div key={i} style={{background:'#0f172a',border:`1px solid #1e293b`,borderLeft:`4px solid ${rc(h.prob)}`,borderRadius:'7px',padding:'12px 14px',marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontWeight:700,fontSize:'13px',color:'#f1f5f9'}}>#{i+1} {h.nome}</span>
                <span style={{padding:'1px 9px',borderRadius:'999px',background:rc(h.prob)+'20',color:rc(h.prob),border:`1px solid ${rc(h.prob)}50`,fontSize:'10px',fontWeight:700}}>{h.prob}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'7px'}}>
                <div><div style={{fontSize:'9px',color:'#22c55e',marginBottom:'3px'}}>A FAVOR</div>{(h.favor||[]).map((a,j)=><div key={j} style={{fontSize:'11px',color:'#86efac',padding:'1px 0',lineHeight:'1.4'}}>- {a}</div>)}</div>
                <div><div style={{fontSize:'9px',color:'#f59e0b',marginBottom:'3px'}}>CONTRA</div>{(h.contra||[]).map((c,j)=><div key={j} style={{fontSize:'11px',color:'#fcd34d',padding:'1px 0',lineHeight:'1.4'}}>- {c}</div>)}</div>
              </div>
              {h.risco&&<div style={{background:'#1c0a0a',borderRadius:'4px',padding:'6px 9px',fontSize:'11px',color:'#fca5a5',lineHeight:'1.4'}}><span style={{color:'#ef4444',fontWeight:700}}>RISCO: </span>{h.risco}</div>}
            </div>
          ))}
        </div>
      )}

      {tab==='sepse'&&(
        <div>
          {qsofa.pontos!==undefined&&(
            <Sec title="qSOFA" icon="🧬" accent={qsofa.pontos>=2?'#ef4444':'#22c55e'}>
              <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'10px'}}>
                <div style={{textAlign:'center',minWidth:'60px'}}>
                  <div style={{fontSize:'9px',color:'#64748b',marginBottom:'2px'}}>PONTOS</div>
                  <div style={{fontSize:'28px',fontWeight:700,color:qsofa.pontos>=2?'#ef4444':'#22c55e',lineHeight:1}}>{qsofa.pontos}</div>
                </div>
                <div style={{flex:1,borderLeft:'1px solid #1e293b',paddingLeft:'12px'}}>
                  <div style={{fontSize:'12px',color:'#94a3b8',marginBottom:'6px'}}>{qsofa.risco}</div>
                  {qsofa.criterios?.map((c,i)=><div key={i} style={{fontSize:'11px',color:qsofa.pontos>=2?'#fca5a5':'#86efac',padding:'2px 0'}}>• {c}</div>)}
                </div>
              </div>
            </Sec>
          )}
          {sepse.indice_choque?.valor&&(
            <Sec title="Indice de Choque (FC/PAS)" icon="💓" accent={parseFloat(sepse.indice_choque.valor)>=1?'#ef4444':'#22c55e'}>
              <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
                <div style={{textAlign:'center',minWidth:'60px'}}>
                  <div style={{fontSize:'9px',color:'#64748b',marginBottom:'2px'}}>VALOR</div>
                  <div style={{fontSize:'28px',fontWeight:700,color:parseFloat(sepse.indice_choque.valor)>=1?'#ef4444':'#22c55e',lineHeight:1}}>{sepse.indice_choque.valor}</div>
                </div>
                <div style={{flex:1,borderLeft:'1px solid #1e293b',paddingLeft:'12px'}}>
                  <div style={{fontSize:'12px',color:'#94a3b8'}}>{sepse.indice_choque.interpretacao}</div>
                </div>
              </div>
            </Sec>
          )}
          {sepse.criterios_berlin?.aplicavel&&(
            <Sec title="Criterios de Berlin (SARA)" icon="🫁" accent="#818cf8">
              <div style={{display:'flex',gap:'16px'}}>
                <div><div style={{fontSize:'9px',color:'#64748b',marginBottom:'2px'}}>PaO2/FiO2</div><div style={{fontSize:'18px',fontWeight:700,color:'#818cf8'}}>{sepse.criterios_berlin.pao2_fio2||'N/D'}</div></div>
                <div style={{flex:1,borderLeft:'1px solid #1e293b',paddingLeft:'12px'}}><div style={{fontSize:'12px',color:'#94a3b8'}}>{sepse.criterios_berlin.classificacao}</div></div>
              </div>
            </Sec>
          )}
          {sepse.criterios_extubacao?.length>0&&(
            <Sec title="Criterios de Extubacao" icon="🌬" accent="#34d399">
              {sepse.criterios_extubacao.map((c,i)=><div key={i} style={{fontSize:'12px',color:'#86efac',padding:'4px 0',borderBottom:'1px solid #1e293b'}}>• {c}</div>)}
            </Sec>
          )}
          {data.ajuste_renal?.egfr_estimado&&(
            <Sec title="Ajuste Renal" icon="🫘" accent="#f59e0b">
              <KV label="eGFR estimado" value={data.ajuste_renal.egfr_estimado}/>
              {data.ajuste_renal.alertas?.map((a,i)=><div key={i} style={{fontSize:'11px',color:'#fcd34d',padding:'3px 0'}}>⚠ {a}</div>)}
            </Sec>
          )}
        </div>
      )}

      {tab==='alertas'&&(
        <div>
          <Sec title="Red Flags" icon="⚑" accent="#ef4444">
            {(data.red_flags||[]).map((f,i)=><div key={i} style={{display:'flex',gap:'8px',padding:'7px 0',borderBottom:'1px solid #1e293b'}}><span style={{color:'#ef4444',flexShrink:0}}>!</span><span style={{color:'#fca5a5',lineHeight:'1.5',fontSize:'12px'}}>{f}</span></div>)}
          </Sec>
          <Sec title="Aviso Legal" icon="⚖" accent="#475569">
            <div style={{padding:'8px',background:'#020617',borderRadius:'5px',fontSize:'10px',color:'#334155',lineHeight:'1.7'}}>NAO SUBSTITUI JULGAMENTO CLINICO. NAO FECHA DIAGNOSTICOS. NAO PRESCREVE TRATAMENTOS.</div>
          </Sec>
        </div>
      )}

      {tab==='passos'&&(
        <div>
          <Sec title="Proximos Passos" icon="🗺" accent="#34d399">
            {(data.passos||[]).map((p,i)=>(
              <div key={i} style={{display:'flex',gap:'8px',padding:'7px 0',borderBottom:'1px solid #1e293b',alignItems:'flex-start'}}>
                <span style={{background:'#022c22',color:'#34d399',borderRadius:'3px',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,flexShrink:0,marginTop:'1px'}}>{i+1}</span>
                <span style={{color:'#86efac',lineHeight:'1.5',fontSize:'12px'}}>{p}</span>
              </div>
            ))}
          </Sec>
          {data.paciente?.exames?.length>0&&<Sec title="Exames Disponiveis" icon="🧪" accent="#818cf8">{data.paciente.exames.map(e=><Tag key={e} color="#818cf8">{e}</Tag>)}</Sec>}
        </div>
      )}

      {tab==='scores'&&(
        <div>
          {(data.scores||[]).length===0&&<div style={{color:'#475569',textAlign:'center',padding:'24px',fontSize:'12px'}}>Nenhum score calculavel com os dados disponíveis.</div>}
          {(data.scores||[]).map((s,i)=>(
            <Sec key={i} title={s.nome||'Score'} icon="📊" accent="#f472b6">
              <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{textAlign:'center',minWidth:'50px'}}>
                  <div style={{fontSize:'9px',color:'#64748b',marginBottom:'1px'}}>RESULTADO</div>
                  <div style={{fontSize:'22px',fontWeight:700,color:s.valor&&s.valor!=='null'?'#f472b6':'#475569',lineHeight:1}}>{s.valor&&s.valor!=='null'?s.valor:'N/D'}</div>
                </div>
                <div style={{flex:1,borderLeft:'1px solid #1e293b',paddingLeft:'12px'}}>
                  <div style={{color:'#94a3b8',lineHeight:'1.6',fontSize:'11px',marginBottom:'4px'}}>{s.interpretacao}</div>
                  {s.faltam?.length>0&&<div><span style={{fontSize:'9px',color:'#f59e0b'}}>FALTAM: </span>{s.faltam.map(d=><Tag key={d} color="#f59e0b">{d}</Tag>)}</div>}
                </div>
              </div>
            </Sec>
          ))}
        </div>
      )}

      {tab==='lacunas'&&(
        <Sec title="Lacunas Criticas" icon="⚠" accent="#f59e0b">
          {(data.lacunas||[]).length===0&&<div style={{color:'#475569',fontSize:'12px'}}>Nenhuma lacuna identificada.</div>}
          {(data.lacunas||[]).map((l,i)=><div key={i} style={{display:'flex',gap:'8px',padding:'7px 0',borderBottom:'1px solid #1e293b',alignItems:'flex-start'}}><span style={{color:'#f59e0b',flexShrink:0}}>-</span><span style={{color:'#fcd34d',lineHeight:'1.5',fontSize:'12px'}}>{l}</span></div>)}
        </Sec>
      )}

      {tab==='plantao'&&(
        <div>
          <Sec title="SBAR - Passagem de Plantao" icon="📝" accent="#a78bfa">
            {[{l:'S',label:'Situacao',val:data.sbar?.situacao,bg:'#0ea5e9'},{l:'B',label:'Background',val:data.sbar?.background,bg:'#8b5cf6'},{l:'A',label:'Avaliacao',val:data.sbar?.avaliacao,bg:'#f59e0b'},{l:'R',label:'Recomendacao',val:data.sbar?.recomendacao,bg:'#22c55e'}].map(item=>(
              <div key={item.l} style={{display:'flex',gap:'12px',padding:'10px 0',borderBottom:'1px solid #1e293b',alignItems:'flex-start'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'7px',background:item.bg,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'14px',color:'#fff',flexShrink:0}}>{item.l}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,color:'#f1f5f9',fontSize:'12px',marginBottom:'2px'}}>{item.label}</div><div style={{color:'#94a3b8',lineHeight:'1.6',fontSize:'12px'}}>{item.val||<span style={{color:'#334155',fontStyle:'italic'}}>Dados insuficientes.</span>}</div></div>
              </div>
            ))}
          </Sec>
          <div style={{textAlign:'center',marginTop:'6px'}}>
            <button onClick={onShowPrint} style={{background:'linear-gradient(135deg,#059669,#0d9488)',border:'none',cursor:'pointer',padding:'9px 18px',borderRadius:'7px',color:'#fff',fontWeight:700,fontSize:'12px',fontFamily:'monospace'}}>Gerar PDF</button>
          </div>
        </div>
      )}

      {tab==='familia'&&(
        <Sec title="Resumo para a Familia" icon="👨‍👩‍👧" accent="#34d399">
          {data.resumo_familiar
            ? <p style={{color:'#86efac',lineHeight:'1.8',fontSize:'13px'}}>{data.resumo_familiar}</p>
            : <p style={{color:'#475569',fontSize:'12px'}}>Nao foi possivel gerar resumo familiar com os dados disponíveis.</p>}
        </Sec>
      )}

      {tab==='metas'&&(
        <div>
          <Sec title="Metas Diarias da UTI" icon="🎯" accent="#0ea5e9">
            {(data.metas_uti||[]).length===0&&<div style={{color:'#475569',fontSize:'12px'}}>Nenhuma meta identificada com os dados disponíveis.</div>}
            {(data.metas_uti||[]).map((m,i)=>{
              const [ok,setOk]=useState(false)
              return(<div key={i} onClick={()=>setOk(!ok)} style={{display:'flex',gap:'10px',padding:'8px 0',borderBottom:'1px solid #1e293b',cursor:'pointer',alignItems:'flex-start'}}>
                <div style={{width:'16px',height:'16px',borderRadius:'3px',border:`2px solid ${ok?'#0ea5e9':'#334155'}`,background:ok?'#0ea5e9':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                  {ok&&<span style={{color:'#fff',fontSize:'10px',fontWeight:700}}>v</span>}
                </div>
                <span style={{color:ok?'#475569':'#7dd3fc',fontSize:'12px',lineHeight:'1.5',textDecoration:ok?'line-through':'none'}}>{m}</span>
              </div>)
            })}
          </Sec>
          {data.balanco_meta?.meta_diaria_ml&&(
            <Sec title="Meta de Balanco Hidrico" icon="💧" accent="#38bdf8">
              <KV label="Meta diaria" value={data.balanco_meta.meta_diaria_ml+' ml'}/>
              {data.balanco_meta.observacao&&<p style={{fontSize:'11px',color:'#94a3b8',marginTop:'6px',lineHeight:'1.5'}}>{data.balanco_meta.observacao}</p>}
            </Sec>
          )}
        </div>
      )}

      {tab==='checklist'&&(
        <div>
          <Sec title="Checklist do Plantao" icon="✅" accent="#34d399">
            {(data.checklist||[]).map((c,i)=>{
              const [done,setDone]=useState(false)
              return(<div key={i} onClick={()=>setDone(!done)} style={{display:'flex',gap:'10px',padding:'8px 0',borderBottom:'1px solid #1e293b',cursor:'pointer',alignItems:'flex-start'}}>
                <div style={{width:'16px',height:'16px',borderRadius:'3px',border:`2px solid ${done?'#34d399':'#334155'}`,background:done?'#34d399':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                  {done&&<span style={{color:'#fff',fontSize:'10px',fontWeight:700}}>v</span>}
                </div>
                <span style={{color:done?'#475569':'#86efac',fontSize:'12px',lineHeight:'1.5',textDecoration:done?'line-through':'none'}}>{c}</span>
              </div>)
            })}
          </Sec>
          {data.checklist_procedimento?.length>0&&(
            <Sec title="Checklist de Procedimento" icon="🔧" accent="#f59e0b">
              {data.checklist_procedimento.map((c,i)=>{
                const [done,setDone]=useState(false)
                return(<div key={i} onClick={()=>setDone(!done)} style={{display:'flex',gap:'10px',padding:'8px 0',borderBottom:'1px solid #1e293b',cursor:'pointer',alignItems:'flex-start'}}>
                  <div style={{width:'16px',height:'16px',borderRadius:'3px',border:`2px solid ${done?'#f59e0b':'#334155'}`,background:done?'#f59e0b':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                    {done&&<span style={{color:'#fff',fontSize:'10px',fontWeight:700}}>v</span>}
                  </div>
                  <span style={{color:done?'#475569':'#fcd34d',fontSize:'12px',lineHeight:'1.5',textDecoration:done?'line-through':'none'}}>{c}</span>
                </div>)
              })}
            </Sec>
          )}
        </div>
      )}
    </div>
  )
}

//
function EvolutionView({analyses,paciente}) {
  if(analyses.length<2) return <div style={{textAlign:'center',padding:'32px',color:'#475569',fontSize:'12px'}}>Sao necessarias pelo menos 2 analises para ver a evolucao.</div>
  const sorted=[...analyses].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))
  const delta=(curr,prev,key)=>{const cv=curr?.paciente?.sinais_vitais?.[key],pv=prev?.paciente?.sinais_vitais?.[key];if(!cv||!pv)return null;const cn=parseFloat(cv),pn=parseFloat(pv);if(isNaN(cn)||isNaN(pn))return null;return{dir:cn-pn>0?'+':'-',color:cn-pn>0?'#ef4444':'#22c55e'}}
  return(
    <div>
      <div style={{fontSize:'10px',color:'#38bdf8',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:'14px'}}>Evolucao — {paciente.nome}</div>
      {sorted.map((a,i)=>{
        const prev=i>0?sorted[i-1].resultado_json:null,curr=a.resultado_json,sv=curr?.paciente?.sinais_vitais||{},isLast=i===sorted.length-1
        return(
          <div key={a.id} style={{display:'flex',gap:'12px',marginBottom:'6px'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
              <div style={{width:'10px',height:'10px',borderRadius:'50%',background:isLast?'#22c55e':'#38bdf8',marginTop:'12px'}}/>
              {!isLast&&<div style={{width:'2px',flex:1,background:'#1e293b',marginTop:'3px'}}/>}
            </div>
            <div style={{flex:1,background:'#0f172a',border:'1px solid #1e293b',borderRadius:'7px',padding:'12px',marginBottom:'3px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'7px',flexWrap:'wrap',gap:'5px'}}>
                <span style={{fontSize:'11px',color:'#64748b'}}>{fmt(a.created_at)}</span>
                <div style={{display:'flex',gap:'5px'}}>
                  {isLast&&<span style={{fontSize:'9px',background:'#22c55e20',color:'#22c55e',border:'1px solid #22c55e40',borderRadius:'20px',padding:'1px 7px'}}>atual</span>}
                  {curr?.urgente&&<span style={{fontSize:'9px',background:'#ef444420',color:'#ef4444',border:'1px solid #ef444440',borderRadius:'20px',padding:'1px 7px'}}>urgente</span>}
                  {curr?.sepse?.qsofa?.pontos>=2&&<span style={{fontSize:'9px',background:'#ef444420',color:'#ef4444',border:'1px solid #ef444440',borderRadius:'20px',padding:'1px 7px'}}>SEPSE</span>}
                </div>
              </div>
              <p style={{fontSize:'11px',color:'#94a3b8',lineHeight:'1.5',marginBottom:'8px'}}>{curr?.resumo?.slice(0,140)}...</p>
              {Object.keys(sv).length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'7px'}}>
                  {Object.entries(sv).map(([k,v])=>{const d=prev?delta(curr,prev,k):null;return(
                    <div key={k} style={{background:'#020617',border:'1px solid #1e293b',borderRadius:'5px',padding:'3px 9px',textAlign:'center',minWidth:'55px'}}>
                      <div style={{fontSize:'8px',color:'#64748b'}}>{k.toUpperCase()}</div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#38bdf8'}}>{v}{d&&<span style={{color:d.color,fontSize:'10px',marginLeft:'2px'}}>{d.dir}</span>}</div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

//
export default function App() {
  const [patients,setPatients]   = useState([])
  const [sel,setSel]             = useState(null)
  const [analyses,setAnalyses]   = useState({})
  const [screen,setScreen]       = useState('home')
  const [selA,setSelA]           = useState(null)
  const [search,setSearch]       = useState('')
  const [showNP,setShowNP]       = useState(false)
  const [npN,setNpN]             = useState('')
  const [npL,setNpL]             = useState('')
  const [npS,setNpS]             = useState('')
  const [caseText,setCaseText]   = useState('')
  const [loading,setLoading]     = useState(false)
  const [result,setResult]       = useState(null)
  const [err,setErr]             = useState(null)
  const [saved,setSaved]         = useState('')
  const [showPDF,setShowPDF]     = useState(false)
  const [dbLoading,setDbLoading] = useState(true)

  useEffect(()=>{ loadPatients() },[])
  useEffect(()=>{ if(sel) loadAnalyses(sel.id) },[sel])

  async function loadPatients() {
    setDbLoading(true)
    const {data,error} = await supabase.from('pacientes').select('*').order('created_at',{ascending:false})
    if(!error) setPatients(data||[])
    setDbLoading(false)
  }

  async function loadAnalyses(pid) {
    const {data,error} = await supabase.from('analises').select('*').eq('paciente_id',pid).order('created_at',{ascending:false})
    if(!error) setAnalyses(prev=>({...prev,[pid]:data||[]}))
  }

  async function createPatient() {
    if(!npN.trim()) return
    const {data,error} = await supabase.from('pacientes').insert({nome:npN.trim(),leito:npL.trim(),setor:npS.trim()}).select().single()
    if(!error){setPatients(prev=>[data,...prev]);setShowNP(false);setNpN('');setNpL('');setNpS('');setSel(data);setScreen('new');setResult(null);setCaseText('')}
  }

  async function deletePatient(id) {
    await supabase.from('pacientes').delete().eq('id',id)
    setPatients(prev=>prev.filter(p=>p.id!==id))
    if(sel?.id===id){setSel(null);setScreen('home')}
  }

  async function analyze() {
    if(!caseText.trim()) return
    setLoading(true);setErr(null);setResult(null);setSaved('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:4096,system:SYSTEM_PROMPT,messages:[{role:'user',content:'Analise este caso clinico e retorne apenas JSON:\n\n'+caseText}]})
      })
      if(!res.ok){const t=await res.text();throw new Error('API '+res.status+': '+t.slice(0,200))}
      const data=await res.json()
      const raw=(data.content||[]).map(b=>b.type==='text'?b.text:'').join('')||''
      if(!raw.trim()) throw new Error('Resposta vazia.')
      const parsed=repairJSON(raw)
      if(!parsed) throw new Error('Erro ao interpretar resposta.')
      setResult(parsed)
      if(sel){
        const {data:aData,error}=await supabase.from('analises').insert({paciente_id:sel.id,caso_texto:caseText,resultado_json:parsed}).select().single()
        if(!error){setSaved('Salvo automaticamente - '+fmt(aData.created_at));loadAnalyses(sel.id)}
        else setSaved('Analise gerada mas nao foi possivel salvar.')
      }
    } catch(e){setErr(e.message)}
    finally{setLoading(false)}
  }

  const patAnal = sel?analyses[sel.id]||[]:[]
  const filtered = patients.filter(p=>p.nome.toLowerCase().includes(search.toLowerCase())||(p.leito||'').toLowerCase().includes(search.toLowerCase()))

  if(showPDF&&(result||selA?.resultado_json)) return <PrintView data={result||selA.resultado_json} paciente={sel} createdAt={selA?.created_at} onClose={()=>setShowPDF(false)}/>

  const inp = {width:'100%',background:'#020617',border:'1px solid #1e293b',borderRadius:'5px',padding:'7px 9px',color:'#cbd5e1',fontSize:'12px',fontFamily:'monospace'}

  return (
    <div style={{minHeight:'100vh',background:'#020617',fontFamily:'monospace',color:'#cbd5e1',fontSize:'13px'}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}input:focus,textarea:focus,select:focus{outline:none;}@keyframes spin{to{transform:rotate(360deg);}}@keyframes fin{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}.fin{animation:fin 0.25s ease;}`}</style>

      {/* Header */}
      <div style={{background:'#0a0f1e',borderBottom:'1px solid #1e293b',padding:'9px 16px',display:'flex',alignItems:'center',gap:'12px',position:'sticky',top:0,zIndex:100}}>
        <button onClick={()=>{setScreen('home');setSel(null);setResult(null);setCaseText('');setSelA(null)}} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',padding:0}}>
          <Logo size={32}/>
          <div><div style={{fontWeight:700,fontSize:'16px',color:'#1D9E75',letterSpacing:'5px',lineHeight:1}}>MAIS</div><div style={{fontSize:'8px',color:'#475569',letterSpacing:'0.18em',marginTop:'2px'}}>inteligencia clinica.</div></div>
        </button>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'8px'}}>
          {(result||selA)&&(screen==='new'||screen==='detail')&&<button onClick={()=>setShowPDF(true)} style={{background:'linear-gradient(135deg,#059669,#0d9488)',border:'none',cursor:'pointer',padding:'6px 12px',borderRadius:'6px',color:'#fff',fontWeight:700,fontSize:'11px',fontFamily:'monospace'}}>PDF</button>}
        </div>
      </div>

      <div style={{display:'flex',height:'calc(100vh - 52px)'}}>

        {/* Sidebar */}
        <div style={{width:'210px',flexShrink:0,borderRight:'1px solid #1e293b',background:'#0a0f1e',display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{padding:'12px 10px 8px'}}>
            <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.15em',marginBottom:'8px'}}>PACIENTES</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{...inp,marginBottom:'7px'}}/>
            <button onClick={()=>setShowNP(v=>!v)} style={{width:'100%',background:'linear-gradient(135deg,#1D9E75,#0d9488)',border:'none',cursor:'pointer',padding:'7px',borderRadius:'6px',color:'#fff',fontWeight:700,fontSize:'11px',fontFamily:'monospace'}}>+ Novo paciente</button>
          </div>
          {showNP&&(
            <div style={{margin:'0 8px 8px',background:'#0f172a',border:'1px solid #1D9E7540',borderRadius:'7px',padding:'10px'}}>
              <div style={{fontSize:'10px',color:'#1D9E75',marginBottom:'8px'}}>NOVO PACIENTE</div>
              {[['Nome *',npN,setNpN,'Maria Silva'],['Leito',npL,setNpL,'Leito 4'],['Setor',npS,setNpS,'UTI']].map(([l,v,fn,ph])=>(
                <div key={l} style={{marginBottom:'6px'}}><div style={{fontSize:'9px',color:'#64748b',marginBottom:'2px'}}>{l}</div><input value={v} onChange={e=>fn(e.target.value)} placeholder={ph} style={inp}/></div>
              ))}
              <div style={{display:'flex',gap:'5px',marginTop:'8px'}}>
                <button onClick={createPatient} disabled={!npN.trim()} style={{flex:1,background:'linear-gradient(135deg,#1D9E75,#0d9488)',border:'none',cursor:'pointer',padding:'6px',borderRadius:'5px',color:'#fff',fontWeight:700,fontSize:'10px',fontFamily:'monospace',opacity:!npN.trim()?0.4:1}}>Criar</button>
                <button onClick={()=>{setShowNP(false);setNpN('');setNpL('');setNpS('')}} style={{background:'#0f172a',border:'1px solid #1e293b',color:'#94a3b8',fontSize:'10px',cursor:'pointer',padding:'6px 10px',borderRadius:'5px',fontFamily:'monospace'}}>X</button>
              </div>
            </div>
          )}
          <div style={{flex:1,overflowY:'auto',padding:'0 8px 8px'}}>
            {dbLoading&&<div style={{textAlign:'center',padding:'16px',color:'#334155',fontSize:'11px'}}>Carregando...</div>}
            {!dbLoading&&filtered.length===0&&<div style={{fontSize:'11px',color:'#334155',textAlign:'center',padding:'16px 8px'}}>Nenhum paciente.</div>}
            {filtered.map(p=>(
              <div key={p.id} onClick={()=>{setSel(p);setScreen('patient');setResult(null);setCaseText('');setSelA(null)}}
                style={{padding:'9px 10px',borderRadius:'7px',cursor:'pointer',border:`1px solid ${sel?.id===p.id?'#1D9E75':'transparent'}`,background:sel?.id===p.id?'#0f172a':'transparent',marginBottom:'3px'}}>
                <div style={{fontWeight:600,fontSize:'12px',color:'#f1f5f9',marginBottom:'1px'}}>{p.nome}</div>
                <div style={{fontSize:'10px',color:'#64748b'}}>{[p.leito,p.setor].filter(Boolean).join(' - ')||'Sem setor'}</div>
                {(analyses[p.id]||[]).length>0&&<div style={{fontSize:'9px',color:'#334155',marginTop:'2px'}}>{(analyses[p.id]||[]).length} analise{(analyses[p.id]||[]).length>1?'s':''}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>

          {screen==='home'&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'70%',gap:'14px',textAlign:'center'}}>
              <Logo size={48}/>
              <div style={{fontSize:'11px',color:'#1e293b',letterSpacing:'0.1em',lineHeight:2}}>SELECIONE OU CRIE UM PACIENTE<br/>PARA INICIAR A ANALISE</div>
            </div>
          )}

          {screen==='patient'&&sel&&(
            <div className="fin">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
                <div><div style={{fontSize:'16px',fontWeight:700,color:'#f1f5f9'}}>{sel.nome}</div><div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>{[sel.leito,sel.setor].filter(Boolean).join(' - ')||'Sem setor'}</div></div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {patAnal.length>=2&&<button onClick={()=>setScreen('evolution')} style={{background:'#0f172a',border:'1px solid #1e293b',color:'#94a3b8',fontSize:'10px',cursor:'pointer',padding:'6px 12px',borderRadius:'6px',fontFamily:'monospace'}}>Evolucao</button>}
                  <button onClick={()=>setScreen('balanco')} style={{background:'#0f172a',border:'1px solid #38bdf8',color:'#38bdf8',fontSize:'10px',cursor:'pointer',padding:'6px 12px',borderRadius:'6px',fontFamily:'monospace'}}>Balanco Hidrico</button>
                  <button onClick={()=>{setResult(null);setCaseText('');setSaved('');setScreen('new')}} style={{background:'linear-gradient(135deg,#1D9E75,#0d9488)',border:'none',cursor:'pointer',padding:'7px 12px',borderRadius:'6px',color:'#fff',fontWeight:700,fontSize:'11px',fontFamily:'monospace'}}>+ Nova analise</button>
                </div>
              </div>
              {patAnal.length===0&&(
                <div style={{background:'#0f172a',border:'1px dashed #1e293b',borderRadius:'8px',padding:'32px',textAlign:'center'}}>
                  <div style={{fontSize:'12px',color:'#334155',marginBottom:'12px'}}>Nenhuma analise ainda.</div>
                  <button onClick={()=>{setResult(null);setCaseText('');setSaved('');setScreen('new')}} style={{background:'linear-gradient(135deg,#1D9E75,#0d9488)',border:'none',cursor:'pointer',padding:'7px 12px',borderRadius:'6px',color:'#fff',fontWeight:700,fontSize:'11px',fontFamily:'monospace'}}>+ Criar primeira analise</button>
                </div>
              )}
              {patAnal.map(a=>(
                <div key={a.id} onClick={()=>{setSelA(a);setResult(a.resultado_json);setScreen('detail')}}
                  style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'7px',padding:'12px 14px',marginBottom:'8px',cursor:'pointer'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'7px',flexWrap:'wrap',gap:'5px'}}>
                    <span style={{fontSize:'11px',color:'#38bdf8',fontWeight:600}}>{fmt(a.created_at)}</span>
                    <div style={{display:'flex',gap:'4px'}}>
                      {a.resultado_json?.urgente&&<span style={{fontSize:'9px',background:'#ef444420',color:'#ef4444',border:'1px solid #ef444440',borderRadius:'20px',padding:'1px 7px'}}>urgente</span>}
                      {a.resultado_json?.sepse?.qsofa?.pontos>=2&&<span style={{fontSize:'9px',background:'#ef444420',color:'#ef4444',border:'1px solid #ef444440',borderRadius:'20px',padding:'1px 7px'}}>SEPSE</span>}
                    </div>
                  </div>
                  <p style={{fontSize:'11px',color:'#94a3b8',lineHeight:'1.5'}}>{a.resultado_json?.resumo?.slice(0,150)}...</p>
                </div>
              ))}
            </div>
          )}

          {screen==='new'&&sel&&(
            <div className="fin">
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                <button onClick={()=>{setScreen('patient');setResult(null);setCaseText('')}} style={{background:'#0f172a',border:'1px solid #1e293b',color:'#94a3b8',fontSize:'10px',cursor:'pointer',padding:'5px 10px',borderRadius:'5px',fontFamily:'monospace'}}>Voltar</button>
                <div><div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>Nova analise</div><div style={{fontSize:'10px',color:'#64748b'}}>{sel.nome}</div></div>
              </div>
              <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'9px',padding:'14px',marginBottom:'14px'}}>
                <div style={{fontSize:'10px',color:'#38bdf8',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:'9px'}}>Caso Clinico</div>
                <textarea value={caseText} onChange={e=>setCaseText(e.target.value)}
                  placeholder="Digite ou use o microfone do teclado para ditar o caso..."
                  style={{width:'100%',minHeight:'100px',background:'#020617',border:'1px solid #1e293b',borderRadius:'5px',color:'#cbd5e1',fontSize:'12px',padding:'9px',resize:'vertical',fontFamily:'monospace',lineHeight:'1.6'}}/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'9px'}}>
                  <span style={{fontSize:'10px',color:'#334155'}}>{caseText.length} chars</span>
                  <button onClick={analyze} disabled={loading||caseText.trim().length<10}
                    style={{background:'linear-gradient(135deg,#0ea5e9,#6366f1)',border:'none',cursor:'pointer',padding:'9px 20px',borderRadius:'7px',color:'#fff',fontWeight:700,fontSize:'12px',fontFamily:'monospace',opacity:loading||caseText.trim().length<10?0.4:1}}>
                    {loading?'Analisando...':'Analisar caso'}
                  </button>
                </div>
              </div>
              {err&&<div style={{background:'#450a0a',border:'1px solid #ef444460',borderRadius:'6px',padding:'10px 14px',marginBottom:'10px',fontSize:'11px',color:'#fda4af',wordBreak:'break-all'}}>ERRO: {err}</div>}
              {saved&&<div style={{background:'#022c22',border:'1px solid #14532d',borderRadius:'6px',padding:'9px 12px',marginBottom:'10px',fontSize:'11px',color:'#86efac'}}>{saved}</div>}
              {loading&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'36px',gap:'12px'}}><div style={{width:'32px',height:'32px',border:'3px solid #1e293b',borderTop:'3px solid #0ea5e9',borderRadius:'50%',animation:'spin 1s linear infinite'}}/><span style={{color:'#475569',fontSize:'11px',letterSpacing:'0.1em'}}>PROCESSANDO...</span></div>}
              {result&&!loading&&<AnalysisResult data={result} paciente={sel} onShowPrint={()=>setShowPDF(true)}/>}
            </div>
          )}

          {screen==='detail'&&selA&&(
            <div className="fin">
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
                <button onClick={()=>{setScreen('patient');setSelA(null);setResult(null)}} style={{background:'#0f172a',border:'1px solid #1e293b',color:'#94a3b8',fontSize:'10px',cursor:'pointer',padding:'5px 10px',borderRadius:'5px',fontFamily:'monospace'}}>Voltar</button>
                <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>{sel?.nome}</div><div style={{fontSize:'10px',color:'#64748b'}}>{fmt(selA.created_at)}</div></div>
                <button onClick={()=>setShowPDF(true)} style={{background:'linear-gradient(135deg,#059669,#0d9488)',border:'none',cursor:'pointer',padding:'6px 12px',borderRadius:'6px',color:'#fff',fontWeight:700,fontSize:'11px',fontFamily:'monospace'}}>PDF</button>
              </div>
              <AnalysisResult data={selA.resultado_json} paciente={sel} createdAt={selA.created_at} onShowPrint={()=>setShowPDF(true)}/>
            </div>
          )}

          {screen==='evolution'&&sel&&(
            <div className="fin">
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                <button onClick={()=>setScreen('patient')} style={{background:'#0f172a',border:'1px solid #1e293b',color:'#94a3b8',fontSize:'10px',cursor:'pointer',padding:'5px 10px',borderRadius:'5px',fontFamily:'monospace'}}>Voltar</button>
                <div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>{sel.nome}</div>
              </div>
              <EvolutionView analyses={patAnal} paciente={sel}/>
            </div>
          )}

          {screen==='balanco'&&sel&&(
            <div className="fin">
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                <button onClick={()=>setScreen('patient')} style={{background:'#0f172a',border:'1px solid #1e293b',color:'#94a3b8',fontSize:'10px',cursor:'pointer',padding:'5px 10px',borderRadius:'5px',fontFamily:'monospace'}}>Voltar</button>
                <div><div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>Balanco Hidrico</div><div style={{fontSize:'10px',color:'#64748b'}}>{sel.nome} — hoje</div></div>
              </div>
              <BalancoHidrico pacienteId={sel.id}/>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
