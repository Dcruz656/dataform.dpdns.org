-- Question bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo        TEXT        NOT NULL DEFAULT '',
  tipo          TEXT        NOT NULL DEFAULT 'text',
  configuracion JSONB       NOT NULL DEFAULT '{}',
  etiquetas     TEXT[]      NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own bank questions"
  ON public.question_bank
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS question_bank_user_id_idx ON public.question_bank (user_id);
