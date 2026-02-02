/**
 * Native Audio Manager
 * Uses Kenney audio assets for sound effects with character-specific voices.
 *
 * Single background track (background.wav) loops throughout the game.
 * SFX are file-based OGG files from Kenney audio library.
 * Voice clips have male/female variants for John/Mary characters.
 */

// ============================================================
// TYPES
// ============================================================

export type MusicTrack =
  | "mainMenu"
  | "farmerJohn"
  | "farmerMary"
  | "splash"
  | "gameOver"
  | "background";

export type SoundEffect =
  | "drop"
  | "land"
  | "perfect"
  | "fail"
  | "powerup"
  | "freeze"
  | "fireball"
  | "levelup"
  | "lifeup"
  | "bank"
  | "miss"
  | "topple"
  | "click"
  | "toggle"
  | "back";

export type VoiceClip =
  | "levelup"
  | "powerup"
  | "gameover"
  | "perfect"
  | "fail"
  | "highscore"
  | "danger";

export type CharacterVoice = "male" | "female";

// ============================================================
// CONFIGURATION
// ============================================================

// Single background track used throughout
const BACKGROUND_MUSIC = "/assets/audio/music/background.wav";

// All tracks point to the same background music for simplicity
const MUSIC_TRACKS: Record<MusicTrack, { loop: string; end?: string }> = {
  background: { loop: BACKGROUND_MUSIC },
  mainMenu: { loop: BACKGROUND_MUSIC },
  farmerJohn: { loop: BACKGROUND_MUSIC },
  farmerMary: { loop: BACKGROUND_MUSIC },
  splash: { loop: BACKGROUND_MUSIC },
  gameOver: { loop: BACKGROUND_MUSIC },
};

// File-based sound effects (Kenney audio library)
const SFX_FILES: Record<SoundEffect, { file: string; volume: number }> = {
  // Game SFX
  drop: { file: "/assets/audio/sfx/drop.ogg", volume: 0.4 },
  land: { file: "/assets/audio/sfx/land.ogg", volume: 0.5 },
  perfect: { file: "/assets/audio/sfx/perfect.ogg", volume: 0.6 },
  fail: { file: "/assets/audio/sfx/fail.ogg", volume: 0.5 },
  powerup: { file: "/assets/audio/sfx/powerup.ogg", volume: 0.5 },
  freeze: { file: "/assets/audio/sfx/freeze.ogg", volume: 0.4 },
  fireball: { file: "/assets/audio/sfx/fireball.ogg", volume: 0.5 },
  levelup: { file: "/assets/audio/sfx/levelup.ogg", volume: 0.6 },
  lifeup: { file: "/assets/audio/sfx/lifeup.ogg", volume: 0.5 },
  bank: { file: "/assets/audio/sfx/bank.ogg", volume: 0.5 },
  miss: { file: "/assets/audio/sfx/miss.ogg", volume: 0.4 },
  topple: { file: "/assets/audio/sfx/topple.ogg", volume: 0.6 },
  // UI SFX
  click: { file: "/assets/audio/ui/click.ogg", volume: 0.5 },
  toggle: { file: "/assets/audio/ui/toggle.ogg", volume: 0.5 },
  back: { file: "/assets/audio/ui/back.ogg", volume: 0.5 },
};

// Voice clips with male/female variants
const VOICE_FILES: Record<VoiceClip, { volume: number }> = {
  levelup: { volume: 0.7 },
  powerup: { volume: 0.7 },
  gameover: { volume: 0.8 },
  perfect: { volume: 0.7 },
  fail: { volume: 0.6 },
  highscore: { volume: 0.8 },
  danger: { volume: 0.7 },
};

// ============================================================
// AUDIO MANAGER CLASS
// ============================================================

class NativeAudioManager {
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private muted = false;

  // Music
  private currentTrack: MusicTrack | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();
  private musicPlaying = false;
  private musicPaused = false;
  private musicPauseTime = 0;
  private musicStartTime = 0;

  // Character voice selection
  private characterVoice: CharacterVoice = "male";

  // Intensity affects volume
  private intensity = 0.5;

  // Master volume
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.7;
      this.masterGain.connect(this.audioContext.destination);

      // Create separate gains for music, sfx, and voice
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.masterGain);

      this.voiceGain = this.audioContext.createGain();
      this.voiceGain.gain.value = 0.8;
      this.voiceGain.connect(this.masterGain);

      // Resume context if suspended (required by browsers)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.initialized = true;
      console.log("[Audio] Native Web Audio initialized");

      // Preload common sounds
      this.preloadSfx();
    } catch (error) {
      console.warn("[Audio] Failed to initialize:", error);
    }
  }

  /**
   * Set the character voice (male for John, female for Mary)
   */
  setCharacterVoice(voice: CharacterVoice): void {
    this.characterVoice = voice;
    console.log(`[Audio] Character voice set to: ${voice}`);
  }

  // ============================================================
  // MUSIC PLAYBACK
  // ============================================================

  async playTrack(track: MusicTrack): Promise<void> {
    if (!this.initialized || this.muted) {
      await this.init();
    }

    if (!this.audioContext || !this.musicGain) return;

    // All tracks use the same background music - don't restart if already playing
    if (this.musicPlaying && !this.musicPaused) {
      this.currentTrack = track;
      return;
    }

    // Stop current track if paused
    this.stopMusic();

    this.currentTrack = track;
    const config = MUSIC_TRACKS[track];

    try {
      const buffer = await this.loadAudio(config.loop);

      this.musicSource = this.audioContext.createBufferSource();
      this.musicSource.buffer = buffer;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicGain);

      this.musicSource.start(0);
      this.musicStartTime = this.audioContext.currentTime;
      this.musicPlaying = true;
      this.musicPaused = false;

      console.log(`[Audio] Playing track: ${track}`);
    } catch (error) {
      console.warn(`[Audio] Failed to play track ${track}:`, error);
    }
  }

  startMusic(): void {
    if (this.musicPlaying && !this.musicPaused) return;

    if (this.musicPaused) {
      this.resumeMusic();
    } else {
      this.playTrack(this.currentTrack || "mainMenu");
    }
  }

  stopMusic(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.musicSource = null;
    }
    this.musicPlaying = false;
    this.musicPaused = false;
    this.musicPauseTime = 0;
  }

  pauseMusic(): void {
    if (!this.musicPlaying || this.musicPaused || !this.audioContext) return;

    this.musicPauseTime = this.audioContext.currentTime - this.musicStartTime;
    this.stopMusicSource();
    this.musicPaused = true;
    this.musicPlaying = false;
  }

  async resumeMusic(): Promise<void> {
    if (!this.musicPaused || !this.currentTrack || !this.audioContext || !this.musicGain) return;

    const config = MUSIC_TRACKS[this.currentTrack];

    try {
      const buffer = await this.loadAudio(config.loop);

      this.musicSource = this.audioContext.createBufferSource();
      this.musicSource.buffer = buffer;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicGain);

      const offset = this.musicPauseTime % buffer.duration;
      this.musicSource.start(0, offset);
      this.musicStartTime = this.audioContext.currentTime - offset;
      this.musicPlaying = true;
      this.musicPaused = false;
    } catch (error) {
      console.warn("[Audio] Failed to resume music:", error);
    }
  }

  private stopMusicSource(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch (e) {
        // Ignore
      }
      this.musicSource = null;
    }
  }

  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));

    if (this.musicGain) {
      const baseVolume = 0.4;
      const intensityBonus = this.intensity * 0.3;
      this.musicGain.gain.setTargetAtTime(
        baseVolume + intensityBonus,
        this.audioContext?.currentTime || 0,
        0.5
      );
    }
  }

  // ============================================================
  // SOUND EFFECTS
  // ============================================================

  /**
   * Play a sound effect
   */
  async play(type: SoundEffect): Promise<void> {
    if (this.muted) return;

    if (!this.initialized) {
      await this.init();
    }

    if (!this.audioContext || !this.sfxGain) return;

    const config = SFX_FILES[type];
    if (!config) return;

    try {
      const buffer = await this.loadAudio(config.file);

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = config.volume;

      source.connect(gainNode);
      gainNode.connect(this.sfxGain);

      source.start(0);
    } catch (error) {
      console.warn(`[Audio] Failed to play SFX ${type}:`, error);
    }
  }

  /**
   * Play a character voice clip
   */
  async playVoice(clip: VoiceClip): Promise<void> {
    if (this.muted) return;

    if (!this.initialized) {
      await this.init();
    }

    if (!this.audioContext || !this.voiceGain) return;

    const config = VOICE_FILES[clip];
    if (!config) return;

    const voicePath = `/assets/audio/sfx/voice/${this.characterVoice}/${clip}.ogg`;

    try {
      const buffer = await this.loadAudio(voicePath);

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = config.volume;

      source.connect(gainNode);
      gainNode.connect(this.voiceGain);

      source.start(0);
    } catch (error) {
      console.warn(`[Audio] Failed to play voice ${clip}:`, error);
    }
  }

  /**
   * Play SFX with accompanying voice clip
   */
  async playWithVoice(sfx: SoundEffect, voice: VoiceClip): Promise<void> {
    await Promise.all([
      this.play(sfx),
      this.playVoice(voice),
    ]);
  }

  // ============================================================
  // AUDIO LOADING
  // ============================================================

  private async loadAudio(url: string): Promise<AudioBuffer> {
    if (this.audioBuffers.has(url)) {
      return this.audioBuffers.get(url)!;
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = this.fetchAndDecodeAudio(url);
    this.loadingPromises.set(url, promise);

    try {
      const buffer = await promise;
      this.audioBuffers.set(url, buffer);
      return buffer;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  private async fetchAndDecodeAudio(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  async preloadTrack(track: MusicTrack): Promise<void> {
    const config = MUSIC_TRACKS[track];
    await this.loadAudio(config.loop);
    if (config.end) {
      await this.loadAudio(config.end);
    }
  }

  /**
   * Preload common sound effects for instant playback
   */
  async preloadSfx(): Promise<void> {
    const commonSfx: SoundEffect[] = ["drop", "land", "perfect", "fail", "bank", "miss"];
    await Promise.all(commonSfx.map((sfx) => this.loadAudio(SFX_FILES[sfx].file)));
  }

  // ============================================================
  // SETTINGS
  // ============================================================

  setMuted(muted: boolean): void {
    this.muted = muted;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.7,
        this.audioContext?.currentTime || 0,
        0.1
      );
    }

    if (muted) {
      this.stopMusic();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext?.currentTime || 0,
        0.1
      );
    }
  }

  setMusicVolume(volume: number): void {
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext?.currentTime || 0,
        0.1
      );
    }
  }

  setSfxVolume(volume: number): void {
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext?.currentTime || 0,
        0.1
      );
    }
  }

  setVoiceVolume(volume: number): void {
    if (this.voiceGain) {
      this.voiceGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext?.currentTime || 0,
        0.1
      );
    }
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  dispose(): void {
    this.stopMusic();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffers.clear();
    this.loadingPromises.clear();
    this.initialized = false;
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const audioManager = new NativeAudioManager();
