/**
 * Audio Capture Script
 * Renders Tone.js procedural audio to OGG files using headless browser + OfflineAudioContext
 * 
 * Usage: npx tsx scripts/capture-audio.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// Audio configuration
const SAMPLE_RATE = 44100;
const SFX_DURATION = 2; // seconds - enough for any effect
const MUSIC_DURATION = 30; // seconds per intensity level (will loop)

const OUTPUT_DIR = path.join(process.cwd(), "public/assets/audio");

// Ensure output directories exist
function ensureDirectories() {
  const dirs = [
    path.join(OUTPUT_DIR, "sfx"),
    path.join(OUTPUT_DIR, "music"),
    path.join(OUTPUT_DIR, "ui"),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Convert WAV to OGG using ffmpeg
function wavToOgg(wavPath: string, oggPath: string): boolean {
  try {
    execSync(`ffmpeg -y -i "${wavPath}" -c:a libvorbis -q:a 6 "${oggPath}"`, {
      stdio: "pipe",
    });
    // Clean up WAV
    fs.unlinkSync(wavPath);
    return true;
  } catch (error) {
    console.error(`Failed to convert ${wavPath}:`, error);
    return false;
  }
}

// Generate HTML that will render audio using Tone.js
function generateCaptureHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Audio Capture</title>
  <script src="https://unpkg.com/tone@15.1.22/build/Tone.js"></script>
</head>
<body>
<script>
// Sound effect definitions (matching src/game/audio.ts)
const SFX_DEFINITIONS = {
  drop: (ctx, dest) => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -8,
    }).connect(dest);
    synth.triggerAttackRelease("G4", "16n", 0, 0.3);
    synth.triggerAttackRelease("D4", "16n", 0.05, 0.2);
    return 0.5;
  },
  
  land: (ctx, dest) => {
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(dest);
    const bass = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.2 },
      volume: -12,
    }).connect(reverb);
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -20,
    }).connect(dest);
    const main = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -8,
    }).connect(dest);
    
    bass.triggerAttackRelease("D2", "8n", 0, 0.7);
    noise.triggerAttackRelease("32n", 0, 0.4);
    main.triggerAttackRelease("D4", "16n", 0, 0.4);
    return 0.8;
  },
  
  perfect: (ctx, dest) => {
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(dest);
    const main = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -8,
    }).connect(reverb);
    const fm = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
      volume: -10,
    }).connect(reverb);
    
    main.triggerAttackRelease("D5", "16n", 0, 0.5);
    main.triggerAttackRelease("F5", "16n", 0.08, 0.5);
    main.triggerAttackRelease("A5", "16n", 0.16, 0.5);
    main.triggerAttackRelease("D6", "8n", 0.24, 0.6);
    fm.triggerAttackRelease("D6", "4n", 0.2, 0.3);
    return 1.2;
  },
  
  fail: (ctx, dest) => {
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(dest);
    const main = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -8,
    }).connect(reverb);
    const bass = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.2 },
      volume: -12,
    }).connect(reverb);
    
    main.triggerAttackRelease(["D4", "Eb4"], "8n", 0, 0.5);
    main.triggerAttackRelease(["Bb3", "B3"], "8n", 0.15, 0.4);
    main.triggerAttackRelease(["G3", "Ab3"], "4n", 0.3, 0.3);
    bass.triggerAttackRelease("D2", "2n", 0, 0.5);
    return 1.5;
  },
  
  powerup: (ctx, dest) => {
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(dest);
    const fm = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
      volume: -10,
    }).connect(reverb);
    const main = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -8,
    }).connect(reverb);
    
    fm.triggerAttackRelease("A5", "16n", 0, 0.4);
    fm.triggerAttackRelease("D6", "16n", 0.1, 0.5);
    fm.triggerAttackRelease("F6", "8n", 0.2, 0.4);
    main.triggerAttackRelease(["D5", "A5"], "8n", 0.15, 0.3);
    return 0.8;
  },
  
  freeze: (ctx, dest) => {
    const fm = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 20,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
      volume: -10,
    }).connect(dest);
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -20,
    }).connect(dest);
    
    fm.triggerAttackRelease("E6", "8n", 0, 0.3);
    fm.triggerAttackRelease("B5", "8n", 0.1, 0.3);
    noise.triggerAttackRelease("4n", 0, 0.2);
    return 0.8;
  },
  
  fireball: (ctx, dest) => {
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -15,
    }).connect(dest);
    const fm = new Tone.FMSynth({
      harmonicity: 5,
      modulationIndex: 10,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
      volume: -10,
    }).connect(dest);
    
    noise.triggerAttackRelease("8n", 0, 0.5);
    fm.triggerAttackRelease("G3", "16n", 0, 0.4);
    fm.triggerAttackRelease("D4", "16n", 0.05, 0.3);
    return 0.6;
  },
  
  levelup: (ctx, dest) => {
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(dest);
    const main = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -8,
    }).connect(reverb);
    const bass = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.2 },
      volume: -12,
    }).connect(reverb);
    
    main.triggerAttackRelease(["D4", "F4", "A4"], "8n", 0, 0.5);
    main.triggerAttackRelease(["F4", "A4", "D5"], "8n", 0.2, 0.5);
    main.triggerAttackRelease(["A4", "D5", "F5"], "4n", 0.4, 0.6);
    bass.triggerAttackRelease("D3", "4n", 0, 0.5);
    bass.triggerAttackRelease("A2", "4n", 0.4, 0.5);
    return 1.2;
  },
  
  lifeup: (ctx, dest) => {
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(dest);
    const main = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -8,
    }).connect(reverb);
    const fm = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
      volume: -10,
    }).connect(reverb);
    
    main.triggerAttackRelease("E5", "16n", 0, 0.4);
    main.triggerAttackRelease("G5", "16n", 0.1, 0.4);
    main.triggerAttackRelease("B5", "16n", 0.2, 0.5);
    main.triggerAttackRelease("E6", "8n", 0.3, 0.5);
    fm.triggerAttackRelease("E6", "4n", 0.35, 0.2);
    return 1.0;
  },
};

// Render a single SFX to buffer
async function renderSFX(name) {
  const duration = 2;
  const sampleRate = 44100;
  
  // Create offline context
  const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
  Tone.setContext(offlineCtx);
  
  const dest = offlineCtx.destination;
  const sfxFn = SFX_DEFINITIONS[name];
  
  if (!sfxFn) {
    throw new Error("Unknown SFX: " + name);
  }
  
  // Render the sound
  const actualDuration = sfxFn(offlineCtx, dest);
  
  // Render to buffer
  const buffer = await offlineCtx.startRendering();
  return { buffer, duration: actualDuration || duration };
}

// Render music at specific intensity
async function renderMusic(intensity, duration) {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
  Tone.setContext(offlineCtx);
  
  const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
  const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.2, wet: 0.15 }).connect(reverb);
  const filter = new Tone.Filter({ 
    frequency: 1500 + intensity * 2500, 
    type: "lowpass" 
  }).connect(delay);
  
  // Main melodic synth
  const mainSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
    volume: -8,
  }).connect(filter);
  
  // Bass synth
  const bassSynth = new Tone.MonoSynth({
    oscillator: { type: "square" },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.2 },
    filterEnvelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.5,
      release: 0.3,
      baseFrequency: 200,
      octaves: 2,
    },
    volume: -12,
  }).connect(reverb);
  
  // Noise for drums
  const noiseSynth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
    volume: -20,
  }).toDestination();
  
  const bpm = 95 + intensity * 30;
  const bassNotes = ["D2", "D2", "A2", "A2", "Bb2", "Bb2", "G2", "A2"];
  const arpeggioNotes = ["D4", "F4", "A4", "C5", "A4", "F4", "D4", "E4", "G4", "Bb4", "G4", "E4"];
  
  // Calculate timing
  const beatDuration = 60 / bpm;
  const eighthNote = beatDuration / 2;
  const sixteenthNote = beatDuration / 4;
  
  // Schedule bass notes
  let bassTime = 0;
  while (bassTime < duration) {
    for (const note of bassNotes) {
      if (bassTime >= duration) break;
      bassSynth.triggerAttackRelease(note, beatDuration * 0.8, bassTime, 0.6);
      bassTime += beatDuration;
    }
  }
  
  // Schedule arpeggio
  let arpTime = 0;
  let arpIndex = 0;
  while (arpTime < duration) {
    const note = arpeggioNotes[arpIndex % arpeggioNotes.length];
    if (Math.random() > 0.3) {
      mainSynth.triggerAttackRelease(note, sixteenthNote, arpTime, 0.3 + intensity * 0.3);
    }
    arpTime += eighthNote;
    arpIndex++;
  }
  
  // Schedule drums
  const drumPattern = [0.8, 0, 0.4, 0, 0.6, 0, 0.4, 0.2];
  let drumTime = 0;
  let drumIndex = 0;
  while (drumTime < duration) {
    const velocity = drumPattern[drumIndex % drumPattern.length];
    if (velocity > 0) {
      noiseSynth.triggerAttackRelease(sixteenthNote, drumTime, velocity * 0.3);
    }
    drumTime += eighthNote;
    drumIndex++;
  }
  
  const buffer = await offlineCtx.startRendering();
  return buffer;
}

// Convert AudioBuffer to WAV blob
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Interleave channels
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Export results to parent
window.renderSFX = renderSFX;
window.renderMusic = renderMusic;
window.audioBufferToWav = audioBufferToWav;
window.SFX_NAMES = Object.keys(SFX_DEFINITIONS);
</script>
</body>
</html>`;
}

// Main capture function
async function captureAudio() {
  console.log("Audio Capture Script");
  console.log("====================\n");

  ensureDirectories();

  // Check for ffmpeg
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
  } catch {
    console.error("Error: ffmpeg is required but not found in PATH");
    console.log("Install ffmpeg:");
    console.log("  macOS: brew install ffmpeg");
    console.log("  Ubuntu: sudo apt install ffmpeg");
    console.log("  Windows: choco install ffmpeg");
    process.exit(1);
  }

  console.log("This script requires a browser environment to run Tone.js");
  console.log("Please run in browser using the development server:\n");
  console.log("  1. Start dev server: pnpm dev");
  console.log("  2. Open: http://localhost:5173/audio-capture.html");
  console.log("  3. Click 'Capture All' button\n");
  console.log("Alternatively, use the browser-based capture tool.\n");

  // Write the capture HTML file
  const htmlPath = path.join(process.cwd(), "public/audio-capture.html");
  fs.writeFileSync(htmlPath, generateCaptureHTML());
  console.log(`Generated capture page: ${htmlPath}`);
}

captureAudio().catch(console.error);
