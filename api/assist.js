// Vercel serverless function: AI-подсказки по Writing/Speaking через DeepSeek.
// DEEPSEEK_API_KEY живёт только в переменных окружения Vercel, в браузер не попадает.
// Тот же паттерн авторизации, что и в grade.js: без валидной Supabase-сессии не работает.

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

  const { mode, text } = req.body || {};
  if (!text || (mode !== 'writing' && mode !== 'speaking')) {
    res.status(400).json({ error: 'Missing or invalid mode/text' });
    return;
  }

  const systemPrompts = {
    writing: 'Ты — коуч по IELTS Writing. По черновику ниже дай 3-5 коротких конкретных советов: связность (coherence), словарный запас, грамматика. Не переписывай текст целиком, только буллеты на русском, каждый пункт с новой строки, без markdown-разметки.',
    speaking: 'Ты — коуч по IELTS Speaking. По ответу ниже дай 3-5 коротких конкретных советов: структура ответа, беглость, более высокий уровень лексики. Не переписывай текст целиком, только буллеты на русском, каждый пункт с новой строки, без markdown-разметки.',
  };

  const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + deepseekKey,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemPrompts[mode] },
        { role: 'user', content: String(text).slice(0, 4000) },
      ],
    }),
  });

  const json = await dsRes.json();
  if (!dsRes.ok) {
    res.status(dsRes.status).json({ error: (json.error && json.error.message) || 'DeepSeek request failed' });
    return;
  }
  const tips = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '';
  res.status(200).json({ tips });
}
