export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({error: 'API key not configured'});

  try {
    const { caseText, prompt } = req.body;
    if (!caseText) return res.status(400).json({error: 'caseText is required'});

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': key
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: prompt,
        messages: [{ role: 'user', content: 'Analise e retorne apenas JSON:\n\n' + caseText }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({error: data.error?.message || 'Anthropic API error'});
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({error: e.message});
  }
}
