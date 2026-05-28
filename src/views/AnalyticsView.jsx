import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Download, Users, Calendar, Star, RefreshCw } from 'lucide-react';
import { COLORS } from '../constants';
import { responsesApi } from '../lib/db';

const TOOLTIP_STYLE = {
  borderRadius: '8px', border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)', fontSize: 13,
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

/* ── Download CSV ─────────────────────────────────────────────────── */
function downloadCSV(filename, rows) {
  const escape = v => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ── Per-question stats helpers ───────────────────────────────────── */
function getChoiceCounts(responses, questionId) {
  const counts = {};
  responses.forEach(r => {
    const val = r.answers?.[questionId];
    if (val != null && val !== '') {
      const key = String(val);
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getNumericAvg(responses, questionId) {
  const vals = responses
    .map(r => r.answers?.[questionId])
    .filter(v => v != null && !isNaN(Number(v)))
    .map(Number);
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length);
}

function getNPSData(responses, questionId) {
  const vals = responses
    .map(r => r.answers?.[questionId])
    .filter(v => v != null && !isNaN(Number(v)))
    .map(Number);
  if (!vals.length) return null;
  const detractors = vals.filter(n => n <= 6).length;
  const passives   = vals.filter(n => n >= 7 && n <= 8).length;
  const promoters  = vals.filter(n => n >= 9).length;
  const score = Math.round(((promoters - detractors) / vals.length) * 100);
  return { detractors, passives, promoters, score, total: vals.length };
}

/* ── Question chart components ────────────────────────────────────── */
function ChoiceChart({ data, total }) {
  if (!data.length) return <EmptyQ />;
  return (
    <div className="space-y-2 mt-3">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-slate-700 truncate">{d.name}</span>
              <span className="text-sm font-bold text-slate-900 ml-2 flex-shrink-0">
                {d.value} <span className="text-slate-400 font-normal text-xs">({Math.round((d.value / total) * 100)}%)</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(d.value / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RatingChart({ avg, max = 5, responses, questionId }) {
  const dist = Array.from({ length: max }, (_, i) => {
    const val = i + 1;
    return {
      name: String(val),
      value: responses.filter(r => Number(r.answers?.[questionId]) === val).length,
    };
  });
  const answered = dist.reduce((s, d) => s + d.value, 0);
  if (!answered) return <EmptyQ />;
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <Star
              key={i}
              size={24}
              style={{ fill: i < Math.round(avg) ? '#f59e0b' : 'none', color: i < Math.round(avg) ? '#f59e0b' : '#cbd5e1' }}
            />
          ))}
        </div>
        <span className="text-2xl font-bold text-slate-900">{avg.toFixed(1)}</span>
        <span className="text-slate-400 text-sm">/ {max}</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dist}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" name="Respuestas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NPSChart({ data }) {
  if (!data) return <EmptyQ />;
  const { detractors, passives, promoters, score, total } = data;
  const scoreColor = score >= 50 ? 'text-green-600' : score >= 0 ? 'text-yellow-600' : 'text-red-600';
  const bars = [
    { name: 'Detractores (0–6)', value: detractors, color: '#ef4444' },
    { name: 'Pasivos (7–8)',     value: passives,   color: '#f59e0b' },
    { name: 'Promotores (9–10)', value: promoters,  color: '#22c55e' },
  ];
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
        <span className="text-slate-400 text-sm">NPS Score (–100 a +100)</span>
      </div>
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-700">{b.name}</span>
                <span className="text-sm font-bold">{b.value} <span className="text-slate-400 font-normal text-xs">({Math.round((b.value / total) * 100)}%)</span></span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(b.value / total) * 100}%`, backgroundColor: b.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SliderChart({ avg, min = 0, max = 10, responses, questionId }) {
  const vals = responses
    .map(r => r.answers?.[questionId])
    .filter(v => v != null && !isNaN(Number(v)))
    .map(Number);
  if (!vals.length) return <EmptyQ />;
  const dist = [];
  for (let i = min; i <= max; i++) {
    dist.push({ name: String(i), value: vals.filter(v => v === i).length });
  }
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-blue-600">{avg.toFixed(1)}</span>
        <span className="text-slate-400 text-sm">promedio ({min}–{max})</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dist}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" name="Respuestas" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TextAnswers({ responses, questionId }) {
  const answers = responses
    .map(r => ({ text: r.answers?.[questionId], date: r.submitted_at }))
    .filter(a => a.text && String(a.text).trim());
  if (!answers.length) return <EmptyQ />;
  return (
    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
      {answers.map((a, i) => (
        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">{fmtDateShort(a.date)}</p>
          <p className="text-sm text-slate-700">"{String(a.text)}"</p>
        </div>
      ))}
    </div>
  );
}

function MatrixChart({ question, responses }) {
  const { rows = [], columns = [] } = question;
  if (!rows.length || !columns.length) return <EmptyQ />;
  const answered = responses.filter(r => r.answers?.[question.id] && typeof r.answers[question.id] === 'object');
  if (!answered.length) return <EmptyQ />;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="text-sm w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-slate-400 font-medium pb-2 pr-4"></th>
            {columns.map(col => (
              <th key={col} className="text-center text-slate-600 font-semibold pb-2 px-3 text-xs whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row} className={ri % 2 === 0 ? 'bg-slate-50' : ''}>
              <td className="text-slate-700 font-medium py-2 pr-4 text-xs">{row}</td>
              {columns.map(col => {
                const count = answered.filter(r => r.answers[question.id]?.[row] === col).length;
                const pct = answered.length ? Math.round((count / answered.length) * 100) : 0;
                return (
                  <td key={col} className="text-center py-2 px-3">
                    <span className="text-sm font-bold text-slate-800">{count}</span>
                    <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyQ() {
  return <p className="text-sm text-slate-400 italic mt-3 py-4 text-center">Sin respuestas para esta pregunta.</p>;
}

/* ── Question card dispatcher ─────────────────────────────────────── */
function QuestionCard({ question, responses, index }) {
  const qId = question.id;
  const answered = responses.filter(r => {
    const v = r.answers?.[qId];
    return v != null && v !== '' && !(typeof v === 'object' && Object.keys(v).length === 0);
  }).length;

  let chart = null;

  if (question.type === 'multiple_choice') {
    const data = getChoiceCounts(responses, qId);
    chart = <ChoiceChart data={data} total={answered} />;

  } else if (question.type === 'rating') {
    const avg = getNumericAvg(responses, qId);
    chart = avg != null
      ? <RatingChart avg={avg} max={question.maxStars || 5} responses={responses} questionId={qId} />
      : <EmptyQ />;

  } else if (question.type === 'nps') {
    const data = getNPSData(responses, qId);
    chart = <NPSChart data={data} />;

  } else if (question.type === 'slider') {
    const avg = getNumericAvg(responses, qId);
    chart = avg != null
      ? <SliderChart avg={avg} min={question.min ?? 0} max={question.max ?? 10} responses={responses} questionId={qId} />
      : <EmptyQ />;

  } else if (question.type === 'text') {
    chart = <TextAnswers responses={responses} questionId={qId} />;

  } else if (question.type === 'matrix') {
    chart = <MatrixChart question={question} responses={responses} />;

  } else if (question.type === 'ranking') {
    const data = getChoiceCounts(responses, qId);
    chart = <ChoiceChart data={data} total={answered} />;

  } else {
    chart = <TextAnswers responses={responses} questionId={qId} />;
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug">
          <span className="text-blue-600 font-bold mr-2">P{index + 1}.</span>
          {question.text || '(sin texto)'}
        </h3>
        <span className="text-xs text-slate-400 flex-shrink-0">{answered} resp.</span>
      </div>
      <p className="text-xs text-slate-400 capitalize mb-1">{question.type?.replace('_', ' ')}</p>
      {chart}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */
export default function AnalyticsView({ questions = [], surveyConfig, theme, surveyId }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const load = async () => {
    if (!surveyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await responsesApi.list(surveyId);
      setResponses(data ?? []);
    } catch (err) {
      setError(err?.message || 'Error al cargar respuestas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [surveyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalResps = responses.length;
  const firstDate  = responses.length ? responses[responses.length - 1]?.submitted_at : null;
  const lastDate   = responses.length ? responses[0]?.submitted_at : null;

  const handleExportCSV = () => {
    if (!responses.length) return;
    const qCols = questions.map((q, i) => `P${i + 1}. ${(q.text || '').slice(0, 40)}`);
    const header = ['ID', 'Nombre', 'Fecha', ...qCols, 'Puntaje', 'Resultado'];
    const rows = responses.map(r => [
      r.id?.slice(0, 8),
      r.respondent_name ?? '',
      fmtDate(r.submitted_at),
      ...questions.map(q => {
        const v = r.answers?.[q.id];
        return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      }),
      r.score ?? '',
      r.score_range_title ?? '',
    ]);
    const slug = (surveyConfig?.title || 'encuesta').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    downloadCSV(`${slug}_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  /* ── No survey selected ── */
  if (!surveyId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-1">Selecciona una encuesta</p>
          <p className="text-sm">Ve a Mis Encuestas y haz clic en editar para ver su analítica.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analítica</h1>
          <p className="text-sm text-slate-500 mt-0.5 truncate max-w-md">{surveyConfig?.title || 'Encuesta'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!totalResps}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Users size={13} /> Respuestas
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalResps}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Calendar size={13} /> Primera
          </div>
          <p className="text-sm font-semibold text-slate-800">{fmtDateShort(firstDate) || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Calendar size={13} /> Última
          </div>
          <p className="text-sm font-semibold text-slate-800">{fmtDateShort(lastDate) || '—'}</p>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center h-32 gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando respuestas...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && totalResps === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Users size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Todavía no hay respuestas</p>
          <p className="text-slate-400 text-sm mt-1">Comparte el enlace de la encuesta para empezar a recopilar datos.</p>
        </div>
      )}

      {/* Per-question charts */}
      {!loading && !error && totalResps > 0 && questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Resultados por pregunta</h2>
          {questions.map((q, i) => (
            <QuestionCard key={q.id} question={q} responses={responses} index={i} />
          ))}
        </div>
      )}

      {/* Response table */}
      {!loading && !error && totalResps > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Respuestas individuales</h2>
            <p className="text-xs text-slate-400 mt-0.5">{totalResps} {totalResps === 1 ? 'registro' : 'registros'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {surveyConfig?.requireName && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  {surveyConfig?.scoreRanges?.length > 0 && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Puntaje</th>
                  )}
                  {questions.slice(0, 4).map((q, i) => (
                    <th key={q.id} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      P{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {responses.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    {surveyConfig?.requireName && (
                      <td className="px-4 py-3 font-medium text-slate-800">{r.respondent_name || '—'}</td>
                    )}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(r.submitted_at)}</td>
                    {surveyConfig?.scoreRanges?.length > 0 && (
                      <td className="px-4 py-3">
                        {r.score != null ? (
                          <span className="font-bold text-blue-600">{r.score}</span>
                        ) : '—'}
                        {r.score_range_title && (
                          <span className="ml-1 text-xs text-slate-400">({r.score_range_title})</span>
                        )}
                      </td>
                    )}
                    {questions.slice(0, 4).map(q => {
                      const v = r.answers?.[q.id];
                      const display = v == null ? '—'
                        : typeof v === 'object' ? Object.values(v).join(', ')
                        : String(v).slice(0, 40);
                      return (
                        <td key={q.id} className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={String(v ?? '')}>
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
