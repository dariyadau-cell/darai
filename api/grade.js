// Vercel serverless function: proxies IELTS grading requests to DeepSeek.
// Keeps DEEPSEEK_API_KEY server-side only, and requires a valid Supabase
// session so the endpoint can't be called anonymously to burn API credits.
// Response is wrapped to match the Anthropic Messages shape the frontend
// already parses ({content:[{text}]}), so index.html needed no changes.

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
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !deepseekKey) {
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

  const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + deepseekKey,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
    }),
  });

  const json = await dsRes.json();
  if (!dsRes.ok) {
    res.status(dsRes.status).json({ error: (json.error && json.error.message) || 'DeepSeek request failed' });
    return;
  }
  const text = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '';
  res.status(200).json({ content: [{ text }] });
}
