import { ArchiveRestore, InboxIcon } from 'lucide-react';

export default function ArchiveView({ surveys, onUnarchive, onViewAnalytics }) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Archivo</h1>
          <p className="text-sm text-slate-500 mt-1">Encuestas archivadas — no aparecen en el Dashboard.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Encuestas Archivadas</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {surveys.length} {surveys.length === 1 ? 'encuesta' : 'encuestas'}
          </span>
        </div>

        {surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <InboxIcon size={40} className="mb-3 opacity-30" />
            <p className="font-medium">El archivo está vacío</p>
            <p className="text-sm mt-1">Las encuestas archivadas desde el Dashboard aparecerán aquí.</p>
          </div>
        ) : (
          surveys.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group"
            >
              <button
                onClick={() => onViewAnalytics()}
                className="flex-1 text-left"
              >
                <p className="font-medium text-slate-600 group-hover:text-blue-700 transition-colors">{s.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.responses} respuestas</p>
              </button>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.statusColor} opacity-60`}>
                  {s.status}
                </span>
                <button
                  onClick={() => onUnarchive(s.id)}
                  title="Restaurar al Dashboard"
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                >
                  <ArchiveRestore size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
