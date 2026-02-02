#!/usr/bin/env npx tsx
/**
 * Generate Farmer Portraits using Imagen 4
 *
 * Creates stylized farmer character portraits matching the game's art style.
 * Run with: pnpm exec tsx scripts/generate-farmer-portraits.ts
 */

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

const MODELS = {
  image: 'imagen-4.0-generate-001',
};

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'sprites');

// Farmer portrait prompts - warm, stylized, matching the game's aesthetic
const FARMERS = [
  {
    id: 'farmer_john',
    filename: 'farmer_john_portrait.png',
    prompt: `
      Stylized cartoon portrait of a friendly male farmer character for a mobile game.
      Middle-aged man with a warm smile, wearing blue overalls and a straw hat.
      Slightly tanned skin from working outdoors. Kind eyes.
      Simple, clean cartoon style like Pixar or Dreamworks characters.
      Front-facing portrait, shoulders and head visible.
      Soft, warm lighting. Transparent background.
      Game character portrait, mobile game art style.
      No background elements, just the character.
    `.trim(),
  },
  {
    id: 'farmer_mary',
    filename: 'farmer_mary_portrait.png',
    prompt: `
      Stylized cartoon portrait of a friendly female farmer character for a mobile game.
      Middle-aged woman with a warm smile, wearing pink/red overalls and a sun hat.
      Slightly tanned skin from working outdoors. Kind eyes.
      Simple, clean cartoon style like Pixar or Dreamworks characters.
      Front-facing portrait, shoulders and head visible.
      Soft, warm lighting. Transparent background.
      Game character portrait, mobile game art style.
      No background elements, just the character.
    `.trim(),
  },
];

async function generateFarmerPortrait(
  ai: GoogleGenAI,
  farmer: typeof FARMERS[0]
): Promise<boolean> {
  console.log(`\n=== Generating: ${farmer.filename} ===`);
  console.log('Prompt:', farmer.prompt.slice(0, 100) + '...');

  try {
    const startTime = Date.now();

    const response = await ai.models.generateImages({
      model: MODELS.image,
      prompt: farmer.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Generation completed in ${elapsed}s`);

    if (response.generatedImages?.length) {
      const image = response.generatedImages[0];
      const imageData = image.image?.imageBytes;

      if (imageData) {
        const imageBuffer = Buffer.from(imageData, 'base64');
        const outputPath = path.join(OUTPUT_DIR, farmer.filename);
        fs.writeFileSync(outputPath, imageBuffer);

        console.log(`Image saved: ${outputPath}`);
        console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
        return true;
      }
    }

    console.log('No image data in response');
    return false;
  } catch (error) {
    console.error('Generation failed:', error);
    return false;
  }
}

async function main() {
  console.log('==========================================');
  console.log('Homestead Headaches - Farmer Portrait Gen');
  console.log('==========================================');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log(`\nGenerating ${FARMERS.length} farmer portraits...`);

  const results: { id: string; success: boolean }[] = [];
  for (const farmer of FARMERS) {
    const success = await generateFarmerPortrait(ai, farmer);
    results.push({ id: farmer.id, success });
  }

  console.log('\n=== Summary ===');
  for (const result of results) {
    console.log(`${result.success ? 'SUCCESS' : 'FAILED'}: ${result.id}`);
  }

  process.exit(results.every(r => r.success) ? 0 : 1);
}

main().catch(console.error);
