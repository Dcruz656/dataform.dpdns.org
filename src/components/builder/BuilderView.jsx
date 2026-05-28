import { useState, useMemo } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, LayoutDashboard, ChevronRight, Library, BookMarked, X, Trash2 } from 'lucide-react';
import { QUESTION_TYPES, createNewQuestion } from '../../constants';
import { nextId } from '../../utils';
import WelcomeCard from './WelcomeCard';
import QuestionCard from './QuestionCard';
import PublishModal from './PublishModal';

function SortableItem({ question, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
    >
      <QuestionCard question={question} dragHandleProps={{ ...attributes, ...listeners }} {...props} />
    </div>
  );
}

export default function BuilderView({
  surveyConfig, setSurveyConfig, questions, setQuestions, onPreview,
  questionBank, onSaveToBank, onInsertFromBank, onDeleteFromBank, activeSurveyId, saveStatus, onEnsureSaved,
}) {
  const [view, setView] = useState('list');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTagFilter, setBankTagFilter] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      setQuestions(qs => {
        const from = qs.findIndex(q => q.id === active.id);
        const to = qs.findIndex(q => q.id === over.id);
        return arrayMove(qs, from, to);
      });
    }
  };

  const updateQuestion = updated => setQuestions(qs => qs.map(q => q.id === updated.id ? updated : q));
  const duplicateQuestion = q => {
    const idx = questions.findIndex(x => x.id === q.id);
    const copy = { ...q, id: nextId(), text: q.text + ' (copia)', conditions: [] };
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    setQuestions(next);
  };
  const deleteQuestion = id => setQuestions(qs => qs.filter(q => q.id !== id));
  const addQuestion = type => {
    setQuestions(qs => [...qs, createNewQuestion(type, nextId())]);
    setShowTypeSelector(false);
  };

  // Bank filtering
  const allTags = useMemo(() => {
    const tags = new Set();
    (questionBank || []).forEach(item => (item.etiquetas || []).forEach(t => tags.add(t)));
    return [...tags];
  }, [questionBank]);

  const filteredBank = useMemo(() => {
    return (questionBank || []).filter(item => {
      const matchSearch = !bankSearch || item.titulo.toLowerCase().includes(bankSearch.toLowerCase());
      const matchTag = !bankTagFilter || (item.etiquetas || []).includes(bankTagFilter);
      return matchSearch && matchTag;
    });
  }, [questionBank, bankSearch, bankTagFilter]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Editor de Encuesta</h1>
          <p className={`text-xs font-medium ${
            saveStatus === 'saving' ? 'text-blue-500' :
            saveStatus === 'saved'  ? 'text-emerald-600' :
            saveStatus === 'error'  ? 'text-red-500' :
            'text-slate-400'
          }`}>
            {saveStatus === 'saving' ? '● Guardando...' :
             saveStatus === 'saved'  ? '✓ Guardado' :
             saveStatus === 'error'  ? '✗ Error al guardar' :
             'Guardado automáticamente'}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="bg-slate-100 p-1 rounded-md flex border border-slate-200 mr-2">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >Lista</button>
            <button
              onClick={() => setView('flow')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'flow' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >Mapa Visual</button>
          </div>
          <button
            onClick={() => { setBankOpen(true); setBankSearch(''); setBankTagFilter(''); }}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 font-medium px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm relative"
          >
            <Library size={15} />
            Banco
            {(questionBank || []).length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {(questionBank || []).length}
              </span>
            )}
          </button>
          <button onClick={onPreview} className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 font-medium px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm">
            <Play size={15} /> Vista Previa
          </button>
          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-2 bg-blue-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            Publicar
          </button>
        </div>
      </div>

      {showPublish && (
        <PublishModal
          surveyConfig={surveyConfig}
          surveyId={activeSurveyId}
          onClose={() => setShowPublish(false)}
          onEnsureSaved={onEnsureSaved}
        />
      )}

      {view === 'list' ? (
        <div className="space-y-5">
          <WelcomeCard surveyConfig={surveyConfig} setSurveyConfig={setSurveyConfig} />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
              {questions.map((q, i) => (
                <SortableItem
                  key={q.id}
                  question={q}
                  index={i}
                  allQuestions={questions}
                  surveyConfig={surveyConfig}
                  onUpdate={updateQuestion}
                  onDuplicate={() => duplicateQuestion(q)}
                  onDelete={() => deleteQuestion(q.id)}
                  onSaveToBank={onSaveToBank}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add question button + type selector */}
          <div>
            {showTypeSelector ? (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-slate-700">¿Qué tipo de pregunta quieres añadir?</span>
                  <button onClick={() => setShowTypeSelector(false)} className="text-slate-400 hover:text-slate-600"><ChevronRight size={16} className="rotate-90" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUESTION_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => addQuestion(t.value)}
                      className="p-3 text-center border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-xs font-medium text-slate-700"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTypeSelector(true)}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-semibold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                + Añadir Nueva Pregunta
              </button>
            )}
          </div>
        </div>
      ) : (
        <FlowMap questions={questions} />
      )}

      {/* Question Bank panel */}
      {bankOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setBankOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Library size={16} className="text-blue-600" />
                <h2 className="font-bold text-slate-800">Banco de Preguntas</h2>
              </div>
              <button onClick={() => setBankOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Search + tag filter */}
            <div className="p-3 border-b border-slate-100 flex-shrink-0 space-y-2">
              <input
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
                placeholder="Buscar pregunta..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {allTags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setBankTagFilter(t => t === tag ? '' : tag)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${bankTagFilter === tag ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {filteredBank.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <BookMarked size={32} className="mx-auto opacity-25" />
                  <p className="font-medium text-sm">
                    {(questionBank || []).length === 0 ? 'El banco está vacío.' : 'Sin resultados.'}
                  </p>
                  {(questionBank || []).length === 0 && (
                    <p className="text-xs">Guarda preguntas usando el ícono <span className="font-mono">🔖</span> en cada tarjeta.</p>
                  )}
                </div>
              ) : (
                filteredBank.map(item => (
                  <div key={item.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium text-slate-700 leading-snug">{item.titulo}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                        {QUESTION_TYPES.find(t => t.value === item.tipo)?.label || item.tipo}
                      </span>
                    </div>
                    {(item.etiquetas || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {item.etiquetas.map(t => (
                          <span key={t} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { onInsertFromBank?.(item); setBankOpen(false); }}
                        className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Insertar
                      </button>
                      <button
                        onClick={() => onDeleteFromBank?.(item.id)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-400 text-xs rounded-md hover:text-red-500 hover:border-red-200 transition-colors"
                        title="Eliminar del banco"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FlowMap({ questions }) {
  return (
    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg relative overflow-auto">
      <div className="absolute top-3 left-3 text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-md border shadow-sm">
        <LayoutDashboard size={13} /> Arquitectura Lógica
      </div>
      <div className="flex gap-5 items-center p-10 pt-14 min-w-max">
        <FlowNode label="Inicio" sub="Bienvenida" variant="dark" />
        {questions.map((q, i) => (
          <div key={q.id} className="flex items-center gap-5">
            <div className="flex items-center gap-1">
              <div className="h-px w-8 bg-slate-300" />
              {q.conditions?.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${
                  q.conditionMode === 'hide' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {q.conditionMode === 'hide' ? 'no si…' : 'si…'}
                </span>
              )}
              <ChevronRight size={13} className="text-slate-400 -ml-1" />
            </div>
            <FlowNode
              label={QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
              sub={q.text.slice(0, 28) + (q.text.length > 28 ? '…' : '')}
              badge={i + 1}
              variant={q.conditions?.length > 0 ? (q.conditionMode === 'hide' ? 'hidden' : 'conditional') : 'default'}
            />
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-px w-8 bg-slate-300" />
          <ChevronRight size={13} className="text-slate-400 -ml-1" />
        </div>
        <FlowNode label="Fin" variant="success" />
      </div>
    </div>
  );
}

function FlowNode({ label, sub, badge, variant }) {
  const base = 'p-4 rounded-lg shadow-sm w-44 text-sm relative border';
  const styles = {
    dark:        `${base} bg-slate-800 text-white border-slate-700`,
    default:     `${base} bg-white border-2 border-blue-600 text-slate-800`,
    conditional: `${base} bg-white border-2 border-amber-400 text-slate-800`,
    hidden:      `${base} bg-white border-2 border-red-300 text-slate-800`,
    success:     `${base} bg-emerald-50 border-emerald-300 text-emerald-700 font-bold`,
  };
  const badgeColors = { conditional: 'bg-amber-400 text-white', hidden: 'bg-red-400 text-white', default: 'bg-blue-600 text-white' };

  return (
    <div className={styles[variant] || styles.default}>
      {badge && (
        <div className={`absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${badgeColors[variant] || badgeColors.default}`}>
          {badge}
        </div>
      )}
      <div className="font-bold truncate">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
