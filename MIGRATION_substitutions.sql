-- Módulo de Substituição Remissionária (Carro / Moto Reserva)
CREATE TABLE IF NOT EXISTS public.contract_substitutions (
    id uuid default gen_random_uuid() primary key,
    contract_id uuid references public.sale_contracts(id) on delete cascade not null,
    substitute_vehicle_id uuid references public.vehicles(id) on delete cascade not null,
    start_date timestamp with time zone default timezone('utc'::text, now()) not null,
    end_date timestamp with time zone,
    reason text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.contract_substitutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.contract_substitutions;
CREATE POLICY "Enable all for authenticated users" ON public.contract_substitutions FOR ALL TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
