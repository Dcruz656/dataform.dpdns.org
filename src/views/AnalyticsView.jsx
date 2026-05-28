import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Download, Users, Calendar, Star, RefreshCw, ChevronLeft, FileText, Sheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COLORS } from '../constants';
import { responsesApi, surveysApi } from '../lib/db';

const TOOLTIP_STYLE = {
  borderRadius: '8px', border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)', fontSize: 13,
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}
function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function getChoiceCounts(responses, qId) {
  const counts = {};
  responses.forEach(r => {
    const v = r.answers?.[qId];
    if (v != null && v !== '') counts[String(v)] = (counts[String(v)] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
function getNumericAvg(responses, qId) {
  const vals = responses.map(r => r.answers?.[qId]).filter(v => v != null && !isNaN(Number(v))).map(Number);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function getNPSData(responses, qId) {
  const vals = responses.map(r => r.answers?.[qId]).filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!vals.length) return null;
  const detractors = vals.filter(n => n <= 6).length;
  const passives   = vals.filter(n => n >= 7 && n <= 8).length;
  const promoters  = vals.filter(n => n >= 9).length;
  return { detractors, passives, promoters, score: Math.round(((promoters - detractors) / vals.length) * 100), total: vals.length };
}
function answeredCount(responses, qId) {
  return responses.filter(r => {
    const v = r.answers?.[qId];
    return v != null && v !== '' && !(typeof v === 'object' && !Object.keys(v).length);
  }).length;
}

/* ── CSV download ─────────────────────────────────────────────────── */
function downloadCSV(filename, rows) {
  const esc = v => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob(['\uFEFF' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

/* ── Chart sub-components ─────────────────────────────────────────── */
function EmptyQ() {
  return <p className="text-sm text-slate-400 italic mt-3 py-4 text-center">Sin respuestas para esta pregunta.</p>;
}

function ChoiceChart({ data, total }) {
  if (!data.length) return <EmptyQ />;
  return (
    <div className="space-y-2 mt-3">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-700 truncate">{d.name}</span>
              <span className="text-sm font-bold text-slate-900 ml-2 flex-shrink-0">
                {d.value} <span className="text-slate-400 font-normal text-xs">({total ? Math.round((d.value / total) * 100) : 0}%)</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${total ? (d.value / total) * 100 : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RatingChart({ avg, max = 5, responses, qId }) {
  const dist = Array.from({ length: max }, (_, i) => ({
    name: String(i + 1),
    value: responses.filter(r => Number(r.answers?.[qId]) === i + 1).length,
  }));
  if (!dist.reduce((s, d) => s + d.value, 0)) return <EmptyQ />;
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <Star key={i} size={22} style={{ fill: i < Math.round(avg) ? '#f59e0b' : 'none', color: i < Math.round(avg) ? '#f59e0b' : '#cbd5e1' }} />
          ))}
        </div>
        <span className="text-2xl font-bold text-slate-900">{avg.toFixed(1)}</span>
        <span className="text-slate-400 text-sm">/ {max}</span>
      </div>
      <div className="h-36">
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
      {bars.map(b => (
        <div key={b.name} className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-700">{b.name}</span>
              <span className="text-sm font-bold">{b.value} <span className="text-slate-400 font-normal text-xs">({total ? Math.round((b.value / total) * 100) : 0}%)</span></span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${total ? (b.value / total) * 100 : 0}%`, backgroundColor: b.color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SliderChart({ avg, min = 0, max = 10, responses, qId }) {
  const dist = [];
  for (let i = min; i <= max; i++) dist.push({ name: String(i), value: responses.filter(r => Number(r.answers?.[qId]) === i).length });
  if (!dist.reduce((s, d) => s + d.value, 0)) return <EmptyQ />;
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-blue-600">{avg.toFixed(1)}</span>
        <span className="text-slate-400 text-sm">promedio ({min}–{max})</span>
      </div>
      <div className="h-36">
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

function TextAnswers({ responses, qId }) {
  const answers = responses.map(r => ({ text: r.answers?.[qId], date: r.submitted_at })).filter(a => a.text?.toString().trim());
  if (!answers.length) return <EmptyQ />;
  return (
    <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
      {answers.map((a, i) => (
        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">{fmtDateShort(a.date)}</p>
          <p className="text-sm text-slate-700">"{String(a.text)}"</p>
        </div>
      ))}
    </div>
  );
}

function QuestionCard({ question, responses, index }) {
  const qId = question.id;
  const n = answeredCount(responses, qId);
  let chart = null;
  if (question.type === 'multiple_choice') chart = <ChoiceChart data={getChoiceCounts(responses, qId)} total={n} />;
  else if (question.type === 'rating') { const avg = getNumericAvg(responses, qId); chart = avg != null ? <RatingChart avg={avg} max={question.maxStars || 5} responses={responses} qId={qId} /> : <EmptyQ />; }
  else if (question.type === 'nps') chart = <NPSChart data={getNPSData(responses, qId)} />;
  else if (question.type === 'slider') { const avg = getNumericAvg(responses, qId); chart = avg != null ? <SliderChart avg={avg} min={question.min ?? 0} max={question.max ?? 10} responses={responses} qId={qId} /> : <EmptyQ />; }
  else if (question.type === 'matrix') {
    const answered = responses.filter(r => r.answers?.[qId] && typeof r.answers[qId] === 'object' && Object.keys(r.answers[qId]).length);
    chart = (question.rows?.length && question.columns?.length && answered.length) ? (
      <div className="mt-3 overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead><tr><th className="text-left pb-2 pr-3 text-slate-400"></th>{question.columns.map(c => <th key={c} className="text-center pb-2 px-2 text-slate-600 font-semibold whitespace-nowrap">{c}</th>)}</tr></thead>
          <tbody>{question.rows.map((row, ri) => <tr key={row} className={ri % 2 === 0 ? 'bg-slate-50' : ''}><td className="py-1.5 pr-3 text-slate-700 font-medium">{row}</td>{question.columns.map(col => { const cnt = answered.filter(r => r.answers[qId]?.[row] === col).length; return <td key={col} className="text-center py-1.5 px-2"><span className="font-bold">{cnt}</span><span className="text-slate-400 ml-1">({answered.length ? Math.round((cnt/answered.length)*100) : 0}%)</span></td>; })}</tr>)}</tbody>
        </table>
      </div>
    ) : <EmptyQ />;
  }
  else chart = <TextAnswers responses={responses} qId={qId} />;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug">
          <span className="text-blue-600 font-bold mr-2">P{index + 1}.</span>{question.text || '(sin texto)'}
        </h3>
        <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{n} resp.</span>
      </div>
      <p className="text-xs text-slate-400 capitalize mt-0.5">{question.type?.replace('_', ' ')}</p>
      {chart}
    </div>
  );
}

/* ── Survey list ──────────────────────────────────────────────────── */
function SurveyList({ surveys, onSelect }) {
  if (!surveys.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Users size={40} className="mx-auto mb-3 text-slate-200" />
        <p className="font-medium">No tienes encuestas creadas</p>
        <p className="text-sm mt-1">Crea una encuesta en el Constructor para ver su analítica aquí.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {surveys.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">{s.name}</p>
              <p className="text-xs text-slate-400 mt-1">Actualizada {fmtDateShort(s.updatedAt)}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.statusColor}`}>{s.status}</span>
              <span className="text-sm font-bold text-slate-600">{s.responses ?? 0} <span className="text-slate-400 font-normal text-xs">resp.</span></span>
              <ChevronLeft size={16} className="text-slate-300 group-hover:text-blue-500 rotate-180 transition-colors" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── PDF export ───────────────────────────────────────────────────── */
function exportPDF({ survey, questions, responses }) {
  const BLUE  = [37, 99, 235];
  const GRAY  = [100, 116, 139];
  const LIGHT = [248, 250, 252];
  const title = survey.title ?? survey.name ?? 'Encuesta';
  const now   = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const slug  = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W   = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('DATAFORM', 12, 13);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Reporte — ${title}`, 42, 13);
  doc.setFontSize(8);
  doc.text(`${dateStr}  ${timeStr}`, W - 12, 13, { align: 'right' });

  // KPI strip
  doc.setFillColor(...LIGHT);
  doc.rect(0, 20, W, 12, 'F');
  doc.setTextColor(...GRAY);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const firstDate = responses.length ? fmtDateShort(responses[responses.length - 1]?.submitted_at) : '—';
  const lastDate  = responses.length ? fmtDateShort(responses[0]?.submitted_at) : '—';
  doc.text(`Total respuestas: ${responses.length}   ·   Primera: ${firstDate}   ·   Última: ${lastDate}`, 12, 28);

  let y = 38;

  // Per-question summary tables
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const qId = q.id;
    const n = answeredCount(responses, qId);
    const qLabel = `P${qi + 1}. ${(q.text || '').slice(0, 80)}`;

    if (y > 170) { doc.addPage(); y = 15; }

    doc.setTextColor(...BLUE);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(qLabel, 12, y);
    doc.setTextColor(...GRAY);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(`${n} respuestas · ${q.type}`, 12, y + 5);

    let body = [];
    if (q.type === 'multiple_choice' || q.type === 'ranking') {
      const counts = getChoiceCounts(responses, qId);
      body = counts.map(d => [d.name, d.value, n ? `${Math.round((d.value / n) * 100)}%` : '0%']);
      if (body.length) autoTable(doc, { startY: y + 8, head: [['Opción', 'Respuestas', '%']], body, styles: { fontSize: 7 }, headStyles: { fillColor: BLUE, textColor: 255 }, alternateRowStyles: { fillColor: LIGHT }, margin: { left: 12, right: 12 }, tableWidth: 120 });
    } else if (q.type === 'rating') {
      const avg = getNumericAvg(responses, qId);
      body = avg != null ? [[`Promedio: ${avg.toFixed(2)} / ${q.maxStars || 5}`, `${n} respuestas`]] : [['Sin datos', '']];
      autoTable(doc, { startY: y + 8, head: [['Métrica', 'Valor']], body, styles: { fontSize: 7 }, headStyles: { fillColor: BLUE, textColor: 255 }, margin: { left: 12, right: 12 }, tableWidth: 120 });
    } else if (q.type === 'nps') {
      const d = getNPSData(responses, qId);
      body = d ? [['NPS Score', d.score], ['Detractores (0–6)', d.detractors], ['Pasivos (7–8)', d.passives], ['Promotores (9–10)', d.promoters]] : [['Sin datos', '']];
      autoTable(doc, { startY: y + 8, head: [['Métrica', 'Valor']], body, styles: { fontSize: 7 }, headStyles: { fillColor: BLUE, textColor: 255 }, margin: { left: 12, right: 12 }, tableWidth: 120 });
    } else if (q.type === 'slider') {
      const avg = getNumericAvg(responses, qId);
      body = avg != null ? [[`Promedio: ${avg.toFixed(2)}`, `Rango ${q.min ?? 0}–${q.max ?? 10}`, `${n} respuestas`]] : [['Sin datos', '', '']];
      autoTable(doc, { startY: y + 8, head: [['Promedio', 'Rango', 'Respuestas']], body, styles: { fontSize: 7 }, headStyles: { fillColor: BLUE, textColor: 255 }, margin: { left: 12, right: 12 }, tableWidth: 120 });
    } else if (q.type === 'text') {
      const texts = responses.map(r => r.answers?.[qId]).filter(v => v?.toString().trim()).slice(0, 10);
      body = texts.map((t, i) => [`${i + 1}.`, String(t).slice(0, 120)]);
      if (body.length) autoTable(doc, { startY: y + 8, head: [['#', 'Respuesta']], body, styles: { fontSize: 7, overflow: 'linebreak' }, headStyles: { fillColor: BLUE, textColor: 255 }, columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 'auto' } }, margin: { left: 12, right: 12 } });
    } else if (q.type === 'matrix' && q.rows?.length && q.columns?.length) {
      const answered = responses.filter(r => r.answers?.[qId] && typeof r.answers[qId] === 'object');
      body = q.rows.map(row => [row, ...q.columns.map(col => { const cnt = answered.filter(r => r.answers[qId]?.[row] === col).length; return `${cnt} (${answered.length ? Math.round((cnt/answered.length)*100) : 0}%)`; })]);
      autoTable(doc, { startY: y + 8, head: [['', ...q.columns]], body, styles: { fontSize: 7 }, headStyles: { fillColor: BLUE, textColor: 255 }, alternateRowStyles: { fillColor: LIGHT }, margin: { left: 12, right: 12 } });
    }

    y = (doc.lastAutoTable?.finalY ?? (y + 8)) + 10;
  }

  // Responses table
  if (responses.length) {
    if (y > 160) { doc.addPage(); y = 15; }
    doc.setTextColor(...BLUE);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Respuestas individuales', 12, y);

    const hasSurveyConfig = survey.require_name;
    const cols = [
      ...(hasSurveyConfig ? ['Nombre'] : []),
      'Fecha',
      ...questions.slice(0, 5).map((q, i) => `P${i + 1}`),
      ...(survey.score_ranges?.length ? ['Puntaje'] : []),
    ];
    const rows = responses.map(r => [
      ...(hasSurveyConfig ? [r.respondent_name || '—'] : []),
      fmtDateShort(r.submitted_at),
      ...questions.slice(0, 5).map(q => {
        const v = r.answers?.[q.id];
        return v == null ? '—' : typeof v === 'object' ? Object.values(v).join(', ') : String(v).slice(0, 30);
      }),
      ...(survey.score_ranges?.length ? [r.score ?? '—'] : []),
    ]);

    autoTable(doc, {
      startY: y + 4,
      head: [cols],
      body: rows,
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT },
      margin: { left: 12, right: 12 },
    });
  }

  // Page footer
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text(`Página ${i} de ${pages}  ·  Generado por DATAFORM`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
  }

  doc.save(`${slug}_${now.toISOString().slice(0, 10)}.pdf`);
}

/* ── Main component ───────────────────────────────────────────────── */
export default function AnalyticsView({ surveys = [], initialSurveyId }) {
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [responses,  setResponses]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [exportMenu, setExportMenu] = useState(false);

  const loadSurvey = async (surveyListItem) => {
    setLoading(true);
    setError(null);
    setResponses([]);
    setQuestions([]);
    try {
      const [full, resps] = await Promise.all([
        surveysApi.get(surveyListItem.id),
        responsesApi.list(surveyListItem.id),
      ]);
      setSelectedSurvey(full);
      setQuestions(full.questions ?? []);
      setResponses(resps ?? []);
    } catch (err) {
      setError(err?.message || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-select if coming from builder with a survey already open
  useEffect(() => {
    if (initialSurveyId && surveys.length) {
      const match = surveys.find(s => s.id === initialSurveyId);
      if (match) loadSurvey(match);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCSV = () => {
    if (!responses.length) return;
    const header = ['ID', 'Nombre', 'Fecha', ...questions.map((q, i) => `P${i + 1}. ${(q.text || '').slice(0, 40)}`), 'Puntaje', 'Resultado'];
    const rows = responses.map(r => [
      r.id?.slice(0, 8), r.respondent_name ?? '', fmtDate(r.submitted_at),
      ...questions.map(q => { const v = r.answers?.[q.id]; return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); }),
      r.score ?? '', r.score_range_title ?? '',
    ]);
    const slug = (selectedSurvey?.title || 'encuesta').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    downloadCSV(`${slug}_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    setExportMenu(false);
  };

  const handlePDF = () => {
    if (!responses.length || !selectedSurvey) return;
    exportPDF({ survey: selectedSurvey, questions, responses });
    setExportMenu(false);
  };

  /* ── Survey not selected: show list ── */
  if (!selectedSurvey) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analítica</h1>
          <p className="text-sm text-slate-500 mt-0.5">Selecciona una encuesta para ver sus resultados</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : (
          <SurveyList surveys={surveys} onSelect={loadSurvey} />
        )}
      </div>
    );
  }

  const totalResps = responses.length;
  const firstDate  = totalResps ? responses[responses.length - 1]?.submitted_at : null;
  const lastDate   = totalResps ? responses[0]?.submitted_at : null;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedSurvey(null); setResponses([]); setQuestions([]); }}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 -ml-1"
            title="Volver a la lista"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{selectedSurvey.title ?? selectedSurvey.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{totalResps} {totalResps === 1 ? 'respuesta' : 'respuestas'}</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={() => loadSurvey({ id: selectedSurvey.id })} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenu(v => !v)}
              disabled={!totalResps}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              <Download size={14} /> Exportar
            </button>
            {exportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[150px]">
                <button onClick={handleCSV} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                  <Sheet size={14} className="text-emerald-600" /> Excel / CSV
                </button>
                <button onClick={handlePDF} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                  <FileText size={14} className="text-red-500" /> PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Respuestas', value: totalResps, icon: <Users size={13} />, color: 'text-blue-600' },
          { label: 'Primera',    value: fmtDateShort(firstDate) || '—', icon: <Calendar size={13} />, color: 'text-slate-800' },
          { label: 'Última',     value: fmtDateShort(lastDate)  || '—', icon: <Calendar size={13} />, color: 'text-slate-800' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{k.icon}{k.label}</div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando respuestas...</span>
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>}

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
          {questions.map((q, i) => <QuestionCard key={q.id} question={q} responses={responses} index={i} />)}
        </div>
      )}

      {/* Response table */}
      {!loading && !error && totalResps > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Respuestas individuales</h2>
            <p className="text-xs text-slate-400 mt-0.5">{totalResps} {totalResps === 1 ? 'registro' : 'registros'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {selectedSurvey.require_name && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  {selectedSurvey.score_ranges?.length > 0 && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Puntaje</th>}
                  {questions.slice(0, 4).map((q, i) => (
                    <th key={q.id} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">P{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {responses.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    {selectedSurvey.require_name && <td className="px-4 py-3 font-medium text-slate-800">{r.respondent_name || '—'}</td>}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(r.submitted_at)}</td>
                    {selectedSurvey.score_ranges?.length > 0 && (
                      <td className="px-4 py-3">
                        {r.score != null ? <span className="font-bold text-blue-600">{r.score}</span> : '—'}
                        {r.score_range_title && <span className="ml-1 text-xs text-slate-400">({r.score_range_title})</span>}
                      </td>
                    )}
                    {questions.slice(0, 4).map(q => {
                      const v = r.answers?.[q.id];
                      const txt = v == null ? '—' : typeof v === 'object' ? Object.values(v).join(', ') : String(v).slice(0, 40);
                      return <td key={q.id} className="px-4 py-3 text-slate-700 max-w-[160px] truncate" title={String(v ?? '')}>{txt}</td>;
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
