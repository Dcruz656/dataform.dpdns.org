import { ArchiveRestore, InboxIcon } from 'lucide-react';

export default function ArchiveView({ surveys, onUnarchive, onViewAnalytics }) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Archivo</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Encuestas archivadas — no aparecen en el Panel de Control.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 ambient-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
          <h2 className="font-bold text-on-surface">Encuestas Archivadas</h2>
          <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
            {surveys.length} {surveys.length === 1 ? 'encuesta' : 'encuestas'}
          </span>
        </div>

        {surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
            <InboxIcon size={40} className="mb-3 opacity-20" />
            <p className="font-semibold">El archivo está vacío</p>
            <p className="text-sm mt-1 text-on-surface-variant/70">Las encuestas archivadas desde el Panel aparecerán aquí.</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/10">
            {surveys.map(s => (
              <li key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors group">
                <button onClick={() => onViewAnalytics()} className="flex-1 text-left">
                  <p className="font-semibold text-on-surface-variant group-hover:text-primary transition-colors text-sm">{s.name}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">{s.responses} respuestas</p>
                </button>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full opacity-60 ${s.statusColor}`}>{s.status}</span>
                  <button
                    onClick={() => onUnarchive(s.id)}
                    title="Restaurar al Panel"
                    className="p-1.5 text-outline hover:text-tertiary-container hover:bg-tertiary-fixed/30 rounded-lg transition-colors"
                  >
                    <ArchiveRestore size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
