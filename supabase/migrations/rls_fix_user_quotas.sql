-- Correction des politiques RLS pour user_quotas

-- 1. Ajouter les autorisations pour INSERT, UPDATE, DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_quotas TO authenticated;

-- 2. Supprimer l'ancienne politique sélective
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_quotas;

-- 3. Créer des politiques complètes pour toutes les opérations CRUD
-- Politique pour SELECT
CREATE POLICY "Users can view their own credits" 
    ON public.user_quotas 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Politique pour INSERT
CREATE POLICY "Users can insert their own credits" 
    ON public.user_quotas 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Politique pour UPDATE
CREATE POLICY "Users can update their own credits" 
    ON public.user_quotas 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- 4. Politique supplémentaire pour le rôle service
-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Service role can manage all credits" ON public.user_quotas;

-- Créer une politique complète pour le rôle service
CREATE POLICY "Service role can manage all credits" 
    ON public.user_quotas 
    USING (auth.role() = 'service_role' OR auth.jwt() ? 'service_role');

-- 5. Ajouter une politique par défaut pour faciliter l'opération upsert
CREATE POLICY "Enable all operations for all users" 
    ON public.user_quotas 
    USING (true) 
    WITH CHECK (auth.uid() = user_id); 