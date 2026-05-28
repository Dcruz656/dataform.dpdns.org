import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download, X, Link, ExternalLink, Loader } from 'lucide-react';
import { surveysApi } from '../../lib/db';

export default function PublishModal({ surveyConfig, surveyId, onClose, onEnsureSaved }) {
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(true);
  const [activated, setActivated] = useState(false);
  const [resolvedId, setResolvedId] = useState(surveyId ?? null);

  const surveyUrl = resolvedId
    ? `https://dataform.dpdns.org/s/${resolvedId}`
    : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setActivating(true);
      let id = surveyId;
      // If no surveyId yet, create the survey now
      if (!id && onEnsureSaved) {
        id = await onEnsureSaved();
      }
      if (cancelled || !id) { setActivating(false); return; }
      setResolvedId(id);
      try {
        await surveysApi.update(id, { is_active: true });
        if (!cancelled) setActivated(true);
      } catch (err) {
        console.error('Error activating survey:', err);
      }
      if (!cancelled) setActivating(false);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyUrl = async () => {
    if (!surveyUrl) return;
    await navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const canvas = document.getElementById('survey-qr-canvas');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${surveyConfig.title.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">

        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              {activating ? <Loader className="text-green-600 animate-spin" size={20} /> : <Check className="text-green-600" size={20} />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                {activating ? 'Publicando...' : '¡Encuesta Publicada!'}
              </h2>
              <p className="text-slate-500 text-sm truncate max-w-[220px]">{surveyConfig.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!surveyId ? (
            <div className="py-6 text-center text-slate-500 text-sm">
              Guarda la encuesta antes de publicarla.
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Código QR</p>
                <div className="flex justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <QRCodeCanvas
                    id="survey-qr-canvas"
                    value={surveyUrl}
                    size={180}
                    bgColor="#f8fafc"
                    fgColor="#0f172a"
                    level="M"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enlace directo</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 min-w-0">
                    <Link size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate font-mono">{surveyUrl}</span>
                  </div>
                  <button
                    onClick={copyUrl}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
                      copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={downloadQR}
                  className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={15} /> Descargar QR (.png)
                </button>
                <a
                  href={surveyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={15} /> Abrir enlace
                </a>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${activated ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs font-semibold text-slate-600">
              {activated ? 'Encuesta activa' : activating ? 'Activando...' : 'Sin guardar'}
            </span>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
