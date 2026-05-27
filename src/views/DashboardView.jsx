import { PenTool, BarChart3, Archive, Pencil } from 'lucide-react';

export default function DashboardView({ surveys = [], loading = false, onViewAnalytics, onNewSurvey, onArchive, onEdit }) {
  const active = surveys.filter(s => s.status === 'Activa').length;
  const drafts  = surveys.filter(s => s.status === 'Borrador').length;
  const total   = surveys.reduce((sum, s) => sum + s.responses, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
        <button
          onClick={onNewSurvey}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <PenTool size={16} /> Nueva Encuesta
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard label="Respuestas Totales" value={total.toLocaleString('es-MX')} trend="↑ +12% este mes" trendColor="text-emerald-600" />
        <StatCard label="Tasa de Finalización" value="88.5%" trend="↑ +2.1% este mes" trendColor="text-emerald-600" />
        <StatCard label="Encuestas Activas" value={active} trend={`${drafts} en borrador`} trendColor="text-slate-400" />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Encuestas Recientes</h2>
          <span className="text-xs text-slate-400">{surveys.length} encuestas</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Cargando encuestas...</div>
        ) : surveys.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No hay encuestas. <button onClick={onNewSurvey} className="text-blue-600 hover:underline font-medium">Crear una nueva</button>
          </div>
        ) : (
          surveys.map(s => (
            <div
              key={s.id}
              className="flex items-center px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-blue-50 transition-colors group"
            >
              <button onClick={onViewAnalytics} className="flex-1 flex items-center justify-between gap-3 text-left min-w-0">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 group-hover:text-blue-700 transition-colors truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.responses} respuestas</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.statusColor}`}>{s.status}</span>
                  <BarChart3 size={15} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
              <button
                onClick={e => { e.stopPropagation(); onEdit?.(s.id); }}
                title="Editar encuesta"
                className="ml-2 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onArchive(s.id); }}
                title="Archivar encuesta"
                className="ml-2 p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Archive size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, trendColor }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-sm font-medium text-slate-500">{label}</h3>
      <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
      <span className={`text-xs font-medium flex items-center mt-2 ${trendColor}`}>{trend}</span>
    </div>
  );
}
