import { useState, useEffect } from 'react';
import { Users, BarChart3, FileText, Zap, RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { adminApi } from '../lib/db';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function KpiTile({ icon, label, value, accent }) {
  return (
    <div className="bg-surface rounded-2xl border border-surface-container-highest p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-on-surface leading-none mt-1">{value}</p>
      </div>
    </div>
  );
}

export default function AdminView() {
  const [stats, setStats]   = useState(null);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [s, u] = await Promise.all([adminApi.getStats(), adminApi.getUsers()]);
      setStats(s); setUsers(u);
    } catch (err) {
      setError(err?.message || 'Error al cargar datos de admin. ¿Corriste la migración SQL 002_profiles.sql?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Panel de Administración</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">Métricas globales de la plataforma</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-container-highest bg-surface text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 bg-error-container text-on-error-container rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI tiles */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="bg-surface rounded-2xl border border-surface-container-highest p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile icon={<Users size={22} className="text-primary" />}    label="Usuarios"            value={stats.usersCount}     accent="bg-primary/10" />
          <KpiTile icon={<FileText size={22} className="text-violet-600" />} label="Encuestas totales" value={stats.surveysCount}   accent="bg-violet-100" />
          <KpiTile icon={<Zap size={22} className="text-emerald-600" />}  label="Encuestas activas"   value={stats.activeCount}    accent="bg-emerald-100" />
          <KpiTile icon={<BarChart3 size={22} className="text-amber-600" />} label="Respuestas totales" value={stats.responsesCount} accent="bg-amber-100" />
        </div>
      )}

      {/* Users table */}
      <div className="bg-surface rounded-2xl border border-surface-container-highest overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container-highest flex items-center justify-between">
          <h2 className="font-bold text-on-surface">Usuarios registrados</h2>
          {!loading && <span className="text-xs text-on-surface-variant">{users.length} usuario{users.length !== 1 ? 's' : ''}</span>}
        </div>

        {loading && users.length === 0 ? (
          <div className="p-6 space-y-3">
            {[0,1,2].map(i => <div key={i} className="h-10 bg-surface-container-low rounded-lg animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant text-center">
            Sin usuarios. Corre la migración <code className="bg-surface-container-low px-1 rounded">002_profiles.sql</code> en Supabase.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container-highest">
                  <th className="text-left px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Registro</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Encuestas</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Activas</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Respuestas</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-3 font-medium text-on-surface truncate max-w-[220px]">{u.email}</td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-on-surface">{u.surveyCount}</td>
                    <td className="px-4 py-3 text-right">
                      {u.activeSurveys > 0
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{u.activeSurveys}</span>
                        : <span className="text-on-surface-variant">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-on-surface">{u.responseCount}</td>
                    <td className="px-4 py-3 text-center">
                      {u.is_admin
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary"><Shield size={10} /> Admin</span>
                        : <span className="text-xs text-on-surface-variant">Usuario</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
