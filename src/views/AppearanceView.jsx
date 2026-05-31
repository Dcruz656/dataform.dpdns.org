import { Check, Upload, Trash2, Image } from 'lucide-react';

const PALETTE = ['#1f108e', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0f172a'];
const FONTS = ['Inter', 'Georgia', 'Courier New', 'Arial'];

export default function AppearanceView({ theme, setTheme }) {

  const handleLogoUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('El archivo excede el tamaño máximo de 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setTheme(t => ({ ...t, logo: ev.target.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Motor de Branding</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Personaliza la apariencia de tus encuestas públicas.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 ambient-shadow p-6 md:p-8 space-y-8">

        {/* Logo */}
        <div>
          <h3 className="font-semibold text-on-surface mb-1">Logotipo</h3>
          <p className="text-xs text-on-surface-variant mb-4">Se mostrará en la cabecera de la encuesta al completarla.</p>
          {theme.logo ? (
            <div className="flex items-start gap-5">
              <div className="w-36 h-20 border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-low flex items-center justify-center flex-shrink-0">
                <img src={theme.logo} alt="Logotipo" className="max-w-full max-h-full object-contain p-2" />
              </div>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-sm text-primary hover:text-surface-tint font-semibold cursor-pointer transition-colors">
                  <Upload size={14} /> Cambiar imagen
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
                </label>
                <button onClick={() => setTheme(t => ({ ...t, logo: null }))} className="flex items-center gap-2 text-sm text-error hover:opacity-80 font-semibold transition-colors">
                  <Trash2 size={14} /> Eliminar logo
                </button>
                <p className="text-xs text-on-surface-variant pt-1">PNG, JPG, SVG, WEBP · Máx. 2 MB</p>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-outline-variant/40 rounded-xl hover:border-primary/40 hover:bg-primary-fixed/10 transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-surface-container group-hover:bg-primary-fixed rounded-full flex items-center justify-center transition-colors">
                <Image size={26} className="text-outline group-hover:text-on-primary-fixed-variant transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-on-surface-variant group-hover:text-primary transition-colors">Haz clic o arrastra el logo aquí</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">PNG, JPG, SVG, WEBP · Máx. 2 MB</p>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
            </label>
          )}
        </div>

        <div className="border-t border-outline-variant/20" />

        {/* Color */}
        <div>
          <h3 className="font-semibold text-on-surface mb-4">Color Principal</h3>
          <div className="flex gap-3 flex-wrap">
            {PALETTE.map(color => (
              <button
                key={color}
                onClick={() => setTheme(t => ({ ...t, primary: color }))}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${theme.primary === color ? 'ring-4 ring-offset-2 ring-outline scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              >
                {theme.primary === color && <Check size={16} color="white" />}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <label className="text-sm text-on-surface-variant">Personalizado:</label>
              <input type="color" value={theme.primary} onChange={e => setTheme(t => ({ ...t, primary: e.target.value }))} className="w-11 h-11 rounded-full cursor-pointer border border-outline-variant/30" />
            </div>
          </div>
        </div>

        {/* Font */}
        <div>
          <h3 className="font-semibold text-on-surface mb-4">Tipografía</h3>
          <div className="flex gap-2 flex-wrap">
            {FONTS.map(font => (
              <button
                key={font}
                onClick={() => setTheme(t => ({ ...t, font }))}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${theme.font === font ? 'border-primary bg-primary-fixed text-on-primary-fixed-variant' : 'border-outline-variant/30 text-on-surface-variant hover:border-outline'}`}
                style={{ fontFamily: font }}
              >
                {font}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/20">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-4">Previsualización</p>
          <div style={{ fontFamily: theme.font }} className="space-y-4">
            {theme.logo && <img src={theme.logo} alt="Logotipo" className="max-h-14 max-w-[180px] object-contain mb-2" />}
            <h2 className="text-xl font-bold text-on-surface">Título de Encuesta de Ejemplo</h2>
            <p className="text-on-surface-variant text-sm">Esta es una descripción de la encuesta con el branding configurado.</p>
            <button className="px-6 py-2.5 rounded-xl text-white font-semibold shadow-sm transition-opacity hover:opacity-90" style={{ backgroundColor: theme.primary }}>
              Continuar →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
