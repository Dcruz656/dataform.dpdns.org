export const LS_PROVIDER = 'df_ai_provider';

export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    tagline: 'Claude Haiku',
    placeholder: 'sk-ant-api03-...',
    storageKey: 'df_anthropic_key',
    docsUrl: 'console.anthropic.com/settings/keys',
    steps: [
      'Ve a console.anthropic.com/settings/keys',
      'Crea una nueva API key.',
      'Modelo usado: Claude Haiku 4.5 (muy económico).',
      'Costo estimado: < $0.001 USD por análisis.',
    ],
  },
  openai: {
    name: 'OpenAI',
    tagline: 'GPT-4o mini',
    placeholder: 'sk-...',
    storageKey: 'df_openai_key',
    docsUrl: 'platform.openai.com/api-keys',
    steps: [
      'Ve a platform.openai.com/api-keys.',
      'Crea una nueva secret key.',
      'Modelo usado: GPT-4o mini (económico).',
      'Costo estimado: < $0.001 USD por análisis.',
    ],
  },
  google: {
    name: 'Google Gemini',
    tagline: 'Gemini Flash',
    placeholder: 'AIzaSy...',
    storageKey: 'df_google_key',
    docsUrl: 'aistudio.google.com/app/apikey',
    steps: [
      'Ve a aistudio.google.com/app/apikey.',
      'Genera una nueva API key.',
      'Modelo usado: Gemini 2.0 Flash Lite.',
      'Tiene nivel gratuito generoso.',
    ],
  },
  groq: {
    name: 'Groq',
    tagline: 'Llama 3.1 · Gratis',
    placeholder: 'gsk_...',
    storageKey: 'df_groq_key',
    docsUrl: 'console.groq.com/keys',
    steps: [
      'Ve a console.groq.com/keys.',
      'Crea una nueva API key.',
      'Modelo usado: Llama 3.1 8B Instant.',
      'Nivel gratuito muy generoso.',
    ],
  },
};

export function getActiveProvider() {
  const p = localStorage.getItem(LS_PROVIDER);
  return p && PROVIDERS[p] ? p : 'anthropic';
}

export function getActiveKey() {
  const p = getActiveProvider();
  return localStorage.getItem(PROVIDERS[p].storageKey) || '';
}

async function _callAnthropic(key, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function _callOpenAI(key, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function _callGoogle(key, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function _callGroq(key, prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

const _callers = { anthropic: _callAnthropic, openai: _callOpenAI, google: _callGoogle, groq: _callGroq };

export async function callAI(prompt) {
  const provider = getActiveProvider();
  const key = getActiveKey();
  if (!key) throw new Error('NO_KEY');
  return _callers[provider](key, prompt);
}

export async function testKey(provider, key) {
  return _callers[provider](key, 'Responde solo con la palabra "ok".');
}
