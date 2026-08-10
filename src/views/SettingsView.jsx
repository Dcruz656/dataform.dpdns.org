import { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, AlertTriangle, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';
import { PROVIDERS, LS_PROVIDER, testKey } from '../lib/ai';

/* ── Provider icons (inline SVG) ─────────────────────────────────── */
function IconAnthropic({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1a1a1a" />
      <text x="12" y="16.5" textAnchor="middle" fontFamily="Georgia,serif" fontSize="13" fontWeight="bold" fill="#e8d5b7">A</text>
    </svg>
  );
}
function IconOpenAI({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#10a37f" />
      <path d="M12 5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" fill="white" />
      <path d="M12 14v4.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconGoogle({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#fff" />
      <text x="12" y="16.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="13" fontWeight="bold">
        <tspan fill="#4285F4">G</tspan>
      </text>
      <rect x="0" y="0" width="24" height="24" rx="6" stroke="#e0e0e0" strokeWidth="1" fill="none" />
    </svg>
  );
}
function IconGroq({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#f55036" />
      <path d="M12 7a5 5 0 1 0 3.54 8.54L14.12 14.1A3 3 0 1 1 12 10v2.5l4-3.5-4-3.5V7Z" fill="white" />
    </svg>
  );
}

const PROVIDER_ICONS = { anthropic: IconAnthropic, openai: IconOpenAI, google: IconGoogle, groq: IconGroq };
const PROVIDER_ORDER = ['anthropic', 'openai', 'google', 'groq'];

export default function SettingsView() {
  const [provider, setProvider] = useState(() => localStorage.getItem(LS_PROVIDER) || 'anthropic');
  const [keys, setKeys]         = useState({});
  const [show, setShow]         = useState(false);
  const [saved, setSaved]       = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'error'
  const [testError, setTestError]   = useState('');

  useEffect(() => {
    const loaded = {};
    Object.keys(PROVIDERS).forEach(k => { loaded[k] = localStorage.getItem(PROVIDERS[k].storageKey) || ''; });
    setKeys(loaded);
  }, []);

  const cfg         = PROVIDERS[provider];
  const currentKey  = keys[provider] ?? '';
  const isStored    = !!localStorage.getItem(cfg?.storageKey);

  const handleProviderChange = (p) => {
    setProvider(p);
    localStorage.setItem(LS_PROVIDER, p);
    setTestResult(null);
    setShow(false);
  };

  const handleKeyChange = (v) => {
    setKeys(prev => ({ ...prev, [provider]: v }));
    setTestResult(null);
  };

  const handleSave = () => {
    const trimmed = currentKey.trim();
    if (!trimmed) return;
    localStorage.setItem(cfg.storageKey, trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem(cfg.storageKey);
    setKeys(prev => ({ ...prev, [provider]: '' }));
    setTestResult(null);
  };

  const handleTest = async () => {
    const key = currentKey.trim();
    if (!key) return;
    setTesting(true);
    setTestResult(null);
    setTestError('');
    try {
      await testKey(provider, key);
      setTestResult('ok');
    } catch (e) {
      setTestError(e.message || 'Error de conexión');
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Configuración</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Integraciones y ajustes de la cuenta</p>
        </div>
      </div>

      {/* AI provider section */}
      <div className="bg-surface rounded-2xl border border-surface-container-highest overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container-highest flex items-center gap-3">
          <Key size={16} className="text-on-surface-variant" />
          <h2 className="font-bold text-on-surface">Proveedor de IA</h2>
          <span className="ml-auto text-xs text-on-surface-variant">Para análisis de respuestas abiertas</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PROVIDER_ORDER.map(p => {
              const Icon   = PROVIDER_ICONS[p];
              const meta   = PROVIDERS[p];
              const hasKey = !!localStorage.getItem(meta.storageKey);
              const active = provider === p;
              return (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-surface-container-highest bg-surface-container-low hover:border-primary/40 hover:bg-surface-container'
                  }`}
                >
                  <Icon size={32} />
                  <div>
                    <p className="text-xs font-bold text-on-surface leading-tight">{meta.name}</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5 leading-tight">{meta.tagline}</p>
                  </div>
                  {hasKey && (
                    <span className="absolute top-2 right-2">
                      <CheckCircle size={12} className="text-emerald-500" />
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Key input for selected provider */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex-shrink-0">
                {(() => { const Icon = PROVIDER_ICONS[provider]; return <Icon size={20} />; })()}
              </div>
              <p className="text-sm font-semibold text-on-surface">{cfg.name} API Key</p>
              {isStored && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle size={10} /> Configurada
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={currentKey}
                onChange={e => handleKeyChange(e.target.value)}
                placeholder={cfg.placeholder}
                className="w-full bg-surface-container-low border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm text-on-surface outline-none transition-all pr-11 font-mono"
              />
              <button
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {testResult === 'ok' && (
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <CheckCircle size={14} /> Key válida — análisis IA listo
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-start gap-2 text-error text-sm">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{testError || 'Key inválida. Verifica que sea correcta.'}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!currentKey.trim()}
                className="flex-1 bg-primary text-on-primary font-semibold text-sm py-2.5 rounded-xl hover:bg-surface-tint transition-colors disabled:opacity-40 active:scale-95"
              >
                {saved ? '¡Guardada!' : 'Guardar key'}
              </button>
              <button
                onClick={handleTest}
                disabled={!currentKey.trim() || testing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-container-highest bg-surface text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-40"
              >
                {testing ? <><RefreshCw size={13} className="animate-spin" /> Probando...</> : 'Probar'}
              </button>
              {isStored && (
                <button
                  onClick={handleClear}
                  className="px-3 py-2.5 rounded-xl border border-error/20 text-error hover:bg-error-container transition-colors"
                  title="Eliminar key"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* How to get a key */}
          <div className="bg-surface-container-low rounded-xl p-4 text-xs text-on-surface-variant space-y-1.5">
            <p className="font-semibold text-on-surface">¿Cómo obtener la key de {cfg.name}?</p>
            {cfg.steps.map((s, i) => <p key={i}>{i + 1}. {s}</p>)}
          </div>

          {/* Privacy note */}
          <p className="text-xs text-on-surface-variant">
            Las API keys se guardan <strong className="text-on-surface">únicamente en tu navegador</strong> (localStorage) y nunca
            se transmiten a nuestros servidores.
          </p>
        </div>
      </div>
    </div>
  );
}
