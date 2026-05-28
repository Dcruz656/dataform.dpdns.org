import { supabase } from './supabase';

// Convert a DB row to the shape the app expects.
// Individual DB columns → theme._config so App.jsx doesn't need changes.
const toApp = row => {
  if (!row) return row;
  const { _config: _ignored, ...pureTheme } = row.theme ?? {};
  return {
    ...row,
    title: row.title ?? row.name,
    theme: {
      ...pureTheme,
      _config: {
        instructions: row.instructions ?? '',
        requireName:  row.require_name  ?? false,
        conversational: row.conversational ?? false,
        timeLimit:    row.time_limit    ?? false,
        startDate:    row.start_date    ?? '',
        endDate:      row.end_date      ?? '',
      },
    },
  };
};

// Convert app-level survey data to DB column names.
const toDb = ({ title, questions, theme, scoreRanges, isActive }) => {
  const { _config = {}, ...pureTheme } = theme ?? {};
  return {
    name:           title,
    title:          title,
    instructions:   _config.instructions   ?? '',
    status:         isActive ? 'Activa' : 'Borrador',
    require_name:   _config.requireName    ?? false,
    conversational: _config.conversational ?? false,
    time_limit:     _config.timeLimit      ?? false,
    start_date:     _config.startDate      || null,
    end_date:       _config.endDate        || null,
    questions:      questions,
    theme:          pureTheme,
    score_ranges:   scoreRanges ?? [],
  };
};

export const surveysApi = {
  async list(userId) {
    const { data, error } = await supabase
      .from('surveys')
      .select('id, name, title, is_active, status, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toApp);
  },

  async get(id) {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return toApp(data);
  },

  async create({ userId, title, questions, theme, scoreRanges }) {
    const { data, error } = await supabase
      .from('surveys')
      .insert({
        user_id: userId,
        is_active: false,
        ...toDb({ title, questions, theme, scoreRanges, isActive: false }),
      })
      .select()
      .single();
    if (error) throw error;
    return toApp(data);
  },

  async update(id, patch) {
    // patch may contain: title, questions, theme (with _config), score_ranges, is_active
    const { title, questions, theme, score_ranges, is_active } = patch;
    const dbPatch = { updated_at: new Date().toISOString() };

    if (title     !== undefined) { dbPatch.name = title; dbPatch.title = title; }
    if (questions !== undefined)   dbPatch.questions = questions;
    if (score_ranges !== undefined) dbPatch.score_ranges = score_ranges;
    if (is_active !== undefined) {
      dbPatch.is_active = is_active;
      dbPatch.status = is_active ? 'Activa' : 'Borrador';
    }
    if (theme !== undefined) {
      const { _config = {}, ...pureTheme } = theme;
      dbPatch.theme = pureTheme;
      if (_config.instructions   !== undefined) dbPatch.instructions   = _config.instructions;
      if (_config.requireName    !== undefined) dbPatch.require_name   = _config.requireName;
      if (_config.conversational !== undefined) dbPatch.conversational = _config.conversational;
      if (_config.timeLimit      !== undefined) dbPatch.time_limit     = _config.timeLimit;
      if (_config.startDate      !== undefined) dbPatch.start_date     = _config.startDate || null;
      if (_config.endDate        !== undefined) dbPatch.end_date       = _config.endDate   || null;
    }

    const { data, error } = await supabase
      .from('surveys')
      .update(dbPatch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toApp(data);
  },

  async delete(id) {
    const { error } = await supabase.from('surveys').delete().eq('id', id);
    if (error) throw error;
  },
};

export const responsesApi = {
  async list(surveyId) {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async submit({ surveyId, respondentName, answers, timings, score, scoreRangeTitle, signal }) {
    const { error } = await supabase
      .from('responses')
      .insert({
        survey_id:         surveyId,
        respondent_name:   respondentName   ?? null,
        answers,
        timings:           timings          ?? [],
        score:             score            ?? null,
        score_range_title: scoreRangeTitle  ?? null,
      })
      .abortSignal(signal ?? null);
    if (error) throw error;
  },
};

export const bankApi = {
  async list(userId) {
    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async save({ userId, titulo, tipo, configuracion, etiquetas }) {
    const { data, error } = await supabase
      .from('question_bank')
      .insert({ user_id: userId, titulo, tipo, configuracion, etiquetas: etiquetas ?? [] })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('question_bank').delete().eq('id', id);
    if (error) throw error;
  },
};
