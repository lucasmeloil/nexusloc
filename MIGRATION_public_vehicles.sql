-- NexusLoc - Ajuste de Permissões para Veículos Públicos
-- Execute este script no SQL Editor do seu painel Supabase

-- Esta política permite que qualquer pessoa (mesmo sem fazer login) 
-- veja os veículos que estão com o status 'available' (disponíveis), 
-- para que eles apareçam corretamente na Landing Page.

-- 1. Habilita o RLS na tabela (caso não esteja habilitado)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 2. Remove a política antiga caso você vá rodar este script mais de uma vez
DROP POLICY IF EXISTS "Permitir leitura publica de veiculos disponiveis" ON public.vehicles;

-- 3. Cria a política que libera a leitura (SELECT) apenas para 
-- usuários anônimos e apenas quando o veículo estiver disponível
CREATE POLICY "Permitir leitura publica de veiculos disponiveis" 
ON public.vehicles 
FOR SELECT 
TO public 
USING (status = 'available');
