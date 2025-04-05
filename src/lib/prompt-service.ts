import OpenAI from 'openai';

/**
 * Enhances a basic prompt into a more detailed, photorealistic prompt for image generation
 * using OpenAI's GPT-4o-mini model
 * 
 * @param basePrompt The original prompt to enhance
 * @returns A more detailed and optimized prompt for image generation
 */
export async function enhancePromptWithGPT(basePrompt: string): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('Enhancing prompt with GPT-4o:', basePrompt);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating hyper-detailed, photorealistic prompts for AI image generation systems. Your goal is to generate a breathtakingly realistic image of a person using only their physical attributes. Do not include any information about clothing, accessories, environment, background, or pose. Focus solely on anatomical and facial features, skin texture, hair characteristics, and other distinct physical traits. Make the description vivid, rich, and layered to help the AI render a truly lifelike image. The person should appear as a modern influencer, with photorealistic lighting, detailed skin, natural imperfections, and camera-like depth"
        },
        {
          role: "user",
          content: `Please enhance this prompt for a photorealistic image generation: "${basePrompt}"`
        }
      ],
      max_tokens: 300,
    });
    
    const enhancedPrompt = response.choices[0].message.content || basePrompt;
    console.log('Enhanced prompt:', enhancedPrompt);
    return enhancedPrompt;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Return original prompt as fallback instead of empty string
    return basePrompt;
  }
}

/**
 * Fallback function to enhance prompts when OpenAI API is unavailable
 * This adds standard high-quality image terms to the prompt
 */
export function enhancePromptMock(basePrompt: string): string {
  // Add standard high-quality image terms
  const enhancementTerms = [
    'high quality',
    'photorealistic',
    'detailed',
    'professional photography',
    '8k',
    'sharp focus',
    'high resolution',
    'studio lighting'
  ];
  
  // Randomly select 3-5 enhancement terms
  const numTerms = Math.floor(Math.random() * 3) + 3; // 3 to 5 terms
  const selectedTerms = [];
  
  for (let i = 0; i < numTerms; i++) {
    const randomIndex = Math.floor(Math.random() * enhancementTerms.length);
    selectedTerms.push(enhancementTerms[randomIndex]);
    // Remove the selected term to avoid duplicates
    enhancementTerms.splice(randomIndex, 1);
    
    // Break if we've used all available terms
    if (enhancementTerms.length === 0) break;
  }
  
  // Combine the base prompt with the enhancement terms
  return `${basePrompt}, ${selectedTerms.join(', ')}`;
} 