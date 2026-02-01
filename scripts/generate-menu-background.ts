#!/usr/bin/env npx tsx
/**
 * Homestead Headaches - Main Menu Background Generation
 *
 * Generates static background images using Imagen 3 for the main menu.
 * - Portrait (9:16) for mobile
 * - Landscape (16:9) for desktop/tablet
 *
 * The image shows a scenic Nebraska farm with dramatic storm clouds,
 * perfect as a backdrop for the game menu.
 *
 * Run with: pnpm exec tsx scripts/generate-menu-background.ts
 */

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// Model IDs - January 2026 (Imagen 4)
const MODELS = {
  image: 'imagen-4.0-generate-001',
  imageFast: 'imagen-4.0-fast-generate-001',
};

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'backgrounds');

// Main menu background prompt - warm, inviting Nebraska farm scene
const MENU_BACKGROUND_PROMPT = `
A beautiful stylized illustration of a Nebraska farm at golden hour sunset.
Rolling golden wheat fields stretch to the horizon. A classic red wooden barn
with white trim sits to one side, with a traditional windmill nearby.
Dramatic storm clouds gather in the distance with a hint of a funnel shape,
but the foreground is bathed in warm golden sunlight.
The style is warm and inviting, like a vintage travel poster or children's
book illustration. Rich warm colors - amber wheat, deep red barn, blue-gray
storm clouds with golden edges. The scene feels nostalgic and peaceful despite
the distant storm. Slightly stylized, not photorealistic.
No text, no animals in frame, no people. Just the beautiful farm landscape.
High quality, detailed, professional illustration quality.
`.trim();

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

interface ImageConfig {
  aspectRatio: '16:9' | '9:16';
  filename: string;
}

async function generateImage(
  ai: GoogleGenAI,
  config: ImageConfig
): Promise<boolean> {
  console.log(`\n=== Generating: ${config.filename} ===`);
  console.log(`Aspect Ratio: ${config.aspectRatio}`);
  console.log('Prompt:', MENU_BACKGROUND_PROMPT.slice(0, 100) + '...');
  console.log('Starting image generation...');

  try {
    const startTime = Date.now();

    // Generate image using Imagen 3
    const response = await ai.models.generateImages({
      model: MODELS.image,
      prompt: MENU_BACKGROUND_PROMPT,
      config: {
        numberOfImages: 1,
        aspectRatio: config.aspectRatio,
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Generation completed in ${elapsed}s`);

    // Extract image
    if (response.generatedImages?.length) {
      const image = response.generatedImages[0];
      const imageData = image.image?.imageBytes;

      if (imageData) {
        // Decode base64 and save to file
        const imageBuffer = Buffer.from(imageData, 'base64');
        const outputPath = path.join(OUTPUT_DIR, config.filename);
        fs.writeFileSync(outputPath, imageBuffer);

        console.log(`Image saved: ${outputPath}`);
        console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
        return true;
      }
    }

    console.log('No image data in response');
    console.log('Response:', JSON.stringify(response, null, 2).slice(0, 500));
    return false;
  } catch (error) {
    console.error('Image generation failed:', error);
    return false;
  }
}

async function main() {
  console.log('==========================================');
  console.log('Homestead Headaches Menu Background Gen');
  console.log('==========================================');

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable not set');
    console.log('Usage: GEMINI_API_KEY=your_key pnpm exec tsx scripts/generate-menu-background.ts');
    process.exit(1);
  }

  console.log(`API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

  // Parse args
  const args = process.argv.slice(2);
  const aspectArg = args[0]; // 'landscape', 'portrait', or 'all' (default)

  // Initialize
  const ai = new GoogleGenAI({ apiKey });
  await ensureOutputDir();

  // Images to generate
  const allImages: ImageConfig[] = [
    { aspectRatio: '16:9', filename: 'menu_landscape.png' },
    { aspectRatio: '9:16', filename: 'menu_portrait.png' },
  ];

  let images = allImages;
  if (aspectArg === 'landscape') {
    images = allImages.filter(i => i.aspectRatio === '16:9');
  } else if (aspectArg === 'portrait') {
    images = allImages.filter(i => i.aspectRatio === '9:16');
  }

  console.log(`\nGenerating ${images.length} image(s)...`);

  // Generate images
  const results: { filename: string; success: boolean }[] = [];
  for (const config of images) {
    const success = await generateImage(ai, config);
    results.push({ filename: config.filename, success });
  }

  // Summary
  console.log('\n=== Summary ===');
  for (const result of results) {
    console.log(`${result.success ? 'SUCCESS' : 'FAILED'}: ${result.filename}`);
  }
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log('\nUsage in game:');
  console.log('  Landscape (16:9): public/assets/backgrounds/menu_landscape.png');
  console.log('  Portrait (9:16):  public/assets/backgrounds/menu_portrait.png');

  const allSuccess = results.every(r => r.success);
  process.exit(allSuccess ? 0 : 1);
}

main().catch(console.error);
