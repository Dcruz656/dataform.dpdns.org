import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, RefreshCw, Download, FileText, Sheet, TrendingUp, Users, Clock, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COLORS } from '../constants';
import { responsesApi, surveysApi } from '../lib/db';

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
function downloadCSV(filename, rows) {
  const esc = v => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

/* ── Data helpers ─────────────────────────────────────────────────── */
function getNumericAvg(responses, qId) {
  const vals = responses.map(r => r.answers?.[qId]).filter(v => v != null && !isNaN(Number(v))).map(Number);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function getChoiceCounts(responses, qId) {
  const counts = {};
  responses.forEach(r => { const v = r.answers?.[qId]; if (v != null && v !== '') counts[String(v)] = (counts[String(v)] || 0) + 1; });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
function getNPSScore(responses, qId) {
  const vals = responses.map(r => r.answers?.[qId]).filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!vals.length) return null;
  const det = vals.filter(n => n <= 6).length;
  const pro = vals.filter(n => n >= 9).length;
  return Math.round(((pro - det) / vals.length) * 100);
}

/* ── Trend chart (SVG, real data) ─────────────────────────────────── */
function TrendChart({ responses }) {
  const days = useMemo(() => {
    const map = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    responses.forEach(r => { const k = r.submitted_at?.slice(0, 10); if (k && k in map) map[k]++; });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [responses]);

  const maxVal = Math.max(...days.map(d => d.count), 1);
  const n = days.length;

  const toPoint = (i, count) => {
    const x = (i / (n - 1)) * 100;
    const y = 100 - (count / maxVal) * 85;
    return `${x},${y}`;
  };
  const linePath = days.map((d, i) => `${i === 0 ? 'M' : 'L'}${toPoint(i, d.count)}`).join(' ');
  const fillPath = `${linePath} L100,100 L0,100 Z`;

  const labels = [days[0]?.date, days[7]?.date, days[14]?.date, days[21]?.date, days[n - 1]?.date]
    .map(d => d ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(new Date(d)) : '');

  return (
    <div className="flex-1 w-full relative min-h-[220px] flex items-end">
      <div className="absolute inset-0 flex flex-col justify-between pb-8 pointer-events-none">
        {[0,1,2,3,4].map(i => <div key={i} className="border-b border-surface-container-highest w-full h-0" />)}
      </div>
      <svg className="absolute inset-0 w-full h-[calc(100%-2rem)]" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="lg" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#1f108e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1f108e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#lg)" />
        <path d={linePath} fill="none" stroke="#1f108e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="w-full flex justify-between text-xs text-on-surface-variant absolute bottom-0 left-0">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

/* ── CSS Donut chart ─────────────────────────────────────────────── */
function DonutChart({ questions, responses }) {
  const mcQ = questions.find(q => q.type === 'multiple_choice');
  const items = useMemo(() => {
    if (!mcQ) return [];
    const counts = getChoiceCounts(responses, mcQ.id);
    const total = counts.reduce((s, c) => s + c.value, 0) || 1;
    return counts.slice(0, 4).map((c, i) => ({ ...c, pct: Math.round((c.value / total) * 100), color: ['#1f108e','#416656','#003421','#e2dfff'][i] }));
  }, [mcQ, responses]);

  const stops = useMemo(() => {
    let acc = 0;
    return items.map(it => { const from = acc; acc += it.pct; return `${it.color} ${from}% ${acc}%`; }).join(', ');
  }, [items]);

  const total = responses.length;

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-36 h-36 donut-chart flex items-center justify-center mb-5"
        style={{ background: items.length ? `conic-gradient(${stops})` : `conic-gradient(#e2dfff 0% 100%)` }}
      >
        <div className="text-center z-10 relative">
          <span className="block text-2xl font-bold text-on-surface leading-none">{total >= 1000 ? `${(total/1000).toFixed(1)}k` : total}</span>
          <span className="block text-xs text-on-surface-variant">Total</span>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="w-full flex flex-col gap-2.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: it.color }} />
                <span className="text-on-surface truncate max-w-[130px]">{it.name}</span>
              </div>
              <span className="font-semibold text-on-surface">{it.pct}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-on-surface-variant text-center">Sin datos de distribución</p>
      )}
    </div>
  );
}

/* ── Per-question horizontal bars ────────────────────────────────── */
function QuestionBars({ questions, responses }) {
  const realQs = questions.filter(q => q.type !== 'section');
  if (!realQs.length) return <p className="text-sm text-on-surface-variant italic">Sin preguntas.</p>;

  return (
    <div className="flex flex-col gap-6">
      {realQs.map((q, i) => {
        let display = null;

        if (q.type === 'multiple_choice') {
          const counts = getChoiceCounts(responses, q.id);
          const total = counts.reduce((s, c) => s + c.value, 0) || 1;
          const top = counts[0];
          if (!top) return null;
          const pct = Math.round((top.value / total) * 100);
          display = { label: `"${top.name}"`, score: `${pct}%`, pct, color: 'bg-primary' };
        } else if (q.type === 'rating') {
          const avg = getNumericAvg(responses, q.id);
          if (avg === null) return null;
          display = { label: `${avg.toFixed(1)} / ${q.maxStars || 5} ★`, score: `${avg.toFixed(1)}`, pct: Math.round((avg / (q.maxStars || 5)) * 100), color: 'bg-amber-400' };
        } else if (q.type === 'nps') {
          const score = getNPSScore(responses, q.id);
          if (score === null) return null;
          display = { label: `NPS Score`, score: String(score), pct: Math.round(((score + 100) / 200) * 100), color: score >= 50 ? 'bg-secondary' : score >= 0 ? 'bg-amber-400' : 'bg-error' };
        } else if (q.type === 'slider') {
          const avg = getNumericAvg(responses, q.id);
          if (avg === null) return null;
          const max = q.max ?? 10;
          display = { label: `Promedio ${avg.toFixed(1)} / ${max}`, score: avg.toFixed(1), pct: Math.round((avg / max) * 100), color: 'bg-primary' };
        } else {
          const count = responses.filter(r => r.answers?.[q.id]?.toString().trim()).length;
          if (!count) return null;
          display = { label: `${count} respuestas abiertas`, score: String(count), pct: Math.round((count / responses.length) * 100), color: 'bg-surface-tint' };
        }

        if (!display) return null;
        return (
          <div key={q.id} className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface font-medium truncate max-w-[70%]">
                <span className="text-on-surface-variant mr-1">P{i + 1}.</span>{q.text || '(sin texto)'}
              </span>
              <span className="text-on-surface-variant flex-shrink-0">{display.label}</span>
            </div>
            <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden">
              <div className={`${display.color} h-full rounded-full transition-all`} style={{ width: `${Math.max(display.pct, 2)}%` }} />
            </div>
          </div>
        );
      }).filter(Boolean)}
    </div>
  );
}

/* ── Survey selector list ─────────────────────────────────────────── */
function SurveyList({ surveys, onSelect }) {
  if (!surveys.length) return (
    <div className="text-center py-16 text-on-surface-variant">
      <span className="material-symbols-outlined text-5xl opacity-20 block mb-3">analytics</span>
      <p className="font-semibold">No tienes encuestas creadas</p>
      <p className="text-sm mt-1">Crea una encuesta en el Constructor para ver su analítica aquí.</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {surveys.map(s => (
        <button key={s.id} onClick={() => onSelect(s)}
          className="w-full text-left bg-surface-container-lowest border border-surface-variant rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group ambient-shadow"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{s.name}</p>
              <p className="text-xs text-on-surface-variant mt-1">Actualizada {fmtDateShort(s.updatedAt)}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.statusColor}`}>{s.status}</span>
              <span className="text-sm font-bold text-on-surface-variant">{s.responses ?? 0} <span className="text-xs font-normal">resp.</span></span>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── PDF export ───────────────────────────────────────────────────── */
function exportPDF({ survey, questions, responses }) {
  const BLUE = [37,99,235]; const GRAY = [100,116,139]; const LIGHT = [248,250,252];
  const title = survey.title ?? survey.name ?? 'Encuesta';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLUE); doc.rect(0,0,W,20,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text('DATAFORM', 12, 13);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text(`Reporte — ${title}`, 42, 13);
  doc.setFontSize(8); doc.text(new Date().toLocaleString('es-MX'), W-12, 13, { align:'right' });
  doc.setFillColor(...LIGHT); doc.rect(0,20,W,12,'F');
  doc.setTextColor(...GRAY); doc.setFontSize(8);
  doc.text(`Total respuestas: ${responses.length}   ·   Primera: ${fmtDateShort(responses[responses.length-1]?.submitted_at)}   ·   Última: ${fmtDateShort(responses[0]?.submitted_at)}`, 12, 28);
  let y = 38;
  const realQs = questions.filter(q => q.type !== 'section');
  realQs.forEach((q, qi) => {
    if (y > 170) { doc.addPage(); y = 15; }
    doc.setTextColor(...BLUE); doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text(`P${qi+1}. ${(q.text||'').slice(0,80)}`, 12, y);
    let body = [];
    if (q.type === 'multiple_choice') { const c = getChoiceCounts(responses, q.id); body = c.map(d=>[d.name, d.value, responses.length ? `${Math.round((d.value/responses.length)*100)}%`:'-']); }
    else if (q.type === 'rating') { const a = getNumericAvg(responses,q.id); body = a!=null?[[`Promedio: ${a.toFixed(2)} / ${q.maxStars||5}`,responses.length]]:[['-',0]]; }
    else if (q.type === 'nps') { const s = getNPSScore(responses,q.id); body = s!=null?[[`NPS: ${s}`,responses.length]]:[['-',0]]; }
    else if (q.type === 'slider') { const a = getNumericAvg(responses,q.id); body = a!=null?[[`Promedio: ${a.toFixed(2)}`,'']]:[['-','']]; }
    else { const t = responses.map(r=>r.answers?.[q.id]).filter(v=>v?.toString().trim()).slice(0,8); body = t.map((v,i)=>[`${i+1}.`,String(v).slice(0,120)]); }
    if (body.length) { autoTable(doc, { startY:y+5, head:[['Respuesta','Cantidad','%']], body, styles:{fontSize:7}, headStyles:{fillColor:BLUE,textColor:255}, margin:{left:12,right:12}, tableWidth:180 }); }
    y = (doc.lastAutoTable?.finalY ?? y+5) + 8;
  });
  if (responses.length) {
    if (y>160) { doc.addPage(); y=15; }
    doc.setTextColor(...BLUE); doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.text('Respuestas individuales',12,y);
    autoTable(doc,{ startY:y+4, head:[['Nombre','Fecha',...realQs.slice(0,5).map((_,i)=>`P${i+1}`)]], body:responses.map(r=>[r.respondent_name||'—',fmtDateShort(r.submitted_at),...realQs.slice(0,5).map(q=>{const v=r.answers?.[q.id]; return v==null?'—':typeof v==='object'?Object.values(v).join(', '):String(v).slice(0,30);})]), styles:{fontSize:7.5},headStyles:{fillColor:BLUE,textColor:255},alternateRowStyles:{fillColor:LIGHT},margin:{left:12,right:12} });
  }
  const pg = doc.internal.getNumberOfPages();
  for(let i=1;i<=pg;i++){ doc.setPage(i); doc.setFontSize(7); doc.setTextColor(...GRAY); doc.text(`Página ${i} de ${pg} · DataForm`,W/2,doc.internal.pageSize.getHeight()-6,{align:'center'}); }
  const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-');
  doc.save(`${slug}_${new Date().toISOString().slice(0,10)}.pdf`);
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
    setLoading(true); setError(null); setResponses([]); setQuestions([]);
    try {
      const [full, resps] = await Promise.all([surveysApi.get(surveyListItem.id), responsesApi.list(surveyListItem.id)]);
      setSelectedSurvey(full); setQuestions(full.questions ?? []); setResponses(resps ?? []);
    } catch (err) { setError(err?.message || 'Error al cargar datos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialSurveyId && surveys.length) { const m = surveys.find(s => s.id === initialSurveyId); if (m) loadSurvey(m); }
  }, []); // eslint-disable-line

  const realQs = questions.filter(q => q.type !== 'section');
  const totalResps = responses.length;
  const firstDate  = totalResps ? fmtDateShort(responses[totalResps-1]?.submitted_at) : '—';
  const lastDate   = totalResps ? fmtDateShort(responses[0]?.submitted_at) : '—';
  const npsQ = realQs.find(q => q.type === 'nps');
  const npsScore = npsQ ? getNPSScore(responses, npsQ.id) : null;

  // avg timings
  const avgMs = useMemo(() => {
    const times = responses.flatMap(r => Array.isArray(r.timings) ? r.timings.map(t => t.duration_ms).filter(Boolean) : []);
    return times.length ? times.reduce((a,b)=>a+b,0)/times.length : null;
  }, [responses]);
  const avgTimeStr = avgMs ? `${Math.floor(avgMs/60000)}m ${Math.floor((avgMs%60000)/1000)}s` : '—';

  const handleCSV = () => {
    if (!responses.length) return;
    const header = ['ID','Nombre','Fecha',...realQs.map((q,i)=>`P${i+1}. ${(q.text||'').slice(0,40)}`),'Puntaje','Resultado'];
    const rows = responses.map(r=>[r.id?.slice(0,8),r.respondent_name??'',fmtDate(r.submitted_at),...realQs.map(q=>{const v=r.answers?.[q.id];return v==null?'':typeof v==='object'?JSON.stringify(v):String(v);}),r.score??'',r.score_range_title??'']);
    const slug = (selectedSurvey?.title||'encuesta').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    downloadCSV(`${slug}_${new Date().toISOString().slice(0,10)}.csv`,[header,...rows]);
    setExportMenu(false);
  };
  const handlePDF = () => { if (!responses.length||!selectedSurvey) return; exportPDF({survey:selectedSurvey,questions,responses}); setExportMenu(false); };

  /* ── Survey list ── */
  if (!selectedSurvey) return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Analítica</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Selecciona una encuesta para ver sus resultados</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32 gap-3 text-on-surface-variant">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando...</span>
        </div>
      ) : <SurveyList surveys={surveys} onSelect={loadSurvey} />}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => { setSelectedSurvey(null); setResponses([]); setQuestions([]); }}
              className="text-on-surface-variant hover:text-on-surface transition-colors mr-1">
              <ChevronLeft size={20} />
            </button>
            <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded-md text-xs font-bold uppercase tracking-wider">
              {selectedSurvey.is_active ? 'Activa' : 'Borrador'}
            </span>
            <span className="text-sm text-on-surface-variant">Creada el {fmtDateShort(selectedSurvey.created_at)}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">{selectedSurvey.title ?? selectedSurvey.name}</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => loadSurvey({ id: selectedSurvey.id })} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <div className="relative">
            <button onClick={() => setExportMenu(v=>!v)} disabled={!totalResps}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-surface-tint transition-colors shadow-sm disabled:opacity-40">
              <Download size={15} /> Exportar
            </button>
            {exportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-surface-variant rounded-xl shadow-lg z-20 py-1 min-w-[150px]">
                <button onClick={handleCSV} className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2.5">
                  <Sheet size={14} className="text-secondary" /> Excel / CSV
                </button>
                <button onClick={handlePDF} className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2.5">
                  <FileText size={14} className="text-error" /> PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="bg-error-container text-on-error-container rounded-xl p-4 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-3 text-on-surface-variant">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando respuestas...</span>
        </div>
      ) : totalResps === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant ambient-shadow p-14 text-center">
          <span className="material-symbols-outlined text-5xl opacity-20 block mb-3">bar_chart</span>
          <p className="font-semibold text-on-surface-variant">Todavía no hay respuestas</p>
          <p className="text-sm text-on-surface-variant/70 mt-1">Comparte el enlace para empezar a recopilar datos.</p>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon="groups" iconColor="text-primary" label="Total Respuestas" value={totalResps.toLocaleString('es-MX')}
              sub={<span className="flex items-center gap-1 text-on-tertiary-container"><TrendingUp size={13} /> Primera: {firstDate}</span>} />
            <KpiCard icon="check_circle" iconColor="text-secondary" label="Última Respuesta" value={lastDate}
              sub={<div className="w-full bg-surface-container-highest h-2 rounded-full mt-1 overflow-hidden"><div className="bg-secondary h-full rounded-full" style={{ width: '100%' }} /></div>} />
            <KpiCard icon="timer" iconColor="text-primary-container" label="Tiempo Promedio" value={avgTimeStr}
              sub={<span className="text-on-surface-variant text-xs">Por respuesta</span>} />
            {npsScore !== null ? (
              <div className="bg-surface-container-lowest p-5 rounded-xl ambient-shadow border border-surface-variant flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute -right-3 -bottom-3 opacity-5">
                  <span className="material-symbols-outlined" style={{ fontSize: 80 }}>thumb_up</span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant relative z-10">
                  <span className="text-xs font-semibold uppercase tracking-wide">Puntuación NPS</span>
                  <span className="material-symbols-outlined text-tertiary text-[18px]">thumb_up</span>
                </div>
                <div className={`text-3xl font-bold relative z-10 ${npsScore >= 50 ? 'text-secondary' : npsScore >= 0 ? 'text-amber-600' : 'text-error'}`}>{npsScore}</div>
                <div className="text-xs text-on-tertiary-container relative z-10">{npsScore >= 50 ? 'Excelente (Promotor)' : npsScore >= 0 ? 'Aceptable' : 'Crítico'}</div>
              </div>
            ) : (
              <KpiCard icon="star" iconColor="text-amber-500" label="Preguntas" value={realQs.length}
                sub={<span className="text-on-surface-variant text-xs">{questions.filter(q=>q.type==='section').length} secciones</span>} />
            )}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Line chart */}
            <div className="md:col-span-3 bg-surface-container-lowest p-6 rounded-xl ambient-shadow border border-surface-variant flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-semibold text-on-surface">Tendencia de Respuestas</h3>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-on-surface-variant"><div className="w-2 h-2 rounded-full bg-primary" /> Total</span>
                </div>
              </div>
              <TrendChart responses={responses} />
            </div>

            {/* Donut */}
            <div className="bg-surface-container-lowest p-6 rounded-xl ambient-shadow border border-surface-variant flex flex-col">
              <h3 className="text-xl font-semibold text-on-surface mb-5">
                {questions.find(q=>q.type==='multiple_choice')?.text?.slice(0,30) || 'Distribución'}
              </h3>
              <DonutChart questions={questions} responses={responses} />
            </div>
          </div>

          {/* Horizontal bar chart */}
          {realQs.length > 0 && (
            <div className="bg-surface-container-lowest p-6 rounded-xl ambient-shadow border border-surface-variant">
              <h3 className="text-xl font-semibold text-on-surface mb-6">Resultados por Pregunta</h3>
              <QuestionBars questions={questions} responses={responses} />
            </div>
          )}

          {/* Responses table */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant ambient-shadow overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-surface-variant flex items-center justify-between">
              <h3 className="font-semibold text-on-surface">Respuestas individuales</h3>
              <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full font-medium">{totalResps} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                    {selectedSurvey.require_name && <th className="px-5 py-3 text-left">Nombre</th>}
                    <th className="px-5 py-3 text-left">Fecha</th>
                    {selectedSurvey.score_ranges?.length > 0 && <th className="px-5 py-3 text-left">Puntaje</th>}
                    {realQs.slice(0,4).map((q,i) => <th key={q.id} className="px-5 py-3 text-left">P{i+1}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {responses.map(r => (
                    <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                      {selectedSurvey.require_name && <td className="px-5 py-3 font-medium text-on-surface">{r.respondent_name||'—'}</td>}
                      <td className="px-5 py-3 text-xs text-on-surface-variant whitespace-nowrap">{fmtDate(r.submitted_at)}</td>
                      {selectedSurvey.score_ranges?.length > 0 && (
                        <td className="px-5 py-3">
                          {r.score!=null?<span className="font-bold text-primary">{r.score}</span>:'—'}
                          {r.score_range_title&&<span className="ml-1 text-xs text-on-surface-variant">({r.score_range_title})</span>}
                        </td>
                      )}
                      {realQs.slice(0,4).map(q => {
                        const v = r.answers?.[q.id];
                        const txt = v==null?'—':typeof v==='object'?Object.values(v).join(', '):String(v).slice(0,40);
                        return <td key={q.id} className="px-5 py-3 text-on-surface-variant max-w-[160px] truncate" title={String(v??'')}>{txt}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, iconColor, label, value, sub }) {
  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl ambient-shadow border border-surface-variant flex flex-col gap-2">
      <div className={`flex items-center justify-between text-on-surface-variant`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-on-surface">{value}</div>
      <div className="text-xs text-on-surface-variant">{sub}</div>
    </div>
  );
}
