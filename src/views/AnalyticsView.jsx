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

/* ── Per-question rich cards ─────────────────────────────────────── */
function EmptyQ() {
  return <p className="text-sm text-on-surface-variant italic py-4 text-center">Sin respuestas para esta pregunta.</p>;
}

function MatrixChart({ question, responses }) {
  const { rows = [], columns = [], columnColors = [] } = question;
  const answered = responses.filter(r => r.answers?.[question.id] && typeof r.answers[question.id] === 'object');
  if (!answered.length) return <EmptyQ />;
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {columns.map((col, ci) => (
          <div key={ci} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: columnColors[ci] || '#94a3b8' }} />
            <span className="text-xs text-on-surface-variant">{col}</span>
          </div>
        ))}
      </div>
      {/* Per-row stacked bars */}
      <div className="space-y-5">
        {rows.map(row => {
          const counts = {};
          columns.forEach(col => { counts[col] = 0; });
          answered.forEach(r => { const v = r.answers[question.id]?.[row]; if (v != null && v in counts) counts[v]++; });
          const total = answered.length;
          return (
            <div key={row} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface">{row}</span>
                <span className="text-xs text-on-surface-variant">{total} resp.</span>
              </div>
              {/* Stacked bar */}
              <div className="flex h-9 rounded-xl overflow-hidden gap-px">
                {columns.map((col, ci) => {
                  const count = counts[col] || 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  const color = columnColors[ci] || '#94a3b8';
                  if (pct === 0) return null;
                  return (
                    <div key={ci} className="flex items-center justify-center text-white text-xs font-bold transition-all relative group/seg"
                      style={{ width: `${pct}%`, backgroundColor: color, minWidth: 3 }}
                      title={`${col}: ${count} (${Math.round(pct)}%)`}
                    >
                      {pct >= 12 ? `${Math.round(pct)}%` : ''}
                    </div>
                  );
                })}
              </div>
              {/* Per-column breakdown */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {columns.map((col, ci) => {
                  const count = counts[col] || 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <span key={ci} className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: columnColors[ci] || '#94a3b8' }} />
                      {col}: <strong className="text-on-surface ml-0.5">{count}</strong>
                      <span className="text-on-surface-variant/60">({pct}%)</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceChart({ question, responses }) {
  const counts = getChoiceCounts(responses, question.id);
  const total = counts.reduce((s, c) => s + c.value, 0) || 1;
  if (!counts.length) return <EmptyQ />;
  const PALETTE = ['#1f108e','#416656','#544fc0','#003421','#c8c4d5','#a8cfbc'];
  return (
    <div className="space-y-3">
      {counts.map((d, i) => {
        const pct = Math.round((d.value / total) * 100);
        return (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface font-medium flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                {d.name}
              </span>
              <span className="text-on-surface-variant font-semibold">{d.value} <span className="font-normal text-xs">({pct}%)</span></span>
            </div>
            <div className="h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingChart({ question, responses }) {
  const max = question.maxStars || 5;
  const avg = getNumericAvg(responses, question.id);
  const vals = responses.map(r => r.answers?.[question.id]).filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!vals.length) return <EmptyQ />;
  const dist = Array.from({ length: max }, (_, i) => ({ star: i + 1, count: vals.filter(v => v === i + 1).length })).reverse();
  const maxCount = Math.max(...dist.map(d => d.count), 1);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-amber-500">{avg?.toFixed(1)}</span>
        <span className="text-on-surface-variant text-sm">/ {max} promedio</span>
        <div className="flex gap-0.5 ml-1">
          {Array.from({ length: max }).map((_, i) => (
            <span key={i} className={`text-xl ${i < Math.round(avg ?? 0) ? 'text-amber-400' : 'text-surface-container-highest'}`}>★</span>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {dist.map(d => (
          <div key={d.star} className="flex items-center gap-3">
            <span className="text-xs font-bold text-amber-500 w-8 text-right flex-shrink-0">{d.star}★</span>
            <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
            </div>
            <span className="text-xs text-on-surface-variant w-20 flex-shrink-0">
              {d.count} ({vals.length ? Math.round((d.count / vals.length) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NPSChart({ question, responses }) {
  const vals = responses.map(r => r.answers?.[question.id]).filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!vals.length) return <EmptyQ />;
  const det = vals.filter(n => n <= 6);
  const pas = vals.filter(n => n >= 7 && n <= 8);
  const pro = vals.filter(n => n >= 9);
  const score = Math.round(((pro.length - det.length) / vals.length) * 100);
  const total = vals.length;
  const detPct = Math.round((det.length / total) * 100);
  const pasPct = Math.round((pas.length / total) * 100);
  const proPct = Math.round((pro.length / total) * 100);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className={`text-5xl font-bold ${score >= 50 ? 'text-secondary' : score >= 0 ? 'text-amber-500' : 'text-error'}`}>{score}</span>
        <span className="text-on-surface-variant text-sm">NPS Score (−100 a +100)</span>
      </div>
      <div className="flex h-9 rounded-xl overflow-hidden gap-px">
        {detPct > 0 && <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: `${detPct}%`, backgroundColor: '#ef4444' }}>{detPct >= 8 ? `${detPct}%` : ''}</div>}
        {pasPct > 0 && <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: `${pasPct}%`, backgroundColor: '#f59e0b' }}>{pasPct >= 8 ? `${pasPct}%` : ''}</div>}
        {proPct > 0 && <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: `${proPct}%`, backgroundColor: '#22c55e' }}>{proPct >= 8 ? `${proPct}%` : ''}</div>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <p className="text-xs font-semibold text-red-500 mb-1">Detractores 0–6</p>
          <p className="text-2xl font-bold text-red-600">{det.length}</p>
          <p className="text-xs text-red-400">{detPct}%</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-xs font-semibold text-amber-500 mb-1">Pasivos 7–8</p>
          <p className="text-2xl font-bold text-amber-600">{pas.length}</p>
          <p className="text-xs text-amber-400">{pasPct}%</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs font-semibold text-green-500 mb-1">Promotores 9–10</p>
          <p className="text-2xl font-bold text-green-600">{pro.length}</p>
          <p className="text-xs text-green-400">{proPct}%</p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => {
          const count = vals.filter(n => n === i).length;
          const color = i <= 6 ? '#ef4444' : i <= 8 ? '#f59e0b' : '#22c55e';
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color, opacity: count > 0 ? 1 : 0.2 }}>{i}</span>
              <span className="text-[10px] text-on-surface-variant">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SliderChart({ question, responses }) {
  const min = question.min ?? 0;
  const max = question.max ?? 10;
  const avg = getNumericAvg(responses, question.id);
  const vals = responses.map(r => r.answers?.[question.id]).filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!vals.length) return <EmptyQ />;
  const dist = [];
  for (let i = min; i <= max; i++) dist.push({ val: i, count: vals.filter(v => v === i).length });
  const maxCount = Math.max(...dist.map(d => d.count), 1);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-primary">{avg?.toFixed(1)}</span>
        <span className="text-on-surface-variant text-sm">promedio ({min}–{max})</span>
      </div>
      <div className="flex items-end gap-1 h-20">
        {dist.map(d => (
          <div key={d.val} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full bg-primary rounded-t-sm" style={{ height: `${(d.count / maxCount) * 64}px`, minHeight: d.count > 0 ? 3 : 0, opacity: d.count > 0 ? 1 : 0.15 }} />
            <span className="text-[9px] text-on-surface-variant">{d.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextChart({ responses, question }) {
  const answers = responses.map(r => ({ text: r.answers?.[question.id], name: r.respondent_name, date: r.submitted_at })).filter(a => a.text?.toString().trim());
  if (!answers.length) return <EmptyQ />;
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {answers.map((a, i) => (
        <div key={i} className="p-3 bg-surface-container-low rounded-xl border border-surface-variant">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-on-surface-variant">{a.name || `Respuesta ${i + 1}`}</span>
            <span className="text-xs text-on-surface-variant">{fmtDateShort(a.date)}</span>
          </div>
          <p className="text-sm text-on-surface leading-relaxed">"{String(a.text)}"</p>
        </div>
      ))}
    </div>
  );
}

function QuestionCards({ questions, responses }) {
  let qNum = 0;
  return (
    <div className="space-y-4">
      {questions.map(q => {
        if (q.type === 'section') {
          return (
            <div key={q.id} className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-surface-container-highest" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider px-2">{q.title || 'Sección'}</span>
              <div className="h-px flex-1 bg-surface-container-highest" />
            </div>
          );
        }
        qNum++;
        const n = qNum;
        const answered = responses.filter(r => { const v = r.answers?.[q.id]; return v != null && v !== '' && !(typeof v === 'object' && !Object.keys(v).length); }).length;
        const pct = responses.length ? Math.round((answered / responses.length) * 100) : 0;
        let chart = null;
        if (q.type === 'matrix')          chart = <MatrixChart question={q} responses={responses} />;
        else if (q.type === 'multiple_choice') chart = <ChoiceChart question={q} responses={responses} />;
        else if (q.type === 'rating')     chart = <RatingChart question={q} responses={responses} />;
        else if (q.type === 'nps')        chart = <NPSChart question={q} responses={responses} />;
        else if (q.type === 'slider')     chart = <SliderChart question={q} responses={responses} />;
        else                              chart = <TextChart question={q} responses={responses} />;
        return (
          <div key={q.id} className="bg-surface-container-lowest rounded-xl border border-surface-variant ambient-shadow p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">P{n}</span>
                  <span className="text-xs text-on-surface-variant capitalize bg-surface-container px-2 py-0.5 rounded-full">{q.type.replace('_', ' ')}</span>
                </div>
                <h4 className="font-semibold text-on-surface text-sm leading-snug">{q.text || '(sin texto)'}</h4>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-on-surface">{answered}</p>
                <p className="text-xs text-on-surface-variant">{pct}% resp.</p>
              </div>
            </div>
            {chart}
          </div>
        );
      })}
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
  // Palette
  const BLUE  = [37,  99,  235];
  const GRAY  = [100, 116, 139];
  const LIGHT = [248, 250, 252];
  const WHITE = [255, 255, 255];
  const DARK  = [15,  23,  42 ];
  const RED   = [239, 68,  68 ];
  const GREEN = [22,  163, 74 ];
  const BAR_PALETTE = [
    [37, 99, 235],[124, 58, 237],[16, 185, 129],
    [245, 158, 11],[239, 68, 68],[6, 182, 212],
    [236, 72, 153],[34, 197, 94],
  ];

  const title  = survey.title ?? survey.name ?? 'Encuesta';
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W      = doc.internal.pageSize.getWidth();
  const H      = doc.internal.pageSize.getHeight();
  const realQs = questions.filter(q => q.type !== 'section');

  // ── Page chrome ──────────────────────────────────────────────────────
  const drawHeader = () => {
    doc.setFillColor(...BLUE); doc.rect(0, 0, W, 20, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('DATAFORM', 12, 13);
    doc.setFontSize(9);  doc.setFont('helvetica', 'normal'); doc.text(`Reporte — ${title}`, 42, 13);
    doc.setFontSize(8);  doc.text(new Date().toLocaleString('es-MX'), W - 12, 13, { align: 'right' });
  };
  const drawMeta = () => {
    doc.setFillColor(...LIGHT); doc.rect(0, 20, W, 11, 'F');
    doc.setTextColor(...GRAY); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(
      `Total respuestas: ${responses.length}   ·   Primera: ${fmtDateShort(responses[responses.length-1]?.submitted_at)}   ·   Última: ${fmtDateShort(responses[0]?.submitted_at)}`,
      12, 27
    );
  };

  // ensure at least `needed` mm remain on current page, otherwise add one
  const ensureSpace = (needed, y) => {
    if (y + needed > H - 14) { doc.addPage(); drawHeader(); drawMeta(); return 34; }
    return y;
  };

  // ── Chart primitives ─────────────────────────────────────────────────
  // Horizontal bar chart: returns height used
  const drawHBar = (counts, total, x, y, availW) => {
    const LABEL_W = Math.min(78, availW * 0.38);
    const BAR_W   = availW - LABEL_W - 30;
    const ROW_H   = 13;
    counts.forEach((d, i) => {
      const ratio   = total > 0 ? d.value / total : 0;
      const fillW   = ratio > 0 ? Math.max(1.5, ratio * BAR_W) : 0;
      const barY    = y + i * ROW_H + 1;
      const barH    = ROW_H - 5;

      const label = d.name.length > 18 ? d.name.slice(0, 17) + '…' : d.name;
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text(label, x + LABEL_W - 2, barY + barH / 2 + 1, { align: 'right' });

      doc.setFillColor(241, 245, 249);
      doc.rect(x + LABEL_W, barY, BAR_W, barH, 'F');

      if (fillW > 0) {
        doc.setFillColor(...BAR_PALETTE[i % BAR_PALETTE.length]);
        doc.rect(x + LABEL_W, barY, fillW, barH, 'F');
      }

      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text(`${d.value}  ${Math.round(ratio * 100)}%`, x + LABEL_W + BAR_W + 3, barY + barH / 2 + 1);
    });
    return counts.length * ROW_H + 4;
  };

  // NPS visual: large score + 3 vertical bars — returns height used
  const drawNPS = (score, npsVals, x, y, availW) => {
    const det   = npsVals.filter(n => n <= 6).length;
    const pas   = npsVals.filter(n => n >= 7 && n <= 8).length;
    const pro   = npsVals.filter(n => n >= 9).length;
    const total = det + pas + pro || 1;
    const scoreColor = score != null ? (score >= 50 ? GREEN : score >= 0 ? BLUE : RED) : GRAY;
    const scoreStr   = score != null ? (score > 0 ? `+${score}` : String(score)) : '—';
    const BAR_H_MAX  = 30;

    // Large score (left column)
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scoreColor);
    doc.text(scoreStr, x + 18, y + 14, { align: 'center' });
    doc.setFontSize(6);  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    doc.text('NPS Score', x + 18, y + 19, { align: 'center' });

    // 3 vertical bars (right)
    const barsX  = x + 44;
    const barsW  = availW - 48;
    const barW3  = barsW / 3 - 4;
    const maxCnt = Math.max(det, pas, pro, 1);
    const cats   = [
      { label: 'Detractores', range: '0–6',  count: det, color: RED             },
      { label: 'Pasivos',     range: '7–8',  count: pas, color: [234, 179,   8] },
      { label: 'Promotores',  range: '9–10', count: pro, color: GREEN           },
    ];
    cats.forEach((cat, i) => {
      const bx = barsX + i * (barW3 + 4);
      const bh = cat.count > 0 ? Math.max(2, (cat.count / maxCnt) * BAR_H_MAX) : 0;
      const by = y + BAR_H_MAX - bh;

      doc.setFillColor(241, 245, 249); doc.rect(bx, y, barW3, BAR_H_MAX, 'F');
      if (bh > 0) { doc.setFillColor(...cat.color); doc.rect(bx, by, barW3, bh, 'F'); }

      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text(String(cat.count), bx + barW3 / 2, bh > 0 ? by - 2 : y - 2, { align: 'center' });

      const labY = y + BAR_H_MAX + 5;
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...cat.color);
      doc.text(cat.label, bx + barW3 / 2, labY, { align: 'center' });
      doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text(`${cat.range}  ${Math.round((cat.count / total) * 100)}%`, bx + barW3 / 2, labY + 4, { align: 'center' });
    });
    return BAR_H_MAX + 14;
  };

  // Rating visual: avg + filled bar — returns height used
  const drawRating = (avg, maxStars, x, y, availW) => {
    if (avg == null) return 8;
    const barW = Math.min(availW - 4, 140);
    const ratio = avg / maxStars;
    doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(245, 158, 11);
    doc.text(avg.toFixed(1), x, y + 7);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    doc.text(`/ ${maxStars} estrellas`, x + 13, y + 7);
    doc.setFillColor(241, 245, 249); doc.rect(x, y + 10, barW, 5, 'F');
    doc.setFillColor(245, 158, 11); doc.rect(x, y + 10, barW * ratio, 5, 'F');
    return 20;
  };

  // ── Build page 1 ─────────────────────────────────────────────────────
  drawHeader(); drawMeta();

  // KPI tiles (y 34 → 55)
  const KPI_Y   = 34;
  const KPI_H   = 20;
  const KPI_W   = 65;
  const KPI_GAP = (W - 24 - 4 * KPI_W) / 3;

  const npsQ     = realQs.find(q => q.type === 'nps');
  const npsScore = npsQ ? getNPSScore(responses, npsQ.id) : null;
  const npsAcc   = npsScore != null ? (npsScore >= 50 ? GREEN : npsScore >= 0 ? BLUE : RED) : GRAY;
  const npsKpiStr = npsScore != null ? (npsScore > 0 ? `+${npsScore}` : String(npsScore)) : '—';

  const starQ    = realQs.find(q => q.type === 'rating');
  const starAvg  = starQ ? getNumericAvg(responses, starQ.id) : null;

  const kpis = [
    { label: 'RESPUESTAS',         value: String(responses.length), accent: BLUE },
    { label: 'PREGUNTAS',          value: String(realQs.length),    accent: [124, 58, 237] },
    { label: 'PROMEDIO ESTRELLAS', value: starAvg != null ? `${starAvg.toFixed(1)} / ${starQ.maxStars || 5}` : '—', accent: [245, 158, 11] },
    { label: 'NPS SCORE',          value: npsKpiStr,                accent: npsAcc },
  ];
  kpis.forEach((k, i) => {
    const x = 12 + i * (KPI_W + KPI_GAP);
    doc.setFillColor(...WHITE); doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, KPI_Y, KPI_W, KPI_H, 2, 2, 'FD');
    doc.setFillColor(...k.accent); doc.rect(x, KPI_Y, 3, KPI_H, 'F');
    doc.setFontSize(5.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    doc.text(k.label, x + 6, KPI_Y + 6);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...k.accent);
    doc.text(k.value, x + 6, KPI_Y + 15);
  });

  let y = KPI_Y + KPI_H + 8;  // ≈ 62

  // ── Question loop ─────────────────────────────────────────────────────
  realQs.forEach((q, qi) => {
    const AVAIL_W = W - 24;

    y = ensureSpace(18, y);
    doc.setTextColor(...BLUE); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(`P${qi+1}. ${(q.text || '').slice(0, 90)}`, 12, y);
    y += 5;

    if (q.type === 'multiple_choice') {
      const counts = getChoiceCounts(responses, q.id);
      if (counts.length) {
        y = ensureSpace(counts.length * 13 + 8, y);
        y += drawHBar(counts, responses.length, 12, y, AVAIL_W);
      } else { y += 6; }
    }

    else if (q.type === 'nps') {
      const npsVals = responses.map(r => r.answers?.[q.id]).filter(v => v != null && !isNaN(Number(v))).map(Number);
      const score   = npsVals.length ? getNPSScore(responses, q.id) : null;
      y = ensureSpace(50, y);
      y += drawNPS(score, npsVals, 12, y, AVAIL_W);
    }

    else if (q.type === 'rating') {
      const avg = getNumericAvg(responses, q.id);
      y = ensureSpace(24, y);
      y += drawRating(avg, q.maxStars || 5, 12, y, AVAIL_W);
    }

    else if (q.type === 'slider') {
      const avg = getNumericAvg(responses, q.id);
      if (avg != null) {
        y = ensureSpace(20, y);
        const min   = q.min ?? 0;
        const max   = q.max ?? 10;
        const barW  = Math.min(AVAIL_W - 4, 150);
        const ratio = (avg - min) / (max - min || 1);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
        doc.text(avg.toFixed(1), 12, y + 6);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
        doc.text(`Promedio · rango ${min}–${max}`, 26, y + 6);
        doc.setFillColor(241, 245, 249); doc.rect(12, y + 9, barW, 5, 'F');
        doc.setFillColor(...BLUE);       doc.rect(12, y + 9, barW * ratio, 5, 'F');
        y += 19;
      } else { y += 6; }
    }

    else {
      // text, ranking, matrix, file — show up to 8 responses as table
      const rows = responses.map(r => r.answers?.[q.id]).filter(v => v?.toString().trim()).slice(0, 8);
      if (rows.length) {
        const body = rows.map((v, i) => [
          `${i+1}.`,
          typeof v === 'object' ? Object.values(v).slice(0, 3).join(', ') : String(v).slice(0, 120),
        ]);
        y = ensureSpace(body.length * 8 + 16, y);
        autoTable(doc, {
          startY: y, head: [['#', 'Respuesta']], body,
          styles: { fontSize: 7 }, headStyles: { fillColor: BLUE, textColor: 255 },
          alternateRowStyles: { fillColor: LIGHT }, margin: { left: 12, right: 12 },
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 8;
      } else { y += 6; }
    }

    y += 4;
  });

  // ── Individual responses table ────────────────────────────────────────
  if (responses.length) {
    y = ensureSpace(30, y);
    doc.setTextColor(...BLUE); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Respuestas individuales', 12, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Nombre', 'Fecha', ...realQs.slice(0, 5).map((_, i) => `P${i+1}`)]],
      body: responses.map(r => [
        r.respondent_name || '—',
        fmtDateShort(r.submitted_at),
        ...realQs.slice(0, 5).map(q => {
          const v = r.answers?.[q.id];
          return v == null ? '—' : typeof v === 'object' ? Object.values(v).join(', ') : String(v).slice(0, 30);
        }),
      ]),
      styles: { fontSize: 7.5 }, headStyles: { fillColor: BLUE, textColor: 255 },
      alternateRowStyles: { fillColor: LIGHT }, margin: { left: 12, right: 12 },
    });
  }

  // ── Footers ───────────────────────────────────────────────────────────
  const pg = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pg; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text(`Página ${i} de ${pg} · DataForm`, W / 2, H - 6, { align: 'center' });
  }

  const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  doc.save(`${slug}_${new Date().toISOString().slice(0, 10)}.pdf`);
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

          {/* Per-question cards */}
          {questions.filter(q => q.type !== 'section').length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-on-surface">Resultados por pregunta</h3>
              <QuestionCards questions={questions} responses={responses} />
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
