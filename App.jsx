import { useState, useEffect, useRef } from 'react';
import { db, PROMPT, STATUS_CFG, DESFECHO_CFG, fmt, fixJSON, calcStatus } from './config';
import Logo from './components/Logo';
import PinScreen from './components/PinScreen';
import Result from './components/Result';
import VitalChart from './components/VitalChart';
import PrintView, { buildReport } from './components/PrintView';

function HomeDash({ patients, analyses, homeFilter, setHomeFilter, setSel, loadA, setScreen }) {
  const ativos = patients.filter(p => !p.desfecho);
  const criticos = ativos.filter(p => p.status_clinico === 'critico');
  const graves = ativos.filter(p => p.status_clinico === 'grave');
  const atencao = ativos.filter(p => p.status_clinico === 'atencao' || p.status_clinico === 'grave');
  const estaveis = ativos.filter(p => p.status_clinico === 'estavel' || !p.status_clinico);
  const maisGrave = criticos[0] || graves[0] || atencao[0] || null;
  const analMG = maisGrave && (analyses[maisGrave.id] || [])[0];
  const hipMG = analMG?.resultado_json?.hipoteses?.[0];
  const qMG = analMG?.resultado_json?.sepse?.qsofa?.pontos ?? null;
  const filtrados = homeFilter === 'critico' ? criticos : homeFilter === 'atencao' ? atencao : homeFilter === 'estavel' ? estaveis : ativos;
  const metrics = [
    { label: 'TOTAL',    val: ativos.length,   color: '#f1f5f9', f: null },
    { label: 'CRITICOS', val: criticos.length,  color: '#ef4444', f: 'critico' },
    { label: 'ATENCAO',  val: atencao.length,   color: '#f59e0b', f: 'atencao' },
    { label: 'ESTAVEIS', val: estaveis.length,  color: '#22c55e', f: 'estavel' },
  ];
  if (!ativos.length) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#1e293b'}}>
      <Logo size={80}/><div style={{fontSize:'11px',letterSpacing:'0.15em',marginTop:'16px',color:'#1e293b'}}>SELECIONE OU CRIE UM PACIENTE</div>
    </div>
  );
  return (
    <div style={{padding:'16px',overflowY:'auto',height:'100%'}}>
      <div style={{marginBottom:'14px'}}><div style={{fontSize:'13px',fontWeight:700,color:'#f1f5f9'}}>Visao Geral — UTI</div><div style={{fontSize:'10px',color:'#475569'}}>{ativos.length} paciente{ativos.length!==1?'s':''} ativo{ativos.length!==1?'s':''}</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'14px'}}>
        {metrics.map(m=>{const active=homeFilter===m.f;return(<div key={m.label} onClick={()=>setHomeFilter(active?null:m.f)} style={{background:active?'#1e293b':'#0f172a',border:`1px solid ${active?m.color+'50':'#1e293b'}`,borderRadius:'8px',padding:'12px',cursor:'pointer'}}><div style={{fontSize:'24px',fontWeight:700,color:m.color,lineHeight:1}}>{m.val}</div><div style={{fontSize:'9px',color:'#475569',marginTop:'4px',letterSpacing:'0.08em'}}>{m.label}</div></div>);})}
      </div>
      {!homeFilter&&maisGrave&&<div style={{background:'#0f172a',border:'1px solid #ef444430',borderLeft:'3px solid #ef4444',borderRadius:'8px',padding:'14px',marginBottom:'14px',cursor:'pointer'}} onClick={()=>{setSel(maisGrave);loadA(maisGrave.id);setScreen('patient');}}>
        <div style={{fontSize:'9px',color:'#ef4444',fontWeight:700,letterSpacing:'0.1em',marginBottom:'8px'}}>PACIENTE MAIS GRAVE</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px'}}>
          <div><div style={{fontSize:'13px',fontWeight:700,color:'#f1f5f9'}}>{maisGrave.nome}</div><div style={{fontSize:'10px',color:'#94a3b8',marginTop:'2px'}}>{hipMG?hipMG.nome:'Ver analise'}</div></div>
          {qMG!==null&&<div style={{textAlign:'center'}}><div style={{fontSize:'20px',fontWeight:700,color:'#ef4444'}}>{qMG}/3</div><div style={{fontSize:'8px',color:'#64748b'}}>qSOFA</div></div>}
        </div>
      </div>}
      <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'8px',padding:'14px'}}>
        <div style={{fontSize:'9px',color:'#64748b',letterSpacing:'0.1em',marginBottom:'10px'}}>{homeFilter?homeFilter.toUpperCase():'TODOS OS PACIENTES'}</div>
        {filtrados.map(p=>{const pa=(analyses[p.id]||[])[0];const hip=pa?.resultado_json?.hipoteses?.[0];return(<div key={p.id} onClick={()=>{setSel(p);loadA(p.id);setScreen('patient');setHomeFilter(null);}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #1e293b',cursor:'pointer'}}><div><span style={{fontSize:'12px',fontWeight:700,color:'#f1f5f9'}}>{p.nome}</span><span style={{fontSize:'10px',color:'#64748b',marginLeft:'8px'}}>{[p.leito,p.setor].filter(Boolean).join(' - ')||'Sem setor'}</span>{hip&&<div style={{fontSize:'10px',color:'#475569',marginTop:'1px'}}>{hip.nome}</div>}</div><span style={{fontSize:'9px',fontWeight:700,padding:'2px 7px',borderRadius:'4px',color:STATUS_CFG[p.status_clinico||'estavel']?.color,background:STATUS_CFG[p.status_clinico||'estavel']?.bg}}>{STATUS_CFG[p.status_clinico||'estavel']?.label}</span></div>);})}
        {!filtrados.length&&<div style={{fontSize:'11px',color:'#334155',textAlign:'center',padding:'12px'}}>Nenhum paciente nesta categoria</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [unlocked,setUnlocked]=useState(false);
  const [dbLoad,setDbLoad]=useState(true);
  const [patients,setPatients]=useState([]);
  const [analyses,setAnalyses]=useState({});
  const [sel,setSel]=useState(null);
  const [patA,setPatA]=useState([]);
  const [screen,setScreen]=useState('patient');
  const [selA,setSelA]=useState(null);
  const [search,setSearch]=useState('');
  const [showNP,setShowNP]=useState(false);
  const [npN,setNpN]=useState('');const [npL,setNpL]=useState('');const [npS,setNpS]=useState('');
  const [caseText,setCaseText]=useState('');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [err,setErr]=useState(null);
  const [saved,setSaved]=useState('');
  const [showPDF,setShowPDF]=useState(false);
  const [notesForPDF,setNotesForPDF]=useState('');
  const [showDesfecho,setShowDesfecho]=useState(false);
  const [showStatusEdit,setShowStatusEdit]=useState(false);
  const [homeFilter,setHomeFilter]=useState(null);
  const [editPat,setEditPat]=useState(false);
  const [editN,setEditN]=useState('');const [editL,setEditL]=useState('');const [editS,setEditS]=useState('');
  const [isRec,setIsRec]=useState(false);
  const [micErr,setMicErr]=useState('');
  const [note,setNote]=useState('');
  const [noteSaved,setNoteSaved]=useState('');
  const [savingNote,setSavingNote]=useState(false);
  const recRef=useRef(null);
  const fileRef=useRef(null);

  useEffect(()=>{loadP();},[]);

  async function loadP(){
    setDbLoad(true);
    const{data}=await db.from('pacientes').select('*').order('created_at',{ascending:false});
    if(data){
      setPatients(data);
      const map={};
      await Promise.all(data.map(async p=>{
        const{data:a}=await db.from('analises').select('*').eq('paciente_id',p.id).order('created_at',{ascending:false}).limit(1);
        if(a)map[p.id]=a;
      }));
      setAnalyses(map);
    }
    setDbLoad(false);
  }

  async function loadA(pid){
    const{data}=await db.from('analises').select('*').eq('paciente_id',pid).order('created_at',{ascending:false});
    if(data){setPatA(data);setAnalyses(prev=>({...prev,[pid]:data}));}
  }

  async function saveEditPat(){
    if(!editN.trim())return;
    const{data,error}=await db.from('pacientes').update({nome:editN.trim(),leito:editL.trim(),setor:editS.trim()}).eq('id',sel.id).select().single();
    if(!error){setSel(data);setPatients(prev=>prev.map(p=>p.id===sel.id?data:p));setEditPat(false);}
  }

  function toggleMic(){
    setMicErr('');
    if(isRec){if(recRef.current)recRef.current.stop();setIsRec(false);return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setMicErr('Use o microfone do teclado iOS');return;}
    const r=new SR();r.lang='pt-BR';r.continuous=true;r.interimResults=true;
    r.onstart=()=>setIsRec(true);r.onend=()=>setIsRec(false);
    r.onerror=e=>{setIsRec(false);setMicErr('Erro: '+e.error);};
    r.onresult=e=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)t+=e.results[i][0].transcript+' ';}if(t)setCaseText(prev=>(prev+t).trim()+' ');};
    recRef.current=r;r.start();
  }

  async function saveNote(aid){
    if(!aid||!note.trim())return;setSavingNote(true);
    const{error}=await db.from('analises').update({notas:note.trim()}).eq('id',aid);
    if(!error){setNoteSaved('Nota salva!');loadA(sel.id);setTimeout(()=>setNoteSaved(''),3000);}
    setSavingNote(false);
  }

  async function createP(){
    if(!npN.trim())return;
    const{data,error}=await db.from('pacientes').insert({nome:npN.trim(),leito:npL.trim(),setor:npS.trim(),status_clinico:'estavel'}).select().single();
    if(!error){setPatients(prev=>[data,...prev]);setAnalyses(prev=>({...prev,[data.id]:[]}));setSel(data);setPatA([]);setShowNP(false);setNpN('');setNpL('');setNpS('');setScreen('new');setCaseText('');setResult(null);}
  }

  async function analyze(){
    if(!caseText.trim())return;
    setLoading(true);setErr(null);setResult(null);setSaved('');setNote('');setNoteSaved('');
    try{
      const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseText,prompt:PROMPT})});
      if(!res.ok){const t=await res.text();throw new Error('API '+res.status+': '+t.slice(0,200));}
      const data=await res.json();
      if(data.error)throw new Error(data.error);
      const raw=(data.content||[]).map(b=>b.type==='text'?b.text:'').join('')||'';
      const parsed=fixJSON(raw);
      if(!parsed)throw new Error('Resposta invalida da API');
      setResult(parsed);
      if(sel){
        const{data:aData,error}=await db.from('analises').insert({paciente_id:sel.id,caso_texto:caseText,resultado_json:parsed}).select().single();
        if(!error){
          setSaved('Salvo - '+fmt(aData.created_at));loadA(sel.id);
          const ns=calcStatus([aData]);
          db.from('pacientes').update({status_clinico:ns}).eq('id',sel.id);
          setSel(prev=>({...prev,status_clinico:ns}));
          setPatients(prev=>prev.map(p=>p.id===sel.id?{...p,status_clinico:ns}:p));
        }
      }
    }catch(e){setErr(e.message);}
    setLoading(false);
  }

  function analyzePhoto(file){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=async e=>{
      try{
        const b64=e.target.result.split(',')[1];const mtype=file.type||'image/jpeg';
        setCaseText('[Processando foto...]');
        const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseText:'Extraia todos os exames laboratoriais.',prompt:'Extraia os valores dos exames e retorne JSON: {"resumo":"liste cada exame nome valor unidade","paciente":{"sinais_vitais":{}},"hipoteses":[],"red_flags":[],"lacunas":[],"passos":[],"scores":[],"sepse":{"qsofa":{"pontos":0,"criterios":[],"risco":""},"indice_choque":{"valor":"","interpretacao":""}},"resumo_familiar":"","metas_uti":[],"tendencias":"","urgente":false,"sbar":{"situacao":"","background":"","avaliacao":"","recomendacao":""},"checklist":[]}',imageData:b64,imageType:mtype})});
        const data=await res.json();if(data.error)throw new Error(data.error);
        const raw=(data.content||[]).map(b=>b.type==='text'?b.text:'').join('');
        const parsed=fixJSON(raw);
        if(parsed?.resumo){setCaseText('EXAMES DA FOTO:\n'+parsed.resumo+'\n\nAdicione informacoes clinicas e clique em Analisar caso.');}
        else{setCaseText('Nao consegui ler os exames. Digite manualmente.');}
      }catch(ex){setCaseText('Erro ao processar foto. Digite manualmente.');}
    };
    reader.readAsDataURL(file);
  }

  const filtered=patients.filter(p=>p.nome?.toLowerCase().includes(search.toLowerCase())||p.leito?.toLowerCase().includes(search.toLowerCase()));

  if(!unlocked)return <PinScreen onUnlock={()=>setUnlocked(true)}/>;
  if(dbLoad)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#020617',color:'#1D9E75',fontFamily:'monospace'}}>Carregando...</div>;
  if(showPDF&&(result||selA?.resultado_json)){
    const pd={...(result||selA.resultado_json),_notas:notesForPDF||note||selA?.notas||''};
    return <PrintView data={pd} paciente={sel} createdAt={selA?.created_at} onClose={()=>setShowPDF(false)}/>;
  }

  return (
    <div style={{display:'flex',height:'100vh',background:'#020617'}}>
      <div style={{width:'220px',background:'#0a0f1e',borderRight:'1px solid #1e293b',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'14px 12px',borderBottom:'1px solid #1e293b'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px',cursor:'pointer'}} onClick={()=>{setSel(null);setScreen('patient');}}>
            <Logo size={32}/>
            <div><div style={{fontWeight:700,fontSize:'16px',color:'#1D9E75',letterSpacing:'5px',lineHeight:1}}>MAIS</div><div style={{fontSize:'8px',color:'#475569',letterSpacing:'0.18em',marginTop:'2px'}}>inteligencia clinica.</div></div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." className="inp" style={{marginBottom:'8px'}}/>
          <button className="btn" style={{width:'100%'}} onClick={()=>setShowNP(true)}>+ Novo paciente</button>
        </div>
        {showNP&&<div style={{padding:'12px',borderBottom:'1px solid #1e293b'}}>
          <input value={npN} onChange={e=>setNpN(e.target.value)} placeholder="Nome" className="inp" style={{marginBottom:'6px'}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'6px'}}>
            <input value={npL} onChange={e=>setNpL(e.target.value)} placeholder="Leito" className="inp"/>
            <input value={npS} onChange={e=>setNpS(e.target.value)} placeholder="Setor" className="inp"/>
          </div>
          <div style={{display:'flex',gap:'6px'}}><button className="btn" style={{flex:1}} onClick={createP}>Salvar</button><button className="sbtn" onClick={()=>setShowNP(false)}>X</button></div>
        </div>}
        <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
          <div style={{fontSize:'9px',color:'#334155',letterSpacing:'0.1em',padding:'4px 4px 6px'}}>PACIENTES</div>
          {filtered.map(p=>{
            const isSel=sel?.id===p.id;
            return(<div key={p.id} onClick={()=>{setSel(p);loadA(p.id);setScreen('patient');setResult(null);setSelA(null);setEditPat(false);setNote('');}} style={{padding:'8px',borderRadius:'7px',marginBottom:'4px',cursor:'pointer',background:isSel?'#1e3a5f':'none',border:`1px solid ${isSel?'#1e4a7f':'transparent'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'2px'}}>
                <span style={{fontWeight:600,fontSize:'12px',color:'#f1f5f9'}}>{p.nome}</span>
                {p.desfecho?<span style={{fontSize:'8px',fontWeight:700,color:DESFECHO_CFG[p.desfecho]?.color,background:DESFECHO_CFG[p.desfecho]?.color+'20',borderRadius:'3px',padding:'1px 5px'}}>{DESFECHO_CFG[p.desfecho]?.label}</span>:<span style={{fontSize:'8px',fontWeight:700,color:STATUS_CFG[p.status_clinico||'estavel']?.color,background:STATUS_CFG[p.status_clinico||'estavel']?.bg,borderRadius:'3px',padding:'1px 5px'}}>{STATUS_CFG[p.status_clinico||'estavel']?.label}</span>}
              </div>
              <div style={{fontSize:'10px',color:'#64748b'}}>{[p.leito,p.setor].filter(Boolean).join(' - ')||'Sem setor'}</div>
              {(analyses[p.id]||[]).length>0&&<div style={{fontSize:'9px',color:'#334155',marginTop:'2px'}}>{(analyses[p.id]||[]).length} analise{(analyses[p.id]||[]).length>1?'s':''}</div>}
            </div>);
          })}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
        {!sel&&<HomeDash patients={patients} analyses={analyses} homeFilter={homeFilter} setHomeFilter={setHomeFilter} setSel={setSel} loadA={loadA} setScreen={setScreen}/>}

        {sel&&screen==='patient'&&<div className="fin" style={{padding:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
            <div>
              {!editPat?<div><div style={{fontSize:'16px',fontWeight:700,color:'#f1f5f9'}}>{sel.nome}</div><div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>{[sel.leito,sel.setor].filter(Boolean).join(' - ')||'Sem setor'}</div></div>
              :<div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                <input className="inp" value={editN} onChange={e=>setEditN(e.target.value)} placeholder="Nome"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}><input className="inp" value={editL} onChange={e=>setEditL(e.target.value)} placeholder="Leito"/><input className="inp" value={editS} onChange={e=>setEditS(e.target.value)} placeholder="Setor"/></div>
                <div style={{display:'flex',gap:'6px'}}><button className="btn" style={{fontSize:'11px'}} onClick={saveEditPat}>Salvar</button><button className="sbtn" onClick={()=>setEditPat(false)}>Cancelar</button></div>
              </div>}
            </div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {!editPat&&<button className="sbtn" onClick={()=>{setEditN(sel.nome);setEditL(sel.leito||'');setEditS(sel.setor||'');setEditPat(true);}}>Editar</button>}
              {patA.length>=2&&!editPat&&<button className="sbtn" onClick={()=>setScreen('evolution')}>Evolucao</button>}
              {patA.length>0&&!editPat&&<button className="sbtn" style={{color:'#38bdf8',borderColor:'#38bdf8'}} onClick={()=>setScreen('dashboard')}>Dashboard</button>}
              {!editPat&&<button className="sbtn" style={{color:STATUS_CFG[sel.status_clinico||'estavel']?.color,borderColor:STATUS_CFG[sel.status_clinico||'estavel']?.color}} onClick={()=>setShowStatusEdit(true)}>{STATUS_CFG[sel.status_clinico||'estavel']?.label}</button>}
              {!editPat&&!sel.desfecho&&<button className="sbtn" style={{color:'#64748b'}} onClick={()=>setShowDesfecho(true)}>Desfecho</button>}
              {!editPat&&<button className="btn" onClick={()=>{setResult(null);setCaseText('');setSaved('');setNote('');setScreen('new');}}>+ Nova analise</button>}
            </div>
          </div>

          {showStatusEdit&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowStatusEdit(false)}>
            <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'12px',padding:'20px',width:'260px'}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:'11px',color:'#64748b',marginBottom:'14px',letterSpacing:'0.1em'}}>STATUS CLINICO</div>
              {Object.entries(STATUS_CFG).map(([k,v])=>(
                <div key={k} onClick={async()=>{await db.from('pacientes').update({status_clinico:k}).eq('id',sel.id);setSel(p=>({...p,status_clinico:k}));setPatients(prev=>prev.map(p=>p.id===sel.id?{...p,status_clinico:k}:p));setShowStatusEdit(false);}} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px',borderRadius:'8px',cursor:'pointer',background:sel.status_clinico===k?v.bg:'transparent',border:`1px solid ${sel.status_clinico===k?v.border:'transparent'}`,marginBottom:'6px'}}>
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',background:v.color,flexShrink:0}}/><span style={{color:v.color,fontWeight:700,fontSize:'13px'}}>{v.label}</span>
                </div>
              ))}
              <button className="sbtn" style={{width:'100%',marginTop:'8px'}} onClick={()=>setShowStatusEdit(false)}>Cancelar</button>
            </div>
          </div>}

          {showDesfecho&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowDesfecho(false)}>
            <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'12px',padding:'20px',width:'260px'}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:'11px',color:'#64748b',marginBottom:'14px',letterSpacing:'0.1em'}}>REGISTRAR DESFECHO</div>
              {Object.entries(DESFECHO_CFG).map(([k,v])=>(
                <div key={k} onClick={async()=>{const now=new Date().toISOString();await db.from('pacientes').update({desfecho:k,desfecho_data:now}).eq('id',sel.id);setSel(p=>({...p,desfecho:k,desfecho_data:now}));setPatients(prev=>prev.map(p=>p.id===sel.id?{...p,desfecho:k}:p));setShowDesfecho(false);}} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'8px',cursor:'pointer',border:`1px solid ${v.color}30`,marginBottom:'8px',background:v.color+'10'}}>
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',background:v.color,flexShrink:0}}/><span style={{color:v.color,fontWeight:700,fontSize:'14px'}}>{v.label}</span>
                </div>
              ))}
              <button className="sbtn" style={{width:'100%',marginTop:'4px'}} onClick={()=>setShowDesfecho(false)}>Cancelar</button>
            </div>
          </div>}

          {patA.map((a,i)=>{
            const isLast=i===0;
            return(<div key={a.id} onClick={()=>{setSelA(a);setResult(null);setNote(a.notas||'');setScreen('detail');}} style={{background:isLast?'#0f172a':'#020617',border:`1px solid ${a.resultado_json?.urgente?'#ef444430':'#1e293b'}`,borderRadius:'8px',padding:'12px',marginBottom:'8px',cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                <span style={{fontSize:'11px',color:'#38bdf8',fontWeight:isLast?700:400}}>{fmt(a.created_at)}</span>
                {a.resultado_json?.urgente&&<span style={{fontSize:'9px',background:'#ef444420',color:'#ef4444',border:'1px solid #ef444440',borderRadius:'20px',padding:'1px 7px',fontWeight:700}}>urgente</span>}
              </div>
              <p style={{fontSize:'11px',color:'#94a3b8',lineHeight:1.5}}>{a.resultado_json?.resumo?.slice(0,150)}...</p>
              {a.notas&&<div style={{marginTop:'5px',padding:'4px 8px',background:'#f59e0b10',border:'1px solid #f59e0b20',borderRadius:'4px',fontSize:'10px',color:'#fcd34d'}}>📝 {a.notas.slice(0,80)}{a.notas.length>80?'...':''}</div>}
            </div>);
          })}
        </div>}

        {sel&&screen==='new'&&<div className="fin" style={{padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
            <button className="sbtn" onClick={()=>setScreen('patient')}>Voltar</button>
            <div><div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>Nova analise</div><div style={{fontSize:'10px',color:'#64748b'}}>{sel.nome}</div></div>
          </div>
          <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'9px',padding:'14px',marginBottom:'10px'}}>
            <div style={{fontSize:'10px',color:'#38bdf8',letterSpacing:'0.12em',fontWeight:700,marginBottom:'8px'}}>CASO CLINICO</div>
            <textarea value={caseText} onChange={e=>setCaseText(e.target.value)} placeholder="Digite, cole ou use o microfone para ditar o caso..." className="inp" style={{minHeight:'100px',resize:'vertical',lineHeight:'1.6',padding:'9px'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'9px',gap:'8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button onClick={toggleMic} style={{background:isRec?'#ef4444':'#1e293b',border:'none',borderRadius:'50%',width:'36px',height:'36px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:isRec?'0 0 0 5px #ef444430':''}}>
                  {isRec?<span style={{color:'#fff',fontSize:'12px'}}>■</span>:<span style={{fontSize:'16px'}}>🎙</span>}
                </button>
                {isRec&&<span style={{fontSize:'10px',color:'#ef4444'}}>● Gravando...</span>}
                {micErr&&<span style={{fontSize:'10px',color:'#f59e0b'}}>{micErr}</span>}
                {!isRec&&!micErr&&<span style={{fontSize:'10px',color:'#334155'}}>{caseText.length} chars</span>}
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>analyzePhoto(e.target.files[0])}/>
                <button onClick={()=>fileRef.current?.click()} style={{background:'#1e293b',border:'none',borderRadius:'50%',width:'36px',height:'36px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:'16px'}}>📷</span></button>
              </div>
              <button className="btn2" onClick={analyze} disabled={loading||caseText.trim().length<10} style={{opacity:loading||caseText.trim().length<10?0.4:1}}>{loading?'Analisando...':'Analisar caso'}</button>
            </div>
          </div>
          {err&&<div style={{background:'#450a0a',border:'1px solid #ef4444',borderRadius:'8px',padding:'10px 14px',color:'#fca5a5',fontSize:'12px',marginBottom:'10px'}}>ERRO: {err}</div>}
          {saved&&<div style={{fontSize:'11px',color:'#22c55e',marginBottom:'6px'}}>{saved}</div>}
          {result&&!loading&&<div>
            <Result data={result} onPDF={()=>{setNotesForPDF(note);setShowPDF(true);}}/>
            <div style={{background:'#0f172a',border:'1px solid #f59e0b30',borderLeft:'3px solid #f59e0b',borderRadius:'9px',padding:'14px',marginTop:'10px'}}>
              <div style={{fontSize:'10px',color:'#f59e0b',fontWeight:700,letterSpacing:'0.1em',marginBottom:'8px'}}>NOTAS DO PLANTAO</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex: Familia comunicada. Aguardando hemodiálise..." className="inp" style={{minHeight:'75px',resize:'vertical',lineHeight:'1.6',padding:'9px'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'7px'}}>
                <span style={{fontSize:'11px',color:'#86efac'}}>{noteSaved}</span>
                <button className="btn" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',opacity:!note.trim()||savingNote?0.4:1}} onClick={()=>saveNote(patA[0]?.id)} disabled={!note.trim()||savingNote}>{savingNote?'Salvando...':'Salvar nota'}</button>
              </div>
            </div>
          </div>}
        </div>}

        {sel&&screen==='detail'&&selA&&<div className="fin" style={{padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
            <button className="sbtn" onClick={()=>{setScreen('patient');setSelA(null);setResult(null);setNote('');setNoteSaved('');}}>Voltar</button>
            <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>{sel?.nome}</div><div style={{fontSize:'10px',color:'#64748b'}}>{fmt(selA.created_at)}</div></div>
          </div>
          <Result data={selA.resultado_json} onPDF={()=>{setNotesForPDF(note||selA.notas||'');setShowPDF(true);}}/>
          <div style={{background:'#0f172a',border:'1px solid #f59e0b30',borderLeft:'3px solid #f59e0b',borderRadius:'9px',padding:'14px',marginTop:'10px'}}>
            <div style={{fontSize:'10px',color:'#f59e0b',fontWeight:700,letterSpacing:'0.1em',marginBottom:'8px'}}>NOTAS DO PLANTAO</div>
            <textarea value={note||selA.notas||''} onChange={e=>setNote(e.target.value)} placeholder="Adicione notas..." className="inp" style={{minHeight:'75px',resize:'vertical',lineHeight:'1.6',padding:'9px'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'7px'}}>
              <span style={{fontSize:'11px',color:'#86efac'}}>{noteSaved}</span>
              <button className="btn" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',opacity:savingNote?0.4:1}} onClick={()=>saveNote(selA.id)} disabled={savingNote}>{savingNote?'Salvando...':'Salvar nota'}</button>
            </div>
          </div>
        </div>}

        {sel&&screen==='dashboard'&&<div className="fin" style={{padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
            <button className="sbtn" onClick={()=>setScreen('patient')}>Voltar</button>
            <div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>Dashboard — {sel.nome}</div>
          </div>
          {patA.length===0?<div style={{textAlign:'center',padding:'32px',color:'#475569',fontSize:'12px'}}>Nenhuma analise ainda.</div>:(()=>{
            const lat=patA[0]?.resultado_json||{};const sv=lat.paciente?.sinais_vitais||{};
            const qpts=lat.sepse?.qsofa?.pontos??0;const ic=lat.sepse?.indice_choque?.valor||'';const icn=parseFloat(ic)||0;
            const flags=(lat.red_flags||[]).slice(0,4);const hip=(lat.hipoteses||[])[0];const passo=(lat.passos||[])[0];
            const sc=qpts>=2||icn>=1||lat.urgente;const scolor=sc?'#ef4444':qpts>=1?'#f59e0b':'#22c55e';const slabel=sc?'ATENCAO IMEDIATA':qpts>=1?'MONITORAR':'ESTAVEL';
            const dfmt=patA[0]?.created_at?new Date(patA[0].created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
            const VT=[{k:'FC',l:'FC',bad:v=>v>100||v<50},{k:'PAS',l:'PAS',bad:v=>v<90},{k:'FR',l:'FR',bad:v=>v>=22},{k:'SpO2',l:'SpO2',bad:v=>v<90},{k:'Glasgow',l:'GCS',bad:v=>v<13}];
            return(<div>
              <div style={{background:scolor+'15',border:`1px solid ${scolor}40`,borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}><div style={{width:'8px',height:'8px',borderRadius:'50%',background:scolor}}/><span style={{fontWeight:700,fontSize:'12px',color:scolor}}>{slabel}</span></div>
                <div style={{display:'flex',gap:'14px',alignItems:'center'}}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'9px',color:'#64748b'}}>qSOFA</div><div style={{fontSize:'16px',fontWeight:700,color:qpts>=2?'#ef4444':'#22c55e'}}>{qpts}/3</div></div>
                  {ic&&<div style={{textAlign:'center'}}><div style={{fontSize:'9px',color:'#64748b'}}>IND.CHOQUE</div><div style={{fontSize:'16px',fontWeight:700,color:icn>=1?'#ef4444':'#22c55e'}}>{ic}</div></div>}
                  <div style={{fontSize:'10px',color:'#475569'}}>{dfmt}</div>
                </div>
              </div>
              <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'10px',padding:'12px',marginBottom:'12px'}}>
                <div style={{fontSize:'9px',color:'#64748b',letterSpacing:'0.1em',marginBottom:'10px'}}>SINAIS VITAIS</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px'}}>
                  {VT.map(v=>{const val=sv[v.k];if(!val)return null;const bad=v.bad(parseFloat(val));const col=bad?'#ef4444':'#94a3b8';return(<div key={v.k} style={{background:'#020617',border:`1px solid ${bad?'#ef444430':'#1e293b'}`,borderRadius:'7px',padding:'8px',textAlign:'center'}}><div style={{fontSize:'8px',color:'#475569',marginBottom:'2px'}}>{v.l}</div><div style={{fontSize:String(val).length>6?'10px':'15px',fontWeight:700,color:col}}>{val}</div></div>);})}
                </div>
              </div>
              <VitalChart sv={sv}/>
              {flags.length>0&&<div style={{background:'#0f172a',border:'1px solid #ef444430',borderLeft:'3px solid #ef4444',borderRadius:'10px',padding:'12px',marginBottom:'12px'}}>
                <div style={{fontSize:'9px',color:'#ef4444',fontWeight:700,letterSpacing:'0.1em',marginBottom:'8px'}}>RED FLAGS — {(lat.red_flags||[]).length} ATIVOS</div>
                {flags.map((f,i)=><div key={i} style={{display:'flex',gap:'7px',padding:'4px 0',borderBottom:i<flags.length-1?'1px solid #1e293b20':'none'}}><span style={{color:'#ef4444',flexShrink:0}}>!</span><span style={{color:'#fca5a5',fontSize:'11px',lineHeight:'1.5'}}>{f}</span></div>)}
                {(lat.red_flags||[]).length>4&&<div style={{fontSize:'10px',color:'#64748b',marginTop:'5px'}}>+{(lat.red_flags||[]).length-4} outros</div>}
              </div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {hip&&<div style={{background:'#0f172a',border:'1px solid #818cf830',borderLeft:'3px solid #818cf8',borderRadius:'10px',padding:'12px'}}><div style={{fontSize:'9px',color:'#818cf8',fontWeight:700,letterSpacing:'0.1em',marginBottom:'6px'}}>HIPOTESE PRINCIPAL</div><div style={{fontSize:'12px',color:'#f1f5f9',fontWeight:600,marginBottom:'4px'}}>{hip.nome}</div><span style={{fontSize:'9px',background:'#ef444420',color:'#ef4444',borderRadius:'4px',padding:'1px 7px',fontWeight:700}}>{hip.prob}</span></div>}
                {passo&&<div style={{background:'#0f172a',border:'1px solid #34d39930',borderLeft:'3px solid #34d399',borderRadius:'10px',padding:'12px'}}><div style={{fontSize:'9px',color:'#34d399',fontWeight:700,letterSpacing:'0.1em',marginBottom:'6px'}}>PROXIMO PASSO</div><div style={{fontSize:'11px',color:'#86efac',lineHeight:'1.5'}}>{passo}</div></div>}
              </div>
            </div>);
          })()}
        </div>}

        {sel&&screen==='evolution'&&<div className="fin" style={{padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
            <button className="sbtn" onClick={()=>setScreen('patient')}>Voltar</button>
            <div style={{fontSize:'13px',fontWeight:600,color:'#f1f5f9'}}>Evolucao — {sel.nome}</div>
          </div>
          {patA.slice().reverse().map((a,i,arr)=>{
            const isLast=i===arr.length-1;
            return(<div key={a.id} style={{display:'flex',gap:'12px',marginBottom:'8px'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                <div style={{width:'12px',height:'12px',borderRadius:'50%',background:isLast?'#22c55e':a.resultado_json?.urgente?'#ef4444':'#38bdf8',marginTop:'10px'}}/>
                {i<arr.length-1&&<div style={{width:'2px',flex:1,background:'#1e293b',marginTop:'3px'}}/>}
              </div>
              <div style={{flex:1,background:'#020617',border:`1px solid ${a.resultado_json?.urgente?'#ef444430':'#1e293b'}`,borderRadius:'8px',padding:'10px 12px',marginBottom:'3px',cursor:'pointer'}} onClick={()=>{setSelA(a);setNote(a.notas||'');setScreen('detail');}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px',flexWrap:'wrap',gap:'5px'}}>
                  <span style={{fontSize:'11px',color:'#64748b'}}>{fmt(a.created_at)}</span>
                  <div style={{display:'flex',gap:'5px'}}>
                    {isLast&&<span style={{fontSize:'9px',background:'#22c55e20',color:'#22c55e',border:'1px solid #22c55e40',borderRadius:'20px',padding:'1px 7px'}}>atual</span>}
                    {a.resultado_json?.urgente&&<span style={{fontSize:'9px',background:'#ef444420',color:'#ef4444',border:'1px solid #ef444440',borderRadius:'20px',padding:'1px 7px'}}>urgente</span>}
                    {a.resultado_json?.sepse?.qsofa?.pontos>0&&<span style={{fontSize:'9px',background:'#818cf820',color:'#818cf8',border:'1px solid #818cf840',borderRadius:'20px',padding:'1px 7px'}}>qSOFA: {a.resultado_json.sepse.qsofa.pontos}</span>}
                  </div>
                </div>
                <div style={{fontSize:'12px',color:'#94a3b8'}}>{(a.resultado_json?.hipoteses||[])[0]?.nome||'Ver analise'}</div>
                {a.notas&&<div style={{marginTop:'5px',padding:'3px 7px',background:'#f59e0b10',border:'1px solid #f59e0b20',borderRadius:'4px',fontSize:'10px',color:'#fcd34d'}}>📝 {a.notas.slice(0,60)}</div>}
              </div>
            </div>);
          })}
        </div>}
      </div>
    </div>
  );
}
