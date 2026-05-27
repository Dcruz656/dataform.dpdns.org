import { Check, Upload, Trash2, Image } from 'lucide-react';

const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0f172a'];
const FONTS = ['Inter', 'Georgia', 'Courier New', 'Arial'];

export default function AppearanceView({ theme, setTheme }) {

  const handleLogoUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo excede el tamaño máximo de 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setTheme(t => ({ ...t, logo: ev.target.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Motor de Branding</h1>

      <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-slate-200 space-y-8">

        {/* Logo */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Logotipo</h3>
          <p className="text-xs text-slate-400 mb-4">Se mostrará en la cabecera de la encuesta al completarla.</p>

          {theme.logo ? (
            <div className="flex items-start gap-5">
              {/* Preview */}
              <div className="w-36 h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
                <img src={theme.logo} alt="Logotipo" className="max-w-full max-h-full object-contain p-2" />
              </div>
              {/* Actions */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors">
                  <Upload size={14} /> Cambiar imagen
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
                </label>
                <button
                  onClick={() => setTheme(t => ({ ...t, logo: null }))}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  <Trash2 size={14} /> Eliminar logo
                </button>
                <p className="text-xs text-slate-400 pt-1">PNG, JPG, SVG, WEBP · Máx. 2 MB</p>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-slate-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors">
                <Image size={26} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 group-hover:text-blue-700 transition-colors">
                  Haz clic o arrastra el logo aquí
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG, WEBP · Máx. 2 MB</p>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
            </label>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* Color */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">Color Principal</h3>
          <div className="flex gap-3 flex-wrap">
            {PALETTE.map(color => (
              <button
                key={color}
                onClick={() => setTheme(t => ({ ...t, primary: color }))}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${theme.primary === color ? 'ring-4 ring-offset-2 ring-slate-300 scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              >
                {theme.primary === color && <Check size={16} color="white" />}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <label className="text-sm text-slate-500">Personalizado:</label>
              <input
                type="color"
                value={theme.primary}
                onChange={e => setTheme(t => ({ ...t, primary: e.target.value }))}
                className="w-11 h-11 rounded-full cursor-pointer border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Font */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">Tipografía</h3>
          <div className="flex gap-2 flex-wrap">
            {FONTS.map(font => (
              <button
                key={font}
                onClick={() => setTheme(t => ({ ...t, font }))}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${theme.font === font ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
                style={{ fontFamily: font }}
              >
                {font}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-4">Previsualización</p>
          <div style={{ fontFamily: theme.font }} className="space-y-4">
            {theme.logo && (
              <img src={theme.logo} alt="Logotipo" className="max-h-14 max-w-[180px] object-contain mb-2" />
            )}
            <h2 className="text-xl font-bold text-slate-900">Título de Encuesta de Ejemplo</h2>
            <p className="text-slate-500 text-sm">Esta es una descripción de la encuesta con el branding configurado.</p>
            <button
              className="px-6 py-2.5 rounded-lg text-white font-medium shadow-md transition-opacity hover:opacity-90"
              style={{ backgroundColor: theme.primary }}
            >
              Continuar →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
