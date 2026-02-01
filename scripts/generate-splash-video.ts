#!/usr/bin/env npx tsx
/**
 * Homestead Headaches - Splash Video Generation
 *
 * Generates a single 8-second splash video using Veo 3.1.
 * - Portrait (9:16) for mobile
 * - Landscape (16:9) for desktop/tablet
 *
 * The video shows a playful cartoon tornado sweeping across a Nebraska farm
 * with farm animals peeking in and out of the funnel.
 *
 * Run with: pnpm exec tsx scripts/generate-splash-video.ts
 */

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// Model IDs - January 2026
const MODELS = {
  video: 'veo-3.1-generate-preview',
  videoFast: 'veo-3.1-fast-generate-preview',
};

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'video');

// Single consolidated prompt for the splash video
const SPLASH_PROMPT = `
Playful cartoon-style animation of a Nebraska farm scene on a sunny day.
A whimsical gray tornado sweeps across golden wheat fields from right to left.
Farm animals peek in and out of the swirling funnel - a curious cow pops its head out,
chickens flutter around the edges, a pig spins by looking dizzy, ducks quack as they
tumble, and a sheep peeks out with a bewildered expression. The tornado passes a
classic red barn and windmill. Bright, cheerful colors with a Pixar/Dreamworks
animation quality. Comedic timing with animals appearing and disappearing.
Blue sky with fluffy clouds above. The mood is fun and whimsical, not scary.
Warm golden hour lighting on the prairie. 8 seconds.
`.trim();

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

interface VideoConfig {
  aspectRatio: '16:9' | '9:16';
  filename: string;
}

async function generateVideo(
  ai: GoogleGenAI,
  config: VideoConfig,
  useFastModel: boolean = false
): Promise<boolean> {
  const model = useFastModel ? MODELS.videoFast : MODELS.video;

  console.log(`\n=== Generating: ${config.filename} ===`);
  console.log(`Aspect Ratio: ${config.aspectRatio}`);
  console.log(`Model: ${model}`);
  console.log('Prompt:', SPLASH_PROMPT.slice(0, 100) + '...');
  console.log('Starting video generation (this may take several minutes)...');

  try {
    const startTime = Date.now();

    // Start video generation
    let operation = await ai.models.generateVideos({
      model,
      prompt: SPLASH_PROMPT,
      config: {
        aspectRatio: config.aspectRatio,
      },
    });

    console.log('Video generation started, polling for completion...');

    // Poll for completion
    const maxWaitTime = 600000; // 10 minutes
    const pollInterval = 15000; // 15 seconds
    let pollCount = 0;

    while (!operation.done) {
      if (Date.now() - startTime > maxWaitTime) {
        console.log('Video generation timed out after 10 minutes');
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`   Polling... (${elapsed}s elapsed, poll #${pollCount})`);

      operation = await ai.operations.getVideosOperation({ operation });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Generation completed in ${elapsed}s`);

    // Extract video
    if (operation.response?.generatedVideos?.length) {
      const video = operation.response.generatedVideos[0];
      const videoUri = video.video?.uri;

      if (videoUri) {
        console.log('Downloading video...');

        // Fetch the video
        const apiKey = process.env.GEMINI_API_KEY;
        const videoUrl = `${videoUri}&key=${apiKey}`;
        const response = await fetch(videoUrl);
        const videoBuffer = Buffer.from(await response.arrayBuffer());

        // Save to file
        const outputPath = path.join(OUTPUT_DIR, config.filename);
        fs.writeFileSync(outputPath, videoBuffer);

        console.log(`Video saved: ${outputPath}`);
        console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        return true;
      }
    }

    console.log('No video data in response');
    console.log('Response:', JSON.stringify(operation.response, null, 2).slice(0, 500));
    return false;
  } catch (error) {
    console.error('Video generation failed:', error);
    return false;
  }
}

async function main() {
  console.log('=====================================');
  console.log('Homestead Headaches Splash Video Gen');
  console.log('=====================================');

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable not set');
    console.log('Usage: GEMINI_API_KEY=your_key pnpm exec tsx scripts/generate-splash-video.ts');
    process.exit(1);
  }

  console.log(`API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

  // Parse args
  const args = process.argv.slice(2);
  const aspectArg = args[0]; // 'landscape', 'portrait', or 'all' (default)
  const useFast = args.includes('--fast');

  // Initialize
  const ai = new GoogleGenAI({ apiKey });
  await ensureOutputDir();

  // Videos to generate
  const allVideos: VideoConfig[] = [
    { aspectRatio: '16:9', filename: 'splash_landscape.mp4' },
    { aspectRatio: '9:16', filename: 'splash_portrait.mp4' },
  ];

  let videos = allVideos;
  if (aspectArg === 'landscape') {
    videos = allVideos.filter(v => v.aspectRatio === '16:9');
  } else if (aspectArg === 'portrait') {
    videos = allVideos.filter(v => v.aspectRatio === '9:16');
  }

  console.log(`\nGenerating ${videos.length} video(s)${useFast ? ' (fast model)' : ''}...`);

  // Generate videos
  const results: { filename: string; success: boolean }[] = [];
  for (const config of videos) {
    const success = await generateVideo(ai, config, useFast);
    results.push({ filename: config.filename, success });
  }

  // Summary
  console.log('\n=== Summary ===');
  for (const result of results) {
    console.log(`${result.success ? 'SUCCESS' : 'FAILED'}: ${result.filename}`);
  }
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log('\nUsage in game:');
  console.log('  Landscape (16:9): public/assets/video/splash_landscape.mp4');
  console.log('  Portrait (9:16):  public/assets/video/splash_portrait.mp4');

  const allSuccess = results.every(r => r.success);
  process.exit(allSuccess ? 0 : 1);
}

main().catch(console.error);
