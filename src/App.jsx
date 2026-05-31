import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, PenTool, BarChart3, Palette, Archive, Menu, X, LogOut, ClipboardList, Bell, HelpCircle, Search } from 'lucide-react';
import { DEFAULT_QUESTIONS } from './constants';
import NavItem from './components/NavItem';
import BuilderView from './components/builder/BuilderView';
import PreviewMode from './components/preview/PreviewMode';
import DashboardView from './views/DashboardView';
import AnalyticsView from './views/AnalyticsView';
import AppearanceView from './views/AppearanceView';
import ArchiveView from './views/ArchiveView';
import MySurveysView from './views/MySurveysView';
import LoginView from './views/LoginView';
import { useAuth } from './contexts/AuthContext';
import { surveysApi, bankApi } from './lib/db';

export default function App() {
  const { user, signOut, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState({ primary: '#2563eb', font: 'Inter', logo: null });
  const [isPreview, setIsPreview] = useState(false);
  const [activeSurveyId, setActiveSurveyId] = useState(null);

  const [surveyConfig, setSurveyConfig] = useState({
    title: 'Mi Primera Encuesta',
    instructions: '',
    requireName: false,
    conversational: false,
    timeLimit: false,
    startDate: '',
    endDate: '',
    scoreRanges: [],
  });

  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [surveys, setSurveys] = useState([]);
  const [archivedSurveys, setArchivedSurveys] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const autoSaveTimer = useRef(null);
  const isMounted = useRef(false);
  const activeSurveyIdRef = useRef(null);
  useEffect(() => { activeSurveyIdRef.current = activeSurveyId; }, [activeSurveyId]);

  useEffect(() => {
    if (!user) {
      setSurveys([]);
      setQuestionBank([]);
      return;
    }
    loadSurveys();
    loadBank();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSurveys = async () => {
    setLoadingSurveys(true);
    try {
      const data = await surveysApi.list(user.id);
      setSurveys(data);
    } catch (err) {
      console.error('Error loading surveys:', err);
    } finally {
      setLoadingSurveys(false);
    }
  };

  const loadBank = async () => {
    try {
      const data = await bankApi.list(user.id);
      setQuestionBank(data);
    } catch (err) {
      console.error('Error loading bank:', err);
    }
  };

  // Auto-save when builder content changes (debounced 1500ms)
  // Uses activeSurveyIdRef to avoid stale closures.
  // Creates the survey in DB if it doesn't exist yet.
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (!user) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');
    autoSaveTimer.current = setTimeout(async () => {
      const themePayload = {
        ...theme,
        _config: {
          instructions: surveyConfig.instructions,
          requireName: surveyConfig.requireName,
          conversational: surveyConfig.conversational,
          timeLimit: surveyConfig.timeLimit,
          startDate: surveyConfig.startDate,
          endDate: surveyConfig.endDate,
        },
      };
      try {
        const currentId = activeSurveyIdRef.current;
        if (currentId) {
          await surveysApi.update(currentId, {
            title: surveyConfig.title,
            questions,
            theme: themePayload,
            score_ranges: surveyConfig.scoreRanges,
          });
          setSurveys(prev =>
            prev.map(s => s.id === currentId ? { ...s, title: surveyConfig.title } : s)
          );
        } else {
          // No survey yet — create on first save
          const survey = await surveysApi.create({
            userId: user.id,
            title: surveyConfig.title,
            questions,
            theme: themePayload,
            scoreRanges: surveyConfig.scoreRanges,
          });
          activeSurveyIdRef.current = survey.id;
          setActiveSurveyId(survey.id);
          setSurveys(prev => [survey, ...prev]);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save error:', err);
        setSaveStatus('error:' + (err?.message || err?.code || JSON.stringify(err)));
      }
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [questions, surveyConfig, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = tab => { setActiveTab(tab); setMenuOpen(false); };

  // Called by PublishModal when activeSurveyId is null — creates survey immediately
  const ensureSurveySaved = async () => {
    if (activeSurveyIdRef.current) return activeSurveyIdRef.current;
    try {
      const themePayload = {
        ...theme,
        _config: {
          instructions: surveyConfig.instructions,
          requireName: surveyConfig.requireName,
          conversational: surveyConfig.conversational,
          timeLimit: surveyConfig.timeLimit,
          startDate: surveyConfig.startDate,
          endDate: surveyConfig.endDate,
        },
      };
      const survey = await surveysApi.create({
        userId: user.id,
        title: surveyConfig.title,
        questions,
        theme: themePayload,
        scoreRanges: surveyConfig.scoreRanges,
      });
      activeSurveyIdRef.current = survey.id;
      setActiveSurveyId(survey.id);
      setSurveys(prev => [survey, ...prev]);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return survey.id;
    } catch (err) {
      console.error('Error saving survey:', err);
      setSaveStatus('error');
      return null;
    }
  };

  const handleNewSurvey = () => {
    isMounted.current = false; // skip auto-save on this render cycle
    activeSurveyIdRef.current = null;
    setActiveSurveyId(null);
    setSurveyConfig({
      title: 'Nueva Encuesta',
      instructions: '',
      requireName: false,
      conversational: false,
      timeLimit: false,
      startDate: '',
      endDate: '',
      scoreRanges: [],
    });
    setQuestions(DEFAULT_QUESTIONS);
    setSaveStatus('idle');
    navigate('builder');
    // Survey is created in DB automatically by auto-save on first change
  };

  const handleEditSurvey = async (id) => {
    try {
      const survey = await surveysApi.get(id);
      const { _config = {}, ...pureTheme } = survey.theme ?? {};
      isMounted.current = false;
      if (pureTheme.primary) setTheme(pureTheme);
      setActiveSurveyId(survey.id);
      setSurveyConfig({
        title: survey.title,
        instructions: _config.instructions ?? '',
        requireName: _config.requireName ?? false,
        conversational: _config.conversational ?? false,
        timeLimit: _config.timeLimit ?? false,
        startDate: _config.startDate ?? '',
        endDate: _config.endDate ?? '',
        scoreRanges: survey.score_ranges ?? [],
      });
      setQuestions(survey.questions ?? []);
      navigate('builder');
    } catch (err) {
      console.error('Error loading survey:', err);
    }
  };

  const handleArchive = id => {
    const survey = surveys.find(s => s.id === id);
    if (!survey) return;
    setSurveys(prev => prev.filter(s => s.id !== id));
    setArchivedSurveys(prev => [survey, ...prev]);
  };

  const handleDeleteSurvey = async id => {
    try {
      await surveysApi.delete(id);
      setSurveys(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting survey:', err);
    }
  };

  const handleUnarchive = id => {
    const survey = archivedSurveys.find(s => s.id === id);
    if (!survey) return;
    setArchivedSurveys(prev => prev.filter(s => s.id !== id));
    setSurveys(prev => [...prev, survey]);
  };

  const handleSaveToBank = async (question, title, tags) => {
    const etiquetas =
      typeof tags === 'string'
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : tags ?? [];
    try {
      const item = await bankApi.save({
        userId: user.id,
        titulo: title || question.text.slice(0, 50) || 'Pregunta sin título',
        tipo: question.type,
        configuracion: { ...question, id: undefined, conditions: [], conditionMode: 'show' },
        etiquetas,
      });
      setQuestionBank(prev => [item, ...prev]);
    } catch (err) {
      console.error('Error saving to bank:', err);
    }
  };

  const handleInsertFromBank = item => {
    const newQ = {
      ...item.configuracion,
      id: Date.now() + Math.floor(Math.random() * 9999),
      conditions: [],
      conditionMode: 'show',
    };
    setQuestions(qs => [...qs, newQ]);
  };

  const handleDeleteFromBank = async id => {
    try {
      await bankApi.delete(id);
      setQuestionBank(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting from bank:', err);
    }
  };

  const mapSurvey = s => ({
    id: s.id,
    name: s.title ?? s.name ?? 'Encuesta',
    responses: s.responseCount ?? 0,
    status: s.is_active ? 'Activa' : 'Borrador',
    statusColor: s.is_active
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-600',
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  });

  const dashboardSurveys = surveys.map(mapSurvey);
  const mySurveysData    = surveys.map(mapSurvey);

  const archivedDashboard = archivedSurveys.map(s => ({
    id: s.id,
    name: s.title ?? s.name ?? 'Encuesta',
    responses: 0,
    status: 'Archivada',
    statusColor: 'bg-amber-100 text-amber-700',
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  // --- Auth gates ---
  if (authLoading) return <LoadingScreen />;
  if (!user) return <LoginView />;

  if (isPreview) {
    return (
      <PreviewMode
        surveyConfig={surveyConfig}
        questions={questions}
        surveyId={activeSurveyId}
        onClose={() => setIsPreview(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex font-sans text-on-surface">

      {menuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-surface-container-highest flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:inset-auto md:translate-x-0 md:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white flex-shrink-0">
            <BarChart3 size={20} />
          </div>
          <div className="min-w-0">
            <button onClick={() => navigate('dashboard')} className="font-bold text-xl text-primary tracking-tight leading-none hover:opacity-80 transition-opacity">DataForm</button>
            <p className="text-xs text-on-surface-variant mt-0.5">Plataforma de Encuestas</p>
          </div>
          <button onClick={() => setMenuOpen(false)} className="md:hidden ml-auto text-on-surface-variant hover:text-on-surface p-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* CTA */}
        <div className="px-4 mb-4">
          <button
            onClick={handleNewSurvey}
            className="w-full bg-primary hover:bg-surface-tint text-on-primary font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_4px_14px_rgba(31,16,142,0.2)] active:scale-95"
          >
            <PenTool size={15} /> Nueva Encuesta
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard"     active={activeTab === 'dashboard'}  onClick={() => navigate('dashboard')} />
          <NavItem icon={<ClipboardList size={18} />}   label="Mis Encuestas" active={activeTab === 'mysurveys'}  onClick={() => navigate('mysurveys')} />
          <NavItem icon={<PenTool size={18} />}         label="Constructor"   active={activeTab === 'builder'}    onClick={() => navigate('builder')} />
          <NavItem icon={<BarChart3 size={18} />}       label="Analítica"     active={activeTab === 'analytics'}  onClick={() => navigate('analytics')} />
          <NavItem icon={<Palette size={18} />}         label="Apariencia"    active={activeTab === 'appearance'} onClick={() => navigate('appearance')} />
          <NavItem
            icon={<Archive size={18} />}
            label={
              <span className="flex items-center gap-2">
                Archivo
                {archivedSurveys.length > 0 && (
                  <span className="text-xs bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded-full font-semibold">
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
          <div className="p-3 m-3 bg-surface-container-low rounded-xl border border-surface-container-highest space-y-3 overflow-y-auto max-h-64">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Configuración</span>
            <Toggle label="Solicitar Nombre"    hint="Pantalla inicial de identificación." checked={surveyConfig.requireName}    onChange={v => setSurveyConfig(c => ({ ...c, requireName: v }))} />
            <Toggle label="Modo Conversacional" hint="Una pregunta a la vez."              checked={surveyConfig.conversational}  onChange={v => setSurveyConfig(c => ({ ...c, conversational: v }))} />
            <Toggle label="Tiempo Límite"       hint="Ventana de disponibilidad."          checked={surveyConfig.timeLimit}       onChange={v => setSurveyConfig(c => ({ ...c, timeLimit: v }))} />
            {surveyConfig.timeLimit && (
              <div className="space-y-2 pt-1 border-t border-surface-container-highest">
                <DateField label="Fecha de inicio" value={surveyConfig.startDate} max={surveyConfig.endDate || undefined}   onChange={v => setSurveyConfig(c => ({ ...c, startDate: v }))} />
                <DateField label="Fecha límite"    value={surveyConfig.endDate}   min={surveyConfig.startDate || undefined} onChange={v => setSurveyConfig(c => ({ ...c, endDate: v }))} />
                {surveyConfig.startDate && surveyConfig.endDate && (
                  <p className="text-xs text-primary font-medium">
                    {Math.max(0, Math.ceil((new Date(surveyConfig.endDate) - new Date(surveyConfig.startDate)) / 86400000))} días de disponibilidad
                  </p>
                )}
              </div>
            )}
            <div className="border-t border-surface-container-highest pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Puntaje</span>
                <button onClick={() => setSurveyConfig(c => ({ ...c, scoreRanges: [...(c.scoreRanges || []), { id: Date.now(), min: 0, max: 10, title: 'Resultado', description: '' }] }))} className="text-xs text-primary hover:text-surface-tint font-semibold">+ Rango</button>
              </div>
              {!(surveyConfig.scoreRanges || []).length && <p className="text-xs text-on-surface-variant/50 italic">Sin rangos.</p>}
              {(surveyConfig.scoreRanges || []).map(range => (
                <ScoreRangeRow key={range.id} range={range}
                  onChange={u => setSurveyConfig(c => ({ ...c, scoreRanges: c.scoreRanges.map(r => r.id === u.id ? u : r) }))}
                  onDelete={() => setSurveyConfig(c => ({ ...c, scoreRanges: c.scoreRanges.filter(r => r.id !== range.id) }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-surface-container-highest">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-error hover:bg-error-container transition-all duration-200"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden">
        {/* Top App Bar */}
        <header className="flex-shrink-0 h-16 bg-surface-container-lowest border-b border-surface-container-highest ambient-shadow flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="md:hidden text-on-surface-variant hover:text-on-surface p-1 -ml-1 transition-colors">
              <Menu size={22} />
            </button>
            <div className="relative hidden sm:block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar encuestas..."
                className="pl-9 pr-4 py-2 bg-surface-container-low border border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-full text-sm text-on-surface w-56 transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95">
              <Bell size={18} />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95">
              <HelpCircle size={18} />
            </button>
            <div className="w-8 h-8 ml-2 rounded-full overflow-hidden border-2 border-surface-container-highest flex-shrink-0">
              {user.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">{(user.email?.[0] ?? '?').toUpperCase()}</div>
              }
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 md:p-8">
            {activeTab === 'dashboard' && (
              <DashboardView
                surveys={dashboardSurveys}
                loading={loadingSurveys}
                onViewAnalytics={() => navigate('analytics')}
                onNewSurvey={handleNewSurvey}
                onArchive={handleArchive}
                onEdit={handleEditSurvey}
              />
            )}
            {activeTab === 'mysurveys' && (
              <MySurveysView
                surveys={mySurveysData}
                loading={loadingSurveys}
                onNewSurvey={handleNewSurvey}
                onEdit={handleEditSurvey}
                onArchive={handleArchive}
                onDelete={handleDeleteSurvey}
                onViewAnalytics={() => navigate('analytics')}
              />
            )}
            {activeTab === 'archive' && (
              <ArchiveView
                surveys={archivedDashboard}
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
                activeSurveyId={activeSurveyId}
                saveStatus={saveStatus}
                onEnsureSaved={ensureSurveySaved}
              />
            )}
            {activeTab === 'analytics'  && (
              <AnalyticsView
                surveys={mySurveysData}
                initialSurveyId={activeSurveyId}
              />
            )}
            {activeTab === 'appearance' && <AppearanceView theme={theme} setTheme={setTheme} />}
          </div>
          <footer className="px-4 md:px-8 py-4 border-t border-outline-variant/20 bg-surface-container-lowest text-center text-xs text-on-surface-variant flex-shrink-0">
            © 2025 DataForm. Daniel Cruz Bautista. Todos los derechos reservados.
          </footer>
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-white/60 text-sm">Cargando...</p>
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 text-sm cursor-pointer group">
      <div onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors mt-0.5 ${checked ? 'bg-primary' : 'bg-surface-container-highest'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </div>
      <div>
        <div className="font-medium text-on-surface group-hover:text-primary transition-colors text-xs">{label}</div>
        {hint && <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed">{hint}</p>}
      </div>
    </label>
  );
}

function ScoreRangeRow({ range, onChange, onDelete }) {
  const inp = "bg-white border border-surface-container-highest rounded px-1.5 py-1 text-xs text-on-surface outline-none focus:border-primary";
  return (
    <div className="bg-white rounded-lg p-2 space-y-1.5 border border-surface-container-highest">
      <div className="flex items-center gap-1">
        <input type="number" value={range.min} onChange={e => onChange({ ...range, min: Number(e.target.value) })} className={`w-12 ${inp}`} placeholder="min" />
        <span className="text-xs text-on-surface-variant">–</span>
        <input type="number" value={range.max} onChange={e => onChange({ ...range, max: Number(e.target.value) })} className={`w-12 ${inp}`} placeholder="max" />
        <input type="text" value={range.title} onChange={e => onChange({ ...range, title: e.target.value })} placeholder="Título" className={`flex-1 ${inp} min-w-0`} />
        <button onClick={onDelete} className="text-on-surface-variant hover:text-error transition-colors p-0.5 flex-shrink-0"><X size={12} /></button>
      </div>
      <input type="text" value={range.description} onChange={e => onChange({ ...range, description: e.target.value })} placeholder="Descripción..." className={`w-full ${inp}`} />
    </div>
  );
}

function DateField({ label, value, min, max, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-on-surface-variant block">{label}</label>
      <input type="date" value={value} min={min} max={max} onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-surface-container-highest rounded-lg px-2 py-1.5 text-xs text-on-surface outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}
