// Vercel Serverless Function - /api/analyze.js
// Compatível com 2 modos:
//   1) ANALISE (legado): body = { caseText, prompt, attachments? }
//   2) CONSULT: body = { mode: 'consult', messages: [...], system: '...' }
//
// attachments: array de { type: 'image'|'pdf', media_type: string, base64: string }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY nao configurada na Vercel.' });
  }

  // Parser de body blindado
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

  console.log('[analyze.js] mode=', body.mode, 'keys=', Object.keys(body));

  const MODEL = 'claude-sonnet-4-5-20250929';

  try {
    let anthropicPayload;

    if (body.mode === 'consult') {
      // ====== MODO CONSULTOR CLINICO ======
      const { messages, system } = body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages vazio ou invalido' });
      }
      anthropicPayload = {
        model: MODEL,
        max_tokens: 1500,
        system: system || 'Voce e um assistente medico de apoio a decisao clinica.',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      };
      console.log('[analyze.js] CONSULT: msgs=', messages.length, 'sys len=', (system || '').length);
    } else {
      // ====== MODO ANALISE (legado + anexos) ======
      const { caseText, prompt, attachments } = body;
      if (!caseText && (!attachments || attachments.length === 0)) {
        return res.status(400).json({ error: 'caseText ou attachments obrigatorio. body keys: ' + Object.keys(body).join(',') });
      }

      // Monta conteudo da mensagem do usuario
      // Anexos primeiro, texto depois (recomendado pelo Anthropic para vision)
      const userContent = [];
      if (Array.isArray(attachments) && attachments.length > 0) {
        // Valida tamanho total (proteção contra request gigante)
        let totalSize = 0;
        for (const a of attachments) {
          if (a.base64) totalSize += a.base64.length;
        }
        if (totalSize > 20 * 1024 * 1024) { // 20MB de base64 ~ 15MB de arquivos
          return res.status(400).json({ error: 'Anexos excedem tamanho total maximo (20MB base64). Reduza a quantidade ou tamanho.' });
        }

        for (const a of attachments) {
          if (!a.base64 || !a.media_type) continue;
          if (a.type === 'pdf' || a.media_type === 'application/pdf') {
            userContent.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: a.base64
              }
            });
          } else {
            // imagem
            userContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: a.media_type || 'image/jpeg',
                data: a.base64
              }
            });
          }
        }
        console.log('[analyze.js] ANALISE: anexos=', attachments.length, 'total b64 size=', totalSize);
      }

      // Texto do caso clinico (sempre por ultimo)
      if (caseText && caseText.trim()) {
        userContent.push({ type: 'text', text: caseText });
      } else {
        userContent.push({ type: 'text', text: 'Analise os exames anexados e me forneça a estrutura JSON solicitada.' });
      }

      anthropicPayload = {
        model: MODEL,
        max_tokens: 4096,
        system: prompt || '',
        messages: [{ role: 'user', content: userContent }]
      };
      console.log('[analyze.js] ANALISE: caseText len=', (caseText || '').length, 'content blocks=', userContent.length);
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
