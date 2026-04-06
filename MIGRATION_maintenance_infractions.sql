-- Criação do módulo de Manutenções Periódicas (Oficina)
CREATE TABLE public.maintenance_schedules (
    id uuid default gen_random_uuid() primary key,
    vehicle_id uuid references public.vehicles(id) on delete cascade not null,
    contract_id uuid references public.sale_contracts(id) on delete cascade,
    scheduled_date date not null,
    description text not null,
    status text not null default 'pending', -- pending, completed, overdue
    cost decimal(12,2) default 0,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS e Politicas
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.maintenance_schedules FOR ALL TO authenticated USING (true);


-- Criação do módulo de Infrações de Trânsito
CREATE TABLE public.traffic_infractions (
    id uuid default gen_random_uuid() primary key,
    contract_id uuid references public.sale_contracts(id) on delete cascade not null,
    vehicle_id uuid references public.vehicles(id) on delete cascade not null,
    infraction_date timestamp with time zone not null,
    notice_number text not null,
    description text not null,
    amount decimal(12,2) not null,
    status text not null default 'pending', -- pending, added_to_installment, paid
    linked_installment_id uuid references public.sale_installments(id) on delete set null,
    driver_indication_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.traffic_infractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.traffic_infractions FOR ALL TO authenticated USING (true);
