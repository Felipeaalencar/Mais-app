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

  try {
    const body = req.body || {};
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
        system: system || 'Voce e um assistente medico de apoio a decisao.',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      };
    } else {
      // ====== MODO ANALISE (legado) ======
      const { caseText, prompt } = body;
      if (!caseText) {
        return res.status(400).json({ error: 'caseText obrigatorio' });
      }
      anthropicPayload = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: prompt || '',
        messages: [{ role: 'user', content: caseText }]
      };
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
      return res.status(r.status).json({ error: 'Anthropic API: ' + text.slice(0, 300) });
    }

    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro desconhecido' });
  }
}
