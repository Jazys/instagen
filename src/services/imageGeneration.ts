import { useState } from "react"
import axios from 'axios'

export interface GenerationConfig {
  age: number
  height: number
  build: number
  fashionStyle: string
  colorPalette: string
  personalityTraits: string
  contentStyle: string
}

export interface GenerationResult {
  imageUrl: string
  style: string
  timestamp: string
}

export const generateImage = async (config: GenerationConfig): Promise<GenerationResult> => {
  if (!process.env.NEXT_PUBLIC_AI_API_KEY) {
    throw new Error('AI API key is not configured')
  }

  try {
    // Example using a hypothetical AI image generation API
    const response = await axios.post('https://api.example-ai-service.com/v1/generate', {
      prompt: `Generate a photo of an influencer with the following characteristics:
        - Age: ${config.age} years old
        - Height: ${config.height}cm
        - Build: ${config.build}% scale
        - Style: ${config.fashionStyle}
        - Colors: ${config.colorPalette}
        - Personality: ${config.personalityTraits}
        - Content type: ${config.contentStyle}`,
      api_key: process.env.NEXT_PUBLIC_AI_API_KEY,
      size: '1024x1024',
      quality: 'hd'
    })

    return {
      imageUrl: response.data.imageUrl,
      style: config.fashionStyle || 'Contemporary',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to generate image:', error)
    throw new Error('Failed to generate image. Please try again.')
  }
}