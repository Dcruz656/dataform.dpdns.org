import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PreviewMode from '../components/preview/PreviewMode';

export default function PublicSurveyView({ surveyId }) {
  const [survey, setSurvey] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | inactive | submitted

  useEffect(() => {
    supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('notfound'); return; }
        if (!data.is_active) { setStatus('inactive'); return; }
        setSurvey(data);
        setStatus('ready');
      });
  }, [surveyId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center max-w-sm p-8">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Encuesta no encontrada</h1>
          <p className="text-slate-500">El enlace puede estar incorrecto o la encuesta fue eliminada.</p>
        </div>
      </div>
    );
  }

  if (status === 'inactive') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center max-w-sm p-8">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Encuesta no disponible</h1>
          <p className="text-slate-500">Esta encuesta no está activa en este momento.</p>
        </div>
      </div>
    );
  }

  const { _config = {}, ...pureTheme } = survey.theme ?? {};
  const surveyConfig = {
    title: survey.title,
    instructions: _config.instructions ?? '',
    requireName: _config.requireName ?? false,
    conversational: _config.conversational ?? false,
    timeLimit: _config.timeLimit ?? false,
    startDate: _config.startDate ?? '',
    endDate: _config.endDate ?? '',
    scoreRanges: survey.score_ranges ?? [],
  };

  return (
    <PreviewMode
      surveyConfig={surveyConfig}
      questions={survey.questions ?? []}
      surveyId={survey.id}
      onClose={() => setStatus('submitted')}
      publicMode
    />
  );
}
