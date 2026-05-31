import { PenTool, BarChart3, Archive, Pencil, TrendingUp, Users, CheckCircle } from 'lucide-react';

export default function DashboardView({ surveys = [], loading = false, onViewAnalytics, onNewSurvey, onArchive, onEdit }) {
  const active = surveys.filter(s => s.status === 'Activa').length;
  const drafts  = surveys.filter(s => s.status === 'Borrador').length;
  const total   = surveys.reduce((sum, s) => sum + s.responses, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Panel de Control</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Bienvenido de nuevo — aquí está el resumen de tu actividad.</p>
        </div>
        <button
          onClick={onNewSurvey}
          className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:bg-surface-tint transition-all shadow-sm flex items-center gap-2 active:scale-95"
        >
          <PenTool size={15} /> Nueva Encuesta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users size={20} />}       label="Respuestas Totales" value={total.toLocaleString('es-MX')} sub={`${active} encuestas activas`} color="bg-primary-fixed text-on-primary-fixed-variant" />
        <StatCard icon={<TrendingUp size={20} />}  label="Tasa de Finalización" value="88.5%" sub="↑ +2.1% este mes" color="bg-tertiary-fixed text-on-tertiary-fixed" />
        <StatCard icon={<CheckCircle size={20} />} label="Encuestas Activas"  value={active} sub={`${drafts} en borrador`} color="bg-secondary-fixed text-on-secondary-fixed-variant" />
      </div>

      {/* Recent surveys */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest ambient-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container-highest flex items-center justify-between">
          <h2 className="font-bold text-on-surface">Encuestas Recientes</h2>
          <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full font-medium">{surveys.length} encuestas</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Cargando encuestas...
          </div>
        ) : surveys.length === 0 ? (
          <div className="py-14 text-center text-on-surface-variant text-sm">
            <PenTool size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No hay encuestas todavía</p>
            <button onClick={onNewSurvey} className="text-primary hover:underline font-semibold">Crear mi primera encuesta</button>
          </div>
        ) : (
          <ul className="divide-y divide-surface-container-highest">
            {surveys.map(s => (
              <li key={s.id} className="flex items-center px-6 py-4 hover:bg-surface-container-low transition-colors group">
                <button onClick={onViewAnalytics} className="flex-1 flex items-center justify-between gap-3 text-left min-w-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface group-hover:text-primary transition-colors truncate text-sm">{s.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{s.responses} {s.responses === 1 ? 'respuesta' : 'respuestas'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.statusColor}`}>{s.status}</span>
                    <BarChart3 size={15} className="text-outline group-hover:text-primary transition-colors" />
                  </div>
                </button>
                <button onClick={e => { e.stopPropagation(); onEdit?.(s.id); }} title="Editar" className="ml-2 p-1.5 text-outline hover:text-primary hover:bg-primary-fixed/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <Pencil size={14} />
                </button>
                <button onClick={e => { e.stopPropagation(); onArchive(s.id); }} title="Archivar" className="ml-1 p-1.5 text-outline hover:text-secondary hover:bg-secondary-fixed/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <Archive size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest ambient-shadow p-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-on-surface">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1.5">{sub}</p>
    </div>
  );
}
