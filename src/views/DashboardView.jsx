import { BarChart3, Archive, Pencil, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ICON_COLORS = [
  'bg-primary-fixed text-on-primary-fixed-variant',
  'bg-secondary-fixed text-on-secondary-fixed-variant',
  'bg-surface-container-highest text-on-surface',
  'bg-tertiary-fixed text-on-tertiary-fixed',
];

const ICON_SYMBOLS = ['storefront', 'edit_document', 'check_circle', 'forum', 'poll', 'description'];

export default function DashboardView({ surveys = [], loading = false, onViewAnalytics, onNewSurvey, onArchive, onEdit }) {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Usuario';

  const active  = surveys.filter(s => s.status === 'Activa').length;
  const total   = surveys.reduce((sum, s) => sum + (s.responses ?? 0), 0);
  const completion = surveys.length ? Math.round((surveys.filter(s => s.status === 'Activa').length / surveys.length) * 100) : 0;
  const maxResponses = Math.max(...surveys.map(s => s.responses ?? 0), 1);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-on-surface tracking-tight">Hola, {firstName}</h2>
          <p className="text-lg text-on-surface-variant mt-2">Aquí tienes el resumen de tu investigación hoy.</p>
        </div>
        <p className="text-xs text-on-surface-variant uppercase tracking-wider hidden md:block">
          Última actualización: {timeStr}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon="monitoring"
          iconColor="bg-secondary-container text-on-secondary-container"
          label="Encuestas Activas"
          value={active}
          badge={{ label: `${surveys.length} total`, trend: false }}
        />
        <KpiCard
          icon="forum"
          iconColor="bg-primary-fixed text-on-primary-fixed-variant"
          label="Respuestas Totales"
          value={total.toLocaleString('es-MX')}
          badge={{ label: '+8.5%', trend: true }}
        />
        <KpiCard
          icon="speed"
          iconColor="bg-surface-container-highest text-on-surface"
          label="Tasa de Finalización"
          value={`${completion}%`}
          badge={{ label: 'Estable', trend: false }}
        />
      </div>

      {/* Surveys table */}
      <div className="bg-surface-container-lowest rounded-xl ambient-shadow border border-surface-variant overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-variant flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-on-surface">Encuestas Recientes</h3>
          <button onClick={onViewAnalytics} className="text-sm font-semibold text-primary hover:text-surface-tint transition-colors flex items-center gap-1">
            Ver todas <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-14 text-center text-on-surface-variant text-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Cargando encuestas...
          </div>
        ) : surveys.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant text-sm space-y-3">
            <span className="material-symbols-outlined text-5xl opacity-20">poll</span>
            <p className="font-semibold">No hay encuestas todavía</p>
            <button onClick={onNewSurvey} className="text-primary font-semibold hover:underline text-sm">Crear mi primera encuesta</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs font-semibold border-b border-surface-variant uppercase tracking-wide">
                  <th className="px-5 py-3">Encuesta</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Respuestas</th>
                  <th className="px-5 py-3 hidden md:table-cell">Modificada</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface divide-y divide-surface-variant">
                {surveys.slice(0, 8).map((s, i) => {
                  const pct = Math.round(((s.responses ?? 0) / maxResponses) * 100);
                  const iconColor = ICON_COLORS[i % ICON_COLORS.length];
                  const iconSymbol = ICON_SYMBOLS[i % ICON_SYMBOLS.length];
                  return (
                    <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{iconSymbol}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface truncate max-w-[180px]">{s.name}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{s.responses ?? 0} respuestas</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={s.status} />
                      </td>

                      {/* Responses progress */}
                      <td className="px-5 py-4">
                        {(s.responses ?? 0) > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-surface-container-highest rounded-full overflow-hidden flex-shrink-0">
                              <div
                                className={`h-full rounded-full ${s.status === 'Activa' ? 'bg-primary' : 'bg-secondary'}`}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                            <span className="text-xs text-on-surface-variant font-medium">{(s.responses ?? 0).toLocaleString('es-MX')}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-xs text-on-surface-variant hidden md:table-cell whitespace-nowrap">
                        {fmtRelative(s.updatedAt || s.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit?.(s.id)} title="Editar" className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => onArchive?.(s.id)} title="Archivar" className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed/30 rounded-lg transition-colors">
                            <Archive size={15} />
                          </button>
                          <button onClick={() => onViewAnalytics?.(s.id)} title="Analítica" className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors">
                            <BarChart3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */
function KpiCard({ icon, iconColor, label, value, badge }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 ambient-shadow interactive-shadow border border-surface-variant flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${iconColor}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        {badge && (
          badge.trend ? (
            <span className="text-xs font-semibold text-on-tertiary-container bg-tertiary-fixed-dim px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp size={13} /> {badge.label}
            </span>
          ) : (
            <span className="text-xs font-semibold text-on-surface-variant bg-surface-variant px-2 py-1 rounded-full">
              {badge.label}
            </span>
          )
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-on-surface-variant mb-1">{label}</p>
        <p className="text-4xl font-bold text-on-surface tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'Activa')
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container">Activa</span>;
  if (status === 'Archivada')
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-surface-variant text-on-surface-variant border border-outline-variant">Archivada</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-surface-container-highest text-on-surface-variant">Borrador</span>;
}

function fmtRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Ayer';
  if (days < 7)  return `Hace ${days} días`;
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(new Date(iso));
}
