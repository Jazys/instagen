# API Externe pour l'Utilisation des Crédits

Cette documentation explique comment utiliser l'API externe pour consommer des crédits utilisateur sans authentification Supabase traditionnelle, en utilisant directement l'ID de l'utilisateur comme clé d'API.

## Configuration Requise

1. Vous devez connaître l'ID Supabase de l'utilisateur pour lequel vous souhaitez consommer des crédits
2. Cet ID doit correspondre à un utilisateur valide dans la base de données Supabase

## Endpoint

```
POST /api/credits/external_call_use_token
```

## En-têtes Requis

```
Content-Type: application/json
X-API-Key: id_utilisateur_supabase
```

## Corps de la Requête

```json
{
  "actionType": "nom_de_votre_action",
  "creditsToUse": 1
}
```

| Paramètre | Type | Description | Requis |
|-----------|------|-------------|--------|
| actionType | string | Description de l'action effectuée | Non (par défaut: "external_api_action") |
| creditsToUse | number | Nombre de crédits à consommer | Non (par défaut: 1) |

## Réponse en Cas de Succès

```json
{
  "success": true,
  "message": "Successfully used 1 credit(s)",
  "credits_remaining": 42,
  "user_id": "id_utilisateur_supabase"
}
```

## Réponses d'Erreur

### Crédits Insuffisants (402)

```json
{
  "error": "Insufficient credits",
  "credits_remaining": 0,
  "credits_required": 1
}
```

### ID Utilisateur Invalide ou Manquant (401)

```json
{
  "error": "Unauthorized - Invalid user ID"
}
```

ou

```json
{
  "error": "Unauthorized - Missing user ID"
}
```

## Exemple d'Utilisation

### Avec cURL

```bash
curl -X POST https://votre-site.com/api/credits/external_call_use_token \
  -H "Content-Type: application/json" \
  -H "X-API-Key: id_utilisateur_supabase" \
  -d '{"actionType": "image_generation", "creditsToUse": 1}'
```

### Avec JavaScript (Node.js)

```javascript
const axios = require('axios');

async function useCredits(userId, actionType = 'image_generation', creditsToUse = 1) {
  try {
    const response = await axios.post(
      'https://votre-site.com/api/credits/external_call_use_token',
      { actionType, creditsToUse },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': userId
        }
      }
    );
    
    console.log('Success:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Exemple d'utilisation
useCredits('id_utilisateur_supabase')
  .then(data => console.log('Credits remaining:', data.credits_remaining))
  .catch(error => console.error('Failed to use credits'));
```

### Avec Python

```python
import requests

def use_credits(user_id, action_type="image_generation", credits_to_use=1):
    url = "https://votre-site.com/api/credits/external_call_use_token"
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": user_id
    }
    
    payload = {
        "actionType": action_type,
        "creditsToUse": credits_to_use
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.json())
        return None

# Exemple d'utilisation
result = use_credits("id_utilisateur_supabase")
if result:
    print(f"Credits remaining: {result['credits_remaining']}")
```

## Sécurité

- Cet endpoint utilise l'ID utilisateur directement comme méthode d'authentification
- Assurez-vous de sécuriser correctement cet ID, car il donne accès à l'utilisation des crédits de l'utilisateur
- Utilisez HTTPS pour toutes les requêtes
- N'implémentez cette méthode que si vous contrôlez les systèmes qui appellent cette API

## Surveillance et Débogage

Toutes les utilisations de crédits via cette API sont enregistrées dans la table `credits_usage_logs` avec un attribut `source: 'external_api'` dans les métadonnées, ce qui vous permet de suivre et d'auditer l'utilisation des crédits. 