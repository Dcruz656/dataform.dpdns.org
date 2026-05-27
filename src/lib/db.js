import { supabase } from './supabase';

export const surveysApi = {
  async list(userId) {
    const { data, error } = await supabase
      .from('surveys')
      .select('id, title, created_at, updated_at, is_active')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create({ userId, title, questions, theme, scoreRanges }) {
    const { data, error } = await supabase
      .from('surveys')
      .insert({
        user_id: userId,
        title,
        questions,
        theme,
        score_ranges: scoreRanges ?? [],
        is_active: false,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from('surveys')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
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
