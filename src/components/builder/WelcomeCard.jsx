import { MessageSquare } from 'lucide-react';

export default function WelcomeCard({ surveyConfig, setSurveyConfig }) {
  const update = (field, value) => setSurveyConfig(c => ({ ...c, [field]: value }));

  return (
    <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm border-t-4 border-t-blue-600">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="text-blue-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-800">Pantalla de Bienvenida</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Título de la Encuesta</label>
          <input
            type="text"
            value={surveyConfig.title}
            onChange={e => update('title', e.target.value)}
            className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-base font-medium transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Instrucciones o Descripción</label>
          <textarea
            value={surveyConfig.instructions}
            onChange={e => update('instructions', e.target.value)}
            className="w-full border border-slate-300 rounded-md p-3 text-sm text-slate-600 min-h-[80px] focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
