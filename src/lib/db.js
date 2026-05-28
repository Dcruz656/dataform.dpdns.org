import { supabase } from './supabase';

// Helper: DB rows use "name", app code uses "title"
const toApp = row => row ? { ...row, title: row.name ?? row.title } : row;

export const surveysApi = {
  async list(userId) {
    const { data, error } = await supabase
      .from('surveys')
      .select('id, name, created_at, updated_at, is_active')
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
        name: title,          // DB column is "name"
        questions,
        theme,
        score_ranges: scoreRanges ?? [],
        is_active: false,
      })
      .select()
      .single();
    if (error) throw error;
    return toApp(data);
  },

  async update(id, patch) {
    // Convert "title" key → "name" for the DB
    const { title, ...rest } = patch;
    const dbPatch = { ...rest, updated_at: new Date().toISOString() };
    if (title !== undefined) dbPatch.name = title;

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

  async submit({ surveyId, respondentName, answers, timings, score, scoreRangeTitle }) {
    const { data, error } = await supabase
      .from('responses')
      .insert({
        survey_id: surveyId,
        respondent_name: respondentName ?? null,
        answers,
        timings: timings ?? [],
        score: score ?? null,
        score_range_title: scoreRangeTitle ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
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
