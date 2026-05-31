import { useState, useMemo } from 'react';
import {
  PenTool, Search, Archive, Pencil, BarChart3, Trash2,
  FileText, CheckCircle, Clock, Filter, SortDesc, Plus,
  QrCode, X, Copy, Check, Download, ExternalLink, Link,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

const STATUS_OPTIONS = [
  { value: 'all',     label: 'Todos' },
  { value: 'Activa',  label: 'Activa' },
  { value: 'Borrador', label: 'Borrador' },
];

/* ------------------------------------------------------------------ */
/* Main Component                                                       */
/* ------------------------------------------------------------------ */
export default function MySurveysView({
  surveys = [],
  loading = false,
  onNewSurvey,
  onEdit,
  onArchive,
  onDelete,
  onViewAnalytics,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated'); // 'updated' | 'name' | 'responses'
  const [linkSurvey, setLinkSurvey] = useState(null);

  const filtered = useMemo(() => {
    let list = [...surveys];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }

    if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'responses') return (b.responses ?? 0) - (a.responses ?? 0);
      // default: updated_at (surveys come sorted from API already)
      return 0;
    });

    return list;
  }, [surveys, search, statusFilter, sortBy]);

  const activeCount  = surveys.filter(s => s.status === 'Activa').length;
  const draftCount   = surveys.filter(s => s.status === 'Borrador').length;
  const totalResps   = surveys.reduce((acc, s) => acc + (s.responses ?? 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {linkSurvey && <LinkModal survey={linkSurvey} onClose={() => setLinkSurvey(null)} />}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Mis Encuestas</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Gestiona y revisa todas tus encuestas creadas
          </p>
        </div>
        <button
          onClick={onNewSurvey}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium text-sm hover:bg-surface-tint active:scale-95 transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          Nueva Encuesta
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill icon={<FileText size={14} />}  label="Total"       value={surveys.length} color="blue"    />
        <SummaryPill icon={<CheckCircle size={14} />} label="Activas"   value={activeCount}     color="emerald" />
        <SummaryPill icon={<Clock size={14} />}      label="Borradores" value={draftCount}       color="amber"   />
        <SummaryPill icon={<BarChart3 size={14} />}  label="Respuestas" value={totalResps}       color="violet"  />
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar encuesta…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant/20 rounded-lg bg-white text-on-surface placeholder-slate-400
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-outline-variant/20 rounded-lg bg-white text-on-surface-variant
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer transition-shadow"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="relative">
          <SortDesc size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-outline-variant/20 rounded-lg bg-white text-on-surface-variant
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer transition-shadow"
          >
            <option value="updated">Más recientes</option>
            <option value="name">Nombre A–Z</option>
            <option value="responses">Más respuestas</option>
          </select>
        </div>
      </div>

      {/* ── Table / Cards ── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {/* Table header (hidden on mobile) */}
        <div className="hidden sm:grid grid-cols-[1fr_110px_110px_160px] gap-4 px-5 py-3 bg-surface-container-low border-b border-outline-variant/10 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
          <span>Encuesta</span>
          <span className="text-center">Respuestas</span>
          <span className="text-center">Estado</span>
          <span className="text-right pr-1">Acciones</span>
        </div>

        {loading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onNewSurvey={onNewSurvey} />
        ) : (
          <ul className="divide-y divide-slate-50">
            {filtered.map(s => (
              <SurveyRow
                key={s.id}
                survey={s}
                onEdit={onEdit}
                onArchive={onArchive}
                onDelete={onDelete}
                onViewAnalytics={onViewAnalytics}
                onShowLink={setLinkSurvey}
              />
            ))}
          </ul>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-2.5 bg-surface-container-low border-t border-outline-variant/10 text-xs text-outline text-right">
            {filtered.length} de {surveys.length} encuestas
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function SummaryPill({ icon, label, value, color }) {
  const colors = {
    blue:   'bg-primary-fixed/20   text-blue-700   border-blue-100',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:  'bg-amber-50  text-amber-700  border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${colors[color]}`}>
      <span className="opacity-80">{icon}</span>
      <div>
        <p className="text-xs font-medium opacity-75">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function SurveyRow({ survey: s, onEdit, onArchive, onDelete, onViewAnalytics, onShowLink }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="group grid grid-cols-1 sm:grid-cols-[1fr_110px_110px_160px] gap-2 sm:gap-4 px-5 py-4 hover:bg-primary-fixed/20/40 transition-colors items-center">

      {/* Name + date */}
      <div className="min-w-0">
        <p className="font-semibold text-on-surface group-hover:text-surface-tint transition-colors truncate text-sm">
          {s.name}
        </p>
        <p className="text-xs text-outline mt-0.5">
          {s.updatedAt ? `Actualizada ${fmtDate(s.updatedAt)}` : fmtDate(s.createdAt)}
        </p>
      </div>

      {/* Responses */}
      <div className="hidden sm:flex justify-center">
        <span className="text-sm font-semibold text-on-surface-variant">
          {(s.responses ?? 0).toLocaleString('es-MX')}
        </span>
      </div>

      {/* Status badge */}
      <div className="hidden sm:flex justify-center">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.statusColor}`}>
          {s.status}
        </span>
      </div>

      {/* Mobile: responses + status inline */}
      <div className="sm:hidden flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.statusColor}`}>{s.status}</span>
        <span className="text-xs text-outline">{s.responses ?? 0} resp.</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
        {/* QR / Link */}
        {s.status === 'Activa' && (
          <ActionBtn
            title="Ver enlace y QR"
            onClick={() => onShowLink?.(s)}
            colorClass="hover:text-green-600 hover:bg-green-50"
          >
            <QrCode size={15} />
          </ActionBtn>
        )}

        {/* Analytics */}
        <ActionBtn
          title="Ver analítica"
          onClick={() => onViewAnalytics?.(s.id)}
          colorClass="hover:text-violet-600 hover:bg-violet-50"
        >
          <BarChart3 size={15} />
        </ActionBtn>

        {/* Edit */}
        <ActionBtn
          title="Editar"
          onClick={() => onEdit?.(s.id)}
          colorClass="hover:text-primary hover:bg-primary-fixed/20"
        >
          <Pencil size={15} />
        </ActionBtn>

        {/* Archive */}
        <ActionBtn
          title="Archivar"
          onClick={() => onArchive?.(s.id)}
          colorClass="hover:text-amber-600 hover:bg-amber-50"
        >
          <Archive size={15} />
        </ActionBtn>

        {/* Delete with confirm */}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete?.(s.id); setConfirmDelete(false); }}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <ActionBtn
            title="Eliminar"
            onClick={() => setConfirmDelete(true)}
            colorClass="hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 size={15} />
          </ActionBtn>
        )}
      </div>
    </li>
  );
}

function ActionBtn({ title, onClick, colorClass, children }) {
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-md text-outline transition-colors ${colorClass}`}
    >
      {children}
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-slate-50">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-100 rounded w-2/3" />
            <div className="h-2.5 bg-slate-100 rounded w-1/4" />
          </div>
          <div className="h-6 w-16 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function LinkModal({ survey, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = `https://dataform.dpdns.org/s/${survey.id}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const canvas = document.getElementById('ms-qr-canvas');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `qr-${survey.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-on-surface">Enlace y código QR</h2>
            <p className="text-on-surface-variant text-sm truncate max-w-[260px]">{survey.name}</p>
          </div>
          <button onClick={onClose} className="text-outline hover:text-slate-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* QR */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Código QR</p>
            <div className="flex justify-center p-6 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <QRCodeCanvas
                id="ms-qr-canvas"
                value={url}
                size={180}
                bgColor="#f8fafc"
                fgColor="#0f172a"
                level="M"
              />
            </div>
          </div>

          {/* URL */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Enlace directo</p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-outline-variant/20 rounded-lg px-3 py-2 bg-surface-container-low min-w-0">
                <Link size={13} className="text-outline flex-shrink-0" />
                <span className="text-sm text-on-surface-variant truncate font-mono">{url}</span>
              </div>
              <button
                onClick={copy}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  copied ? 'bg-green-600 text-white' : 'bg-primary text-on-primary hover:bg-surface-tint'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={downloadQR}
              className="w-full py-2.5 border border-slate-300 text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
            >
              <Download size={15} /> Descargar QR (.png)
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 border border-slate-300 text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={15} /> Abrir enlace
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ search, onNewSurvey }) {
  if (search) {
    return (
      <div className="py-14 text-center">
        <Search size={36} className="mx-auto text-slate-200 mb-3" />
        <p className="text-on-surface-variant text-sm font-medium">Sin resultados para "<span className="text-on-surface-variant">{search}</span>"</p>
        <p className="text-outline text-xs mt-1">Intenta con otro término.</p>
      </div>
    );
  }
  return (
    <div className="py-14 text-center">
      <PenTool size={36} className="mx-auto text-slate-200 mb-3" />
      <p className="text-on-surface-variant text-sm font-medium">Aún no tienes encuestas</p>
      <button
        onClick={onNewSurvey}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-surface-tint transition-colors"
      >
        <Plus size={15} /> Crear mi primera encuesta
      </button>
    </div>
  );
}
