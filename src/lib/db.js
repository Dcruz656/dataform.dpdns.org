import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

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
      .select('id, name, title, is_active, status, created_at, updated_at, responses(count)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(row => ({
      ...toApp(row),
      responseCount: row.responses?.[0]?.count ?? 0,
    }));
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
    // Raw fetch with Prefer:return=minimal avoids a SELECT after INSERT
    // (which would require an additional RLS policy for anon users).
    const res = await fetch(`${SUPABASE_URL}/rest/v1/responses`, {
      method: 'POST',
      signal: signal ?? undefined,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        survey_id:         surveyId,
        respondent_name:   respondentName   ?? null,
        answers:           answers          ?? {},
        timings:           Array.isArray(timings) ? timings : [],
        score:             score            ?? null,
        score_range_title: scoreRangeTitle  ?? null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.hint || `HTTP ${res.status}`);
    }
  },
};

export const adminApi = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, created_at')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  async getStats() {
    const [
      { count: usersCount },
      { count: surveysCount },
      { count: responsesCount },
      { count: activeCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('surveys').select('*', { count: 'exact', head: true }),
      supabase.from('responses').select('*', { count: 'exact', head: true }),
      supabase.from('surveys').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    return {
      usersCount:    usersCount    ?? 0,
      surveysCount:  surveysCount  ?? 0,
      responsesCount: responsesCount ?? 0,
      activeCount:   activeCount   ?? 0,
    };
  },

  async getUsers() {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: surveys } = await supabase
      .from('surveys')
      .select('user_id, id, is_active');

    const surveyMap = {};
    const activeMap = {};
    const surveyToUser = {};
    (surveys || []).forEach(s => {
      surveyMap[s.user_id] = (surveyMap[s.user_id] || 0) + 1;
      if (s.is_active) activeMap[s.user_id] = (activeMap[s.user_id] || 0) + 1;
      surveyToUser[s.id] = s.user_id;
    });

    const { data: responses } = await supabase
      .from('responses')
      .select('survey_id');
    const respMap = {};
    (responses || []).forEach(r => {
      const uid = surveyToUser[r.survey_id];
      if (uid) respMap[uid] = (respMap[uid] || 0) + 1;
    });

    return (profiles || []).map(p => ({
      ...p,
      surveyCount:   surveyMap[p.id] || 0,
      activeSurveys: activeMap[p.id] || 0,
      responseCount: respMap[p.id]   || 0,
    }));
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
