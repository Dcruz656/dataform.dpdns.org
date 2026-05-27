import { useState, useRef } from 'react';
import {
  GripVertical, X, GitBranch, Copy, Trash2, ChevronDown, ChevronUp,
  Star, AlignLeft, SlidersHorizontal, Upload, Table2, ListOrdered, TrendingUp,
  Bookmark,
} from 'lucide-react';
import { PRESET_SCALES, QUESTION_TYPES, LOGIC_OPERATORS } from '../../constants';

const TYPE_ICONS = {
  multiple_choice: <span className="text-xs font-bold">☑</span>,
  text: <AlignLeft size={13} />,
  rating: <Star size={13} />,
  nps: <TrendingUp size={13} />,
  matrix: <Table2 size={13} />,
  ranking: <ListOrdered size={13} />,
  slider: <SlidersHorizontal size={13} />,
  file: <Upload size={13} />,
};

export default function QuestionCard({ question, index, allQuestions, surveyConfig, dragHandleProps, onUpdate, onDuplicate, onDelete, onSaveToBank }) {
  const [showLogic, setShowLogic] = useState(question.conditions?.length > 0);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [bankTitle, setBankTitle] = useState('');
  const [bankTags, setBankTags] = useState('');
  const textRef = useRef(null);

  const update = patch => onUpdate({ ...question, ...patch });

  // Variables available for piping into this question
  const availableVars = [
    ...(surveyConfig?.requireName ? [{ key: 'nombre', label: 'Nombre del evaluador' }] : []),
    ...allQuestions.slice(0, index).map((q, i) => ({
      key: `P${i + 1}`,
      label: (q.text || `Pregunta ${i + 1}`).slice(0, 35),
    })),
  ];

  const insertVar = (varKey) => {
    const el = textRef.current;
    setShowVarMenu(false);
    if (!el) {
      update({ text: question.text + `{{${varKey}}}` });
      return;
    }
    const start = el.selectionStart ?? question.text.length;
    const end = el.selectionEnd ?? question.text.length;
    const token = `{{${varKey}}}`;
    const newText = question.text.slice(0, start) + token + question.text.slice(end);
    update({ text: newText });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const changeType = newType => {
    const base = { id: question.id, type: newType, text: question.text, required: question.required, conditions: question.conditions, conditionMode: question.conditionMode };
    const defaults = {
      multiple_choice: { scale: 'csat', options: [...PRESET_SCALES.csat.options] },
      text: {},
      rating: { maxStars: 5 },
      nps: {},
      matrix: { rows: ['Criterio 1', 'Criterio 2'], columns: ['Malo', 'Regular', 'Bueno', 'Excelente'] },
      ranking: { options: ['Opción 1', 'Opción 2', 'Opción 3'] },
      slider: { min: 0, max: 10, step: 1, minLabel: '', maxLabel: '' },
      file: { acceptedTypes: 'image/*,.pdf', maxSizeMB: 10 },
    };
    onUpdate({ ...base, ...(defaults[newType] || {}) });
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm group">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 rounded-t-lg">
          <button {...dragHandleProps} className="text-slate-400 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity touch-none">
            <GripVertical size={18} />
          </button>
          <span className="font-bold text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Q{index + 1}</span>
          <div className="flex items-center gap-1.5 text-slate-600">
            {TYPE_ICONS[question.type]}
            <select
              value={question.type}
              onChange={e => changeType(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold text-slate-700 outline-none cursor-pointer hover:text-blue-600 transition-colors"
            >
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input type="checkbox" checked={question.required} onChange={e => update({ required: e.target.checked })} className="rounded" />
              Requerida
            </label>
            <button
              onClick={() => { setBankTitle(question.text.slice(0, 60) || 'Pregunta sin título'); setBankTags(''); setBankModal(true); }}
              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
              title="Guardar en banco"
            >
              <Bookmark size={15} />
            </button>
            <button onClick={onDuplicate} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Duplicar">
              <Copy size={15} />
            </button>
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Text input with variable insertion */}
          <div className="relative">
            <input
              ref={textRef}
              type="text"
              placeholder="Escribe tu pregunta aquí..."
              value={question.text}
              onChange={e => update({ text: e.target.value })}
              className="w-full border-b-2 border-slate-200 py-2 focus:border-blue-600 outline-none text-lg font-medium placeholder:text-slate-300 transition-colors bg-transparent pr-16"
            />
            {availableVars.length > 0 && (
              <div className="absolute right-0 bottom-1.5">
                <button
                  type="button"
                  onClick={() => setShowVarMenu(v => !v)}
                  className="text-xs px-2 py-1 text-slate-400 hover:text-blue-600 border border-slate-200 rounded-md hover:border-blue-400 transition-colors font-mono leading-none"
                  title="Insertar variable de piping"
                >
                  {'{x}'}
                </button>
                {showVarMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowVarMenu(false)} />
                    <div className="absolute right-0 bottom-8 bg-white border border-slate-200 rounded-lg shadow-xl z-20 w-64 py-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide px-3 pt-2 pb-1">Insertar variable</p>
                      {availableVars.map(v => (
                        <button
                          key={v.key}
                          onMouseDown={e => { e.preventDefault(); insertVar(v.key); }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                        >
                          <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</span>
                          <span className="text-slate-500 truncate">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <TypeConfig question={question} onUpdate={onUpdate} />
        </div>

        {/* Logic Panel */}
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowLogic(v => !v)}
            className="w-full flex items-center gap-2 px-5 py-3 text-sm text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
          >
            <GitBranch size={14} />
            <span className="font-medium">Lógica Condicional</span>
            {question.conditions?.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-bold">
                {question.conditions.length}
              </span>
            )}
            <span className="ml-auto">{showLogic ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </button>

          {showLogic && (
            <LogicPanel
              question={question}
              allQuestions={allQuestions}
              questionIndex={index}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>

      {/* Save to Bank modal */}
      {bankModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setBankModal(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-80 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bookmark size={16} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">Guardar en Banco</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Título</label>
                <input
                  value={bankTitle}
                  onChange={e => setBankTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Título de la pregunta"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Etiquetas <span className="font-normal text-slate-400">(separadas por coma)</span></label>
                <input
                  value={bankTags}
                  onChange={e => setBankTags(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="ej: satisfacción, nps, onboarding"
                  onKeyDown={e => e.key === 'Enter' && bankTitle.trim() && (onSaveToBank?.(question, bankTitle, bankTags), setBankModal(false))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { if (bankTitle.trim()) { onSaveToBank?.(question, bankTitle, bankTags); setBankModal(false); } }}
                disabled={!bankTitle.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => setBankModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TypeConfig({ question, onUpdate }) {
  const update = patch => onUpdate({ ...question, ...patch });

  if (question.type === 'multiple_choice') {
    const handleScaleChange = key => {
      const opts = PRESET_SCALES[key]?.options;
      update({ scale: key, options: opts ? [...opts] : question.options, optionScores: opts ? opts.map(() => 0) : question.optionScores });
    };
    const handleOptionChange = (idx, value) => {
      const opts = [...question.options];
      opts[idx] = value;
      update({ scale: 'custom', options: opts });
    };
    const handleScoreChange = (idx, value) => {
      const scores = question.options.map((_, i) => (question.optionScores || [])[i] ?? 0);
      scores[idx] = Number(value);
      update({ optionScores: scores });
    };
    const removeOption = idx => {
      update({
        scale: 'custom',
        options: question.options.filter((_, i) => i !== idx),
        optionScores: (question.optionScores || []).filter((_, i) => i !== idx),
      });
    };

    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Opciones</span>
            <span className="text-xs text-slate-400 font-medium">pts</span>
          </div>
          <select
            value={question.scale}
            onChange={e => handleScaleChange(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white font-medium text-slate-700 outline-none focus:border-blue-600 cursor-pointer shadow-sm"
          >
            {Object.entries(PRESET_SCALES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {question.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2 group/opt bg-white p-2 rounded border border-slate-200 shadow-sm focus-within:border-blue-400">
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
              <input
                type="text"
                value={opt}
                onChange={e => handleOptionChange(idx, e.target.value)}
                className="flex-1 bg-transparent border-none outline-none py-1 text-sm text-slate-700"
              />
              <input
                type="number"
                value={(question.optionScores || [])[idx] ?? 0}
                onChange={e => handleScoreChange(idx, e.target.value)}
                className="w-14 text-center border-l border-slate-200 py-1 text-xs text-slate-600 bg-transparent outline-none focus:bg-blue-50 focus:text-blue-700"
                title="Puntaje para esta opción"
              />
              <button onClick={() => removeOption(idx)} className="opacity-0 group-hover/opt:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => update({ scale: 'custom', options: [...question.options, `Opción ${question.options.length + 1}`], optionScores: [...(question.optionScores || []), 0] })}
          className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          + Añadir opción
        </button>
      </div>
    );
  }

  if (question.type === 'text') {
    return (
      <div className="bg-slate-50 rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-400 text-sm">
        El usuario verá un campo de texto libre.
      </div>
    );
  }

  if (question.type === 'rating') {
    const maxStars = question.maxStars || 5;
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
        <label className="text-sm font-bold text-slate-700 mb-3 block">Cantidad de Estrellas</label>
        <div className="flex gap-2 mb-4">
          {[3, 5, 7, 10].map(n => (
            <button
              key={n}
              onClick={() => update({ maxStars: n, starScores: Array.from({ length: n }, (_, i) => (question.starScores || [])[i] ?? 0) })}
              className={`w-12 h-9 rounded-md font-bold text-sm transition-colors ${maxStars === n ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'}`}
            >
              {n}★
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-4">
          {Array.from({ length: maxStars }).map((_, i) => (
            <Star key={i} size={22} className="text-amber-400 fill-amber-400" />
          ))}
        </div>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wide">Puntaje por estrella</p>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: maxStars }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-amber-500 font-bold">{i + 1}★</span>
                <input
                  type="number"
                  value={(question.starScores || [])[i] ?? 0}
                  onChange={e => {
                    const scores = Array.from({ length: maxStars }, (_, j) => (question.starScores || [])[j] ?? 0);
                    scores[i] = Number(e.target.value);
                    update({ starScores: scores });
                  }}
                  className="w-12 text-center border border-slate-200 rounded px-1 py-1 text-xs text-slate-700 bg-white outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (question.type === 'nps') {
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
        <p className="text-sm text-slate-500 mb-3">Escala fija 0–10 con categorías automáticas:</p>
        <div className="flex gap-1 flex-wrap mb-4">
          {Array.from({ length: 11 }, (_, i) => {
            const cls = i <= 6 ? 'bg-red-100 text-red-700' : i <= 8 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
            return <span key={i} className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${cls}`}>{i}</span>;
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mb-4 font-medium">
          <span>Detractores (0–6)</span><span>Pasivos (7–8)</span><span>Promotores (9–10)</span>
        </div>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wide">Puntaje por valor NPS</p>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className={`text-xs font-bold ${i <= 6 ? 'text-red-500' : i <= 8 ? 'text-yellow-500' : 'text-green-500'}`}>{i}</span>
                <input
                  type="number"
                  value={(question.npsScores || [])[i] ?? 0}
                  onChange={e => {
                    const scores = Array.from({ length: 11 }, (_, j) => (question.npsScores || [])[j] ?? 0);
                    scores[i] = Number(e.target.value);
                    update({ npsScores: scores });
                  }}
                  className="w-10 text-center border border-slate-200 rounded px-0.5 py-1 text-xs text-slate-700 bg-white outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (question.type === 'matrix') {
    const updateRow = (idx, val) => { const r = [...question.rows]; r[idx] = val; update({ rows: r }); };
    const updateCol = (idx, val) => { const c = [...question.columns]; c[idx] = val; update({ columns: c }); };

    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Filas (criterios)</label>
            <div className="space-y-2">
              {question.rows?.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input value={row} onChange={e => updateRow(i, e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
                  <button onClick={() => update({ rows: question.rows.filter((_, ri) => ri !== i) })} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
              <button onClick={() => update({ rows: [...(question.rows || []), `Criterio ${(question.rows?.length || 0) + 1}`] })} className="text-xs text-blue-600 font-semibold hover:text-blue-800">+ Fila</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Columnas (escala)</label>
            <div className="space-y-2">
              {question.columns?.map((col, i) => (
                <div key={i} className="flex gap-2">
                  <input value={col} onChange={e => updateCol(i, e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
                  <button onClick={() => update({ columns: question.columns.filter((_, ci) => ci !== i) })} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
              <button onClick={() => update({ columns: [...(question.columns || []), `Col ${(question.columns?.length || 0) + 1}`] })} className="text-xs text-blue-600 font-semibold hover:text-blue-800">+ Columna</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (question.type === 'ranking') {
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Ítems a ordenar</label>
        <div className="space-y-2">
          {question.options?.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
              <input value={opt} onChange={e => { const o = [...question.options]; o[i] = e.target.value; update({ options: o }); }} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
              <button onClick={() => update({ options: question.options.filter((_, ri) => ri !== i) })} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
          <button onClick={() => update({ options: [...(question.options || []), `Ítem ${(question.options?.length || 0) + 1}`] })} className="text-xs text-blue-600 font-semibold hover:text-blue-800 mt-1">+ Añadir ítem</button>
        </div>
      </div>
    );
  }

  if (question.type === 'slider') {
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Mínimo</label>
            <input type="number" value={question.min ?? 0} onChange={e => update({ min: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Máximo</label>
            <input type="number" value={question.max ?? 10} onChange={e => update({ max: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Paso</label>
            <input type="number" value={question.step ?? 1} onChange={e => update({ step: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Etiqueta mínimo</label>
            <input type="text" value={question.minLabel ?? ''} placeholder={`${question.min ?? 0}`} onChange={e => update({ minLabel: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Etiqueta máximo</label>
            <input type="text" value={question.maxLabel ?? ''} placeholder={`${question.max ?? 10}`} onChange={e => update({ maxLabel: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
          </div>
        </div>
        <input type="range" min={question.min ?? 0} max={question.max ?? 10} step={question.step ?? 1} defaultValue={(question.min ?? 0) + ((question.max ?? 10) - (question.min ?? 0)) / 2} className="w-full opacity-60 cursor-not-allowed" disabled />
      </div>
    );
  }

  if (question.type === 'file') {
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-3">
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">Tipos permitidos</label>
          <select value={question.acceptedTypes} onChange={e => update({ acceptedTypes: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500">
            <option value="image/*,.pdf">Imágenes y PDF</option>
            <option value="image/*">Solo imágenes</option>
            <option value=".pdf">Solo PDF</option>
            <option value="*">Cualquier archivo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">Tamaño máximo (MB)</label>
          <input type="number" value={question.maxSizeMB ?? 10} onChange={e => update({ maxSizeMB: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-500" />
        </div>
      </div>
    );
  }

  return null;
}

function LogicPanel({ question, allQuestions, questionIndex, onUpdate }) {
  const previous = allQuestions.slice(0, questionIndex);

  const addCondition = () => {
    if (previous.length === 0) return;
    onUpdate({
      ...question,
      conditions: [...(question.conditions || []), { sourceId: previous[0].id, operator: 'equals', value: '' }],
    });
  };

  const updateCond = (idx, field, value) => {
    const conds = [...question.conditions];
    conds[idx] = { ...conds[idx], [field]: value };
    if (field === 'sourceId') conds[idx].value = '';
    onUpdate({ ...question, conditions: conds });
  };

  const removeCond = idx => {
    onUpdate({ ...question, conditions: question.conditions.filter((_, i) => i !== idx) });
  };

  return (
    <div className="px-5 pb-5 pt-3 bg-slate-50/60 space-y-3">
      {previous.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No hay preguntas anteriores disponibles como condición.</p>
      ) : (
        <>
          <div className="flex gap-1 pb-1">
            <button
              onClick={() => onUpdate({ ...question, conditionMode: 'show' })}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${
                (question.conditionMode ?? 'show') !== 'hide'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-500 hover:border-blue-400'
              }`}
            >
              Mostrar si...
            </button>
            <button
              onClick={() => onUpdate({ ...question, conditionMode: 'hide' })}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${
                question.conditionMode === 'hide'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-500 hover:border-amber-400'
              }`}
            >
              Ocultar si...
            </button>
          </div>

          {(question.conditions || []).map((cond, idx) => {
            const srcQ = allQuestions.find(q => q.id === cond.sourceId);
            const valueOpts = srcQ?.type === 'multiple_choice' ? srcQ.options : srcQ?.type === 'ranking' ? srcQ.options : null;

            return (
              <div key={idx} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
                  {question.conditionMode === 'hide' ? 'Ocultar si' : 'Mostrar si'}
                </span>
                <select
                  value={cond.sourceId}
                  onChange={e => updateCond(idx, 'sourceId', Number(e.target.value))}
                  className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-500 max-w-[160px]"
                >
                  {previous.map((pq, pi) => (
                    <option key={pq.id} value={pq.id}>Q{pi + 1}: {pq.text.slice(0, 25)}{pq.text.length > 25 ? '…' : ''}</option>
                  ))}
                </select>
                <select
                  value={cond.operator}
                  onChange={e => updateCond(idx, 'operator', e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-500"
                >
                  {LOGIC_OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                {valueOpts ? (
                  <select
                    value={cond.value}
                    onChange={e => updateCond(idx, 'value', e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccionar…</option>
                    {valueOpts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={cond.value}
                    onChange={e => updateCond(idx, 'value', e.target.value)}
                    placeholder="valor…"
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 w-24 bg-white outline-none focus:border-blue-500"
                  />
                )}
                <button onClick={() => removeCond(idx)} className="text-slate-400 hover:text-red-500 p-1 ml-auto">
                  <X size={14} />
                </button>
              </div>
            );
          })}
          <button onClick={addCondition} className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1 mt-1">
            + Agregar condición
          </button>
        </>
      )}
    </div>
  );
}
