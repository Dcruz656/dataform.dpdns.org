import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { Download, X, Filter, Check, ChevronDown, FileJson, FileText, Sheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COLORS, MOCK_RESPONSES } from '../constants';
import { downloadRawCSV, downloadJSON, getWordFrequency } from '../utils';

const CSAT_OPTIONS = ['Muy insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', 'Muy satisfecho'];
const NPS_CAT = n => (n <= 6 ? 'Detractor' : n <= 8 ? 'Pasivo' : 'Promotor');
const TOOLTIP_STYLE = { borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)', fontSize: 13 };
const qLabel = (idx, q) => {
  const t = q?.text || '';
  return `P${idx + 1}. ${t.length > 55 ? t.slice(0, 55) + '…' : t}`;
};

const FUNNEL_DATA = [
  { name: 'Vistas', count: 1240 },
  { name: 'Iniciadas', count: 1100 },
  { name: 'Media', count: 950 },
  { name: 'Completadas', count: 750 },
];

const BAR_DATA = [
  { name: 'Lun', resp: 120 }, { name: 'Mar', resp: 200 }, { name: 'Mie', resp: 150 },
  { name: 'Jue', resp: 280 }, { name: 'Vie', resp: 310 }, { name: 'Sab', resp: 90 }, { name: 'Dom', resp: 70 },
];

export default function AnalyticsView({ questions, surveyConfig, theme }) {
  const [filterValue, setFilterValue] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [exportState,   setExportState]   = useState('idle'); // 'idle' | 'done'
  const [exportMenu,    setExportMenu]    = useState(false);
  const [chartTypeFunnel, setChartTypeFunnel] = useState('area');
  const [chartTypeDaily,  setChartTypeDaily]  = useState('bar');
  const [chartTypeQ1,     setChartTypeQ1]     = useState('donut');

  const filtered = useMemo(() =>
    MOCK_RESPONSES.filter(r =>
      (!filterValue || r.answers[1] === filterValue)
    ),
    [filterValue]
  );

  const tableRows = useMemo(() =>
    nameSearch.trim()
      ? filtered.filter(r => r.name.toLowerCase().includes(nameSearch.toLowerCase()))
      : filtered,
    [filtered, nameSearch]
  );

  // ── Comportamiento (mock, deterministic) ────────────────────────────────
  const behaviorData = useMemo(() => {
    if (!questions || questions.length === 0) return null;
    const rng = (i) => {
      const x = Math.sin(i * 127.1 + questions.reduce((s, q) => s + q.id * 31, 7)) * 43758.5453;
      return Math.abs(x - Math.floor(x));
    };
    const totalStart = MOCK_RESPONSES.length;
    const funnel = [];
    let remaining = totalStart;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const dropped = i === 0 ? 0 : Math.min(Math.floor(remaining * (0.02 + rng(i) * 0.13)), remaining - 1);
      if (i > 0) remaining -= dropped;
      funnel.push({
        label: `Q${i + 1}: ${(q.text || '').slice(0, 20)}`,
        count: remaining,
        percentage: Math.round((remaining / totalStart) * 100),
        dropoff: dropped > 0 ? Math.round((dropped / (remaining + dropped)) * 100) : 0,
        isWorst: false,
      });
    }
    const maxDrop = Math.max(...funnel.map(f => f.dropoff));
    if (maxDrop > 0) {
      const wi = funnel.findIndex(f => f.dropoff === maxDrop);
      if (wi >= 0) funnel[wi].isWorst = true;
    }
    const avgTimes = questions.map((q, i) => ({
      label: `Q${i + 1}: ${(q.text || '').slice(0, 18)}`,
      seconds: Math.floor(6 + rng(i + 50) * 44),
    }));
    return { funnel, avgTimes };
  }, [questions]);

  const pieData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => {
      const v = r.answers[1];
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return CSAT_OPTIONS.map(opt => ({ name: opt, value: counts[opt] || 0 })).filter(d => d.value > 0);
  }, [filtered]);

  const textAnswers = useMemo(() => filtered.map(r => r.answers[4]).filter(Boolean), [filtered]);
  const wordFreq = useMemo(() => getWordFrequency(textAnswers), [textAnswers]);

  // ── Shared export data builder ──────────────────────────────────────────
  const buildExportData = () => {
    const hasName = surveyConfig?.requireName;
    const surveyTitle = surveyConfig?.title || 'Encuesta';
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    // Datos a exportar: respetan el filtro cross-tab pero no el buscador de nombre
    // (el buscador es navegación puntual, no segmentación analítica)
    const data = filtered;
    const pct = n => data.length ? `${Math.round((n / data.length) * 100)}%` : '0%';

    // ── Filtros activos legibles ──
    const activeFilters = [
      filterValue ? `Satisfacción = "${filterValue}"` : null,
    ].filter(Boolean).join(' · ') || 'Ninguno';

    // ── Estadísticas de resumen ──
    const starVals = data.map(r => r.answers[2]).filter(v => v != null);
    const starAvg  = starVals.length ? (starVals.reduce((a, b) => a + b, 0) / starVals.length).toFixed(1) : 'N/D';

    const npsVals    = data.map(r => r.answers[3]).filter(v => v != null);
    const detractors = npsVals.filter(n => n <= 6).length;
    const passives   = npsVals.filter(n => n >= 7 && n <= 8).length;
    const promoters  = npsVals.filter(n => n >= 9).length;
    const npsScore   = npsVals.length
      ? Math.round(((promoters - detractors) / npsVals.length) * 100)
      : 'N/D';

    const q1Counts = {};
    CSAT_OPTIONS.forEach(o => { q1Counts[o] = 0; });
    data.forEach(r => { if (r.answers[1]) q1Counts[r.answers[1]] = (q1Counts[r.answers[1]] || 0) + 1; });

    // ─────────────────────────────────────────────
    // BLOQUE 1 — Metadatos
    // ─────────────────────────────────────────────
    const SEP  = [];       // fila vacía separadora
    const RULE = ['────────────────────────────────────────────'];

    const meta = [
      ['DATAFORM — Exportación de Resultados'],
      SEP,
      ['Encuesta',              surveyTitle],
      ['Exportado el',          `${dateStr}  ${timeStr}`],
      ['Filtros aplicados',     activeFilters],
      ['Respuestas exportadas', data.length],
      ['Total de respuestas',   MOCK_RESPONSES.length],
      SEP,
    ];

    // ─────────────────────────────────────────────
    // BLOQUE 2 — Tabla de respuestas
    // ─────────────────────────────────────────────
    const tableHeader = [
      'ID',
      ...(hasName ? ['Evaluador'] : []),
      'Fecha y Hora',
      qLabel(0, questions?.[0]),
      qLabel(1, questions?.[1]),
      'Calificación Estrellas',
      qLabel(2, questions?.[2]),
      'Categoría NPS',
      qLabel(3, questions?.[3]),
    ];

    const tableRows = data.map(r => [
      `#${String(r.id).padStart(3, '0')}`,
      ...(hasName ? [r.name || ''] : []),
      r.timestamp,
      r.answers[1] || '',
      r.answers[2] != null ? `${r.answers[2]} / 5` : '',
      r.answers[2] != null ? '★'.repeat(r.answers[2]) + '☆'.repeat(5 - r.answers[2]) : '',
      r.answers[3] != null ? r.answers[3] : '',
      r.answers[3] != null ? NPS_CAT(r.answers[3]) : '',
      r.answers[4] || '',
    ]);

    // ─────────────────────────────────────────────
    // BLOQUE 3 — Resumen estadístico
    // ─────────────────────────────────────────────
    const summary = [
      SEP,
      RULE,
      ['RESUMEN ESTADÍSTICO'],
      RULE,
      SEP,
      // Q1
      [qLabel(0, questions?.[0])],
      ['Opción', 'Respuestas', 'Porcentaje'],
      ...CSAT_OPTIONS.map(o => [o, q1Counts[o], pct(q1Counts[o])]),
      SEP,
      // Q2
      [qLabel(1, questions?.[1])],
      ['Promedio de Estrellas', `${starAvg} / 5`],
      SEP,
      // Q3
      [qLabel(2, questions?.[2])],
      ['NPS Score (–100 a +100)', npsScore],
      ['Categoría',    'Respuestas', 'Porcentaje'],
      ['Detractores (0–6)', detractors, pct(detractors)],
      ['Pasivos (7–8)',     passives,   pct(passives)],
      ['Promotores (9–10)', promoters,  pct(promoters)],
    ];

    // Nombre de archivo: título-encuesta_YYYY-MM-DD.csv
    const slug = surveyTitle
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const isoDate = now.toISOString().slice(0, 10);
    const filename = `${slug}_${isoDate}.csv`;

    return { hasName, surveyTitle, now, dateStr, timeStr, activeFilters, data, pct,
      starAvg, npsScore, detractors, passives, promoters, q1Counts,
      tableHeader, tableRows, meta, summary, slug, isoDate, filename };
  };

  // ── CSV ─────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const { meta, tableHeader, tableRows, summary, filename } = buildExportData();
    const SEP = []; const RULE = ['────────────────────────────────────────────'];
    downloadRawCSV(filename, [...meta, tableHeader, ...tableRows, SEP, RULE, ['RESUMEN ESTADÍSTICO'], RULE, ...summary]);
    triggerDone();
  };

  // ── JSON ─────────────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    const { hasName, surveyTitle, now, activeFilters, data, starAvg, npsScore,
      detractors, passives, promoters, q1Counts, slug, isoDate } = buildExportData();

    const payload = {
      metadata: {
        survey:            surveyTitle,
        exportedAt:        now.toISOString(),
        filtersApplied:    activeFilters,
        exportedResponses: data.length,
        totalResponses:    MOCK_RESPONSES.length,
      },
      responses: data.map(r => ({
        id:        r.id,
        ...(hasName ? { evaluator: r.name } : {}),
        timestamp: r.timestamp,
        answers: {
          P1_satisfaction:  r.answers[1] ?? null,
          P2_stars:         r.answers[2] ?? null,
          P3_nps:           r.answers[3] ?? null,
          P3_npsCategory:   r.answers[3] != null ? NPS_CAT(r.answers[3]) : null,
          P4_comment:       r.answers[4] ?? null,
        },
      })),
      summary: {
        P1_distribution:   q1Counts,
        P2_avgStars:       parseFloat(starAvg),
        P3_npsScore:       npsScore,
        P3_detractors:     detractors,
        P3_passives:       passives,
        P3_promoters:      promoters,
      },
    };

    downloadJSON(`${slug}_${isoDate}.json`, payload);
    triggerDone();
  };

  // ── PDF ──────────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const { hasName, surveyTitle, dateStr, timeStr, activeFilters, data, pct,
      starAvg, npsScore, detractors, passives, promoters, q1Counts, slug, isoDate } = buildExportData();

    const BLUE  = [37, 99, 235];
    const GRAY  = [100, 116, 139];
    const LIGHT = [248, 250, 252];
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W     = doc.internal.pageSize.getWidth();

    // ── Header band ──
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, W, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('DATAFORM', 12, 13);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Reporte de Resultados - ${surveyTitle}`, 42, 13);
    doc.setFontSize(8);
    doc.text(`${dateStr}  ${timeStr}`, W - 12, 13, { align: 'right' });

    // ── Metadata row ──
    doc.setFillColor(...LIGHT);
    doc.rect(0, 20, W, 12, 'F');
    doc.setTextColor(...GRAY);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Respuestas exportadas: ${data.length}  ·  Total: ${MOCK_RESPONSES.length}  ·  Filtros: ${activeFilters}`, 12, 28);

    // ── Logo (PDF only) ──
    if (theme?.logo) {
      try {
        const fmt = theme.logo.startsWith('data:image/png') ? 'PNG'
          : (theme.logo.startsWith('data:image/jpeg') || theme.logo.startsWith('data:image/jpg')) ? 'JPEG'
          : null;
        if (fmt) doc.addImage(theme.logo, fmt, W - 44, 21.5, 32, 9);
      } catch (_) {}
    }

    // ── Responses table ──
    const cols = [
      'ID',
      ...(hasName ? ['Evaluador'] : []),
      'Fecha y Hora', 'P1 Satisfacción', 'P2 Estrellas', 'P3 NPS', 'Categoría', 'P4 Comentario',
    ];
    const rows = data.map(r => [
      `#${String(r.id).padStart(3, '0')}`,
      ...(hasName ? [r.name || ''] : []),
      r.timestamp,
      r.answers[1] || '',
      r.answers[2] != null ? `${r.answers[2]}/5` : '',
      r.answers[3] ?? '',
      r.answers[3] != null ? NPS_CAT(r.answers[3]) : '',
      (r.answers[4] || '').slice(0, 60) + ((r.answers[4] || '').length > 60 ? '...' : ''),
    ]);

    autoTable(doc, {
      startY: 35,
      head: [cols],
      body: rows,
      styles:       { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles:   { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { [cols.length - 1]: { cellWidth: 60 } },
      margin: { left: 12, right: 12 },
    });

    // ── Summary table ──
    const sumY = doc.lastAutoTable.finalY + 10;
    doc.setTextColor(...BLUE);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Resumen Estadístico', 12, sumY);

    autoTable(doc, {
      startY: sumY + 4,
      head: [['Métrica', 'Valor']],
      body: [
        ['Promedio de Estrellas (Q2)', `${starAvg} / 5`],
        ['NPS Score (Q3)', `${npsScore} (de -100 a +100)`],
        ['Detractores (0–6)', `${detractors}  (${pct(detractors)})`],
        ['Pasivos (7–8)',     `${passives}  (${pct(passives)})`],
        ['Promotores (9–10)', `${promoters}  (${pct(promoters)})`],
        ...CSAT_OPTIONS.map(o => [`Q1 — ${o}`, `${q1Counts[o]}  (${pct(q1Counts[o])})`]),
      ],
      styles:     { fontSize: 8 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
      margin: { left: 12, right: 12 },
    });

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(...GRAY);
      doc.text(`Página ${i} de ${pageCount}  ·  Generado por DATAFORM`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
    }

    doc.save(`${slug}_${isoDate}.pdf`);
    triggerDone();
  };

  const triggerDone = () => {
    setExportState('done');
    setExportMenu(false);
    setTimeout(() => setExportState('idle'), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analítica del Proyecto</h1>
          <p className="text-sm text-slate-500 mt-1">{questions?.[0] ? `"${questions[0].text?.slice(0, 50)}…"` : ''} · {MOCK_RESPONSES.length} respuestas</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenu(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm border ${
              exportState === 'done'
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {exportState === 'done' ? <Check size={15} /> : <Download size={15} />}
            {exportState === 'done' ? '¡Exportado!' : 'Exportar'}
            {exportState !== 'done' && <ChevronDown size={13} />}
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[150px]">
              <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                <Sheet size={14} className="text-emerald-600" /> CSV (.csv)
              </button>
              <button onClick={handleExportJSON} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                <FileJson size={14} className="text-blue-600" /> JSON (.json)
              </button>
              <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5">
                <FileText size={14} className="text-red-500" /> PDF (.pdf)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cross-tab filter */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-blue-700">
          <Filter size={15} />
          <span className="text-sm font-bold">Filtro Cross-tab</span>
        </div>
        <span className="text-sm text-slate-600">Segmentar por satisfacción (Q1):</span>
        <select
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white outline-none focus:border-blue-600"
        >
          <option value="">Todos los usuarios ({MOCK_RESPONSES.length})</option>
          {CSAT_OPTIONS.map(opt => {
            const n = MOCK_RESPONSES.filter(r => r.answers[1] === opt).length;
            return <option key={opt} value={opt}>{opt} ({n})</option>;
          })}
        </select>
        {filterValue && (
          <>
            <span className="text-sm font-semibold text-blue-700">{filtered.length} respuestas coinciden</span>
            <button onClick={() => setFilterValue('')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 ml-auto">
              <X size={13} /> Limpiar filtro
            </button>
          </>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <KpiCard label="Respuestas Totales" value={filtered.length} color="text-blue-600" />
        <KpiCard label="Tasa de Finalización" value="60.4%" color="text-emerald-600" />
        <KpiCard label="Tiempo Medio" value="1m 45s" color="text-slate-700" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-slate-800">Embudo de Abandono</h3>
            <ChartToggle
              value={chartTypeFunnel}
              onChange={setChartTypeFunnel}
              options={[{ value: 'area', label: 'Área' }, { value: 'bar', label: 'Barras' }, { value: 'line', label: 'Línea' }]}
            />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {chartTypeFunnel === 'area' ? (
                <AreaChart data={FUNNEL_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" fill="#bfdbfe" strokeWidth={3} />
                </AreaChart>
              ) : chartTypeFunnel === 'bar' ? (
                <BarChart data={FUNNEL_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={FUNNEL_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-slate-800">Respuestas por Día</h3>
            <ChartToggle
              value={chartTypeDaily}
              onChange={setChartTypeDaily}
              options={[{ value: 'bar', label: 'Barras' }, { value: 'line', label: 'Línea' }, { value: 'area', label: 'Área' }]}
            />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {chartTypeDaily === 'bar' ? (
                <BarChart data={BAR_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="resp" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartTypeDaily === 'line' ? (
                <LineChart data={BAR_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="resp" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <AreaChart data={BAR_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="resp" stroke="#2563eb" fill="#bfdbfe" strokeWidth={3} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Question breakdown */}
      <h2 className="text-xl font-bold text-slate-900 pt-4 border-t">Desglose por Pregunta</h2>

      {/* Q1 — chart with type selector */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-1 gap-4">
          <h3 className="font-semibold text-lg text-slate-800">
            <span className="text-blue-600 mr-2">Q1.</span>
            {questions?.[0]?.text || '¿Cómo calificaría nuestro servicio general?'}
          </h3>
          <ChartToggle
            value={chartTypeQ1}
            onChange={setChartTypeQ1}
            options={[
              { value: 'donut',  label: 'Dona' },
              { value: 'pie',    label: 'Pastel' },
              { value: 'bar',    label: 'Barras' },
              { value: 'hbar',   label: 'Horizontal' },
            ]}
          />
        </div>
        {filterValue && <p className="text-xs text-blue-600 font-medium mb-2">Filtrado por: {filterValue}</p>}

        {pieData.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-8 text-center">Sin datos para el filtro seleccionado.</p>
        ) : (chartTypeQ1 === 'donut' || chartTypeQ1 === 'pie') ? (
          <div className="flex flex-col sm:flex-row items-center mt-4 gap-4">
            <div className="w-full sm:w-1/2 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={chartTypeQ1 === 'donut' ? 55 : 0}
                    outerRadius={80}
                    paddingAngle={chartTypeQ1 === 'donut' ? 4 : 1}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-3">
              {pieData.map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-700 font-medium">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{entry.value} <span className="text-slate-400 font-normal">resp.</span></span>
                </div>
              ))}
            </div>
          </div>
        ) : chartTypeQ1 === 'bar' ? (
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Respuestas" radius={[4, 4, 0, 0]}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* hbar — horizontal */
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={120} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Respuestas" radius={[0, 4, 4, 0]}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Q4 — word cloud + responses */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="font-semibold text-lg text-slate-800 mb-1">
          <span className="text-blue-600 mr-2">Q4.</span>
          {questions?.[3]?.text || '¿Qué podríamos hacer para mejorar su experiencia?'}
        </h3>
        {filterValue && <p className="text-xs text-blue-600 font-medium mb-3">Filtrado por: {filterValue} ({textAnswers.length} respuestas)</p>}

        {wordFreq.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Nube de Palabras</p>
            <div className="bg-slate-50 rounded-lg p-5 flex flex-wrap gap-2 justify-center min-h-[100px] items-center border border-slate-100">
              <WordCloud words={wordFreq} />
            </div>
          </div>
        )}

        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Respuestas ({textAnswers.length})</p>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {filtered.map(r => r.answers[4] && (
            <div key={r.id} className="p-4 bg-slate-50 border rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-400">{r.timestamp}</span>
                <SentimentBadge text={r.answers[4]} />
              </div>
              <p className="text-sm text-slate-700">"{r.answers[4]}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comportamiento */}
      {behaviorData && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 pt-4 border-t">Comportamiento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Tiempo promedio por pregunta</h3>
              <HBarChart data={behaviorData.avgTimes} />
              <p className="text-xs text-slate-400 mt-3">Estimado basado en respuestas registradas</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Embudo de abandono</h3>
              <FunnelChart data={behaviorData.funnel} />
              {behaviorData.funnel.some(f => f.isWorst) && (
                <p className="text-xs text-red-500 mt-3 font-medium">
                  ● Mayor abandono en {behaviorData.funnel.find(f => f.isWorst)?.label}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Raw data table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-12">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-slate-800">Tabla de Respuestas Individuales</h3>
            <p className="text-xs text-slate-400 mt-0.5">{tableRows.length} de {filtered.length} registros</p>
          </div>
          {surveyConfig?.requireName && (
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                placeholder="Buscar evaluador..."
                className="pl-8 pr-8 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-52 transition-all"
              />
              {nameSearch && (
                <button onClick={() => setNameSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {tableRows.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="font-medium">Sin resultados para "{nameSearch}"</p>
            <button onClick={() => setNameSearch('')} className="mt-2 text-sm text-blue-600 hover:underline">Limpiar búsqueda</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {surveyConfig?.requireName && <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Evaluador</th>}
                  <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Fecha</th>
                  <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Q1 Satisfacción</th>
                  <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Q2 Estrellas</th>
                  <th className="text-left py-2 text-slate-500 font-semibold">Q3 NPS</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {surveyConfig?.requireName && (
                      <td className="py-2.5 pr-4 font-semibold text-slate-800">
                        {nameSearch ? <Highlight text={r.name} query={nameSearch} /> : r.name}
                      </td>
                    )}
                    <td className="py-2.5 pr-4 text-slate-500 text-xs">{r.timestamp}</td>
                    <td className="py-2.5 pr-4 text-slate-700 font-medium">{r.answers[1]}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-amber-400">{'★'.repeat(r.answers[2] || 0)}</span><span className="text-slate-200">{'★'.repeat(5 - (r.answers[2] || 0))}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.answers[3] >= 9 ? 'bg-green-100 text-green-700' : r.answers[3] >= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {r.answers[3]}
                      </span>
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

function KpiCard({ label, value, color }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</h3>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function WordCloud({ words }) {
  const max = words[0]?.[1] || 1;
  const palette = ['#2563eb', '#3b82f6', '#1d4ed8', '#0ea5e9', '#6366f1', '#8b5cf6'];
  return (
    <>
      {words.map(([word, count], i) => {
        const size = 11 + Math.round((count / max) * 22);
        const opacity = 0.45 + (count / max) * 0.55;
        return (
          <span
            key={word}
            className="font-semibold cursor-default select-none hover:opacity-100 transition-opacity"
            style={{ fontSize: `${size}px`, opacity, color: palette[i % palette.length] }}
            title={`${count} menciones`}
          >
            {word}
          </span>
        );
      })}
    </>
  );
}

function SentimentBadge({ text }) {
  const positive = ['excelente', 'buena', 'rápido', 'satisfecho', 'bueno', 'supera', 'muy bien'];
  const negative = ['lento', 'tarda', 'pésima', 'falla', 'soporte', 'urgentes', 'poco útil'];
  const t = text.toLowerCase();
  const isPos = positive.some(w => t.includes(w));
  const isNeg = negative.some(w => t.includes(w));
  if (isPos && !isNeg) return <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded">Positivo (IA)</span>;
  if (isNeg) return <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded">Crítico (IA)</span>;
  return <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">Neutral (IA)</span>;
}

function ChartToggle({ options, value, onChange }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200 flex-shrink-0">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
            value === opt.value
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function HBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.seconds), 1);
  const ROW_H = 36;
  const LABEL_W = 108;
  const BAR_MAX = 200;
  const W = LABEL_W + BAR_MAX + 52;
  const H = data.length * ROW_H + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Tiempo por pregunta">
      {data.map((d, i) => {
        const barW = Math.max(3, (d.seconds / maxVal) * BAR_MAX);
        const y = i * ROW_H;
        return (
          <g key={i}>
            <text x={LABEL_W - 6} y={y + 22} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="system-ui, sans-serif">
              {d.label.length > 16 ? d.label.slice(0, 15) + '…' : d.label}
            </text>
            <rect x={LABEL_W} y={y + 9} width={barW} height={20} rx="3" fill="#2563eb" opacity="0.72" />
            <text x={LABEL_W + barW + 5} y={y + 22} fontSize="10" fill="#64748b" fontFamily="system-ui, sans-serif">
              {d.seconds}s
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FunnelChart({ data }) {
  if (!data || data.length === 0) return null;
  const STEP_H = 54;
  const W = 320;
  const MAX_W = 260;
  const H = data.length * STEP_H + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto" aria-label="Embudo de abandono">
      {data.map((d, i) => {
        const barW = Math.max(24, (d.percentage / 100) * MAX_W);
        const x = (W - barW) / 2;
        const y = i * STEP_H;
        const fill = d.isWorst ? '#ef4444' : '#2563eb';
        const opacity = Math.max(0.38, 1 - i * (0.52 / Math.max(data.length, 1)));
        return (
          <g key={i}>
            <rect x={x} y={y + 2} width={barW} height={36} rx="4" fill={fill} opacity={opacity} />
            <text x={W / 2} y={y + 24} textAnchor="middle" fontSize="9.5" fill="white" fontWeight="bold" fontFamily="system-ui, sans-serif">
              {d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label} — {d.count} ({d.percentage}%)
            </text>
            {i < data.length - 1 && d.dropoff > 0 && (
              <text x={W / 2} y={y + 50} textAnchor="middle" fontSize="9" fill={d.isWorst ? '#ef4444' : '#94a3b8'} fontFamily="system-ui, sans-serif">
                ↓ -{d.dropoff}% abandono
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Highlight({ text, query }) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
