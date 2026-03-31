-- NexusLoc - Modulo Aluguel com Intencao de Venda
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.sale_contracts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  vehicle_id        UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  sale_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  down_payment      NUMERIC(12,2) NOT NULL DEFAULT 0,
  installments      INTEGER NOT NULL CHECK (installments BETWEEN 1 AND 36),
  installment_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_day           INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid','overdue','cancelled')),
  notes             TEXT
);

CREATE TABLE IF NOT EXISTS public.sale_installments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sale_contract_id    UUID NOT NULL REFERENCES public.sale_contracts(id) ON DELETE CASCADE,
  installment_number  INTEGER NOT NULL,
  due_date            DATE NOT NULL,
  amount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_at             TIMESTAMPTZ,
  paid_amount         NUMERIC(12,2),
  receipt_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_sale_contracts_client      ON public.sale_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_sale_contracts_vehicle     ON public.sale_contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sale_contracts_status      ON public.sale_contracts(status);
CREATE INDEX IF NOT EXISTS idx_sale_installments_contract ON public.sale_installments(sale_contract_id);
CREATE INDEX IF NOT EXISTS idx_sale_installments_due      ON public.sale_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_sale_installments_status   ON public.sale_installments(status);

ALTER TABLE public.sale_contracts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_sale_contracts"    ON public.sale_contracts;
DROP POLICY IF EXISTS "auth_all_sale_installments" ON public.sale_installments;

CREATE POLICY "auth_all_sale_contracts"    ON public.sale_contracts    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sale_installments" ON public.sale_installments FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12,2);
