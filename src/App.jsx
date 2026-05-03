import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [status, setStatus] = useState('carregando...')
  const [patients, setPatients] = useState([])

  useEffect(() => {
    async function test() {
      try {
        const { data, error } = await supabase.from('pacientes').select('*').limit(5)
        if (error) {
          setStatus('ERRO SUPABASE: ' + error.message)
        } else {
          setStatus('Supabase OK! ' + (data?.length || 0) + ' pacientes')
          setPatients(data || [])
        }
      } catch(e) {
        setStatus('ERRO: ' + e.message)
      }
    }
    test()
  }, [])

  return (
    <div style={{padding:'30px', background:'#020617', minHeight:'100vh', color:'#cbd5e1', fontFamily:'monospace'}}>
      <div style={{fontSize:'24px', color:'#1D9E75', letterSpacing:'5px', marginBottom:'20px'}}>MAIS</div>
      <div style={{padding:'14px', background:'#0f172a', borderRadius:'8px', marginBottom:'16px'}}>
        <div style={{fontSize:'11px', color:'#64748b', marginBottom:'6px'}}>STATUS</div>
        <div style={{color:'#38bdf8'}}>{status}</div>
      </div>
      {patients.map(p => (
        <div key={p.id} style={{padding:'10px', background:'#0f172a', borderRadius:'6px', marginBottom:'8px'}}>
          {p.nome}
        </div>
      ))}
    </div>
  )
}
