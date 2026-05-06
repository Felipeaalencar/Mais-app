import { createClient } from '@supabase/supabase-js';

export const SUPA_URL = 'https://xyyhxxaxmyicvgijcqau.supabase.co';
export const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eWh4eGF4bXlpY3ZnaWpjcWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Njk5MjksImV4cCI6MjA5MzI0NTkyOX0.yfmTot10KpQTZtztv2y1Jf0DHLgxwIxs3xMe1OgPE9s';
export const db = createClient(SUPA_URL, SUPA_KEY);

export const PIN = '1404';

export const PROMPT = `Voce e um assistente medico de suporte a decisao clinica hospitalar. Responda SOMENTE com JSON valido, sem markdown. Em sinais_vitais use APENAS numeros simples ex: "FC":"122", "PAS":"82", "FR":"32", "SpO2":"86", "Glasgow":"11" - NUNCA texto descritivo. Estrutura: {"resumo":"","paciente":{"idade":"","sexo":"","setor":"","queixa":"","evolucao":"","comorbidades":[],"sinais_vitais":{"FC":"","PAS":"","FR":"","SpO2":"","Glasgow":"","Temperatura":"","Lactato":"","PAM":"","Diurese":""},"exames":[],"intervencoes":[],"sintomas":[]},"hipoteses":[{"nome":"","prob":"Alta/Media/Baixa","favor":[],"contra":[],"risco":""}],"red_flags":[],"lacunas":[],"passos":[],"scores":[{"nome":"","valor":"","interpretacao":"","faltam":[]}],"sepse":{"qsofa":{"pontos":0,"criterios":[],"risco":""},"indice_choque":{"valor":"","interpretacao":""}},"resumo_familiar":"","metas_uti":[],"tendencias":"","urgente":false,"sbar":{"situacao":"","background":"","avaliacao":"","recomendacao":""},"checklist":[]} Regras: Max 4 hipoteses. Max 6 itens por array. NAO prescreva. NAO feche diagnosticos.`;

export const STATUS_CFG = {
  estavel: { label: 'Estavel', color: '#22c55e', bg: '#022c22', border: '#14532d' },
  atencao: { label: 'Atencao', color: '#f59e0b', bg: '#1c1000', border: '#78350f' },
  grave:   { label: 'Grave',   color: '#ef4444', bg: '#1c0a0a', border: '#7f1d1d' },
  critico: { label: 'Critico', color: '#ef4444', bg: '#450a0a', border: '#991b1b' },
};

export const DESFECHO_CFG = {
  alta:         { label: 'Alta Medica',  color: '#22c55e' },
  transferencia:{ label: 'Transferido',  color: '#f59e0b' },
  obito:        { label: 'Obito',        color: '#94a3b8' },
};

export const RANGES = {
  FC:          { min: 60,  max: 100, label: 'FC',      unit: 'bpm',     color: '#0ea5e9' },
  PAS:         { min: 90,  max: 140, label: 'PAS',     unit: 'mmHg',    color: '#8b5cf6' },
  FR:          { min: 12,  max: 20,  label: 'FR',      unit: 'irpm',    color: '#f59e0b' },
  SpO2:        { min: 94,  max: 100, label: 'SpO2',    unit: '%',       color: '#22c55e' },
  Glasgow:     { min: 15,  max: 15,  label: 'GCS',     unit: '',        color: '#38bdf8' },
  Temperatura: { min: 36,  max: 37.5,label: 'Temp',    unit: 'C',       color: '#fb923c' },
  Lactato:     { min: 0,   max: 2,   label: 'Lactato', unit: 'mmol/L',  color: '#ef4444' },
  PAM:         { min: 65,  max: 100, label: 'PAM',     unit: 'mmHg',    color: '#c084fc' },
  Diurese:     { min: 0.5, max: 2,   label: 'Diur.',   unit: 'ml/h',    color: '#34d399' },
};

export const fmt = (d) => new Date(d).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

export const fixJSON = (raw) => {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
};

export const calcStatus = (analises) => {
  if (!analises?.length) return 'estavel';
  const lat = analises[0].resultado_json || {};
  const q = lat.sepse?.qsofa?.pontos || 0;
  const ic = parseFloat(lat.sepse?.indice_choque?.valor || '0') || 0;
  if (q >= 3 || ic >= 1.5) return 'critico';
  if (q >= 2 || ic >= 1) return 'grave';
  if (q >= 1) return 'atencao';
  return 'estavel';
};
