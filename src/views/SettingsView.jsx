import { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, AlertTriangle, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';

export const LS_ANTHROPIC_KEY = 'df_anthropic_key';

export default function SettingsView() {
  const [apiKey, setApiKey]     = useState('');
  const [show, setShow]         = useState(false);
  const [saved, setSaved]       = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'error'
  const [testError, setTestError]   = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(LS_ANTHROPIC_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const isStored = !!localStorage.getItem(LS_ANTHROPIC_KEY);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_ANTHROPIC_KEY, trimmed);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem(LS_ANTHROPIC_KEY);
    setApiKey('');
    setTestResult(null);
  };

  const handleTest = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setTesting(true);
    setTestResult(null);
    setTestError('');
    try {
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
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      if (res.ok) {
        setTestResult('ok');
      } else {
        const err = await res.json().catch(() => ({}));
        setTestError(err?.error?.message || `Error ${res.status}`);
        setTestResult('error');
      }
    } catch (e) {
      setTestError(e.message || 'Error de red');
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

      {/* API Key section */}
      <div className="bg-surface rounded-2xl border border-surface-container-highest overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container-highest flex items-center gap-3">
          <Key size={16} className="text-on-surface-variant" />
          <h2 className="font-bold text-on-surface">Anthropic API Key</h2>
          {isStored && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle size={10} /> Configurada
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Ingresa tu API key de Anthropic para habilitar el análisis de respuestas abiertas con IA en la
            sección de <strong className="text-on-surface">Analítica</strong>. La key se guarda únicamente
            en tu navegador y nunca se envía a nuestros servidores.
          </p>

          {/* Input */}
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder="sk-ant-api03-..."
              className="w-full bg-surface-container-low border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm text-on-surface outline-none transition-all pr-11 font-mono"
            />
            <button
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Test result */}
          {testResult === 'ok' && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle size={14} /> Key válida — análisis IA listo para usar
            </div>
          )}
          {testResult === 'error' && (
            <div className="flex items-start gap-2 text-error text-sm">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{testError || 'Key inválida. Verifica que sea correcta.'}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 bg-primary text-on-primary font-semibold text-sm py-2.5 rounded-xl hover:bg-surface-tint transition-colors disabled:opacity-40 active:scale-95"
            >
              {saved ? '¡Guardada!' : 'Guardar key'}
            </button>
            <button
              onClick={handleTest}
              disabled={!apiKey.trim() || testing}
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

          {/* Help */}
          <div className="bg-surface-container-low rounded-xl p-4 text-xs text-on-surface-variant space-y-1.5">
            <p className="font-semibold text-on-surface">¿Cómo obtener una API key?</p>
            <p>1. Ve a <strong>console.anthropic.com</strong> y crea una cuenta.</p>
            <p>2. En la sección <strong>API Keys</strong>, genera una nueva key.</p>
            <p>3. El análisis usa <strong>Claude Haiku</strong> (el modelo más económico).</p>
            <p className="text-primary/80">Costo aproximado: menos de $0.001 USD por análisis.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
