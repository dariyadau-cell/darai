// Vercel serverless function: proxies IELTS grading requests to Claude.
// Keeps ANTHROPIC_API_KEY server-side only, and requires a valid Supabase
// session so the endpoint can't be called anonymously to burn API credits.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !anthropicKey) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  const userRes = await fetch(supabaseUrl + '/auth/v1/user', {
    headers: { apikey: supabaseAnonKey, Authorization: 'Bearer ' + token },
  });
  if (!userRes.ok) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { system, message } = req.body || {};
  if (!system || !message) {
    res.status(400).json({ error: 'Missing system or message' });
    return;
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: message }],
    }),
  });

  const json = await anthropicRes.json();
  res.status(anthropicRes.status).json(json);
}
