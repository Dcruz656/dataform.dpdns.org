import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PreviewMode from '../components/preview/PreviewMode';

const STORAGE_KEY = id => `dataform_answered_${id}`;

export default function PublicSurveyView({ surveyId }) {
  const [survey, setSurvey] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | already_answered | ready | notfound | inactive | submitted

  useEffect(() => {
    // Check if already answered on this device
    if (localStorage.getItem(STORAGE_KEY(surveyId))) {
      setStatus('already_answered');
      return;
    }
    supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('notfound'); return; }
        if (!data.is_active)  { setStatus('inactive'); return; }
        setSurvey(data);
        setStatus('ready');
      });
  }, [surveyId]);

  const handleSubmitted = () => {
    localStorage.setItem(STORAGE_KEY(surveyId), Date.now().toString());
    setStatus('submitted');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'already_answered') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-blue-600 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Ya respondiste esta encuesta</h1>
          <p className="text-slate-500">Tu respuesta ya fue registrada desde este dispositivo. ¡Gracias por participar!</p>
        </div>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Encuesta no encontrada</h1>
          <p className="text-slate-500">El enlace puede estar incorrecto o la encuesta fue eliminada.</p>
        </div>
      </div>
    );
  }

  if (status === 'inactive') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Encuesta no disponible</h1>
          <p className="text-slate-500">Esta encuesta no está activa en este momento.</p>
        </div>
      </div>
    );
  }

  if (status === 'submitted') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-600 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Gracias por tu respuesta!</h1>
          <p className="text-slate-500">Tu opinión ha sido registrada exitosamente.</p>
        </div>
      </div>
    );
  }

  const { _config = {} } = survey.theme ?? {};
  const surveyConfig = {
    title: survey.title,
    instructions: _config.instructions ?? '',
    requireName: _config.requireName ?? false,
    conversational: _config.conversational ?? false,
    scoreRanges: survey.score_ranges ?? [],
  };

  return (
    <PreviewMode
      surveyConfig={surveyConfig}
      questions={survey.questions ?? []}
      surveyId={survey.id}
      onClose={handleSubmitted}
      publicMode
    />
  );
}
