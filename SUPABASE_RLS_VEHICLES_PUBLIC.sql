-- ==============================================================================
-- 🚀  SCRIPT PARA LIBERAR ACESSO PÚBLICO AOS VEÍCULOS
-- ==============================================================================
-- Problema: Clientes normais (não logados) entram no site e os carros não carregam,
-- pois o mecanismo de segurança (RLS - Row Level Security) do Supabase bloqueava.
--
-- Solução: As instruções abaixo dizem ao Supabase:
-- "Qualquer pessoa acessando o site (público) tem permissão de LEITURA (SELECT) nos veículos."
-- ==============================================================================

-- 1. Garante que o RLS está ativado na tabela de veículos
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 2. Se por acaso já existir uma política com esse nome, exclui para não dar erro
DROP POLICY IF EXISTS "Public_Vehicles_Select" ON public.vehicles;

-- 3. Cria a Política mágica permitindo que QUALQUER UM veja a frota
CREATE POLICY "Public_Vehicles_Select" 
ON public.vehicles 
FOR SELECT 
USING (true);

-- Pronto! Os clientes verão a frota no site normalmente agora.
