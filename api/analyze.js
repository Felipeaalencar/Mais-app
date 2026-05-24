// Vercel Serverless Function - /api/analyze.js
// Compatível com 2 modos:
//   1) ANALISE (legado): body = { caseText, prompt }
//   2) CONSULT: body = { mode: 'consult', messages: [...], system: '...' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY nao configurada na Vercel.' });
  }

  // Parser de body blindado: aceita objeto ou string JSON
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Body invalido (nao parseou JSON): ' + e.message });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Body ausente ou nao-objeto. typeof=' + (typeof body) });
  }

  // Log de debug (aparece nos logs da Vercel)
  console.log('[analyze.js] mode=', body.mode, 'keys=', Object.keys(body));

  try {
    let anthropicPayload;

    if (body.mode === 'consult') {
      // ====== MODO CONSULTOR CLINICO ======
      const { messages, system } = body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages vazio ou invalido' });
      }
      anthropicPayload = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: system || 'Voce e um assistente medico de apoio a decisao clinica.',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      };
      console.log('[analyze.js] CONSULT: msgs=', messages.length, 'sys len=', (system || '').length);
    } else {
      // ====== MODO ANALISE (legado) ======
      const { caseText, prompt } = body;
      if (!caseText) {
        return res.status(400).json({ error: 'caseText obrigatorio (modo analise). body keys: ' + Object.keys(body).join(',') });
      }
      anthropicPayload = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: prompt || '',
        messages: [{ role: 'user', content: caseText }]
      };
      console.log('[analyze.js] ANALISE: caseText len=', caseText.length);
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicPayload)
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('[analyze.js] Anthropic erro:', r.status, text.slice(0, 200));
      return res.status(r.status).json({ error: 'Anthropic API: ' + text.slice(0, 300) });
    }

    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[analyze.js] Erro fatal:', err.message);
    return res.status(500).json({ error: err.message || 'Erro desconhecido' });
  }
}
