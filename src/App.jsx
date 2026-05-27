import { useState, useEffect } from 'react';
import { LayoutDashboard, PenTool, BarChart3, Palette, Archive, Menu, X } from 'lucide-react';
import { DEFAULT_QUESTIONS } from './constants';
import NavItem from './components/NavItem';
import BuilderView from './components/builder/BuilderView';
import PreviewMode from './components/preview/PreviewMode';
import DashboardView from './views/DashboardView';
import AnalyticsView from './views/AnalyticsView';
import AppearanceView from './views/AppearanceView';
import ArchiveView from './views/ArchiveView';

const INITIAL_SURVEYS = [
  { id: 1, name: 'Evaluación de Producto Q3',   responses: 1240, status: 'Activa',   statusColor: 'bg-emerald-100 text-emerald-700' },
  { id: 2, name: 'Satisfacción Postventa Mayo', responses: 318,  status: 'Activa',   statusColor: 'bg-emerald-100 text-emerald-700' },
  { id: 3, name: 'Onboarding Nuevos Clientes',  responses: 97,   status: 'Borrador', statusColor: 'bg-slate-100 text-slate-600' },
  { id: 4, name: 'NPS Trimestral Q2',           responses: 0,    status: 'Borrador', statusColor: 'bg-slate-100 text-slate-600' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('builder');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState({ primary: '#2563eb', font: 'Inter', logo: null });
  const [isPreview, setIsPreview] = useState(false);

  const [surveyConfig, setSurveyConfig] = useState({
    title: 'Evaluación de Producto Q3',
    instructions: 'Por favor, tómese un minuto para ayudarnos a mejorar nuestros servicios.',
    requireName: false,
    conversational: false,
    timeLimit: false,
    startDate: '',
    endDate: '',
    scoreRanges: [],
  });

  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [surveys, setSurveys] = useState(INITIAL_SURVEYS);
  const [archivedSurveys, setArchivedSurveys] = useState([]);

  const [questionBank, setQuestionBank] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dataform_bank') || '[]'); }
    catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem('dataform_bank', JSON.stringify(questionBank));
  }, [questionBank]);

  const handleSaveToBank = (question, title, tags) => {
    const item = {
      id: Date.now(),
      titulo: title || question.text.slice(0, 50) || 'Pregunta sin título',
      tipo: question.type,
      configuracion: { ...question, id: undefined, conditions: [], conditionMode: 'show' },
      etiquetas: typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : (tags || []),
    };
    setQuestionBank(prev => [item, ...prev]);
  };
  const handleInsertFromBank = (item) => {
    const newQ = { ...item.configuracion, id: Date.now() + Math.floor(Math.random() * 9999), conditions: [], conditionMode: 'show' };
    setQuestions(qs => [...qs, newQ]);
  };
  const handleDeleteFromBank = (id) => setQuestionBank(prev => prev.filter(b => b.id !== id));

  const navigate = tab => { setActiveTab(tab); setMenuOpen(false); };

  const handleArchive = id => {
    const survey = surveys.find(s => s.id === id);
    if (!survey) return;
    setSurveys(prev => prev.filter(s => s.id !== id));
    setArchivedSurveys(prev => [survey, ...prev]);
  };

  const handleUnarchive = id => {
    const survey = archivedSurveys.find(s => s.id === id);
    if (!survey) return;
    setArchivedSurveys(prev => prev.filter(s => s.id !== id));
    setSurveys(prev => [...prev, survey]);
  };

  const handleNewSurvey = () => {
    setSurveyConfig({ title: 'Nueva Encuesta', instructions: '', requireName: false, conversational: false, timeLimit: false, startDate: '', endDate: '' });
    setQuestions([]);
    navigate('builder');
  };

  if (isPreview) {
    return <PreviewMode surveyConfig={surveyConfig} questions={questions} onClose={() => setIsPreview(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">

      {/* Backdrop móvil */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:inset-auto md:translate-x-0 md:z-auto
      `}>
        <div className="p-5 border-b border-slate-800/50 flex items-center justify-between">
          <button
            onClick={() => navigate('dashboard')}
            className="text-white font-bold text-xl tracking-wider flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs font-bold">D</div>
            DATAFORM
          </button>
          <button
            onClick={() => setMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard"   active={activeTab === 'dashboard'}  onClick={() => navigate('dashboard')} />
          <NavItem icon={<PenTool size={18} />}         label="Constructor" active={activeTab === 'builder'}    onClick={() => navigate('builder')} />
          <NavItem icon={<BarChart3 size={18} />}        label="Analítica"   active={activeTab === 'analytics'}  onClick={() => navigate('analytics')} />
          <NavItem icon={<Palette size={18} />}          label="Apariencia"  active={activeTab === 'appearance'} onClick={() => navigate('appearance')} />
          <NavItem
            icon={<Archive size={18} />}
            label={
              <span className="flex items-center gap-2">
                Archivo
                {archivedSurveys.length > 0 && (
                  <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full font-semibold">
                    {archivedSurveys.length}
                  </span>
                )}
              </span>
            }
            active={activeTab === 'archive'}
            onClick={() => navigate('archive')}
          />
        </nav>

        {activeTab === 'builder' && (
          <div className="p-4 m-4 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-4 overflow-y-auto max-h-72">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Configuración Global</span>
            <Toggle
              label="Solicitar Nombre"
              hint="Pantalla inicial para identificar al usuario."
              checked={surveyConfig.requireName}
              onChange={v => setSurveyConfig(c => ({ ...c, requireName: v }))}
            />
            <Toggle
              label="Modo Conversacional"
              hint="Una pregunta a la vez, estilo Typeform."
              checked={surveyConfig.conversational}
              onChange={v => setSurveyConfig(c => ({ ...c, conversational: v }))}
            />
            <Toggle
              label="Tiempo Límite"
              hint="Definir ventana de disponibilidad."
              checked={surveyConfig.timeLimit}
              onChange={v => setSurveyConfig(c => ({ ...c, timeLimit: v }))}
            />
            {surveyConfig.timeLimit && (
              <div className="space-y-3 pt-1 border-t border-slate-700/60">
                <DateField
                  label="Fecha de inicio"
                  value={surveyConfig.startDate}
                  max={surveyConfig.endDate || undefined}
                  onChange={v => setSurveyConfig(c => ({ ...c, startDate: v }))}
                />
                <DateField
                  label="Fecha límite"
                  value={surveyConfig.endDate}
                  min={surveyConfig.startDate || undefined}
                  onChange={v => setSurveyConfig(c => ({ ...c, endDate: v }))}
                />
                {surveyConfig.startDate && surveyConfig.endDate && (
                  <p className="text-xs text-blue-400 font-medium">
                    {Math.max(0, Math.ceil(
                      (new Date(surveyConfig.endDate) - new Date(surveyConfig.startDate)) / 86400000
                    ))} días de disponibilidad
                  </p>
                )}
              </div>
            )}

            {/* Score ranges */}
            <div className="border-t border-slate-700/60 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Puntaje</span>
                <button
                  onClick={() => setSurveyConfig(c => ({
                    ...c,
                    scoreRanges: [...(c.scoreRanges || []), { id: Date.now(), min: 0, max: 10, title: 'Resultado', description: '' }],
                  }))}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  + Rango
                </button>
              </div>
              {(surveyConfig.scoreRanges || []).length === 0 && (
                <p className="text-xs text-slate-600 italic">Sin rangos configurados.</p>
              )}
              {(surveyConfig.scoreRanges || []).map(range => (
                <ScoreRangeRow
                  key={range.id}
                  range={range}
                  onChange={updated => setSurveyConfig(c => ({
                    ...c,
                    scoreRanges: c.scoreRanges.map(r => r.id === updated.id ? updated : r),
                  }))}
                  onDelete={() => setSurveyConfig(c => ({
                    ...c,
                    scoreRanges: c.scoreRanges.filter(r => r.id !== range.id),
                  }))}
                />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden">
        {/* Barra superior móvil */}
        <div className="md:hidden flex-shrink-0 bg-slate-900 px-4 py-3 flex items-center gap-3 border-b border-slate-800">
          <button
            onClick={() => setMenuOpen(true)}
            className="text-slate-300 hover:text-white p-1 -ml-1 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-xs font-bold text-white">D</div>
            <span className="text-white font-bold text-base tracking-wider">DATAFORM</span>
          </div>
        </div>

        {/* Área de contenido con scroll propio */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 md:p-8">
            {activeTab === 'dashboard' && (
              <DashboardView
                surveys={surveys}
                onViewAnalytics={() => navigate('analytics')}
                onNewSurvey={handleNewSurvey}
                onArchive={handleArchive}
              />
            )}
            {activeTab === 'archive' && (
              <ArchiveView
                surveys={archivedSurveys}
                onUnarchive={handleUnarchive}
                onViewAnalytics={() => navigate('analytics')}
              />
            )}
            {activeTab === 'builder' && (
              <BuilderView
                surveyConfig={surveyConfig}
                setSurveyConfig={setSurveyConfig}
                questions={questions}
                setQuestions={setQuestions}
                onPreview={() => setIsPreview(true)}
                questionBank={questionBank}
                onSaveToBank={handleSaveToBank}
                onInsertFromBank={handleInsertFromBank}
                onDeleteFromBank={handleDeleteFromBank}
              />
            )}
            {activeTab === 'analytics'  && <AnalyticsView questions={questions} surveyConfig={surveyConfig} theme={theme} />}
            {activeTab === 'appearance' && <AppearanceView theme={theme} setTheme={setTheme} />}
          </div>
          <footer className="px-4 md:px-8 py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400 flex-shrink-0">
            @Daniel Cruz Bautista &mdash; Derechos Reservados
          </footer>
        </div>
      </main>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 text-sm cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full relative flex-shrink-0 transition-colors mt-0.5 ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </div>
      <div>
        <div className="font-medium text-slate-300 group-hover:text-white transition-colors">{label}</div>
        {hint && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
    </label>
  );
}

function ScoreRangeRow({ range, onChange, onDelete }) {
  return (
    <div className="bg-slate-800 rounded-md p-2.5 space-y-1.5 border border-slate-700/50">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={range.min}
          onChange={e => onChange({ ...range, min: Number(e.target.value) })}
          className="w-14 bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
          placeholder="min"
        />
        <span className="text-xs text-slate-500">–</span>
        <input
          type="number"
          value={range.max}
          onChange={e => onChange({ ...range, max: Number(e.target.value) })}
          className="w-14 bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
          placeholder="max"
        />
        <input
          type="text"
          value={range.title}
          onChange={e => onChange({ ...range, title: e.target.value })}
          placeholder="Título"
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-blue-500 min-w-0"
        />
        <button onClick={onDelete} className="text-slate-500 hover:text-red-400 transition-colors p-0.5 flex-shrink-0">
          <X size={12} />
        </button>
      </div>
      <input
        type="text"
        value={range.description}
        onChange={e => onChange({ ...range, description: e.target.value })}
        placeholder="Descripción del resultado..."
        className="w-full bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function DateField({ label, value, min, max, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-400 block">{label}</label>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors [color-scheme:dark]"
      />
    </div>
  );
}
