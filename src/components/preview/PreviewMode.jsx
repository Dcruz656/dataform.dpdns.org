import { useState, useEffect, useRef } from 'react';
import { Eye, Check, Star, ChevronRight, ChevronLeft, Upload, Award } from 'lucide-react';
import { shouldShowQuestion } from '../../utils';
import { responsesApi } from '../../lib/db';

/* ─── Piping: replace {{P1}}, {{nombre}}, etc. with actual answers ─── */
function applyPiping(text, answers, questions, name) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    if (varName === 'nombre') return name || '';
    const m = varName.match(/^P(\d+)$/i);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < questions.length) {
        const val = answers[questions[idx].id];
        if (val !== undefined && val !== null && val !== '') return String(val);
      }
    }
    return '';
  });
}

/* ─── Score calculation ─── */
function calculateScore(questions, answers) {
  return questions.reduce((total, q) => {
    const ans = answers[q.id];
    if (ans === undefined || ans === null || ans === '') return total;
    if (q.type === 'multiple_choice' && q.optionScores) {
      const idx = (q.options || []).indexOf(ans);
      if (idx >= 0) return total + (Number(q.optionScores[idx]) || 0);
    }
    if (q.type === 'rating' && q.starScores) {
      return total + (Number(q.starScores[ans - 1]) || 0);
    }
    if (q.type === 'nps' && q.npsScores) {
      return total + (Number(q.npsScores[ans]) || 0);
    }
    return total;
  }, 0);
}

export default function PreviewMode({ surveyConfig, questions, surveyId, onClose, publicMode = false }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const setAnswer = (id, val) => setAnswers(prev => ({ ...prev, [id]: val }));

  const handleSubmit = ({ timings = [], respondentName = null } = {}) => {
    const score = surveyConfig?.scoreRanges?.length > 0 ? calculateScore(questions, answers) : null;
    setFinalScore(score);
    setSubmitted(true); // show result immediately — save happens in background

    if (surveyId) {
      const scoreRange = score !== null
        ? (surveyConfig.scoreRanges || []).find(r => score >= Number(r.min) && score <= Number(r.max))
        : null;
      responsesApi.submit({
        surveyId,
        respondentName: respondentName || null,
        answers,
        timings: Array.isArray(timings) ? timings : Object.entries(timings).map(([qId, t]) => ({ question_id: qId, ...t })),
        score,
        scoreRangeTitle: scoreRange?.title ?? null,
      }).catch(err => console.error('[submit] background save failed:', err));
    }
  };

  if (submitted) {
    if (surveyConfig?.scoreRanges?.length > 0 && finalScore !== null) {
      return <ResultScreen score={finalScore} ranges={surveyConfig.scoreRanges} onClose={onClose} />;
    }
    return <ThankYouScreen onClose={onClose} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Preview bar — hidden in public mode */}
      {!publicMode && (
        <div className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Eye size={16} />
            <span className="font-medium">Modo Previsualización</span>
            {surveyConfig.conversational && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded text-xs font-semibold">Conversacional</span>
            )}
          </div>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition-colors">
            Cerrar Vista Previa
          </button>
        </div>
      )}

      {surveyConfig.conversational ? (
        <ConversationalView
          surveyConfig={surveyConfig}
          questions={questions}
          answers={answers}
          setAnswer={setAnswer}
          onSubmit={handleSubmit}
        />
      ) : (
        <ClassicView
          surveyConfig={surveyConfig}
          questions={questions}
          answers={answers}
          setAnswer={setAnswer}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

/* ─── Classic (all questions at once) ─── */
function ClassicView({ surveyConfig, questions, answers, setAnswer, onSubmit }) {
  const [name, setName] = useState('');
  const visible = questions.filter(q => shouldShowQuestion(q, answers));
  const visibleQuestions = visible.filter(q => q.type !== 'section');

  const answered = visibleQuestions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;
  const total = visibleQuestions.length;
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  // Save partial state to localStorage when leaving without submitting
  useEffect(() => {
    const handler = () => {
      localStorage.setItem('dataform_partial', JSON.stringify({
        surveyTitle: surveyConfig.title,
        mode: 'classic',
        answeredCount: answered,
        totalCount: total,
        timestamp: new Date().toISOString(),
      }));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [answered, total, surveyConfig.title]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sticky progress bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex-shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-slate-500">
              {answered} de {total} {total === 1 ? 'pregunta respondida' : 'preguntas respondidas'}
            </span>
            <span className="text-xs font-bold text-blue-600">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center p-6 overflow-y-auto">
        <div className="max-w-2xl w-full bg-white p-10 rounded-lg shadow-sm border border-slate-200 my-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{surveyConfig.title}</h1>
          <p className="text-slate-500 mb-10 text-base">{surveyConfig.instructions}</p>

          {surveyConfig.requireName && (
            <div className="mb-10 pb-10 border-b border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Nombre Completo *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full border-b-2 border-slate-300 focus:border-blue-600 outline-none py-2 text-lg text-slate-900 transition-colors bg-transparent"
              />
            </div>
          )}

          <div className="space-y-12">
            {(() => {
              let qNum = 0;
              return visible.map(q => {
                if (q.type === 'section') {
                  return (
                    <div key={q.id} className="border-t-2 border-blue-100 pt-8 -mx-10 px-10">
                      <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                        {q.title || 'Sección'}
                      </div>
                      {q.instructions && <p className="text-slate-500 text-sm">{q.instructions}</p>}
                    </div>
                  );
                }
                qNum++;
                return (
                  <div key={q.id}>
                    <h3 className="font-semibold text-xl mb-5 text-slate-800">
                      <span className="text-blue-600 mr-2">{qNum}.</span>
                      {applyPiping(q.text, answers, questions, name)}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <QuestionRenderer question={q} answer={answers[q.id]} onAnswer={val => setAnswer(q.id, val)} />
                  </div>
                );
              });
            })()}
          </div>

          <button
            onClick={() => onSubmit({ timings: [], respondentName: name })}
            className="mt-12 px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Enviar Respuestas
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Conversational (one at a time, Typeform-style) ─── */
function ConversationalView({ surveyConfig, questions, answers, setAnswer, onSubmit }) {
  const [currentIdx, setCurrentIdx] = useState(surveyConfig.requireName ? -1 : 0);
  const [name, setName] = useState('');
  const [localAnswer, setLocalAnswer] = useState(null);
  const entryTimeRef = useRef(Date.now());
  const [timings, setTimings] = useState({});

  const visible = questions.filter(q => shouldShowQuestion(q, answers));
  const safeIdx = Math.min(currentIdx, visible.length - 1);
  const isNameScreen = currentIdx === -1;
  const current = visible[safeIdx];
  const isSection = current?.type === 'section';
  const visibleQOnly = visible.filter(q => q.type !== 'section');
  const answeredSoFar = visibleQOnly.slice(0, safeIdx + 1).filter(q => answers[q.id] !== undefined).length;
  const progress = isNameScreen ? 0 : (visibleQOnly.length ? (answeredSoFar / visibleQOnly.length) * 100 : 0);
  const isLast = safeIdx === visible.length - 1;

  // Save partial state to localStorage on page close
  useEffect(() => {
    const handler = () => {
      localStorage.setItem('dataform_partial', JSON.stringify({
        surveyTitle: surveyConfig.title,
        mode: 'conversational',
        abandonedAtIdx: currentIdx,
        answeredCount: Object.keys(answers).length,
        timestamp: new Date().toISOString(),
      }));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [currentIdx, answers, surveyConfig.title]);

  const handleNext = () => {
    // Record timing for current question
    if (!isNameScreen && current) {
      const duration = Date.now() - entryTimeRef.current;
      setTimings(t => ({ ...t, [current.id]: { duration_ms: duration, estado: 'respondida' } }));
      const val = localAnswer !== null ? localAnswer : answers[current.id];
      if (val !== undefined && val !== null) setAnswer(current.id, val);
    }
    setLocalAnswer(null);
    entryTimeRef.current = Date.now();
    if (isLast && !isNameScreen) { onSubmit({ timings, respondentName: name }); return; }
    setCurrentIdx(i => i + 1);
  };

  const handleBack = () => {
    setLocalAnswer(null);
    entryTimeRef.current = Date.now();
    setCurrentIdx(i => Math.max(surveyConfig.requireName ? -1 : 0, i - 1));
  };

  const handleSkip = () => {
    if (!isNameScreen && current) {
      const duration = Date.now() - entryTimeRef.current;
      setTimings(t => ({ ...t, [current.id]: { duration_ms: duration, estado: 'omitida' } }));
    }
    setLocalAnswer(null);
    entryTimeRef.current = Date.now();
    if (isLast && !isNameScreen) { onSubmit({ timings, respondentName: name }); return; }
    setCurrentIdx(i => i + 1);
  };

  const canAdvance = isNameScreen
    ? !surveyConfig.requireName || name.trim().length > 0
    : isSection || !current?.required || (localAnswer !== null ? localAnswer !== '' : answers[current?.id] !== undefined);

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          {isNameScreen ? (
            <div key="name" className="animate-slide-in">
              <p className="text-blue-600 font-bold text-sm uppercase tracking-wider mb-3">{surveyConfig.title}</p>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{surveyConfig.instructions}</h2>
              <p className="text-slate-500 mb-8">Primero, ¿cuál es tu nombre?</p>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canAdvance && handleNext()}
                placeholder="Tu nombre completo..."
                className="w-full text-2xl border-b-2 border-slate-300 focus:border-blue-600 outline-none py-3 bg-transparent transition-colors"
                autoFocus
              />
            </div>
          ) : current && isSection ? (
            <div key={current.id} className="animate-slide-in text-center">
              <div className="inline-block bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-wider">
                {current.title || 'Nueva Sección'}
              </div>
              {current.instructions && (
                <p className="text-slate-500 text-base">{current.instructions}</p>
              )}
            </div>
          ) : current ? (
            <div key={current.id} className="animate-slide-in">
              <p className="text-slate-400 text-sm font-medium mb-3">
                {visibleQOnly.findIndex(q => q.id === current.id) + 1} / {visibleQOnly.length}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                {applyPiping(current.text, answers, questions, name)}
                {current.required && <span className="text-red-500 ml-1">*</span>}
              </h2>
              <QuestionRenderer
                question={current}
                answer={localAnswer !== null ? localAnswer : answers[current.id]}
                onAnswer={val => { setLocalAnswer(val); }}
                conversational
              />
            </div>
          ) : null}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-10">
            <button
              onClick={handleNext}
              disabled={!canAdvance}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
            >
              {isLast && !isNameScreen ? 'Enviar' : 'Continuar'}
              <ChevronRight size={18} />
            </button>
            {(currentIdx > (surveyConfig.requireName ? -1 : 0)) && (
              <button onClick={handleBack} className="px-4 py-3 text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-medium">
                <ChevronLeft size={16} /> Atrás
              </button>
            )}
            {current && !current.required && !isNameScreen && (
              <button onClick={handleSkip} className="ml-auto text-slate-400 hover:text-slate-600 text-sm">
                Omitir →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Question renderers (shared by Classic + Conversational) ─── */
function QuestionRenderer({ question, answer, onAnswer, conversational = false }) {
  switch (question.type) {
    case 'multiple_choice': return <MultipleChoice question={question} answer={answer} onAnswer={onAnswer} />;
    case 'text':            return <OpenText question={question} answer={answer} onAnswer={onAnswer} />;
    case 'rating':          return <RatingStars question={question} answer={answer} onAnswer={onAnswer} />;
    case 'nps':             return <NPSScale question={question} answer={answer} onAnswer={onAnswer} />;
    case 'matrix':          return <Matrix question={question} answer={answer} onAnswer={onAnswer} />;
    case 'ranking':         return <Ranking question={question} answer={answer} onAnswer={onAnswer} />;
    case 'slider':          return <Slider question={question} answer={answer} onAnswer={onAnswer} />;
    case 'file':            return <FileUpload question={question} />;
    default:                return null;
  }
}

function MultipleChoice({ question, answer, onAnswer }) {
  return (
    <div className="space-y-3">
      {question.options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onAnswer(opt)}
          className={`w-full text-left p-4 rounded-lg border-2 font-medium transition-all duration-150 ${answer === opt ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-slate-50'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function OpenText({ question, answer, onAnswer }) {
  return (
    <textarea
      value={answer || ''}
      onChange={e => onAnswer(e.target.value)}
      placeholder="Escriba su respuesta aquí..."
      className="w-full border-2 border-slate-200 rounded-lg p-4 text-slate-700 focus:border-blue-600 outline-none min-h-[130px] transition-colors resize-none"
    />
  );
}

function RatingStars({ question, answer, onAnswer }) {
  const [hovered, setHovered] = useState(0);
  const max = question.maxStars || 5;
  return (
    <div className="flex gap-2">
      {Array.from({ length: max }).map((_, i) => {
        const filled = (hovered || answer || 0) > i;
        return (
          <button
            key={i}
            onClick={() => onAnswer(i + 1)}
            onMouseEnter={() => setHovered(i + 1)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              size={36}
              className="transition-colors duration-100"
              style={{ fill: filled ? '#f59e0b' : 'none', color: filled ? '#f59e0b' : '#94a3b8' }}
            />
          </button>
        );
      })}
      {answer && <span className="ml-3 text-slate-500 text-sm self-center">{answer} / {max}</span>}
    </div>
  );
}

function NPSScale({ question, answer, onAnswer }) {
  const color = n => n <= 6 ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : n <= 8 ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
  const selectedColor = n => n <= 6 ? 'bg-red-500 border-red-500 text-white' : n <= 8 ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-green-500 border-green-500 text-white';

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            className={`w-11 h-11 rounded-lg border-2 font-bold text-sm transition-all ${answer === i ? selectedColor(i) : color(i)}`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-400 font-medium">
        <span>Nada probable</span>
        <span>Muy probable</span>
      </div>
      <div className="flex gap-6 text-xs font-semibold">
        <span className="text-red-500">● Detractores (0–6)</span>
        <span className="text-yellow-500">● Pasivos (7–8)</span>
        <span className="text-green-500">● Promotores (9–10)</span>
      </div>
    </div>
  );
}

function Matrix({ question, answer = {}, onAnswer }) {
  const update = (row, col) => onAnswer({ ...answer, [row]: col });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left text-slate-400 font-medium pb-3 pr-4 w-1/3"></th>
            {question.columns?.map(col => (
              <th key={col} className="text-center text-slate-600 font-semibold pb-3 px-3 whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.rows?.map((row, ri) => (
            <tr key={row} className={ri % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
              <td className="text-slate-700 font-medium py-3 pr-4 rounded-l-lg">{row}</td>
              {question.columns?.map(col => (
                <td key={col} className="text-center py-3 px-3">
                  <button
                    onClick={() => update(row, col)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${answer[row] === col ? 'border-blue-600 bg-blue-600' : 'border-slate-300 hover:border-blue-400'}`}
                  >
                    {answer[row] === col && <div className="w-2 h-2 rounded-full bg-white" />}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Ranking({ question, answer, onAnswer }) {
  const [items, setItems] = useState(answer || question.options || []);

  const move = (idx, dir) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    onAnswer(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={item} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{idx + 1}</span>
          <span className="flex-1 text-slate-700 font-medium">{item}</span>
          <div className="flex flex-col gap-0.5">
            <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors leading-none text-xs">▲</button>
            <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors leading-none text-xs">▼</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Slider({ question, answer, onAnswer }) {
  const min = question.min ?? 0;
  const max = question.max ?? 10;
  const mid = min + Math.round((max - min) / 2);
  const [val, setVal] = useState(answer ?? mid);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="text-5xl font-bold text-blue-600">{val}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={question.step ?? 1}
        value={val}
        onChange={e => { const v = Number(e.target.value); setVal(v); onAnswer(v); }}
        className="w-full"
      />
      <div className="flex justify-between text-sm text-slate-500 font-medium">
        <span>{question.minLabel || min}</span>
        <span>{question.maxLabel || max}</span>
      </div>
    </div>
  );
}

function FileUpload({ question }) {
  const [file, setFile] = useState(null);
  return (
    <label className="flex flex-col items-center gap-3 p-10 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
      <Upload size={32} className="text-slate-400" />
      {file ? (
        <span className="text-sm font-medium text-blue-700">{file.name}</span>
      ) : (
        <>
          <span className="text-slate-600 font-medium">Haz clic o arrastra un archivo aquí</span>
          <span className="text-xs text-slate-400">{question.acceptedTypes} · máx. {question.maxSizeMB} MB</span>
        </>
      )}
      <input type="file" accept={question.acceptedTypes} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
    </label>
  );
}

function ResultScreen({ score, ranges, onClose }) {
  const range = ranges.find(r => score >= Number(r.min) && score <= Number(r.max));

  if (!range) return <ThankYouScreen onClose={onClose} />;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
      <div className="text-center max-w-md animate-slide-in">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award size={40} className="text-blue-600" />
        </div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Puntaje obtenido</p>
        <p className="text-5xl font-bold text-blue-600 mb-5">{score}</p>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">{range.title}</h1>
        {range.description && (
          <p className="text-slate-500 text-lg mb-8 leading-relaxed">{range.description}</p>
        )}
        <button
          onClick={onClose}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function ThankYouScreen({ onClose }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
      <div className="text-center max-w-md animate-slide-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={38} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">¡Gracias por tu respuesta!</h1>
        <p className="text-slate-500 text-lg mb-8">Tu opinión ha sido registrada exitosamente.</p>
        <button onClick={onClose} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
          Cerrar
        </button>
      </div>
    </div>
  );
}
