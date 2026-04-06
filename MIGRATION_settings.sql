-- ─────────────────────────────────────────────────────────────
-- MIGRATION: settings table
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.settings (
  id          UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
  company_name              TEXT NOT NULL DEFAULT 'Itabaiana Loc',
  company_cnpj              TEXT DEFAULT '',
  company_address           TEXT DEFAULT '',
  company_phone             TEXT DEFAULT '',
  company_email             TEXT DEFAULT '',
  logo_url                  TEXT DEFAULT '/logo.png',
  currency                  TEXT DEFAULT 'BRL',
  daily_rental_start_time   TEXT DEFAULT '08:00',
  daily_rental_end_time     TEXT DEFAULT '18:00',
  contract_clauses          TEXT[] DEFAULT ARRAY[
    'O locatário deve devolver o veículo com o mesmo nível de combustível.',
    'Multas de trânsito ocorridas durante o período de locação são de responsabilidade do locatário.',
    'Atraso na devolução acarretará cobrança de hora extra proporcional.'
  ],
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) to read and write
CREATE POLICY "Admins can read settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can write settings"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (true);

-- Seed default row
INSERT INTO public.settings (id)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID)
ON CONFLICT (id) DO NOTHING;
