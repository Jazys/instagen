import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

/*Example of curl request :
curl --location --request POST 'http://localhost:3000/api/credits/external_call_use_token' \
--header 'x-api-key: 8c1a35eb-029f-431b-9f3e-d27fa6ac6a5f' \
--header 'Content-Type: application/json' \
--data-raw '{"actionType": "test_curl", "creditsToUse": 1}'
*/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer l'ID utilisateur depuis l'en-tête comme "clé d'API"
    const userId = req.headers['x-api-key'] as string;
    console.log(req.headers);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Missing user ID' });
    }

    // Créer un client Supabase avec le rôle de service
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server configuration error - Missing service role key' });
    }

    const serviceClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );

    // Vérifier si l'utilisateur existe dans Supabase
    const { data: userData, error: userError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      return res.status(401).json({ error: 'Unauthorized - Invalid user ID' });
    }

    // Récupérer les données de la requête
    const { actionType = "external_api_action", creditsToUse = 1 } = req.body;

    // Vérifier si l'utilisateur a assez de crédits
    const { data: quotaData, error: quotaError } = await serviceClient
      .from('user_quotas')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();
    
    if (quotaError) {
      return res.status(500).json({ error: 'Failed to fetch user credits' });
    }
    
    const currentCredits = quotaData?.credits_remaining || 0;
    
    // Vérifier si l'utilisateur a assez de crédits
    if (currentCredits < creditsToUse) {
      return res.status(402).json({ 
        error: 'Insufficient credits', 
        credits_remaining: currentCredits,
        credits_required: creditsToUse
      });
    }
    
    // Mettre à jour les crédits de l'utilisateur
    const newCredits = currentCredits - creditsToUse;
    const { error: updateError } = await serviceClient
      .from('user_quotas')
      .update({ 
        credits_remaining: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (updateError) {
      return res.status(500).json({ error: 'Failed to update credits' });
    }

    // Enregistrer l'utilisation des crédits
    const { error: logError } = await serviceClient
      .from('credits_usage_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        credits_used: creditsToUse,
        credits_remaining: newCredits
      });

    if (logError) {
      // On continue malgré l'erreur de journalisation, car les crédits ont déjà été déduits
      console.error('Failed to log credit usage:', logError);
    }

    // Renvoyer une réponse de succès avec le nouveau solde
    return res.status(200).json({ 
      success: true, 
      message: `Successfully used ${creditsToUse} credit(s)`,
      credits_remaining: newCredits,
      user_id: userId
    });
    
  } catch (error) {
    console.error('External credit usage error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 