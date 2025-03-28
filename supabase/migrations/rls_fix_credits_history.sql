-- Correction des politiques RLS pour credits_history

-- 1. Ajouter les autorisations pour INSERT, UPDATE, DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credits_history TO authenticated;

-- 2. Supprimer l'ancienne politique sélective si elle existe
DROP POLICY IF EXISTS "Users can view their own credit history" ON public.credits_history;

-- 3. Créer des politiques complètes pour toutes les opérations CRUD
-- Politique pour SELECT
CREATE POLICY "Users can view their own credit history" 
    ON public.credits_history 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Politique pour INSERT
CREATE POLICY "Users can insert their own credit history" 
    ON public.credits_history 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 4. Politique supplémentaire pour le rôle service
DROP POLICY IF EXISTS "Service role can manage credit history" ON public.credits_history;

-- Créer une politique complète pour le rôle service
CREATE POLICY "Service role can manage credit history" 
    ON public.credits_history 
    USING (auth.role() = 'service_role' OR auth.jwt() ? 'service_role'); 