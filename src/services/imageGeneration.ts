
import { useState } from "react"

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
  // Simulate API call with demo images
  const demoImages = [
    '/photo-8-m84j64ee.jpeg',
    '/photo-6-m84jbhjp.jpeg',
    '/photo-7-m84jo0h1.jpeg'
  ]
  
  await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API delay
  
  return {
    imageUrl: demoImages[Math.floor(Math.random() * demoImages.length)],
    style: "Contemporary",
    timestamp: new Date().toISOString()
  }
}
