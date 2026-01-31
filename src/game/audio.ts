/**
 * Audio System with Tone.js
 * Background music and sound effects for Infinite Headaches
 */

import * as Tone from "tone";

export type SoundType =
  | "drop"
  | "land"
  | "perfect"
  | "fail"
  | "powerup"
  | "freeze"
  | "fireball"
  | "levelup"
  | "lifeup";

class AudioManager {
  private initialized = false;
  private musicPlaying = false;
  private muted = false;

  // Synths for sound effects
  private mainSynth: Tone.PolySynth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private fmSynth: Tone.FMSynth | null = null;
  private bassLoop: Tone.Sequence | null = null;
  private arpeggioLoop: Tone.Pattern<string> | null = null;
  private drumLoop: Tone.Sequence | null = null;

  // Effects
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private filter: Tone.Filter | null = null;

  // Music state
  private currentIntensity = 0; // 0-1, affects music intensity

  /**
   * Initialize audio context and instruments
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await Tone.start();

      // Create effects chain
      this.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
      this.delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.2, wet: 0.15 }).connect(
        this.reverb
      );
      this.filter = new Tone.Filter({ frequency: 2000, type: "lowpass" }).connect(this.delay);

      // Main melodic synth for effects
      this.mainSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
        volume: -8,
      }).connect(this.filter);

      // Bass synth
      this.bassSynth = new Tone.MonoSynth({
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
      }).connect(this.reverb);

      // Noise synth for percussive effects
      this.noiseSynth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -20,
      }).toDestination();

      // FM synth for special effects
      this.fmSynth = new Tone.FMSynth({
        harmonicity: 3,
        modulationIndex: 10,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
        volume: -10,
      }).connect(this.reverb);

      this.initialized = true;
      console.log("[Audio] Tone.js initialized");
    } catch (error) {
      console.warn("[Audio] Failed to initialize Tone.js:", error);
    }
  }

  /**
   * Start background music
   */
  startMusic(): void {
    if (!this.initialized || this.musicPlaying || this.muted) return;

    // Psychic/mysterious theme in D minor
    const _scale = ["D3", "E3", "F3", "G3", "A3", "Bb3", "C4", "D4"];
    const bassNotes = ["D2", "D2", "A2", "A2", "Bb2", "Bb2", "G2", "A2"];

    // Arpeggio pattern - dreamy, slightly confused sounding
    this.arpeggioLoop = new Tone.Pattern(
      (time, note) => {
        if (this.mainSynth && Math.random() > 0.3) {
          // Some randomness for that confused Duck feel
          this.mainSynth.triggerAttackRelease(note, "16n", time, 0.3 + this.currentIntensity * 0.3);
        }
      },
      ["D4", "F4", "A4", "C5", "A4", "F4", "D4", "E4", "G4", "Bb4", "G4", "E4"],
      "upDown"
    );
    this.arpeggioLoop.interval = "8n";

    // Bass line
    this.bassLoop = new Tone.Sequence(
      (time, note) => {
        if (this.bassSynth) {
          this.bassSynth.triggerAttackRelease(note, "4n", time, 0.6);
        }
      },
      bassNotes,
      "4n"
    );

    // Simple drum pattern using noise
    this.drumLoop = new Tone.Sequence(
      (time, velocity) => {
        if (this.noiseSynth && velocity > 0) {
          this.noiseSynth.triggerAttackRelease("16n", time, velocity * 0.3);
        }
      },
      [0.8, 0, 0.4, 0, 0.6, 0, 0.4, 0.2],
      "8n"
    );

    // Set tempo - slightly unsteady like Duck's headache
    Tone.getTransport().bpm.value = 95;

    // Start all loops
    this.arpeggioLoop.start(0);
    this.bassLoop.start(0);
    this.drumLoop.start(0);
    Tone.getTransport().start();

    this.musicPlaying = true;
    console.log("[Audio] Music started");
  }

  /**
   * Stop background music
   */
  stopMusic(): void {
    if (!this.musicPlaying) return;

    Tone.getTransport().stop();
    this.arpeggioLoop?.stop();
    this.bassLoop?.stop();
    this.drumLoop?.stop();

    this.musicPlaying = false;
    console.log("[Audio] Music stopped");
  }

  /**
   * Set music intensity (0-1) based on game state
   */
  setIntensity(intensity: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, intensity));

    // Adjust tempo based on intensity
    if (this.musicPlaying) {
      Tone.getTransport().bpm.value = 95 + this.currentIntensity * 30;
    }

    // Adjust filter for more brightness at high intensity
    if (this.filter) {
      this.filter.frequency.rampTo(1500 + this.currentIntensity * 2500, 0.5);
    }
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    }
  }

  /**
   * Get mute state
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Play a sound effect
   */
  async play(type: SoundType): Promise<void> {
    if (this.muted) return;

    if (!this.initialized) {
      await this.init();
    }

    if (!this.initialized) return;

    const now = Tone.now();

    switch (type) {
      case "drop":
        this.playDropSound(now);
        break;
      case "land":
        this.playLandSound(now);
        break;
      case "perfect":
        this.playPerfectSound(now);
        break;
      case "fail":
        this.playFailSound(now);
        break;
      case "powerup":
        this.playPowerupSound(now);
        break;
      case "freeze":
        this.playFreezeSound(now);
        break;
      case "fireball":
        this.playFireballSound(now);
        break;
      case "levelup":
        this.playLevelUpSound(now);
        break;
      case "lifeup":
        this.playLifeUpSound(now);
        break;
    }
  }

  private playDropSound(time: number): void {
    // Whoosh down
    if (this.mainSynth) {
      this.mainSynth.triggerAttackRelease("G4", "16n", time, 0.3);
      this.mainSynth.triggerAttackRelease("D4", "16n", time + 0.05, 0.2);
    }
  }

  private playLandSound(time: number): void {
    // Satisfying thump with pitch
    if (this.bassSynth) {
      this.bassSynth.triggerAttackRelease("D2", "8n", time, 0.7);
    }
    if (this.noiseSynth) {
      this.noiseSynth.triggerAttackRelease("32n", time, 0.4);
    }
    if (this.mainSynth) {
      this.mainSynth.triggerAttackRelease("D4", "16n", time, 0.4);
    }
  }

  private playPerfectSound(time: number): void {
    // Magical ascending arpeggio
    if (this.mainSynth) {
      this.mainSynth.triggerAttackRelease("D5", "16n", time, 0.5);
      this.mainSynth.triggerAttackRelease("F5", "16n", time + 0.08, 0.5);
      this.mainSynth.triggerAttackRelease("A5", "16n", time + 0.16, 0.5);
      this.mainSynth.triggerAttackRelease("D6", "8n", time + 0.24, 0.6);
    }
    if (this.fmSynth) {
      this.fmSynth.triggerAttackRelease("D6", "4n", time + 0.2, 0.3);
    }
  }

  private playFailSound(time: number): void {
    // Sad descending with dissonance
    if (this.mainSynth) {
      this.mainSynth.triggerAttackRelease(["D4", "Eb4"], "8n", time, 0.5);
      this.mainSynth.triggerAttackRelease(["Bb3", "B3"], "8n", time + 0.15, 0.4);
      this.mainSynth.triggerAttackRelease(["G3", "Ab3"], "4n", time + 0.3, 0.3);
    }
    if (this.bassSynth) {
      this.bassSynth.triggerAttackRelease("D2", "2n", time, 0.5);
    }
  }

  private playPowerupSound(time: number): void {
    // Sparkly collection sound
    if (this.fmSynth) {
      this.fmSynth.triggerAttackRelease("A5", "16n", time, 0.4);
      this.fmSynth.triggerAttackRelease("D6", "16n", time + 0.1, 0.5);
      this.fmSynth.triggerAttackRelease("F6", "8n", time + 0.2, 0.4);
    }
    if (this.mainSynth) {
      this.mainSynth.triggerAttackRelease(["D5", "A5"], "8n", time + 0.15, 0.3);
    }
  }

  private playFreezeSound(time: number): void {
    // Icy crystalline sound
    if (this.fmSynth) {
      // High pitched shimmer
      this.fmSynth.modulationIndex.value = 20;
      this.fmSynth.triggerAttackRelease("E6", "8n", time, 0.3);
      this.fmSynth.triggerAttackRelease("B5", "8n", time + 0.1, 0.3);
      this.fmSynth.modulationIndex.value = 10; // Reset
    }
    if (this.noiseSynth) {
      this.noiseSynth.triggerAttackRelease("4n", time, 0.2);
    }
  }

  private playFireballSound(time: number): void {
    // Whooshy fire burst
    if (this.noiseSynth) {
      this.noiseSynth.triggerAttackRelease("8n", time, 0.5);
    }
    if (this.fmSynth) {
      this.fmSynth.harmonicity.value = 5;
      this.fmSynth.triggerAttackRelease("G3", "16n", time, 0.4);
      this.fmSynth.triggerAttackRelease("D4", "16n", time + 0.05, 0.3);
      this.fmSynth.harmonicity.value = 3; // Reset
    }
  }

  private playLevelUpSound(time: number): void {
    // Triumphant fanfare
    if (this.mainSynth) {
      this.mainSynth.triggerAttackRelease(["D4", "F4", "A4"], "8n", time, 0.5);
      this.mainSynth.triggerAttackRelease(["F4", "A4", "D5"], "8n", time + 0.2, 0.5);
      this.mainSynth.triggerAttackRelease(["A4", "D5", "F5"], "4n", time + 0.4, 0.6);
    }
    if (this.bassSynth) {
      this.bassSynth.triggerAttackRelease("D3", "4n", time, 0.5);
      this.bassSynth.triggerAttackRelease("A2", "4n", time + 0.4, 0.5);
    }
  }

  private playLifeUpSound(time: number): void {
    // Healing/1-up sound
    if (this.mainSynth) {
      this.mainSynth.triggerAttackRelease("E5", "16n", time, 0.4);
      this.mainSynth.triggerAttackRelease("G5", "16n", time + 0.1, 0.4);
      this.mainSynth.triggerAttackRelease("B5", "16n", time + 0.2, 0.5);
      this.mainSynth.triggerAttackRelease("E6", "8n", time + 0.3, 0.5);
    }
    if (this.fmSynth) {
      this.fmSynth.triggerAttackRelease("E6", "4n", time + 0.35, 0.2);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopMusic();

    this.mainSynth?.dispose();
    this.bassSynth?.dispose();
    this.noiseSynth?.dispose();
    this.fmSynth?.dispose();
    this.reverb?.dispose();
    this.delay?.dispose();
    this.filter?.dispose();
    this.arpeggioLoop?.dispose();
    this.bassLoop?.dispose();
    this.drumLoop?.dispose();

    this.initialized = false;
  }
}

// Singleton instance
export const audioManager = new AudioManager();
