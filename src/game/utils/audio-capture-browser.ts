/**
 * Browser-based Audio Capture Module
 * Import this in a React component to trigger audio capture from the UI
 * 
 * Usage in dev tools console or component:
 *   import { captureAllAudio } from '@/scripts/audio-capture-browser';
 *   await captureAllAudio();
 */

import * as Tone from "tone";

const SFX_NAMES = [
  "drop",
  "land", 
  "perfect",
  "fail",
  "powerup",
  "freeze",
  "fireball",
  "levelup",
  "lifeup",
] as const;

type SFXName = (typeof SFX_NAMES)[number];

const INTENSITY_LEVELS = [0, 0.25, 0.5, 0.75, 1] as const;

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // WAV header
  writeString(0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave channels
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Render a single SFX using OfflineAudioContext
 */
async function renderSFX(name: SFXName): Promise<AudioBuffer> {
  const duration = 2;
  const sampleRate = 44100;

  const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

  // Create a temporary Tone.js context
  const originalContext = Tone.getContext();

  // Create effects chain
  const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 });
  const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.2, wet: 0.15 });
  const filter = new Tone.Filter({ frequency: 2000, type: "lowpass" });

  // We need to use the Web Audio API directly for offline rendering
  // Tone.js doesn't fully support OfflineAudioContext, so we'll use a workaround

  // For now, render using the live context and capture
  await Tone.start();

  const recorder = new Tone.Recorder();
  const dest = Tone.getDestination();

  // Connect recorder
  dest.connect(recorder);

  // Start recording
  recorder.start();

  // Play the sound
  const { audioManager } = await import("@/game/audio");
  await audioManager.init();
  await audioManager.play(name);

  // Wait for sound to finish
  await new Promise((resolve) => setTimeout(resolve, duration * 1000));

  // Stop recording
  const recording = await recorder.stop();

  // Disconnect
  dest.disconnect(recorder);
  recorder.dispose();

  // Convert blob to AudioBuffer
  const arrayBuffer = await recording.arrayBuffer();
  const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);

  return audioBuffer;
}

/**
 * Render music at a specific intensity level
 */
async function renderMusic(intensity: number, durationSeconds = 30): Promise<AudioBuffer> {
  await Tone.start();

  const recorder = new Tone.Recorder();
  const dest = Tone.getDestination();
  dest.connect(recorder);

  // Import and use the audio manager
  const { audioManager } = await import("@/game/audio");
  await audioManager.init();

  // Set intensity and start music
  audioManager.setIntensity(intensity);
  audioManager.startMusic();

  // Start recording
  recorder.start();

  // Wait for duration
  await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));

  // Stop
  audioManager.stopMusic();
  const recording = await recorder.stop();

  // Cleanup
  dest.disconnect(recorder);
  recorder.dispose();

  // Convert to AudioBuffer
  const arrayBuffer = await recording.arrayBuffer();
  const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);

  return audioBuffer;
}

/**
 * Capture and download a single SFX
 */
export async function captureSFX(name: SFXName): Promise<void> {
  console.log(`Capturing SFX: ${name}`);

  try {
    const buffer = await renderSFX(name);
    const wav = audioBufferToWav(buffer);
    downloadBlob(wav, `${name}.wav`);
    console.log(`Downloaded: ${name}.wav`);
  } catch (error) {
    console.error(`Failed to capture ${name}:`, error);
  }
}

/**
 * Capture and download music at a specific intensity
 */
export async function captureMusic(intensity: number, duration = 30): Promise<void> {
  const levelName = `intensity-${Math.round(intensity * 100)}`;
  console.log(`Capturing music: ${levelName}`);

  try {
    const buffer = await renderMusic(intensity, duration);
    const wav = audioBufferToWav(buffer);
    downloadBlob(wav, `theme-${levelName}.wav`);
    console.log(`Downloaded: theme-${levelName}.wav`);
  } catch (error) {
    console.error(`Failed to capture music ${levelName}:`, error);
  }
}

/**
 * Capture all SFX
 */
export async function captureAllSFX(): Promise<void> {
  console.log("Capturing all SFX...");

  for (const name of SFX_NAMES) {
    await captureSFX(name);
    // Small delay between captures
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("All SFX captured!");
}

/**
 * Capture all music intensity levels
 */
export async function captureAllMusic(duration = 30): Promise<void> {
  console.log("Capturing all music intensity levels...");

  for (const intensity of INTENSITY_LEVELS) {
    await captureMusic(intensity, duration);
    // Longer delay between music captures
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("All music captured!");
}

/**
 * Capture everything (SFX + Music)
 */
export async function captureAllAudio(): Promise<void> {
  console.log("=== Audio Capture Started ===");
  console.log("This will download WAV files for all game audio.");
  console.log("Convert to OGG using: ffmpeg -i input.wav -c:a libvorbis -q:a 6 output.ogg\n");

  await captureAllSFX();
  await captureAllMusic();

  console.log("\n=== Audio Capture Complete ===");
  console.log("Files downloaded. Move them to public/assets/audio/{sfx,music}/");
}

// Expose to window for dev tools access
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).captureAudio = {
    captureSFX,
    captureMusic,
    captureAllSFX,
    captureAllMusic,
    captureAllAudio,
    SFX_NAMES,
    INTENSITY_LEVELS,
  };

  console.log("Audio capture tools available:");
  console.log("  window.captureAudio.captureAllAudio() - Capture everything");
  console.log("  window.captureAudio.captureSFX('land') - Capture single SFX");
  console.log("  window.captureAudio.captureMusic(0.5) - Capture music at intensity");
}
